import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.redis import get_redis_client
from app.providers.sms.mock_provider import MockSMSProvider

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_teardown():
    r = get_redis_client()
    r.flushall()
    MockSMSProvider.clear()
    yield

def test_full_auth_flow_and_session_lifecycle():
    phone = "+919876543210"

    # 1. Send OTP
    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    assert res.status_code == 200, res.text
    data = res.json()
    assert "challenge_id" in data
    assert data["expires_in"] == 300
    challenge_id = data["challenge_id"]

    # Retrieve OTP captured safely by Mock provider
    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone)
    assert sent_otp != ""
    assert len(sent_otp) == 6

    # 2. Attempt incorrect OTP (should decrement attempts)
    bad_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": "000000" if sent_otp != "000000" else "111111"
    })
    assert bad_res.status_code == 400
    assert "remaining" in bad_res.json()["detail"].lower()

    # 3. Successful verification
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": sent_otp
    })
    assert verify_res.status_code == 200
    v_data = verify_res.json()
    assert "access_token" in v_data
    access_token = v_data["access_token"]
    assert "refresh_token" in verify_res.cookies

    # 4. Check Single-Use consumption (re-verifying same challenge must fail)
    reuse_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": sent_otp
    })
    assert reuse_res.status_code == 410

    # 5. Access protected /me endpoint
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["phone_e164"] == phone

    # 6. Refresh token rotation
    refresh_token_cookie = verify_res.cookies["refresh_token"]
    refresh_res = client.post("/api/v1/auth/refresh", cookies={"refresh_token": refresh_token_cookie})
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.json()
    new_refresh_cookie = refresh_res.cookies.get("refresh_token")
    assert new_refresh_cookie != refresh_token_cookie

    # 7. Token Family Reuse Detection: replaying old refresh token should revoke entire family
    replay_res = client.post("/api/v1/auth/refresh", cookies={"refresh_token": refresh_token_cookie})
    assert replay_res.status_code == 401
    assert "reuse detected" in replay_res.json()["detail"].lower()

    # Successor refresh token should now also be revoked due to family invalidation
    successor_res = client.post("/api/v1/auth/refresh", cookies={"refresh_token": new_refresh_cookie})
    assert successor_res.status_code == 401

def test_max_attempts_exhaustion():
    phone = "+919876543219"
    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    challenge_id = res.json()["challenge_id"]

    # Fire 3 wrong attempts
    for _ in range(3):
        client.post("/api/v1/auth/verify-otp", json={
            "challenge_id": challenge_id,
            "phone_number": phone,
            "purpose": "login",
            "otp": "999999"
        })

    # 4th attempt must be 410 Gone / Exhausted
    exhaust_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": "999999"
    })
    assert exhaust_res.status_code == 410

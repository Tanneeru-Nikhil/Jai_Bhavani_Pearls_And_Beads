import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.redis import get_redis_client
from app.providers.sms.mock_provider import MockSMSProvider

@pytest.fixture(autouse=True)
def reset_state():
    """Reset Redis and MockSMSProvider state before each test."""
    r = get_redis_client()
    r.flushall()
    MockSMSProvider.clear()
    yield


def make_client() -> TestClient:
    """Create a fresh TestClient with cookie jar per test."""
    return TestClient(app, raise_server_exceptions=True)


def test_full_auth_flow_and_session_lifecycle():
    """
    Covers the complete authentication lifecycle:
    send-otp → verify-otp (wrong + correct) → single-use consumption
    → /me → refresh rotation → reuse detection
    """
    client = make_client()
    phone = "+919876543210"

    # ── 1. Send OTP ─────────────────────────────────────────────
    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    assert res.status_code == 200, f"send-otp failed: {res.text}"
    data = res.json()
    assert "challenge_id" in data
    assert data["expires_in"] == 300
    assert data["resend_after"] == 60
    challenge_id = data["challenge_id"]

    # Retrieve OTP from safe in-memory mock (never logged)
    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone)
    assert sent_otp != ""
    assert len(sent_otp) == 6
    assert sent_otp.isdigit()

    # ── 2. Wrong OTP attempt ─────────────────────────────────────
    wrong_otp = "000000" if sent_otp != "000000" else "111111"
    bad_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": wrong_otp
    })
    assert bad_res.status_code == 400
    assert "remaining" in bad_res.json()["detail"].lower()

    # ── 3. Correct OTP verification ──────────────────────────────
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": sent_otp
    })
    assert verify_res.status_code == 200, f"verify-otp failed: {verify_res.text}"
    v_data = verify_res.json()
    assert "access_token" in v_data
    assert v_data["user"]["phone_e164"] == phone
    access_token = v_data["access_token"]

    # Refresh token should be set as HttpOnly cookie
    assert "refresh_token" in verify_res.cookies

    # ── 4. Single-use consumption: same challenge must fail ──────
    reuse_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": sent_otp
    })
    assert reuse_res.status_code == 410, f"Expected 410, got {reuse_res.status_code}: {reuse_res.text}"

    # ── 5. Access protected /me endpoint with Bearer token ───────
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_res.status_code == 200
    assert me_res.json()["phone_e164"] == phone

    # ── 6. Refresh token rotation ────────────────────────────────
    original_refresh_token = verify_res.cookies["refresh_token"]

    refresh_res = client.post("/api/v1/auth/refresh", json={"refresh_token": original_refresh_token})
    assert refresh_res.status_code == 200, f"refresh failed: {refresh_res.text}"
    assert "access_token" in refresh_res.json()

    new_refresh_token = refresh_res.cookies.get("refresh_token")
    assert new_refresh_token is not None
    assert new_refresh_token != original_refresh_token

    # ── 7. Token Family Reuse Detection ──────────────────────────
    # Replay the OLD (now-revoked) refresh token; should get 401
    replay_res = client.post("/api/v1/auth/refresh", json={"refresh_token": original_refresh_token})
    assert replay_res.status_code == 401, f"Expected 401 on reuse, got {replay_res.status_code}: {replay_res.text}"
    assert "reuse detected" in replay_res.json()["detail"].lower()

    # After family revocation, the successor token should also be invalidated
    successor_res = client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh_token})
    assert successor_res.status_code == 401, f"Expected successor to also be revoked, got {successor_res.status_code}"


def test_max_attempts_exhaustion():
    """After OTP_MAX_ATTEMPTS wrong OTPs, the challenge is permanently locked (410)."""
    client = make_client()
    phone = "+919876543219"

    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    assert res.status_code == 200
    challenge_id = res.json()["challenge_id"]

    # Fire OTP_MAX_ATTEMPTS (3) wrong attempts
    for i in range(3):
        r = client.post("/api/v1/auth/verify-otp", json={
            "challenge_id": challenge_id,
            "phone_number": phone,
            "purpose": "login",
            "otp": "999999"
        })
        # First two: 400 with remaining attempts; third: might be 400 or 410 depending on impl
        assert r.status_code in (400, 410), f"Attempt {i+1} unexpected status: {r.status_code}"

    # 4th attempt must be 410 Gone (challenge exhausted)
    exhaust_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": "999999"
    })
    assert exhaust_res.status_code == 410, f"Expected 410 after exhaustion, got {exhaust_res.status_code}: {exhaust_res.text}"


def test_otp_not_in_response():
    """OTP must never appear in any API response body."""
    client = make_client()
    phone = "+919876543211"

    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    assert res.status_code == 200

    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone)
    assert sent_otp != ""

    # OTP must not be in the send-otp response
    response_text = res.text
    assert sent_otp not in response_text, f"OTP '{sent_otp}' leaked in response: {response_text}"


def test_phone_mismatch_rejected():
    """Verify-OTP with a different phone than send-OTP must fail."""
    client = make_client()
    phone_a = "+919876543212"
    phone_b = "+919876543213"

    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone_a, "purpose": "login"})
    challenge_id = res.json()["challenge_id"]
    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone_a)

    # Try to verify challenge A with phone B
    mismatch_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone_b,
        "purpose": "login",
        "otp": sent_otp
    })
    assert mismatch_res.status_code in (400, 410), f"Phone mismatch should fail: {mismatch_res.status_code}"


def test_purpose_mismatch_rejected():
    """OTP issued for 'register' cannot be used for 'login'."""
    client = make_client()
    phone = "+919876543214"

    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "register"})
    challenge_id = res.json()["challenge_id"]
    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone)

    mismatch_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",   # ← wrong purpose
        "otp": sent_otp
    })
    assert mismatch_res.status_code in (400, 410), f"Purpose mismatch should fail: {mismatch_res.status_code}"


def test_invalid_otp_format_rejected():
    """Short, long, and non-numeric OTPs are rejected with 422."""
    client = make_client()
    phone = "+919876543215"

    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    challenge_id = res.json()["challenge_id"]

    for bad_otp in ["12345", "1234567", "abcdef", "12345a"]:
        r = client.post("/api/v1/auth/verify-otp", json={
            "challenge_id": challenge_id,
            "phone_number": phone,
            "purpose": "login",
            "otp": bad_otp
        })
        assert r.status_code == 422, f"OTP '{bad_otp}' should be rejected with 422, got {r.status_code}"


def test_correct_otp_after_failed_attempts_succeeds():
    """2 wrong OTPs followed by the correct one should still succeed."""
    client = make_client()
    phone = "+919876543216"

    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    challenge_id = res.json()["challenge_id"]
    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone)
    wrong_otp = "000000" if sent_otp != "000000" else "111111"

    # 2 wrong attempts
    for _ in range(2):
        client.post("/api/v1/auth/verify-otp", json={
            "challenge_id": challenge_id,
            "phone_number": phone,
            "purpose": "login",
            "otp": wrong_otp
        })

    # Correct OTP on 3rd attempt should succeed
    good_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id,
        "phone_number": phone,
        "purpose": "login",
        "otp": sent_otp
    })
    assert good_res.status_code == 200, f"Expected success on 3rd attempt, got {good_res.status_code}: {good_res.text}"
    assert "access_token" in good_res.json()


def test_me_requires_auth():
    """/auth/me without token returns 401."""
    client = make_client()
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_logout_clears_session():
    """After logout, the refresh token cookie should be invalidated."""
    client = make_client()
    phone = "+919876543217"

    # Login
    res = client.post("/api/v1/auth/send-otp", json={"phone_number": phone, "purpose": "login"})
    challenge_id = res.json()["challenge_id"]
    sent_otp = MockSMSProvider.get_last_otp_for_phone(phone)
    verify_res = client.post("/api/v1/auth/verify-otp", json={
        "challenge_id": challenge_id, "phone_number": phone, "purpose": "login", "otp": sent_otp
    })
    assert verify_res.status_code == 200
    original_refresh = verify_res.cookies["refresh_token"]
    access_token = verify_res.json()["access_token"]

    # Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200
    assert "logged out" in logout_res.json()["message"].lower()

    # Attempt to use the revoked refresh token
    client.cookies.set("refresh_token", original_refresh, domain="testserver", path="/api/v1/auth")
    refresh_res = client.post("/api/v1/auth/refresh")
    # Should fail — token was revoked during logout
    assert refresh_res.status_code == 401

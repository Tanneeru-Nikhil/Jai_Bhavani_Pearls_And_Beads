import pytest
from app.services.phone_service import PhoneNumberService
from app.services.otp_service import OTPService
from app.services.security_service import SecurityService

def test_phone_number_normalization_valid():
    assert PhoneNumberService.normalize_and_validate("+91 98765 43210") == "+919876543210"
    assert PhoneNumberService.normalize_and_validate("9876543210", default_region="IN") == "+919876543210"
    assert PhoneNumberService.normalize_and_validate("+1 (415) 555-2671") == "+14155552671"

def test_phone_number_invalid():
    with pytest.raises(ValueError):
        PhoneNumberService.normalize_and_validate("12345")
    with pytest.raises(ValueError):
        PhoneNumberService.normalize_and_validate("invalid_alphabet")

def test_otp_generation_format():
    for _ in range(50):
        otp = OTPService.generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()
        val = int(otp)
        assert 0 <= val <= 999999

def test_otp_hmac_and_constant_time_comparison():
    key_version = "v1"
    challenge_id = "test-challenge-123"
    phone = "+919876543210"
    otp = "123456"
    purpose = "login"

    mac = SecurityService.compute_otp_hmac(challenge_id, phone, otp, purpose, key_version)
    assert len(mac) == 64  # SHA-256 hex string

    # Matching MAC
    assert SecurityService.verify_otp_hmac(mac, mac) is True

    # Tampered MAC
    tampered = mac[:-1] + ("0" if mac[-1] != "0" else "1")
    assert SecurityService.verify_otp_hmac(mac, tampered) is False

    # Tampered OTP produces different MAC
    wrong_mac = SecurityService.compute_otp_hmac(challenge_id, phone, "654321", purpose, key_version)
    assert SecurityService.verify_otp_hmac(mac, wrong_mac) is False

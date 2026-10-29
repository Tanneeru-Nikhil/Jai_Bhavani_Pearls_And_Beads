import secrets
import uuid
import time
from typing import Tuple, Dict, Any, Optional
from app.core.config import settings
from app.core.redis import get_redis_client
from app.services.security_service import SecurityService

class OTPService:
    @staticmethod
    def generate_otp() -> str:
        """
        Generates 6-digit cryptographically secure numeric OTP via secrets.randbelow.
        """
        val = secrets.randbelow(1_000_000)
        return f"{val:06d}"

    @classmethod
    def create_challenge(cls, phone_e164: str, purpose: str) -> Tuple[str, str]:
        """
        Generates challenge_id, random 6-digit OTP, stores challenge state in Redis with TTL.
        Returns: (challenge_id, raw_otp)
        """
        r = get_redis_client()
        challenge_id = str(uuid.uuid4())
        otp = cls.generate_otp()
        key_version = settings.OTP_HMAC_CURRENT_KEY_VERSION
        mac = SecurityService.compute_otp_hmac(challenge_id, phone_e164, otp, purpose, key_version)
        phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)

        challenge_key = f"otp:challenge:{challenge_id}"
        cooldown_key = f"otp:phone_cooldown:{phone_digest}"

        mapping = {
            "challenge_id": challenge_id,
            "key_version": key_version,
            "mac": mac,
            "purpose": purpose,
            "phone_digest": phone_digest,
            "attempts": "0",
            "status": "PENDING",
            "created_at": str(int(time.time())),
        }

        # Atomic Redis multi-exec transaction for challenge and cooldown
        pipe = r.pipeline()
        pipe.hset(challenge_key, mapping=mapping)
        pipe.expire(challenge_key, settings.OTP_TTL_SECONDS)
        pipe.set(cooldown_key, challenge_id, ex=settings.OTP_RESEND_COOLDOWN_SECONDS)
        pipe.execute()

        return challenge_id, otp

    @classmethod
    def verify_challenge(cls, challenge_id: str, phone_e164: str, purpose: str, input_otp: str) -> Tuple[bool, str, Optional[int]]:
        """
        Verifies challenge atomically.
        Returns: (is_success, error_code, remaining_attempts)
        error_code: "" if success, or "NOT_FOUND", "INVALID_PURPOSE", "PHONE_MISMATCH", "EXPIRED", "EXHAUSTED", "MISMATCH"
        """
        r = get_redis_client()
        challenge_key = f"otp:challenge:{challenge_id}"

        # Fetch challenge
        data = r.hgetall(challenge_key)
        if not data:
            return False, "NOT_FOUND", None

        status = data.get("status", "")
        if status != "PENDING":
            return False, status, 0

        # Validate purpose and phone binding
        if data.get("purpose") != purpose:
            return False, "INVALID_PURPOSE", None

        expected_phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)
        if data.get("phone_digest") != expected_phone_digest:
            return False, "PHONE_MISMATCH", None

        key_version = data.get("key_version", "v1")
        stored_mac = data.get("mac", "")
        current_attempts = int(data.get("attempts", "0"))

        if current_attempts >= settings.OTP_MAX_ATTEMPTS:
            r.hset(challenge_key, "status", "EXHAUSTED")
            return False, "EXHAUSTED", 0

        # Compute expected HMAC
        calculated_mac = SecurityService.compute_otp_hmac(challenge_id, phone_e164, input_otp, purpose, key_version)
        is_match = SecurityService.verify_otp_hmac(calculated_mac, stored_mac)

        if is_match:
            # Single-use consumption: immediately mark CONSUMED and delete challenge
            r.hset(challenge_key, "status", "CONSUMED")
            r.delete(challenge_key)
            return True, "", 0
        else:
            # Increment attempt count atomically
            new_attempts = r.hincrby(challenge_key, "attempts", 1)
            remaining = max(0, settings.OTP_MAX_ATTEMPTS - new_attempts)
            if new_attempts >= settings.OTP_MAX_ATTEMPTS:
                r.hset(challenge_key, "status", "EXHAUSTED")
                return False, "EXHAUSTED", 0
            return False, "MISMATCH", remaining

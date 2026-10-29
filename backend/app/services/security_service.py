import hmac
import hashlib
from typing import Dict
from app.core.config import settings

class SecurityService:
    @staticmethod
    def get_key_bytes(key_version: str) -> bytes:
        keys: Dict[str, str] = settings.get_hmac_keys_dict()
        key_hex = keys.get(key_version)
        if not key_hex:
            # Fallback to current key if missing
            key_hex = list(keys.values())[0]
        try:
            return bytes.fromhex(key_hex)
        except ValueError:
            return key_hex.encode("utf-8")

    @classmethod
    def compute_otp_hmac(cls, challenge_id: str, phone_e164: str, otp: str, purpose: str, key_version: str = "v1") -> str:
        """
        Computes HMAC-SHA256 bound to (challenge_id, phone_e164, otp, purpose).
        """
        key = cls.get_key_bytes(key_version)
        msg = f"{challenge_id}:{phone_e164}:{otp}:{purpose}".encode("utf-8")
        return hmac.new(key, msg, hashlib.sha256).hexdigest()

    @classmethod
    def verify_otp_hmac(cls, calculated_mac: str, stored_mac: str) -> bool:
        """
        Guarantees constant-time comparison against timing attacks.
        """
        if not calculated_mac or not stored_mac:
            return False
        return hmac.compare_digest(calculated_mac, stored_mac)

    @classmethod
    def compute_pseudonym_digest(cls, value: str) -> str:
        """
        Generates safe pseudonymized hash of sensitive strings (phone, IP) for Redis keys & logs.
        """
        key = cls.get_key_bytes("v1")
        return hmac.new(key, value.encode("utf-8"), hashlib.sha256).hexdigest()[:32]

    @staticmethod
    def hash_refresh_token(token: str) -> str:
        """
        Computes SHA-256 hash of refresh token for PostgreSQL storage.
        """
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

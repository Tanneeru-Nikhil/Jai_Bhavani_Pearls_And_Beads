import logging
from typing import Dict, Any, List
from app.providers.sms.base import BaseSMSProvider

logger = logging.getLogger(__name__)

class MockSMSProvider(BaseSMSProvider):
    """
    Mock SMS provider for local development, integration, and security tests.
    Stores messages in an in-memory buffer without logging sensitive OTP plaintext.
    """
    sent_messages: List[Dict[str, Any]] = []

    def send_otp(self, to_phone_e164: str, otp: str) -> Dict[str, Any]:
        record = {
            "to": to_phone_e164,
            "otp": otp,  # Recorded strictly in memory for test assertions
            "provider": "mock",
            "status": "delivered",
        }
        self.sent_messages.append(record)
        logger.info(f"[MockSMSProvider] Dispatched OTP SMS to {to_phone_e164[:6]}****")
        return {"provider_message_id": f"mock-msg-{len(self.sent_messages)}", "status": "sent"}

    @classmethod
    def get_last_otp_for_phone(cls, phone_e164: str) -> str:
        for msg in reversed(cls.sent_messages):
            if msg["to"] == phone_e164:
                return msg["otp"]
        return ""

    @classmethod
    def clear(cls):
        cls.sent_messages.clear()

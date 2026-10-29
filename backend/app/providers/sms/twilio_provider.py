import httpx
import logging
from typing import Dict, Any
from app.providers.sms.base import BaseSMSProvider, SMSDeliveryError
from app.core.config import settings

logger = logging.getLogger(__name__)

class TwilioSMSProvider(BaseSMSProvider):
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.messaging_service_sid = settings.TWILIO_MESSAGING_SERVICE_SID
        self.from_phone = settings.TWILIO_FROM_PHONE

    def send_otp(self, to_phone_e164: str, otp: str) -> Dict[str, Any]:
        if not self.account_sid or not self.auth_token:
            raise SMSDeliveryError("Twilio credentials not configured", is_retryable=False)

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
        body_text = f"Your Jai Bhavani Pearls verification code is {otp}. Valid for 5 minutes. Do not share this code."

        data = {"To": to_phone_e164, "Body": body_text}
        if self.messaging_service_sid:
            data["MessagingServiceSid"] = self.messaging_service_sid
        elif self.from_phone:
            data["From"] = self.from_phone
        else:
            raise SMSDeliveryError("Neither MessagingServiceSid nor From phone configured for Twilio", is_retryable=False)

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(url, data=data, auth=(self.account_sid, self.auth_token))
                if res.status_code in [200, 201]:
                    res_json = res.json()
                    return {"provider_message_id": res_json.get("sid"), "status": res_json.get("status")}
                
                # Handle error responses
                is_retryable = res.status_code >= 500 or res.status_code == 429
                error_msg = f"Twilio API rejected message with HTTP {res.status_code}"
                logger.error(f"[TwilioSMSProvider] SMS delivery error: {error_msg}")
                raise SMSDeliveryError(error_msg, is_retryable=is_retryable, provider_code=str(res.status_code))
        except httpx.RequestError as exc:
            logger.error(f"[TwilioSMSProvider] Network timeout or connection error: {exc}")
            raise SMSDeliveryError("SMS gateway connection error", is_retryable=True)

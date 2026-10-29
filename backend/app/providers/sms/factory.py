from typing import Optional
from app.core.config import settings
from app.providers.sms.base import BaseSMSProvider
from app.providers.sms.mock_provider import MockSMSProvider
from app.providers.sms.twilio_provider import TwilioSMSProvider

_provider_instance: Optional[BaseSMSProvider] = None

def get_sms_provider() -> BaseSMSProvider:
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    if settings.SMS_PROVIDER.lower() == "twilio":
        _provider_instance = TwilioSMSProvider()
    else:
        _provider_instance = MockSMSProvider()

    return _provider_instance

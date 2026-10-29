from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class SMSDeliveryError(Exception):
    def __init__(self, message: str, is_retryable: bool = False, provider_code: Optional[str] = None):
        super().__init__(message)
        self.is_retryable = is_retryable
        self.provider_code = provider_code

class BaseSMSProvider(ABC):
    @abstractmethod
    def send_otp(self, to_phone_e164: str, otp: str) -> Dict[str, Any]:
        """
        Sends OTP SMS. Must return delivery metadata dict or raise SMSDeliveryError.
        """
        pass

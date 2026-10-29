import os
import json
from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Dict, Optional, List

class Settings(BaseSettings):
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = Field(
        default="sqlite:///./app.db",
        description="SQLAlchemy database connection string"
    )

    # Redis
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    USE_FAKEREDIS_IN_DEV: bool = True

    # Security & Cryptography
    OTP_HMAC_KEYS: str = Field(
        default='{"v1":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}',
        description="JSON string mapping key version to hex HMAC secret"
    )
    OTP_HMAC_CURRENT_KEY_VERSION: str = "v1"
    
    JWT_SECRET: str = "super_secret_jwt_signing_key_at_least_32_characters_long_123456789"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_TTL_SECONDS: int = 900  # 15 minutes
    REFRESH_TOKEN_TTL_SECONDS: int = 1209600  # 14 days

    # OTP Challenge Policies
    OTP_TTL_SECONDS: int = 300  # 5 minutes
    OTP_RESEND_COOLDOWN_SECONDS: int = 60  # 60s cooldown
    OTP_MAX_ATTEMPTS: int = 3

    # Rate Limiting
    RATE_LIMIT_PHONE_MAX: int = 3
    RATE_LIMIT_PHONE_WINDOW_SECONDS: int = 900  # 3 per 15 min
    RATE_LIMIT_IP_MAX: int = 10
    RATE_LIMIT_IP_WINDOW_SECONDS: int = 900  # 10 per 15 min
    RATE_LIMIT_DAILY_PHONE_MAX: int = 10

    # SMS Gateway Provider
    SMS_PROVIDER: str = "mock"
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_MESSAGING_SERVICE_SID: Optional[str] = None
    TWILIO_FROM_PHONE: Optional[str] = None

    # CORS & Reverse Proxy
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    TRUSTED_PROXY_IPS: str = "127.0.0.1,::1"

    def get_hmac_keys_dict(self) -> Dict[str, str]:
        try:
            return json.loads(self.OTP_HMAC_KEYS)
        except Exception:
            return {"v1": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"}

    def get_trusted_proxies(self) -> List[str]:
        return [ip.strip() for ip in self.TRUSTED_PROXY_IPS.split(",") if ip.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

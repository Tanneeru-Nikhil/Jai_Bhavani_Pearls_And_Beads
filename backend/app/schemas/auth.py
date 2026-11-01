from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime

class SendOtpRequest(BaseModel):
    phone_number: str = Field(..., description="E.164 phone number, e.g. +919876543210")
    purpose: str = Field(default="login", description="Purpose: login, register, or verify_phone")

    @field_validator("purpose")
    def validate_purpose(cls, v: str) -> str:
        valid_purposes = {"login", "register", "verify_phone"}
        if v not in valid_purposes:
            raise ValueError(f"purpose must be one of {valid_purposes}")
        return v

class SendOtpResponse(BaseModel):
    challenge_id: str
    expires_in: int
    resend_after: int
    message: str

class VerifyOtpRequest(BaseModel):
    challenge_id: str = Field(..., description="Opaque challenge identifier returned by /send-otp")
    phone_number: str = Field(..., description="E.164 phone number")
    purpose: str = Field(default="login")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit numeric OTP")

    @field_validator("otp")
    def validate_otp_numeric(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("OTP must be exactly 6 digits")
        return v

class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: str
    phone_e164: str
    account_status: str
    role: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_verified_at: Optional[datetime] = None

class VerifyOtpResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: Optional[str] = None

class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int

class MessageResponse(BaseModel):
    message: str

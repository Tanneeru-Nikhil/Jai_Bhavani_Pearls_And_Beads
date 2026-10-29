import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.schemas.auth import (
    SendOtpRequest,
    SendOtpResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    UserResponse,
    MessageResponse,
)
from app.services.phone_service import PhoneNumberService
from app.services.otp_service import OTPService
from app.services.rate_limit_service import RateLimitService
from app.services.security_service import SecurityService
from app.services.session_service import SessionService
from app.providers.sms.factory import get_sms_provider
from app.providers.sms.base import SMSDeliveryError
from app.middleware.ip_resolver import get_client_ip
from app.models.auth import User, OtpAuditEvent, SecurityEvent
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/send-otp",
    response_model=SendOtpResponse,
    responses={
        400: {"description": "Invalid phone number or purpose"},
        429: {"description": "Rate limit exceeded or cooldown active"},
        503: {"description": "SMS gateway failure or Redis unavailable"},
    }
)
def send_otp(req: SendOtpRequest, request: Request, db: Session = Depends(get_db)):
    # 1. Normalize and validate phone number
    try:
        phone_e164 = PhoneNumberService.normalize_and_validate(req.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    client_ip = get_client_ip(request)

    # 2. Check resend cooldown
    allowed_cooldown, remaining_cd = RateLimitService.check_resend_cooldown(phone_e164)
    if not allowed_cooldown:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Please wait {remaining_cd} seconds before requesting another verification code.",
            headers={"Retry-After": str(remaining_cd)}
        )

    # 3. Check Phone Rate Limit (sliding window: e.g. 3 per 15m)
    allowed_phone_rate, phone_retry = RateLimitService.check_phone_rate_limit(phone_e164)
    if not allowed_phone_rate:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification attempts for this phone number. Please try again later.",
            headers={"Retry-After": str(phone_retry)}
        )

    # 4. Check IP Rate Limit (sliding window: e.g. 10 per 15m)
    allowed_ip_rate, ip_retry = RateLimitService.check_ip_rate_limit(client_ip)
    if not allowed_ip_rate:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many verification requests from your IP address. Please try again later.",
            headers={"Retry-After": str(ip_retry)}
        )

    # 5. Check Daily Phone Limit
    allowed_daily, daily_retry = RateLimitService.check_daily_phone_limit(phone_e164)
    if not allowed_daily:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily verification limit exceeded for this phone number.",
            headers={"Retry-After": str(daily_retry)}
        )

    # 6. Generate challenge and cryptographic OTP
    try:
        challenge_id, raw_otp = OTPService.create_challenge(phone_e164, req.purpose)
    except Exception as e:
        logger.error(f"Failed to create OTP challenge in Redis: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable. Please try again shortly."
        )

    # 7. Dispatch SMS
    sms_provider = get_sms_provider()
    try:
        sms_provider.send_otp(phone_e164, raw_otp)
    except SMSDeliveryError as e:
        logger.error(f"SMS gateway delivery failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send verification SMS at this time. Please retry shortly."
        )

    # 8. Record audit log
    phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)
    audit = OtpAuditEvent(
        challenge_id=challenge_id,
        phone_digest=phone_digest,
        operation=req.purpose,
        outcome="ISSUED"
    )
    db.add(audit)
    db.commit()

    return SendOtpResponse(
        challenge_id=challenge_id,
        expires_in=settings.OTP_TTL_SECONDS,
        resend_after=settings.OTP_RESEND_COOLDOWN_SECONDS,
        message="If eligible, a verification code has been requested."
    )

@router.post(
    "/verify-otp",
    response_model=VerifyOtpResponse,
    responses={
        400: {"description": "Invalid OTP code or phone mismatch"},
        410: {"description": "Challenge expired or maximum attempts exhausted"},
    }
)
def verify_otp(
    req: VerifyOtpRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    try:
        phone_e164 = PhoneNumberService.normalize_and_validate(req.phone_number)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    # Atomic challenge verification
    is_valid, err_code, remaining = OTPService.verify_challenge(
        challenge_id=req.challenge_id,
        phone_e164=phone_e164,
        purpose=req.purpose,
        input_otp=req.otp
    )

    phone_digest = SecurityService.compute_pseudonym_digest(phone_e164)

    if not is_valid:
        if err_code == "EXHAUSTED":
            # Record audit
            db.add(OtpAuditEvent(challenge_id=req.challenge_id, phone_digest=phone_digest, operation=req.purpose, outcome="EXHAUSTED"))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Maximum verification attempts exceeded. Please request a new code."
            )
        elif err_code in ["NOT_FOUND", "EXPIRED"]:
            db.add(OtpAuditEvent(challenge_id=req.challenge_id, phone_digest=phone_digest, operation=req.purpose, outcome="EXPIRED"))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Verification code has expired or is invalid. Please request a new one."
            )
        else:
            db.add(OtpAuditEvent(challenge_id=req.challenge_id, phone_digest=phone_digest, operation=req.purpose, outcome="FAILED_ATTEMPT", attempt_count=str(remaining)))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
            )

    # SUCCESS: User resolution or creation
    user = db.query(User).filter(User.phone_e164 == phone_e164).first()
    now = datetime.now(timezone.utc)

    if not user:
        user = User(
            phone_e164=phone_e164,
            account_status="active",
            role="customer",
            phone_verified_at=now,
            last_authenticated_at=now,
        )
        db.add(user)
        db.flush()
    else:
        if user.account_status != "active":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled or suspended")
        user.phone_verified_at = now
        user.last_authenticated_at = now

    # Create Session & Tokens
    access_token, raw_refresh_token = SessionService.create_session(
        db=db,
        user=user,
        user_agent=user_agent,
        ip_address=client_ip
    )

    # Set secure HttpOnly cookie for refresh token
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh_token,
        httponly=True,
        secure=False if settings.APP_ENV == "development" else True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_TTL_SECONDS,
        path="/api/v1/auth"
    )

    # Also set access_token cookie for web clients
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False if settings.APP_ENV == "development" else True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_TTL_SECONDS,
        path="/"
    )

    # Record verified audit event
    db.add(OtpAuditEvent(challenge_id=req.challenge_id, phone_digest=phone_digest, operation=req.purpose, outcome="VERIFIED"))
    db.commit()

    return VerifyOtpResponse(
        access_token=access_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_TTL_SECONDS,
        user=UserResponse.model_validate(user)
    )

@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token(
    req: RefreshTokenRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    token = req.refresh_token or request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent")

    try:
        new_access_token, new_refresh_token = SessionService.rotate_refresh_token(
            db=db,
            raw_refresh_token=token,
            user_agent=user_agent,
            ip_address=client_ip
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

    # Set rotated cookie
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False if settings.APP_ENV == "development" else True,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_TTL_SECONDS,
        path="/api/v1/auth"
    )
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=False if settings.APP_ENV == "development" else True,
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_TTL_SECONDS,
        path="/"
    )

    return RefreshTokenResponse(
        access_token=new_access_token,
        token_type="Bearer",
        expires_in=settings.ACCESS_TOKEN_TTL_SECONDS
    )

@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    token = request.cookies.get("refresh_token")
    if token:
        SessionService.revoke_session(db, token, reason="logout")

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    response.delete_cookie(key="access_token", path="/")
    return MessageResponse(message="Successfully logged out")

@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    SessionService.revoke_all_user_sessions(db, current_user.id, reason="logout_all")
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    response.delete_cookie(key="access_token", path="/")
    return MessageResponse(message="All sessions successfully terminated")

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

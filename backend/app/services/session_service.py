import secrets
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from typing import Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.auth import User, AuthSession, SecurityEvent
from app.services.security_service import SecurityService

class SessionService:
    @staticmethod
    def create_access_token(user_id: str, role: str) -> str:
        """
        Creates signed short-lived JWT access token with JTI.
        """
        now = datetime.now(timezone.utc)
        payload = {
            "sub": user_id,
            "role": role,
            "jti": str(uuid.uuid4()),
            "iat": now,
            "exp": now + timedelta(seconds=settings.ACCESS_TOKEN_TTL_SECONDS),
            "iss": "jai-bhavani-auth",
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    @staticmethod
    def verify_access_token(token: str) -> Dict[str, Any]:
        """
        Verifies JWT access token claims. Throws jwt.PyJWTError on failure.
        """
        return jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            issuer="jai-bhavani-auth",
            options={"require": ["exp", "sub", "jti", "role"]}
        )

    @staticmethod
    def create_session(
        db: Session,
        user: User,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Creates new session family, returns: (access_token, opaque_refresh_token).
        """
        access_token = SessionService.create_access_token(user.id, user.role)
        raw_refresh_token = secrets.token_urlsafe(48)
        refresh_token_hash = SecurityService.hash_refresh_token(raw_refresh_token)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=settings.REFRESH_TOKEN_TTL_SECONDS)
        family_id = str(uuid.uuid4())

        session = AuthSession(
            user_id=user.id,
            token_family_id=family_id,
            refresh_token_hash=refresh_token_hash,
            user_agent=user_agent[:512] if user_agent else None,
            ip_address=ip_address[:64] if ip_address else None,
            created_at=now,
            expires_at=expires_at,
            last_used_at=now,
        )
        db.add(session)
        user.last_authenticated_at = now
        db.commit()

        return access_token, raw_refresh_token

    @staticmethod
    def rotate_refresh_token(
        db: Session,
        raw_refresh_token: str,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Rotates refresh token. Detects token reuse.
        If a revoked token is presented, invalidates entire token family immediately.
        Returns: (new_access_token, new_raw_refresh_token)
        """
        token_hash = SecurityService.hash_refresh_token(raw_refresh_token)
        session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()

        now = datetime.now(timezone.utc)
        if not session:
            raise ValueError("Invalid refresh token")

        # REUSE DETECTION: Check if already revoked
        if session.revoked_at is not None:
            # Revoke entire token family to protect user against token theft
            db.query(AuthSession).filter(
                AuthSession.token_family_id == session.token_family_id,
                AuthSession.revoked_at.is_(None)
            ).update({
                AuthSession.revoked_at: now,
                AuthSession.revocation_reason: "token_reuse_detected"
            })
            # Log security event
            sec_event = SecurityEvent(
                user_id=session.user_id,
                event_type="token_reuse_detected",
                ip_address_hash=SecurityService.compute_pseudonym_digest(ip_address or ""),
                details=f"Token reuse in family {session.token_family_id}"
            )
            db.add(sec_event)
            db.commit()
            raise ValueError("Token reuse detected. All active sessions in this family have been revoked.")

        # Check expiration
        # Ensure session.expires_at is timezone-aware for comparison
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at < now:
            session.revoked_at = now
            session.revocation_reason = "expired"
            db.commit()
            raise ValueError("Refresh token expired")

        # Invalidate current token via rotation
        session.revoked_at = now
        session.revocation_reason = "rotated"
        session.last_used_at = now

        # Issue successor token in the same family
        new_raw_refresh_token = secrets.token_urlsafe(48)
        new_refresh_hash = SecurityService.hash_refresh_token(new_raw_refresh_token)
        new_expires_at = now + timedelta(seconds=settings.REFRESH_TOKEN_TTL_SECONDS)

        new_session = AuthSession(
            user_id=session.user_id,
            token_family_id=session.token_family_id,
            refresh_token_hash=new_refresh_hash,
            user_agent=user_agent[:512] if user_agent else session.user_agent,
            ip_address=ip_address[:64] if ip_address else session.ip_address,
            created_at=now,
            expires_at=new_expires_at,
            last_used_at=now,
        )
        db.add(new_session)

        # Retrieve user to mint new access token
        user = db.query(User).filter(User.id == session.user_id).first()
        if not user or user.account_status != "active":
            db.rollback()
            raise ValueError("User account is not active")

        new_access_token = SessionService.create_access_token(user.id, user.role)
        db.commit()

        return new_access_token, new_raw_refresh_token

    @staticmethod
    def revoke_session(db: Session, raw_refresh_token: str, reason: str = "logout"):
        token_hash = SecurityService.hash_refresh_token(raw_refresh_token)
        session = db.query(AuthSession).filter(AuthSession.refresh_token_hash == token_hash).first()
        if session and session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            session.revocation_reason = reason
            db.commit()

    @staticmethod
    def revoke_all_user_sessions(db: Session, user_id: str, reason: str = "logout_all"):
        now = datetime.now(timezone.utc)
        db.query(AuthSession).filter(
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None)
        ).update({
            AuthSession.revoked_at: now,
            AuthSession.revocation_reason: reason
        })
        db.commit()

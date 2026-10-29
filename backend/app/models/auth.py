import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Index,
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_e164 = Column(String(32), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=True)
    first_name = Column(String(100), nullable=True, default="Valued")
    last_name = Column(String(100), nullable=True, default="Customer")
    role = Column(String(32), nullable=False, default="customer")
    account_status = Column(String(32), nullable=False, default="active")  # pending, active, suspended, disabled
    phone_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_authenticated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")

class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_family_id = Column(String(36), nullable=False, index=True)
    refresh_token_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256 hex digest
    user_agent = Column(String(512), nullable=True)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    last_used_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)
    revocation_reason = Column(String(128), nullable=True)  # e.g., "logout", "rotation", "reuse_detected", "logout_all"

    user = relationship("User", back_populates="sessions")

    __table_args__ = (
        Index("ix_session_family_revoked", "token_family_id", "revoked_at"),
    )

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True, index=True)
    event_type = Column(String(64), nullable=False, index=True)  # e.g., "otp_sent", "otp_verified", "otp_failed", "token_reused"
    phone_digest = Column(String(64), nullable=True, index=True)  # Pseudonymous keyed hash
    ip_address_hash = Column(String(64), nullable=True)
    details = Column(Text, nullable=True)  # JSON-encoded sanitized metadata
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

class OtpAuditEvent(Base):
    __tablename__ = "otp_audit_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    challenge_id = Column(String(64), nullable=False, index=True)
    phone_digest = Column(String(64), nullable=False, index=True)
    operation = Column(String(32), nullable=False)  # "login", "register", "verify_phone"
    outcome = Column(String(32), nullable=False)  # "ISSUED", "VERIFIED", "EXPIRED", "EXHAUSTED", "REJECTED"
    attempt_count = Column(String(8), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

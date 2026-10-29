"""Initial migration for auth tables

Revision ID: 001_auth_tables
Revises: 
Create Date: 2026-10-29 14:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '001_auth_tables'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('phone_e164', sa.String(length=32), nullable=False, unique=True),
        sa.Column('email', sa.String(length=255), nullable=True, unique=True),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=False, server_default='customer'),
        sa.Column('account_status', sa.String(length=32), nullable=False, server_default='active'),
        sa.Column('phone_verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_authenticated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_phone_e164', 'users', ['phone_e164'])

    # Auth Sessions
    op.create_table(
        'auth_sessions',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_family_id', sa.String(length=36), nullable=False),
        sa.Column('refresh_token_hash', sa.String(length=64), nullable=False, unique=True),
        sa.Column('user_agent', sa.String(length=512), nullable=True),
        sa.Column('ip_address', sa.String(length=64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revocation_reason', sa.String(length=128), nullable=True),
    )
    op.create_index('ix_auth_sessions_user_id', 'auth_sessions', ['user_id'])
    op.create_index('ix_auth_sessions_family_id', 'auth_sessions', ['token_family_id'])

    # Otp Audit Events
    op.create_table(
        'otp_audit_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('challenge_id', sa.String(length=64), nullable=False),
        sa.Column('phone_digest', sa.String(length=64), nullable=False),
        sa.Column('operation', sa.String(length=32), nullable=False),
        sa.Column('outcome', sa.String(length=32), nullable=False),
        sa.Column('attempt_count', sa.String(length=8), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

    # Security Events
    op.create_table(
        'security_events',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), nullable=True),
        sa.Column('event_type', sa.String(length=64), nullable=False),
        sa.Column('phone_digest', sa.String(length=64), nullable=True),
        sa.Column('ip_address_hash', sa.String(length=64), nullable=True),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('security_events')
    op.drop_table('otp_audit_events')
    op.drop_table('auth_sessions')
    op.drop_table('users')

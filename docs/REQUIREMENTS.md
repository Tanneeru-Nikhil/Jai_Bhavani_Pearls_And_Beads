# Product Requirements Document (PRD)
## Secure Mobile Phone OTP Authentication System

### 1. Executive Summary
The goal of this project is to implement an enterprise-grade, production-hardened Mobile Phone One-Time Password (OTP) authentication system. The system serves as the primary authentication and identity mechanism for customers and administrators, with high resilience against automated abuse, brute force, toll fraud, replay attacks, and credential stuffing.

### 2. Functional Requirements
- **Phone Number Registration & Login:**
  - Phone numbers are validated and normalized to canonical international E.164 format using Google `phonenumbers`.
  - Seamless auto-registration for valid phone numbers or verification of existing accounts.
- **OTP Generation & Dispatch:**
  - 6-digit numeric OTP generated using Python `secrets.randbelow`.
  - Configurable expiration (default: 300 seconds / 5 minutes).
  - Resend cooldown (default: 60 seconds) strictly enforced per phone.
  - Multi-channel delivery via SMS Gateway Abstraction (Twilio adapter first, with mock/sandbox support).
  - OTP never returned in response payload or logged.
- **OTP Verification & Single-Use:**
  - Atomic verification in Redis preventing race conditions and replay attacks.
  - Maximum 3 failed verification attempts before the challenge is immediately and permanently invalidated.
  - Zero-knowledge storage: Plaintext OTP is never stored in DB or Redis; challenge stores HMAC-SHA256 digest keyed with a high-entropy server secret.
  - Single-use consumption: Verification immediately consumes/deletes the challenge.
- **Session & Token Lifecycle Management:**
  - Issuance of short-lived Access Tokens (JWT, 15m) and cryptographically random opaque Refresh Tokens (14 days).
  - Session stored in PostgreSQL `auth_sessions` with SHA-256 hashed refresh tokens.
  - Automatic refresh token rotation upon each refresh request.
  - Refresh token reuse detection: If an expired or already-used refresh token is presented, the entire token family is revoked immediately.
  - Global logout (`/auth/logout-all`) and single-session logout (`/auth/logout`).
  - Protected API routes requiring Bearer authorization or secure HttpOnly cookies.
- **Rate Limiting & Fraud Prevention:**
  - Per-phone sliding window rate limit: max 3 requests per 15 minutes, 10 per day.
  - Per-IP rate limit: max 10 requests per 15 minutes.
  - Global velocity rate limit.
  - Cooldown timers with exponential backoff on repeated failures.
  - HTTP 429 Too Many Requests responses with RFC-compliant `Retry-After` headers.

### 3. Non-Functional Requirements
- **Security:** Zero plaintext OTP storage; constant-time comparison (`hmac.compare_digest`); secure CORS policy with explicit origins; no wildcard credentialed CORS; proxy header trust only from configured trusted CIDRs.
- **Performance & Latency:** Redis p99 response < 5ms for challenge verification and rate limit checks.
- **Availability & Fail-Closed:** System fails securely if Redis or DB is unreachable (no bypass permitted).
- **Privacy & Auditability:** Structured JSON audit logging with phone number masking/hashing and IP anonymization. Strict data minimization.

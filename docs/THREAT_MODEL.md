# Threat Model
## Secure Mobile Phone OTP Authentication System

### 1. Asset Identification & Trust Boundaries
- **Assets:**
  - Phone numbers (PII)
  - User accounts and authorizations (Admin vs. Customer)
  - Authentication tokens (JWT access tokens, opaque refresh tokens)
  - Active session state & token families
  - SMS budget and gateway credentials
  - HMAC server secrets
- **Trust Boundaries:**
  - Client (Browser/Mobile App) <-> Reverse Proxy / API Gateway (HTTPS, TLS Termination)
  - Reverse Proxy <-> FastAPI Application Server
  - FastAPI Server <-> Redis (Private Network, Authenticated)
  - FastAPI Server <-> PostgreSQL (Private Network, Authenticated, Encrypted)
  - FastAPI Server <-> External SMS Provider (HTTPS Outbound, Signature-Verified Webhooks)

---

### 2. Threat Analysis (STRIDE Model)

| Threat Category | Attack Vector / Scenario | Likelihood | Impact | Severity | Mitigation Strategy | Residual Risk & Monitoring |
|---|---|---|---|---|---|---|
| **Brute Force** | Exhausting 6-digit numeric space (1,000,000 possibilities) against an active challenge | High | Critical | **CRITICAL** | Max 3 attempts enforced atomically via Redis Lua/atomic operations. Challenge invalidated permanently upon 3rd failure. Sliding window rate limit per phone and per IP. | Low. Monitored via `auth_otp_failed_attempts_total` and alerts on rapid failures. |
| **Replay & Race Conditions** | Attacker intercepts valid OTP or fires concurrent verify requests using the same OTP | High | Critical | **CRITICAL** | Challenge immediately deleted/marked consumed upon successful verification. Atomic Lua script ensures only first verification succeeds. Constant-time HMAC comparison. | Negligible with atomic Redis operations. |
| **SMS Toll Fraud & Flooding** | Attacker repeatedly requests OTPs to premium rate numbers or loops requests to drain SMS budget | High | High | **HIGH** | Strict rate limiting: 60s cooldown per phone, 3 requests / 15 mins per phone, 10 requests / 15 mins per IP, 10 / day per phone. Global SMS rate limiter. Restricted country code allowlist. | Low. Gateway spending caps set at provider level (Twilio budget alert). |
| **Phone Number Enumeration** | Probing endpoint to identify registered user phone numbers | Medium | Medium | **MEDIUM** | Uniform response on `/auth/send-otp` ("If eligible, a verification code has been requested"). Constant response timings regardless of user existence. | Low. Timing difference minimized. |
| **Session Theft & XSS** | Theft of tokens from localStorage | High | Critical | **CRITICAL** | Refresh tokens never stored in localStorage; stored in Secure, HttpOnly, SameSite=Lax cookies (or transmitted via secure memory). Access tokens short-lived (15 min). Content Security Policy (CSP). | Addressed by cookie isolation. |
| **Refresh Token Replay & Forgery** | Stolen refresh token used to generate new access tokens | Medium | Critical | **CRITICAL** | Token Family tracking with immediate automatic revocation of all descendant sessions upon reuse detection. Refresh tokens stored only as SHA-256 hashes in DB. | Negligible after automatic family invalidation. |
| **CSRF Attacks** | Cross-site request forgery against cookie-based auth endpoints | Medium | High | **HIGH** | SameSite=Lax/Strict cookies + explicit CORS origin whitelist (no wildcard `*` with credentials). Custom header checks (`X-Requested-With` or CSRF token). | Negligible. |
| **Redis / DB Compromise** | Reading stored OTPs directly from Redis or database dump | Low | Critical | **CRITICAL** | Zero plaintext OTP storage. Stored challenge contains only HMAC-SHA256(challenge_id + normalized_phone + OTP, server_secret). Offline dictionary attack against Redis dump is infeasible without server secret. | Server secret stored in environment variables, rotated with key versioning (`v1`, `v2`). |
| **SMS Provider Outage** | External provider (Twilio) downtime blocking logins | Medium | High | **HIGH** | Provider abstraction with fallback capability, circuit breaker, health check, and structured error classification (retryable vs fatal). | Handled by provider failover architecture and operational alarms. |
| **Header Spoofing** | Attacker forging `X-Forwarded-For` to bypass IP rate limits | Medium | High | **HIGH** | FastAPI client IP resolver inspects `X-Forwarded-For` only from verified trusted proxy CIDRs (e.g., Cloudflare, reverse proxy container). | Proper proxy configuration in Nginx/Docker. |
| **Denial of Service (DoS)** | Overwhelming `/auth/send-otp` or `/auth/verify-otp` with high volume | High | High | **HIGH** | Distributed Redis rate limiting with early rejection before DB or provider queries. Resource bounds and connection pools. | Edge mitigation (Cloudflare/Nginx) combined with internal rate limiting. |

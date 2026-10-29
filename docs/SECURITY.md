# Security Architecture & Operations Guide
## Mobile Phone OTP Authentication

### 1. Data Minimization & Privacy
- **Audit Logs:** Never record raw phone numbers. Use HMAC-SHA256 of phone number with a salt for logging (`phone_digest = hmac_sha256(phone, log_salt)[:16]`).
- **IP Masking:** Hash client IP or truncate last octet for logging (`192.168.1.xxx` / `2001:db8::xxx`).
- **Zero Sensitive Data:** OTPs, plain passwords, plain refresh tokens, and SMS body text are strictly forbidden in stdout, log aggregators, or telemetry.

### 2. Secrets Management & Rotation
- `OTP_HMAC_KEYS`: JSON mapping of key versions to 256-bit hex keys, e.g. `{"v1": "9a3f...", "v2": "4e1b..."}`.
- Application supports dual verification during rotation: Verifies challenge against key version recorded in the challenge metadata.
- Signing always uses `OTP_HMAC_CURRENT_KEY_VERSION`.

### 3. Fail-Closed Principles
- If Redis is unreachable during `/send-otp` or `/verify-otp`, request fails immediately with HTTP 503 (`Service Unavailable`). No fallback to insecure memory or bypassed checks is permitted in production.
- If PostgreSQL is unreachable during session issuance, challenge consumption rolls back and fails with HTTP 503.

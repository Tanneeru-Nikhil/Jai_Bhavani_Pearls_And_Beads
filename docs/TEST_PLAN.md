# Verification & Test Plan
## Mobile Phone OTP Authentication

### 1. Test Levels

#### Unit Tests (`backend/tests/unit/`)
- `test_phone_service.py`: Valid E.164 parsing, invalid country formats, invalid numbering plan, rejection of alphanumeric input.
- `test_otp_service.py`: Secure 6-digit numeric generation (`secrets`), uniform length distribution, formatting.
- `test_crypto_service.py`: HMAC generation, constant-time `compare_digest` verification, key versioning.
- `test_rate_limiter.py`: Sliding window counters, cooldown expiration, burst limits, key generation.
- `test_session_service.py`: JWT token signing, claims verification (`exp`, `sub`, `jti`), refresh token hashing, reuse detection logic.

#### Integration Tests (`backend/tests/integration/`)
- `test_auth_api.py`: Full flow `/send-otp` -> `/verify-otp` -> `/me` -> `/refresh` -> `/logout`.
- `test_challenge_lifecycle.py`: Expired challenge rejection, attempt counter decrement, exhaustion at 3 attempts, single-use invalidation.
- `test_fail_closed.py`: Mocking Redis failure -> assert HTTP 503 without leaking state.

#### Concurrency & Security Tests (`backend/tests/concurrency/`)
- `test_concurrent_verify.py`: 10 simultaneous HTTP requests verifying the same challenge with the correct OTP -> exactly 1 succeeds, 9 fail (atomic single-use).
- `test_concurrent_exhaustion.py`: 5 simultaneous incorrect OTP attempts -> exactly 3 attempts registered, challenge transitioned to `EXHAUSTED`.
- `test_refresh_token_reuse.py`: Replaying a revoked refresh token -> asserts entire token family is revoked and session cannot be refreshed.

#### Frontend Tests (`frontend/src/__tests__/`)
- `PhoneNumberForm.test.tsx`: E.164 validation, country code selection, submission trigger.
- `OTPDigitInput.test.tsx`: Keyboard arrow navigation, backspace handling, 6-digit paste handling.
- `ResendCountdown.test.tsx`: Countdown timer ticks down, disables resend button until 0s.

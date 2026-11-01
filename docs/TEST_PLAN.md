# Test Plan (TEST_PLAN.md)
## Jai Bhavani Pearls & Beads — Secure OTP Authentication System

> **Version:** 1.0 | **Date:** 2026-10-30

---

## 1. Testing Philosophy

| Principle | Implementation |
|-----------|---------------|
| **Isolated test environments** | SQLite + fakeredis for all unit/integration tests; no production dependencies |
| **No real OTPs in tests** | MockSMSProvider captures OTP in memory; tests call `get_last_otp_for_phone()` |
| **No production secrets in tests** | Hardcoded test-only secrets in fixtures; never use `.env` production values |
| **Test the security protocol** | Explicit tests for replay protection, race conditions, token reuse, and rate limits |
| **Fast by default** | Unit tests < 100ms each; integration tests < 2s each; E2E tests < 30s each |
| **Coverage targets** | Backend: > 90% line coverage; Frontend: > 80% component coverage |

---

## 2. Test Categories

### 2.1 Unit Tests (`backend/tests/unit/`)

#### test_core_services.py — Cryptography and Phone Service

| Test | Description | Acceptance Criteria |
|------|-------------|---------------------|
| `test_phone_normalization_valid` | E.164 normalization of various formats | `+919876543210` from `9876543210`, `+91 98765 43210`, `+1 (415) 555-2671` → correct E.164 |
| `test_phone_invalid_rejects` | Invalid numbers raise ValueError | Short numbers, alphabetic input raise `ValueError` |
| `test_otp_generation_format` | OTP is always 6 digits | Run 50 iterations: all are 6-char digit strings in `[0, 999999]` |
| `test_hmac_computation` | HMAC-SHA256 is consistent and 64 chars | Same inputs produce same 64-char hex string |
| `test_hmac_constant_time_comparison` | `verify_otp_hmac` returns True for matching, False for tampered | Tampered last byte fails; different OTP fails |
| `test_hmac_input_binding` | Different challenge_id or purpose yields different HMAC | Changing any input component changes the HMAC output |
| `test_key_version_rotation` | Different key versions produce different HMACs | HMAC(v1, ...) != HMAC(v2, ...) for same message |
| `test_refresh_token_hash` | SHA-256 hash is consistent and 64 chars | `hash_refresh_token(token)` is deterministic and 64-char hex |
| `test_pseudonym_digest` | Pseudonym is deterministic and 32 chars | Same phone always produces same 32-char digest |

#### test_rate_limiting.py — Rate Limit Service

| Test | Description | Acceptance Criteria |
|------|-------------|---------------------|
| `test_cooldown_blocks_resend` | Cooldown key present → blocked | Second call within 60s returns `(False, remaining)` |
| `test_cooldown_expires` | After TTL, resend is allowed | After artificial TTL expiry (fakeredis), returns `(True, 0)` |
| `test_phone_rate_limit_sliding_window` | 3 requests in 15min → 4th blocked | 4th call returns `(False, retry_after > 0)` |
| `test_ip_rate_limit_sliding_window` | 10 requests in 15min → 11th blocked | 11th call returns `(False, retry_after > 0)` |
| `test_daily_phone_limit` | 10 OTPs per day → 11th blocked | 11th call returns `(False, retry_after > 0)` |
| `test_different_phones_independent` | Rate limits are per-phone | Phone A hitting limit does not block Phone B |
| `test_different_ips_independent` | Rate limits are per-IP | IP A hitting limit does not block IP B |

---

### 2.2 Integration Tests (`backend/tests/integration/`)

#### test_auth_api.py — Full Auth Flow

| Test | Description | Acceptance Criteria |
|------|-------------|---------------------|
| `test_full_auth_flow_and_session_lifecycle` | Complete happy path | Send OTP → verify → get token → access /me → refresh → old token rejected → new token works → family reuse detected |
| `test_otp_single_use_consumption` | Same challenge cannot be verified twice | Second verify with same challenge_id returns 410 Gone |
| `test_max_attempts_exhaustion` | Max 3 attempts per challenge | After 3 wrong attempts, 4th returns 410 Gone |
| `test_correct_otp_after_failed_attempt` | Correct OTP accepted even after failures | 2 wrong + 1 correct = success |
| `test_expired_challenge_returns_410` | Expired challenge returns 410 | After fakeredis TTL expiry → 410 |
| `test_phone_normalization_in_flow` | Unnormalized phone accepted | `+91 98765 43210` works same as `+919876543210` |
| `test_phone_mismatch_rejected` | Wrong phone on verify → error | Send to A, verify with B → error |
| `test_purpose_mismatch_rejected` | Wrong purpose on verify → error | Send `login`, verify with `register` → error |
| `test_invalid_otp_format_rejected` | Non-6-digit OTP → 422 | `"12345"`, `"1234567"`, `"abcdef"` → 422 Unprocessable |
| `test_send_otp_generic_response` | Generic response prevents enumeration | Response message is identical for existing and new users |
| `test_refresh_token_rotation` | Each refresh produces new token | Old refresh token rejected after rotation |
| `test_token_family_reuse_detection` | Reused refresh token revokes family | Presenting old token after rotation → 401; new token also → 401 |
| `test_logout_revokes_session` | Logout invalidates refresh token | After logout, refresh attempt → 401 |
| `test_logout_all_revokes_all_sessions` | logout-all revokes all families | Two sessions both invalidated |
| `test_me_requires_auth` | `/auth/me` requires valid token | Without token → 401 |
| `test_me_returns_correct_user` | `/auth/me` returns authenticated user | Phone matches `+919876543210` |
| `test_suspended_account_rejected` | Suspended account cannot verify | `account_status=suspended` → 403 |

#### test_rate_limit_api.py — Rate Limiting Integration

| Test | Description | Acceptance Criteria |
|------|-------------|---------------------|
| `test_cooldown_enforced_via_api` | API returns 429 on cooldown | Second send within 60s → 429 with `Retry-After` header |
| `test_phone_rate_limit_via_api` | 4th OTP request in 15min → 429 | Rate limit headers correctly returned |
| `test_ip_rate_limit_via_api` | 11th IP request → 429 | Different phones still blocked by IP limit |

---

### 2.3 Security Tests

| Test | Category | Acceptance Criteria |
|------|----------|---------------------|
| `test_otp_not_in_response` | Information disclosure | API response body never contains 6-digit numeric OTP |
| `test_otp_not_in_headers` | Information disclosure | Response headers contain no OTP |
| `test_replay_protection` | Replay attack | Same challenge_id + correct OTP submitted twice → second returns 410 |
| `test_concurrent_verification` | Race condition | 5 concurrent POST /verify-otp with correct OTP → exactly 1 succeeds, others fail with 410 |
| `test_brute_force_locked` | Brute force | 3 wrong OTPs → 4th attempt gets 410 regardless of OTP correctness |
| `test_hmac_timing_safe` | Timing attack | Verify with wrong OTP does not take measurably different time than right OTP |
| `test_refresh_token_not_in_body` | Token exposure | verify-otp response body does not contain refresh token |
| `test_refresh_token_httponly` | Cookie security | Set-Cookie for refresh_token includes HttpOnly flag |
| `test_access_token_expiry` | Token expiry | Expired access token returns 401 |
| `test_jwt_algorithm_confusion` | JWT security | `alg=none` or `alg=RS256` token rejected |
| `test_token_reuse_revokes_family` | Token theft protection | Presenting revoked refresh token revokes all family sessions |
| `test_phone_enumeration_mitigation` | Phone enumeration | send-otp response is identical for known and unknown phones |
| `test_sql_injection_phone_field` | Injection | `"'; DROP TABLE users; --"` as phone → 400 (not 500) |
| `test_otp_too_short_rejected` | Input validation | 5-digit OTP → 422 |
| `test_otp_too_long_rejected` | Input validation | 7-digit OTP → 422 |
| `test_otp_non_numeric_rejected` | Input validation | `"abc123"` → 422 |

---

### 2.4 Concurrency Tests

| Test | Setup | Acceptance Criteria |
|------|-------|---------------------|
| `test_concurrent_otp_verify_race` | Thread pool: 10 threads, 1 challenge, correct OTP | Exactly 1 returns 200; rest return 410 |
| `test_concurrent_refresh_rotation` | Thread pool: 5 threads, same refresh token | Exactly 1 succeeds; rest get 401 (reuse detected) |
| `test_concurrent_rate_limit_increment` | Thread pool: 12 threads, same phone, send-otp | ≤3 succeed per 15-min window; rest get 429 |

---

### 2.5 React Component Tests (`frontend/src/__tests__/`)

| Component | Tests |
|-----------|-------|
| `OTPInput` | Renders 6 inputs; paste distributes digits; keyboard navigation (left/right/backspace); autocomplete attribute set; `inputMode="numeric"` |
| `PhoneInput` | Country code selector renders; E.164 prefix applied; invalid input shows error |
| `LoginPage` | Send OTP form submits; error state shown; loading spinner during request; OTP form appears after send |
| `ResendCountdown` | Countdown displays; button disabled during countdown; button enabled after countdown |
| `AuthContext` | `sendOtp` calls correct API endpoint; `loginWithOtp` calls verify-otp; `logout` calls /auth/logout; `refreshUser` calls /auth/me |
| `RequireAuth` | Unauthenticated user redirected to /login; loading state shows spinner |
| `RequireAdmin` | Non-admin role redirected to /; admin role renders children |
| `GuestOnly` | Authenticated user redirected to /; unauthenticated renders children |

---

### 2.6 End-to-End Tests (Playwright, `frontend/e2e/`)

| Scenario | Steps | Acceptance Criteria |
|----------|-------|---------------------|
| `auth_happy_path.spec.ts` | Open app → navigate to /login → enter phone → click Send OTP → enter OTP from MockProvider → click Verify → land on home page logged in | User profile visible in UI; no console errors |
| `auth_wrong_otp.spec.ts` | Send OTP → enter wrong OTP 3 times | After 3rd: "Maximum attempts exceeded" shown; resend button active |
| `auth_expired_otp.spec.ts` | Send OTP → wait for TTL → enter correct OTP | "Code expired" error shown |
| `auth_resend_countdown.spec.ts` | Send OTP → immediate resend click | Resend button disabled; countdown shown |
| `auth_logout.spec.ts` | Login → click Logout → navigate to protected page | Redirected to /login |
| `admin_access_control.spec.ts` | Login as customer → navigate to /admin | Redirected to / |
| `auth_session_restore.spec.ts` | Login → close tab → open new tab → navigate to app | User still logged in (session cookie persists) |
| `auth_mobile_otp_paste.spec.ts` | Focus OTP input → paste "123456" | All 6 inputs filled; submit enabled |

---

### 2.7 Health Endpoint Tests

| Test | Endpoint | Criteria |
|------|----------|---------|
| `test_liveness` | `GET /health/live` | Returns 200 with `{"status": "ok"}` |
| `test_readiness_healthy` | `GET /health/ready` | Returns 200 when DB + Redis OK |
| `test_readiness_degraded` | `GET /health/ready` (DB down) | Returns 503 |

---

## 3. Test Infrastructure

### 3.1 Backend Test Fixtures

```python
# conftest.py (to be added)
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.redis import get_redis_client
from app.providers.sms.mock_provider import MockSMSProvider

@pytest.fixture(autouse=True)
def reset_state():
    """Reset Redis and MockSMSProvider before each test."""
    r = get_redis_client()  # returns fakeredis in test mode
    r.flushall()
    MockSMSProvider.clear()
    yield

@pytest.fixture
def client():
    return TestClient(app)
```

### 3.2 Running Tests

```bash
# All backend tests
cd backend
venv/Scripts/python.exe -m pytest tests/ -v --tb=short

# Unit tests only (fast)
venv/Scripts/python.exe -m pytest tests/unit/ -v

# Integration tests only
venv/Scripts/python.exe -m pytest tests/integration/ -v

# Security tests
venv/Scripts/python.exe -m pytest tests/security/ -v

# With coverage report
venv/Scripts/python.exe -m pytest tests/ --cov=app --cov-report=html --cov-report=term-missing

# Frontend component tests
cd frontend
npm run test

# Frontend E2E tests (requires running app)
npm run test:e2e
```

### 3.3 CI Test Matrix

```yaml
# .github/workflows/ci.yml
test-backend:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/setup-python@v5
    - run: pip install -r requirements.txt
    - run: pytest tests/ -v --cov=app --cov-fail-under=85

test-frontend:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npm run test -- --coverage
    - run: npm run test:e2e

security-scan:
  runs-on: ubuntu-latest
  steps:
    - run: pip install pip-audit
    - run: pip-audit -r requirements.txt
    - run: npx audit --audit-level=high
```

---

## 4. Acceptance Criteria (Final)

The system is **complete** when all of the following are verified:

| # | Criterion | How Verified |
|---|-----------|-------------|
| 1 | Application starts with `docker-compose up` | Manual check: all containers healthy |
| 2 | Alembic migrations succeed against PostgreSQL | `alembic upgrade head` exits 0 |
| 3 | All 7 existing backend tests pass (6/7 → target 7/7) | `pytest tests/ -v` all green |
| 4 | OTP expiry test passes | `test_expired_challenge_returns_410` |
| 5 | Max attempts test passes | `test_max_attempts_exhaustion` |
| 6 | Replay protection test passes | `test_otp_single_use_consumption` |
| 7 | Concurrent verification test passes | `test_concurrent_otp_verify_race` |
| 8 | Rate limit tests pass | `test_phone_rate_limit_via_api` |
| 9 | Session revocation test passes | `test_logout_revokes_session` |
| 10 | Token reuse detection test passes | `test_token_family_reuse_detection` |
| 11 | Unauthorized access test passes | `test_me_requires_auth` |
| 12 | OTP not in response body | `test_otp_not_in_response` |
| 13 | Playwright E2E happy path passes | `auth_happy_path.spec.ts` |
| 14 | Deployment and recovery procedures documented | `docs/DEPLOYMENT.md` and `DATABASE.md` |
| 15 | Production security checklist complete | `docs/SECURITY.md` |

---

## 5. Known Issues and Defects (Baseline)

| Issue | Severity | Status | Fix |
|-------|----------|--------|-----|
| `app.db` stale schema caused `test_full_auth_flow_and_session_lifecycle` to fail | High | **Fixed** — deleted stale `app.db`; `Base.metadata.create_all()` recreates on next run |
| `verify_challenge` has TOCTOU window on attempt counting under extreme concurrency | Low | Open — document Lua upgrade path (see LLD §3.2) |
| `/health` endpoint returns basic `{"status": "ok"}` without DB/Redis probes | Medium | Open — needs `/health/ready` with actual probe |
| `AuthContext.sendOtp` sends `{phone}` but API expects `{phone_number}` | High | Open — needs field name alignment |
| `AuthContext.loginWithOtp` sends `{phone, otp}` but API expects `{challenge_id, phone_number, purpose, otp}` | High | Open — needs signature update to include `challenge_id` |

> **Note:** The last two issues indicate the frontend `AuthContext` was scaffolded before the backend API contract was finalized. These must be resolved in Phase 6 (Frontend implementation).

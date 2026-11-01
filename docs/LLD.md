# Low-Level Design (LLD)
## Jai Bhavani Pearls & Beads — Secure OTP Authentication System

> **Version:** 1.0 | **Date:** 2026-10-30

---

## 1. Cryptographic Specifications and Key Management

### 1.1 OTP Generation

```python
# app/services/otp_service.py — OTPService.generate_otp()
import secrets

def generate_otp() -> str:
    """
    Cryptographically secure 6-digit OTP.
    secrets.randbelow(N) uses os.urandom() internally.
    Uniform distribution over [0, 999999]; zero-padded to 6 digits.
    """
    val = secrets.randbelow(1_000_000)
    return f"{val:06d}"
```

**Security properties:**
- `secrets.randbelow` uses the OS CSPRNG (`os.urandom`/`CryptGenRandom`)
- 10^6 = 1,000,000 possible values; brute force requires ~500,000 attempts on average
- Attack mitigated by: max 3 attempts per challenge, 5-minute TTL, per-phone rate limits

### 1.2 HMAC Challenge Construction

The server **never** stores the OTP. It stores an HMAC that binds the OTP to its full context:

```python
# app/services/security_service.py — SecurityService.compute_otp_hmac()
import hmac
import hashlib

def compute_otp_hmac(
    challenge_id: str,
    phone_e164: str,
    otp: str,
    purpose: str,
    key_version: str = "v1"
) -> str:
    key = get_key_bytes(key_version)                          # bytes from hex secret
    msg = f"{challenge_id}:{phone_e164}:{otp}:{purpose}".encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()    # 64-char hex string
```

**Binding prevents:**
- Using a valid OTP for a different phone number (phone_e164 bound)
- Using a valid OTP for a different purpose (purpose bound)
- Cross-challenge replay (challenge_id bound)

### 1.3 Constant-Time Comparison

```python
def verify_otp_hmac(calculated_mac: str, stored_mac: str) -> bool:
    """
    hmac.compare_digest() runs in O(n) time regardless of the first differing byte.
    Prevents timing side-channel attacks that could reveal prefix length of correct HMAC.
    """
    if not calculated_mac or not stored_mac:
        return False
    return hmac.compare_digest(calculated_mac, stored_mac)
```

### 1.4 HMAC Key Management

```python
# Settings: OTP_HMAC_KEYS = '{"v1": "hex64chars...", "v2": "hex64chars..."}'
# OTP_HMAC_CURRENT_KEY_VERSION = "v1"

def get_key_bytes(key_version: str) -> bytes:
    keys = settings.get_hmac_keys_dict()     # JSON parse
    key_hex = keys.get(key_version)
    if not key_hex:
        key_hex = list(keys.values())[0]     # fallback to first key
    return bytes.fromhex(key_hex)
```

**Key Rotation Procedure:**
1. Generate new `v2` key: `python -c "import secrets; print(secrets.token_hex(32))"`
2. Add `v2` to `OTP_HMAC_KEYS` dict; keep `v1` present
3. Set `OTP_HMAC_CURRENT_KEY_VERSION=v2` — new challenges use v2
4. Wait for `OTP_TTL_SECONDS` (300s) for all v1 challenges to expire
5. Remove `v1` from `OTP_HMAC_KEYS`

---

## 2. Redis Key Hierarchy and Data Structures

### 2.1 Challenge Hash

```
Key:  otp:challenge:{challenge_id}
Type: Hash
TTL:  OTP_TTL_SECONDS (default: 300s)

Fields:
  challenge_id  : str  — UUID v4 (redundant; for debugging)
  key_version   : str  — "v1" (used to retrieve correct HMAC key on verification)
  mac           : str  — HMAC-SHA256 hex (64 chars)
  purpose       : str  — "login" | "register" | "verify_phone"
  phone_digest  : str  — HMAC pseudonym of phone_e164 (32 chars)
  attempts      : str  — "0" initially; HINCRBY on each failed attempt
  status        : str  — "PENDING" | "CONSUMED" | "EXHAUSTED"
  created_at    : str  — Unix timestamp (for app-level expiry validation)
```

### 2.2 Cooldown Key

```
Key:  otp:phone_cooldown:{phone_digest}
Type: String (presence flag)
TTL:  OTP_RESEND_COOLDOWN_SECONDS (default: 60s)
Value: {challenge_id}  — can be used for debugging; not security-critical
```

### 2.3 Sliding Window Rate Limit (ZSET)

```
Key:    otp:phone_rate:{phone_digest}  |  otp:ip_rate:{ip_digest}
Type:   Sorted Set
TTL:    window_seconds + 10s buffer
Score:  Unix timestamp (float)
Member: "{timestamp}:{count}"  — unique member per event
```

**Algorithm (check_and_increment_sliding_window):**
```
1. ZREMRANGEBYSCORE key 0 (now - window_seconds)   # expire old entries
2. ZCARD key                                         # count in window
3. If count >= limit: return (blocked, retry_after)
4. ZADD key {now: f"{now}:{count}"}                 # record new event
5. EXPIRE key window_seconds + 10                   # refresh TTL
6. return (allowed, 0)
```

### 2.4 Daily Counter

```
Key:   otp:daily_rate:{phone_digest}
Type:  Integer (INCR)
TTL:   86400s (24h); set only on first creation (INCR + EXPIRE if count == 1)
Value: Cumulative count for current day
```

---

## 3. Atomic Challenge Verification — Concurrency Analysis

### 3.1 Current Implementation (Non-Atomic HGETALL + HINCRBY)

The current `verify_challenge` method reads state with `HGETALL`, computes the HMAC in Python, then updates with `HSET`/`HINCRBY`. This creates a theoretical TOCTOU window under extreme concurrency:

**Race scenario (very low probability):**
```
Thread A: HGETALL → attempts=2, status=PENDING
Thread B: HGETALL → attempts=2, status=PENDING
Thread A: HINCRBY attempts → 3; HSET status=EXHAUSTED → returns EXHAUSTED
Thread B: HINCRBY attempts → 4 (already exhausted but HINCRBY ran again)
```

**Mitigation in current code:** The `attempts >= OTP_MAX_ATTEMPTS` check runs before HMAC comparison. The race only allows one additional HINCRBY beyond the limit; `status` is idempotently set to `EXHAUSTED`. No security bypass is possible — the challenge is **never** marked CONSUMED from an exhausted state.

### 3.2 Lua Script Upgrade Path

For deployments requiring strict atomicity (Redis Cluster, >10k concurrent users), replace with:

```lua
-- KEYS[1]: otp:challenge:{challenge_id}
-- ARGV[1]: expected_mac (HMAC computed server-side)
-- ARGV[2]: max_attempts (e.g., "3")

local data = redis.call('HMGET', KEYS[1], 'status', 'mac', 'attempts')
local status   = data[1]
local mac      = data[2]
local attempts = tonumber(data[3] or '0')

-- Challenge not found (TTL expired or never created)
if not status then
    return {err = "NOT_FOUND"}
end

-- Challenge already consumed or exhausted
if status ~= "PENDING" then
    return {err = status}
end

-- Already at max attempts
if attempts >= tonumber(ARGV[2]) then
    redis.call('HSET', KEYS[1], 'status', 'EXHAUSTED')
    return {err = "EXHAUSTED"}
end

-- HMAC comparison (server computes ARGV[1] before calling Lua)
if mac == ARGV[1] then
    -- Atomic single-use consumption
    redis.call('HSET', KEYS[1], 'status', 'CONSUMED')
    redis.call('DEL',  KEYS[1])
    return {ok = "VERIFIED"}
else
    -- Increment and conditionally exhaust
    local new_attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
    if new_attempts >= tonumber(ARGV[2]) then
        redis.call('HSET', KEYS[1], 'status', 'EXHAUSTED')
    end
    return {err = "MISMATCH", remaining = tonumber(ARGV[2]) - new_attempts}
end
```

**Note:** The Lua script receives the pre-computed HMAC from the Python layer (HMAC computation cannot run inside Lua). This is secure because: the HMAC is computed from inputs the server controls, and the comparison happens atomically in Redis.

---

## 4. API Contract — All Endpoints

### `POST /api/v1/auth/send-otp`

**Description:** Initiates phone OTP verification. Validates phone, enforces rate limits, generates challenge, dispatches SMS.

**Authentication Required:** None (public endpoint)

**Request:**
```json
{
  "phone_number": "+919876543210",
  "purpose": "login"
}
```

**Validation:**
- `phone_number`: Non-empty string; validated by `phonenumbers` library; normalized to E.164
- `purpose`: Enum — `login`, `register`, `verify_phone`

**Response 200:**
```json
{
  "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
  "expires_in": 300,
  "resend_after": 60,
  "message": "If eligible, a verification code has been requested."
}
```

**Note:** The response message is generic to prevent phone enumeration — it is the same whether the user exists or not.

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid phone number format or invalid purpose |
| 429 | Resend cooldown active, phone rate limit, IP rate limit, or daily limit exceeded (includes `Retry-After` header) |
| 503 | Redis unavailable or SMS gateway failure |

**Rate Limits:**
- Resend cooldown: 60s per phone
- Per-phone: 3 per 15 minutes
- Per-IP: 10 per 15 minutes
- Daily per-phone: 10 per 24 hours

**Idempotency:** Not idempotent — each call creates a new challenge (if cooldown allows).

**Audit Events:** `otp_audit_events` row with `outcome=ISSUED`

---

### `POST /api/v1/auth/verify-otp`

**Description:** Verifies the OTP submitted by the client. Atomically validates, creates/updates user, issues session tokens.

**Authentication Required:** None (public endpoint)

**Request:**
```json
{
  "challenge_id": "550e8400-e29b-41d4-a716-446655440000",
  "phone_number": "+919876543210",
  "purpose": "login",
  "otp": "123456"
}
```

**Validation:**
- `challenge_id`: Non-empty string (UUID format)
- `phone_number`: Valid phone number (re-validated on verify)
- `purpose`: Same enum as send-otp
- `otp`: Exactly 6 digits (`isdigit()` check)

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "phone_e164": "+919876543210",
    "account_status": "active",
    "role": "customer",
    "first_name": "Valued",
    "last_name": "Customer",
    "phone_verified_at": "2026-10-30T15:20:00Z"
  }
}
```

**Cookies Set:**
```
Set-Cookie: refresh_token=<opaque_64_char_token>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=1209600
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Incorrect OTP (`remaining` attempts shown) |
| 400 | Invalid phone format |
| 403 | Account suspended or disabled |
| 410 | Challenge expired, not found, or max attempts exhausted |
| 503 | Service unavailable |

**Concurrent Request Safety:** The attempt increment (`HINCRBY`) is atomic. Two concurrent requests with the wrong OTP both increment. Two concurrent requests with the correct OTP: the first succeeds (CONSUMED+DEL), the second finds key missing → NOT_FOUND → 410.

**Audit Events:** `otp_audit_events` rows for `VERIFIED`, `FAILED_ATTEMPT`, `EXHAUSTED`, or `EXPIRED`.

---

### `POST /api/v1/auth/refresh`

**Description:** Rotates the refresh token. Detects reuse and revokes the entire token family on theft.

**Authentication Required:** Refresh token cookie (or request body)

**Request:** Empty body or `{"refresh_token": "..."}` (cookie preferred)

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

**Cookies Rotated:**
```
Set-Cookie: refresh_token=<new_opaque_token>; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth
Set-Cookie: access_token=<new_jwt>; HttpOnly; Secure; SameSite=Lax; Path=/
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Refresh token missing, expired, invalid, or reuse detected |

**Reuse Detection:** If the presented refresh token hash matches a session row with `revoked_at IS NOT NULL`, all sessions in the same `token_family_id` are revoked immediately, and a `security_event` is written.

**Idempotency:** Not idempotent — each call issues a new token pair.

---

### `POST /api/v1/auth/logout`

**Description:** Revokes the current session's refresh token.

**Authentication Required:** Refresh token cookie (optional — best-effort logout)

**Response 200:**
```json
{"message": "Successfully logged out"}
```

**Cookies Cleared:**
```
Set-Cookie: refresh_token=; Max-Age=0; Path=/api/v1/auth
Set-Cookie: access_token=; Max-Age=0; Path=/
```

**Notes:** Logout proceeds even if no valid refresh token is present (idempotent from user's perspective). The short-lived access token (15 min) naturally expires; JTI revocation in Redis is reserved for future implementation.

---

### `POST /api/v1/auth/logout-all`

**Description:** Revokes all active sessions for the authenticated user.

**Authentication Required:** Valid access token (Bearer or cookie)

**Response 200:**
```json
{"message": "All sessions successfully terminated"}
```

**Database Effect:** `UPDATE auth_sessions SET revoked_at=now(), revocation_reason='logout_all' WHERE user_id=<id> AND revoked_at IS NULL`

---

### `GET /api/v1/auth/me`

**Description:** Returns the authenticated user's profile.

**Authentication Required:** Valid access token (Bearer header or `access_token` cookie)

**Response 200:**
```json
{
  "id": "uuid",
  "phone_e164": "+919876543210",
  "account_status": "active",
  "role": "customer",
  "first_name": "Valued",
  "last_name": "Customer",
  "phone_verified_at": "2026-10-30T15:20:00Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Token missing, expired, or malformed |
| 403 | Account not active |

---

### `GET /health/live`

**Description:** Liveness check — confirms the process is running.

**Response 200:**
```json
{"status": "ok", "env": "development"}
```

---

### `GET /health/ready`

**Description:** Readiness check — confirms database and Redis connections are healthy.  
*(To be implemented — currently served by `/health` on main app)*

**Response 200:**
```json
{
  "status": "ready",
  "postgres": "ok",
  "redis": "ok"
}
```

**Response 503:**
```json
{
  "status": "not_ready",
  "postgres": "error",
  "redis": "ok"
}
```

---

## 5. Session Token Specification

### 5.1 JWT Access Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub":  "550e8400-e29b-41d4-a716-446655440000",  // user.id (UUID)
    "role": "customer",                               // user.role
    "jti":  "unique-token-id-uuid",                   // JWT ID for future revocation
    "iat":  1730000000,                               // Issued at (Unix)
    "exp":  1730000900,                               // Expires at (iat + 900s)
    "iss":  "jai-bhavani-auth"                       // Issuer
  }
}
```

**Signing:** `HS256` with `JWT_SECRET` (minimum 32 characters; production: 256+ bit random)

### 5.2 Opaque Refresh Token

```
Format:   secrets.token_urlsafe(48)
Entropy:  48 bytes = 384 bits (URL-safe base64 encoded)
Storage:  SHA-256 hex hash in auth_sessions.refresh_token_hash
Cookie:   HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth
TTL:      REFRESH_TOKEN_TTL_SECONDS = 1209600s (14 days)
```

---

## 6. Service Layer Contracts

### 6.1 PhoneNumberService

```python
class PhoneNumberService:
    @staticmethod
    def normalize_and_validate(raw_phone: str, default_region: str = "IN") -> str:
        """
        Returns canonical E.164 string or raises ValueError.
        Uses Google libphonenumber via phonenumbers package.
        """
```

### 6.2 OTPService

```python
class OTPService:
    @staticmethod
    def generate_otp() -> str:
        """Returns 6-digit zero-padded cryptographically secure string."""

    @classmethod
    def create_challenge(cls, phone_e164: str, purpose: str) -> Tuple[str, str]:
        """
        Creates Redis challenge hash + cooldown key atomically via pipeline.
        Returns: (challenge_id: str, raw_otp: str)
        Raises: Exception on Redis failure → caller raises HTTP 503
        """

    @classmethod
    def verify_challenge(
        cls, challenge_id: str, phone_e164: str, purpose: str, input_otp: str
    ) -> Tuple[bool, str, Optional[int]]:
        """
        Atomically verifies OTP challenge.
        Returns: (is_success, error_code, remaining_attempts)
        error_code: "" | "NOT_FOUND" | "INVALID_PURPOSE" | "PHONE_MISMATCH" | 
                    "CONSUMED" | "EXHAUSTED" | "MISMATCH"
        """
```

### 6.3 RateLimitService

```python
class RateLimitService:
    @staticmethod
    def check_resend_cooldown(phone_e164: str) -> Tuple[bool, int]:
        """Returns (is_allowed, remaining_cooldown_seconds)"""

    @staticmethod
    def check_and_increment_sliding_window(
        key: str, limit: int, window_seconds: int
    ) -> Tuple[bool, int]:
        """Returns (is_allowed, retry_after_seconds)"""

    @classmethod
    def check_phone_rate_limit(cls, phone_e164: str) -> Tuple[bool, int]: ...

    @classmethod
    def check_ip_rate_limit(cls, client_ip: str) -> Tuple[bool, int]: ...

    @classmethod
    def check_daily_phone_limit(cls, phone_e164: str) -> Tuple[bool, int]: ...
```

### 6.4 SessionService

```python
class SessionService:
    @staticmethod
    def create_access_token(user_id: str, role: str) -> str:
        """Mints HS256 JWT with JTI, exp, iss, sub, role claims."""

    @staticmethod
    def verify_access_token(token: str) -> Dict[str, Any]:
        """
        Decodes and validates JWT. Raises jwt.PyJWTError on failure.
        Requires: exp, sub, jti, role claims.
        """

    @staticmethod
    def create_session(
        db: Session, user: User,
        user_agent: Optional[str], ip_address: Optional[str]
    ) -> Tuple[str, str]:
        """
        Creates new token family. Returns (access_token, raw_refresh_token).
        Persists auth_sessions row with SHA-256 hash.
        """

    @staticmethod
    def rotate_refresh_token(
        db: Session, raw_refresh_token: str,
        user_agent: Optional[str], ip_address: Optional[str]
    ) -> Tuple[str, str]:
        """
        Rotates refresh token. Raises ValueError on reuse, expiry, or invalid token.
        Returns (new_access_token, new_raw_refresh_token).
        """

    @staticmethod
    def revoke_session(db: Session, raw_refresh_token: str, reason: str = "logout"): ...

    @staticmethod
    def revoke_all_user_sessions(db: Session, user_id: str, reason: str = "logout_all"): ...
```

---

## 7. SMS Provider Adapter Architecture

### 7.1 Abstract Interface

```python
# app/providers/sms/base.py
class SMSDeliveryError(Exception):
    def __init__(self, message: str, is_retryable: bool = False, provider_code: Optional[str] = None): ...

class BaseSMSProvider(ABC):
    @abstractmethod
    def send_otp(self, to_phone_e164: str, otp: str) -> Dict[str, Any]:
        """
        Send OTP via SMS. Returns metadata dict or raises SMSDeliveryError.
        Never logs the OTP value.
        """
```

### 7.2 Provider Factory

```python
# app/providers/sms/factory.py
def get_sms_provider() -> BaseSMSProvider:
    provider = settings.SMS_PROVIDER.lower()
    if provider == "twilio":
        return TwilioProvider(...)
    elif provider == "mock":
        return MockSMSProvider()
    else:
        raise ValueError(f"Unknown SMS provider: {provider}")
```

### 7.3 Provider Extension Points

| Provider | Status | Config Keys |
|----------|--------|-------------|
| `mock` | Implemented | None |
| `twilio` | Implemented | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` |
| `msg91` | Stub (interface ready) | `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID` |
| `aws_sns` | Stub (interface ready) | `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| `2factor` | Stub (interface ready) | `TWO_FACTOR_API_KEY` |

---

## 8. Frontend Component Architecture

### 8.1 Auth Flow Components

```
src/
  contexts/
    AuthContext.tsx       ← useAuth() hook; sendOtp, loginWithOtp, logout, refreshUser
  pages/
    auth/
      LoginPage.tsx       ← Phone input + OTP input; country code selector
  components/
    auth/
      PhoneInput.tsx      ← E.164 input with country code prefix
      OTPInput.tsx        ← 6-digit split input; autocomplete="one-time-code"; paste support
      ResendCountdown.tsx ← Countdown timer (visual only; server enforces cooldown)
  router/
    AppRouter.tsx         ← RequireAuth, RequireAdmin, GuestOnly route guards
  lib/
    api.ts                ← Axios instance; idempotency key interceptor; 401 redirect
```

### 8.2 AuthContext Contract

```typescript
interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string, purpose?: string) => Promise<SendOtpResponse>;
  loginWithOtp: (challengeId: string, phone: string, otp: string, purpose?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;  // legacy
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface SendOtpResponse {
  challenge_id: string;
  expires_in: number;   // seconds (300)
  resend_after: number; // seconds (60)
  message: string;
}
```

**Security constraints:**
- OTPs are **never** stored in component state beyond the controlled input
- OTPs are **never** written to `localStorage`, `sessionStorage`, or cookies
- `challenge_id` may be held in component state (it is opaque and not secret)
- The server countdown (based on `expires_in`) is authoritative; the UI countdown is decorative

### 8.3 OTP Input Component Requirements

- 6 separate single-character `<input>` fields with `maxLength=1`
- Keyboard navigation: `ArrowLeft`/`ArrowRight`/`Backspace` move focus between inputs
- Paste support: paste a 6-digit string and distribute across all inputs
- `autoComplete="one-time-code"` on the first/wrapper input (triggers iOS/Android OTP autofill)
- `inputMode="numeric"` for numeric keyboard on mobile
- Tab-accessible; ARIA labels present

### 8.4 Protected Route Guards

```typescript
// RequireAuth: redirect unauthenticated to /login
// RequireAdmin: redirect non-admin roles to /
// GuestOnly: redirect authenticated users to /
```

All guards wait for `isLoading` to resolve before redirecting (avoids flash of wrong content on session restoration).

---

## 9. Error Handling Strategy

### 9.1 Backend Error Taxonomy

| Error Class | HTTP Status | Response Body |
|------------|-------------|---------------|
| Invalid input (validation) | 400 | `{"detail": "Phone number is not valid..."}` |
| Authentication required | 401 | `{"detail": "Authentication credentials required"}` |
| Account not active | 403 | `{"detail": "Account is disabled or suspended"}` |
| Challenge expired/consumed | 410 | `{"detail": "Verification code has expired..."}` |
| Rate limited | 429 | `{"detail": "..."} + Retry-After header` |
| Service unavailable | 503 | `{"detail": "Authentication service temporarily unavailable."}` |
| Internal error | 500 | `{"detail": "Internal server error"}` (no stack trace in production) |

**Generic Responses:** `/auth/send-otp` always returns 200 with generic message if phone passes validation (whether user exists or not), preventing enumeration.

### 9.2 Frontend Error Handling

```typescript
// api.ts getErrorMessage()
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data?.detail === 'string') return data.detail;
    if (Array.isArray(data?.detail)) return data.detail.map(e => e.msg).join('. ');
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}
```

---

## 10. Middleware Specifications

### 10.1 IP Resolver

```python
# app/middleware/ip_resolver.py
def get_client_ip(request: Request) -> str:
    """
    Extracts real client IP from X-Forwarded-For only if the
    direct connection comes from a trusted proxy CIDR.
    Falls back to request.client.host otherwise.
    
    Prevents IP spoofing via forged X-Forwarded-For headers.
    """
    trusted_proxies = settings.get_trusted_proxies()  # ["127.0.0.1", "::1", ...]
    direct_ip = request.client.host if request.client else "unknown"
    
    if direct_ip in trusted_proxies:
        forwarded = request.headers.get("X-Forwarded-For", "")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return direct_ip
```

### 10.2 CORS Configuration

```python
CORSMiddleware(
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173"],
    allow_credentials=True,                    # Required for cookies
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Retry-After"]
)
```

**Production:** `allow_origins` must be set to exact production frontend domain. No wildcard `*` with `allow_credentials=True` (rejected by browsers).

---

## 11. Configuration Reference

All configuration is loaded from environment variables via `pydantic-settings`.  
See [`.env.example`](../.env.example) for complete reference.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | `development` / `testing` / `production` |
| `DATABASE_URL` | `sqlite:///./app.db` | SQLAlchemy connection string |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `USE_FAKEREDIS_IN_DEV` | `True` | Fall back to fakeredis if Redis unreachable |
| `OTP_HMAC_KEYS` | `{"v1":"..."}` | JSON dict of versioned HMAC keys |
| `OTP_HMAC_CURRENT_KEY_VERSION` | `v1` | Active signing key version |
| `JWT_SECRET` | (must set) | HS256 signing secret (min 32 chars) |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | 15 minutes |
| `REFRESH_TOKEN_TTL_SECONDS` | `1209600` | 14 days |
| `OTP_TTL_SECONDS` | `300` | 5 minutes |
| `OTP_RESEND_COOLDOWN_SECONDS` | `60` | 60 seconds |
| `OTP_MAX_ATTEMPTS` | `3` | Max wrong OTP attempts per challenge |
| `RATE_LIMIT_PHONE_MAX` | `3` | Per-phone OTPs per window |
| `RATE_LIMIT_PHONE_WINDOW_SECONDS` | `900` | 15 minutes |
| `RATE_LIMIT_IP_MAX` | `10` | Per-IP OTPs per window |
| `RATE_LIMIT_IP_WINDOW_SECONDS` | `900` | 15 minutes |
| `RATE_LIMIT_DAILY_PHONE_MAX` | `10` | Per-phone OTPs per day |
| `SMS_PROVIDER` | `mock` | `mock` or `twilio` |
| `TWILIO_ACCOUNT_SID` | (optional) | Twilio credentials |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | CORS allowed origin |
| `TRUSTED_PROXY_IPS` | `127.0.0.1,::1` | Trusted proxy CIDR list |

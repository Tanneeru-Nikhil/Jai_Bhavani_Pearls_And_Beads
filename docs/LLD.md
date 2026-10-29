# Low-Level Design (LLD)
## Secure Mobile Phone OTP Authentication System

### 1. Cryptographic Specifications & Key Management
- **Entropy Source:** `secrets.randbelow(1_000_000)` formatted as `f"{val:06d}"`.
- **HMAC Storage:**
  ```python
  def compute_otp_hmac(key: bytes, challenge_id: str, phone_e164: str, otp: str, purpose: str) -> str:
      message = f"{challenge_id}:{phone_e164}:{otp}:{purpose}".encode("utf-8")
      return hmac.new(key, message, hashlib.sha256).hexdigest()
  ```
- **Comparison:** `hmac.compare_digest(calculated_hmac, stored_hmac)` guaranteeing constant-time execution against timing attacks.
- **Key Versioning:** Keys managed via `OTP_HMAC_KEYS={"v1": "hex-or-secret", "v2": "..."}`. Default signing uses `OTP_HMAC_CURRENT_KEY_VERSION`.

### 2. Redis Key Hierarchy & Data Types

| Key Pattern | Type | TTL | Purpose |
|---|---|---|---|
| `otp:challenge:{challenge_id}` | Hash | 300s (5m) | Stores `{key_version, mac, purpose, phone_digest, attempts, status}` |
| `otp:phone_cooldown:{phone_digest}` | String | 60s | Binary presence flag to block resends within cooldown |
| `otp:phone_rate:{phone_digest}` | Sorted Set (ZSET) | 900s (15m) | Sliding window timestamps for per-phone issuance limit |
| `otp:ip_rate:{ip_digest}` | Sorted Set (ZSET) | 900s (15m) | Sliding window timestamps for per-IP issuance limit |
| `otp:daily_rate:{phone_digest}` | Integer (INCR) | End-of-day | Daily rate limit counter |
| `auth:revoked_jti:{jti}` | String | Access TTL | Fast-path access token revocation check |

### 3. Atomic Challenge Consumption Lua Script

```lua
-- KEYS[1]: otp:challenge:{challenge_id}
-- ARGV[1]: expected_mac
-- ARGV[2]: max_attempts (e.g. 3)

local challenge = redis.call('HMGET', KEYS[1], 'status', 'mac', 'attempts')
local status = challenge[1]
local mac = challenge[2]
local attempts = tonumber(challenge[3] or '0')

if not status then
    return {err = "NOT_FOUND"}
end

if status ~= "PENDING" then
    return {err = "INVALID_STATUS", status = status}
end

if attempts >= tonumber(ARGV[2]) then
    redis.call('HSET', KEYS[1], 'status', 'EXHAUSTED')
    return {err = "EXHAUSTED"}
end

if mac == ARGV[1] then
    redis.call('HSET', KEYS[1], 'status', 'CONSUMED')
    redis.call('DEL', KEYS[1]) -- Immediate invalidation on success
    return {ok = "VERIFIED"}
else
    local new_attempts = redis.call('HINCRBY', KEYS[1], 'attempts', 1)
    if new_attempts >= tonumber(ARGV[2]) then
        redis.call('HSET', KEYS[1], 'status', 'EXHAUSTED')
    end
    return {err = "MISMATCH", remaining = tonumber(ARGV[2]) - new_attempts}
end
```

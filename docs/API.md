# API Specification
## Mobile Phone OTP Authentication v1

Base URL: `/api/v1/auth`

---

### 1. `POST /api/v1/auth/send-otp`
Requests a 6-digit OTP sent to the verified mobile phone.

#### Request Body
```json
{
  "phone_number": "+919876543210",
  "purpose": "login"
}
```
*Purpose enum:* `login`, `register`, `verify_phone`

#### Success Response (`200 OK`)
```json
{
  "challenge_id": "c1f728be-c6e3-4d7a-8bfe-30e44ebfa3c4",
  "expires_in": 300,
  "resend_after": 60,
  "message": "If eligible, a verification code has been requested."
}
```
*Note:* Plaintext OTP is never returned.

#### Error Responses
- `400 Bad Request`: Invalid E.164 phone number, unsupported country, invalid purpose.
- `429 Too Many Requests`: Cooldown active or rate limit exceeded. Header `Retry-After: 45` provided.
- `503 Service Unavailable`: Fail-closed on Redis/SMS failure.

---

### 2. `POST /api/v1/auth/verify-otp`
Verifies the 6-digit OTP challenge and issues session tokens.

#### Request Body
```json
{
  "challenge_id": "c1f728be-c6e3-4d7a-8bfe-30e44ebfa3c4",
  "phone_number": "+919876543210",
  "purpose": "login",
  "otp": "839201"
}
```

#### Success Response (`200 OK`)
Sets `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Lax; Path=/api/v1/auth; Max-Age=1209600`
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "phone_e164": "+919876543210",
    "account_status": "active",
    "role": "customer",
    "phone_verified_at": "2026-10-29T09:00:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Incorrect OTP (with `remaining_attempts: 2`).
- `410 Gone`: Challenge expired or exhausted (max 3 attempts exceeded).
- `409 Conflict`: Challenge already consumed.

---

### 3. `POST /api/v1/auth/refresh`
Rotates refresh token and issues a new access token.

#### Request Header or Cookie
- Cookie: `refresh_token=<token>` or Body: `{"refresh_token": "<token>"}`

#### Success Response (`200 OK`)
Sets new rotated refresh token in Cookie.
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

#### Error Response
- `401 Unauthorized`: Token invalid, expired, or reuse detected (resulting in revocation of all sessions in family).

---

### 4. `POST /api/v1/auth/logout`
Revokes the current session and clears cookies.

---

### 5. `POST /api/v1/auth/logout-all`
Revokes all active sessions for the current user.

---

### 6. `GET /api/v1/auth/me`
Returns current user profile. Requires `Authorization: Bearer <token>`.

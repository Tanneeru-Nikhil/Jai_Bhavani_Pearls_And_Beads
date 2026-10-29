# High-Level Architecture Design (HLD)
## Secure Mobile Phone OTP Authentication System

### 1. Architectural Topology

```text
[ Browser / Mobile Client ]
         │  HTTPS / WSS
         ▼
[ Reverse Proxy / Ingress ]
         │  Internal Network
         ▼
[ FastAPI Auth Monolith /api/v1/auth ]
   │                 │                    │
   ├── [Redis]       ├── [PostgreSQL]     └── [SMS Gateway]
   │   - Challenges  │   - Users (E.164)      - Twilio Adapter
   │   - Cooldowns   │   - Auth Sessions      - Mock Provider (Dev/Test)
   │   - Rate Limits │   - Audit Logs         - MSG91 / SNS Extensible
   │   - Revoked JTI └── - Security Events
```

### 2. Core Subsystems & Components

1. **Client Layer (React + TypeScript + Vite):**
   - E.164 phone number formatting with country selector (`CountryCodeSelector`).
   - Accessible 6-digit split input (`OTPDigitInput`) supporting keyboard navigation and one-touch clipboard paste (`autocomplete="one-time-code"`).
   - Dynamic resend countdown timer (client visual guide backed by server validation).
   - Automatic silent token refresh using Axios interceptors.
   - Protected route guards with role checks (Admin vs Customer).

2. **API & Service Layer (FastAPI 0.14x + Python 3.12+):**
   - **`PhoneNumberService`**: Country code validation, E.164 canonicalization using Google `phonenumbers`.
   - **`OTPService`**: Cryptographically secure 6-digit generation via `secrets.randbelow`.
   - **`SecurityService`**: HMAC-SHA256 calculation (`challenge_id` + `normalized_phone` + `otp` + `server_secret`). Key rotation support via `key_version`.
   - **`RateLimitService`**: Distributed sliding-window counters, cooldown enforcement, and toll-fraud prevention in Redis.
   - **`SMSDeliveryService`**: Provider-agnostic dispatch with Twilio and Mock adapters.
   - **`SessionService`**: Access token (JWT) minting, opaque refresh token generation, SHA-256 hash storage in PostgreSQL, token family tracking for reuse detection.
   - **`AuditService`**: Privacy-compliant structured audit event logger.

3. **Data & Storage Layer:**
   - **Redis 7+**: Transient challenge state, sliding window rate limits, cooldown flags, revoked tokens.
   - **PostgreSQL 16+**: Permanent identities (`users`), authenticated sessions (`auth_sessions`), security logs (`security_events`).

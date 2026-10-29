# Deployment & Operations Guide
## Mobile Phone OTP Authentication

### 1. Infrastructure Overview (Docker Compose)
The stack consists of:
- `fastapi-app`: Python 3.12+ ASGI server running Uvicorn with structured JSON logging.
- `postgres`: PostgreSQL 16 Alpine with persistent volume and dedicated non-root `auth_user`.
- `redis`: Redis 7 Alpine configured with password authentication, AOF persistence, and memory limits.
- `frontend`: Vite React build served via Nginx with TLS and hardened CSP headers.

### 2. Environment Variables & Secrets
See `.env.example` for required configuration parameters.
Never commit `.env` containing production keys into source control.
All production keys (`OTP_HMAC_KEYS`, `JWT_SECRET`, `TWILIO_AUTH_TOKEN`) must be injected via Secret Manager (e.g. AWS Secrets Manager or HashiCorp Vault).

### 3. Migration Workflow
Database schema migrations are executed explicitly via Alembic:
```bash
docker compose run --rm backend alembic upgrade head
```
Destructive auto-migrations are prohibited on application boot.

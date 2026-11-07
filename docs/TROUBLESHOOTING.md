# Rodstar PayOps: Troubleshooting Guide

---

## 1. Authentication & Token Issues

### "Refresh token reuse detected. All sessions in this chain have been revoked."
- **Cause:** A previously rotated refresh token was submitted again. This usually happens when a browser tab makes concurrent refresh requests or when a token is intercepted.
- **Resolution:** Re-authenticate via `/api/v1/auth/login`. In frontend applications, implement a mutex/request deduplicator around token refresh logic.

### "Token missing user or tenant claim" / 401 Unauthorized
- **Cause:** Bearer token is malformed, expired, or signed with an outdated `SECRET_KEY`.
- **Resolution:** Ensure client sends `Authorization: Bearer <valid_jwt>` and check system clock synchronization.

---

## 2. Database & Alembic Migrations

### "Expected table missing after migration upgrade"
- **Cause:** Migration scripts not discovered or directory path misconfiguration.
- **Resolution:** Ensure `script_location = %(here)s/migrations` in `backend/alembic.ini` without spaces in `version_locations`. Run:
  ```bash
  cd backend
  alembic upgrade head
  ```

### Cross-Tenant 404 on Resource Access
- **Behavior:** Accessing an existing resource ID returns `404 Not Found`.
- **Expected Design:** This is intentional fail-closed behavior. If the requested resource belongs to a different tenant, the backend masks its existence with a 404 to prevent ID enumeration.

---

## 3. Network & Health Checks

### `/health/ready` returns 503 Service Unavailable
- **Cause:** Database connection pool failed or PostgreSQL container is initializing.
- **Resolution:**
  ```bash
  docker compose logs db
  docker compose exec backend python -c "from app.core.database import sync_engine; print(sync_engine.connect())"
  ```

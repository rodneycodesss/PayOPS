# Rodstar PayOps: Security Architecture & Controls

Security is a primary non-negotiable principle in Rodstar PayOps. As a commercial financial SaaS handling Kenyan payments, taxes, and accounting, multiple defense-in-depth layers are strictly enforced.

---

## 1. Authentication & Identity Protection

- **Password Hashing:** Argon2id (`time_cost=3`, `memory_cost=64MB`, `parallelism=4`, RFC 9106 compliant). Passwords are never stored in plaintext or reversible formats.
- **Access Tokens:** Short-lived JWTs (30 minutes) containing minimal claims (`sub`, `tenant_id`, `roles`, `permissions`, `jti`, `exp`).
- **Refresh Token Rotation & Family Reuse Detection:**
  - Refresh tokens are single-use and rotated on every refresh.
  - Each refresh token chain shares an immutable `family_id`.
  - When an already-used or revoked refresh token is presented, the system triggers immediate family-wide revocation, invalidating all active sessions in the chain.
- **Multi-Factor Authentication (TOTP):** Standard RFC 6238 TOTP using `pyotp` with 1-step window drift tolerance.

---

## 2. Multi-Tenant Isolation & Fail-Closed Boundary

- **Backend Enforcement:**
  - Every tenant-owned table contains a non-nullable `tenant_id` foreign key.
  - Queries are mediated via `TenantScopedRepository` and FastAPI dependency injection (`get_tenant_context`).
  - Route handlers are structurally prevented from executing un-scoped queries.
  - Attempting to access an ID belonging to another tenant returns `404 Not Found` (fail-closed principle), preventing ID enumeration or guessing.
- **Mandatory Cross-Tenant Tests:** Automated integration tests in `backend/tests/test_cross_tenant.py` verify that tenant data is invisible and immutable across boundaries.

---

## 3. Cryptography & Secrets at Rest

- **Provider Credentials:** External API secrets, Daraja consumer keys, passkeys, and bank tokens are encrypted before database insertion using Fernet symmetric encryption (AES-128-CBC + HMAC-SHA256).
- **Master Key:** The `CREDENTIALS_ENCRYPTION_KEY` is loaded strictly from environment variables and is never committed to Git.
- **Zero Raw Secret Logging:** Webhook processors and error loggers sanitize sensitive keys, PINs, card data, and passwords before logging.

---

## 4. HTTP & Application Hardening

- **Security Headers Middleware:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none';`
- **CORS Policy:** Strict origin whitelist restricted to production domain (`payops.rodstartechdevs.co.ke`) and local development ports.

---

## 5. Audit Logging

- All sensitive mutations (registration, login, MFA activation, profile updates, branch creation, user invitations, and financial postings) write immutable entries into the `audit_logs` table.
- Entries capture `tenant_id`, `actor_id`, `actor_email`, `action`, `resource_type`, `resource_id`, diff metadata, IP address, and user agent.

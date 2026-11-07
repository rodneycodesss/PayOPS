# Rodstar PayOps

**Tagline:** Intelligent Payment Operations & Tax Automation  
**Target Domain:** `payops.rodstartechdevs.co.ke`  
**Primary Market:** Kenya (KES, M-PESA Daraja, KRA PIN, VAT)

Rodstar PayOps is a multi-tenant SaaS built for Kenyan businesses to collect payments, reconcile them against invoices and bank statements, maintain a double-entry ledger, and prepare compliant tax invoices for KRA eTIMS.

---

## Non-Negotiable Engineering Principles

1. **Backend Source of Truth:** Frontend and n8n only call authenticated backend REST APIs.
2. **Exact Money Precision:** `Decimal` in Python, `NUMERIC(18,2)` in PostgreSQL. Floats are prohibited in all financial paths. Every amount carries an ISO currency (`KES`).
3. **Append-Only Ledger:** Posted journal entries, payments, and allocations are immutable. Corrections are executed via explicit reversing entries.
4. **Tenant Isolation:** Enforced at the data-access layer via `tenant_id` and fail-closed repository scoping. Cross-tenant access fails closed (404).
5. **No Fake Compliance:** Invoices are marked `ACCEPTED` only by authentic cryptographic responses from approved tax adapters. Manual recordings are explicitly stamped `"manually recorded"`.

---

## Repository Structure

```
rodstar-payops/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # Versioned REST endpoints (auth, tenants, audit, health)
│   │   ├── core/           # Config, security (Argon2id, JWT, Fernet, TOTP), DB, dependencies
│   │   ├── models/         # 29 SQLAlchemy 2 models (tenants, rbac, invoices, payments, etc.)
│   │   ├── schemas/        # Pydantic v2 schemas
│   │   ├── services/       # Auth, audit, business services
│   │   ├── integrations/   # Daraja, banks, eTIMS adapters
│   │   ├── accounting/     # PostingService, Chart of Accounts, Double-entry ledger
│   │   ├── reconciliation/ # 5-tier matching priority rules engine
│   │   └── workers/        # Celery asynchronous task definitions
│   ├── migrations/         # Alembic migration versions and env
│   └── tests/              # Pytest test suite (auth, MFA, cross-tenant, migrations, RBAC)
├── frontend/               # React 19, TypeScript, Tailwind CSS, Lucide
├── infrastructure/         # Nginx reverse proxy configuration & deployment scripts
├── n8n/                    # Importable automation workflows
├── docs/                   # PLAN.md, DECISIONS.md, API.md, SECURITY.md, DEPLOY.md, TROUBLESHOOTING.md
├── docker-compose.yml      # Production stack (Postgres, Redis, Backend, n8n, Nginx)
├── docker-compose.sandbox.yml # Sandbox stack with Mailpit & local dev ports
└── .env.example            # Environment variables specification
```

---

## Quickstart

### 1. Run with Docker Compose
```bash
cp .env.example .env
docker compose up -d --build
```

### 2. Local Backend Development & Tests
```bash
# Setup virtual environment
uv venv backend/.venv
backend\.venv\Scripts\activate

# Install dependencies
uv pip install -r backend/requirements.txt --python backend/.venv/Scripts/python.exe

# Run test suite
backend\.venv\Scripts\pytest -v
```

---

## Phase Status Summary

- [x] **Phase 1: Foundation (Green & Verified)**
  - Repository structure & Docker Compose configurations.
  - Multi-tenant data layer & fail-closed tenant scoping.
  - Argon2id password hashing, JWT access & refresh token rotation with reuse family revocation.
  - TOTP Multi-factor authentication.
  - Granular RBAC (owner, finance_admin, accountant, cashier, auditor, viewer).
  - 29 Core SQLAlchemy models & complete Alembic migration suite (upgrades and downgrades verified).
  - Immutable audit logging.
  - Health probes (`/health/live`, `/health/ready`, `/api/v1/health`).
- [ ] **Phase 2: Payments & Ingestion**
- [ ] **Phase 3: Reconciliation Engine**
- [ ] **Phase 4: Accounting & Ledger**
- [ ] **Phase 5: Invoicing & eTIMS**
- [ ] **Phase 6: Automations (n8n)**
- [ ] **Phase 7: Frontend Application**
- [ ] **Phase 8: Production Readiness**

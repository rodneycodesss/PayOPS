# Rodstar PayOps: Implementation Plan (Release 1)

**Tagline:** Intelligent Payment Operations & Tax Automation  
**Primary Market:** Kenya (KES, M-PESA, KRA PIN, VAT)  
**Standard:** Commercial fintech product, append-only double-entry ledger, zero mock data in functional paths.

---

## 1. Architecture & Technical Baseline

- **Backend:** Python 3.13, FastAPI, SQLAlchemy 2 (async/sync scoped sessions), Pydantic v2, Alembic, Argon2id, PyJWT, Cryptography (Fernet/AES-GCM for provider credentials at rest).
- **Database:** PostgreSQL (with `NUMERIC(18,2)` exact monetary precision, `tenant_id` scoping, indexes, foreign keys, row hashes, and idempotency constraints).
- **Cache & Queues:** Redis, Celery (background job execution for webhooks, reconciliations, report generation).
- **Automation:** n8n calling backend via dedicated service accounts and scoped API keys (n8n has no direct DB access).
- **Frontend:** React 19 / TypeScript, Vite, Tailwind CSS, Lucide icons, React Router, TanStack Query, React Hook Form, Zod, Recharts.
- **Testing:** Pytest, HTTPX (API integration tests), property/invariant testing for ledger and matching, Playwright (frontend E2E journeys).

---

## 2. Release 1 Build Phases & Exit Criteria

### Phase 1: Foundation
- **Scope:**
  - Standard repository layout (`backend`, `frontend`, `n8n`, `infrastructure`, `docs`).
  - Docker Compose configuration (`docker-compose.yml`, `docker-compose.sandbox.yml`).
  - Configuration and secrets management via `.env` / Pydantic Settings with credential encryption at rest.
  - Multi-tenant architecture: `Tenant`, `User`, `Role`, `Permission`, `UserRole`, `Branch`.
  - Authentication: Argon2id password hashing, JWT access & refresh tokens with rotation and reuse detection, TOTP-based MFA (`pyotp`).
  - RBAC data-access layer: mandatory tenant scoping in all queries, fail-closed policy.
  - Audit logging system (`audit_logs`) tracking actor, action, resource, IP, and changes.
  - Health check endpoints (`/health/live`, `/health/ready`).
  - Initial database models and Alembic migrations.
- **Exit Criteria:**
  - Stack builds with one command.
  - Migrations apply cleanly to an empty database and downgrade cleanly.
  - Register -> Login -> MFA verify -> Refresh -> Revoke cycle passes.
  - Cross-tenant access tests fail closed.

### Phase 2: Payments & Ingestion
- **Scope:**
  - Daraja API integration interface and implementation (`PaymentProvider` base class).
  - Daraja OAuth client, STK Push initiation, STK Callback processor, C2B Register/Validate/Confirm endpoints.
  - Webhook ingestion pipeline: raw payload preservation in `webhook_events`, signature & authenticity verification, idempotency checking.
  - Payment lifecycle state machine: `INITIATED` -> `PENDING` -> `SUCCEEDED` | `FAILED` | `CANCELLED` | `TIMED_OUT`.
  - CSV bank statement importer: format validation, row hashing for duplicate prevention, malformed row error reporting, and import summaries.
- **Exit Criteria:**
  - Duplicate callback creates exactly one payment.
  - Failed and timed-out payments handled gracefully.
  - Malformed CSV rows rejected safely with detailed summary.
  - Sandbox calls succeed if credentials supplied; marked `implemented, unverified` otherwise.

### Phase 3: Reconciliation Engine
- **Scope:**
  - Rule-based reconciliation engine implementing 5 matching priority tiers:
    1. Exact transaction reference
    2. Exact invoice reference
    3. Exact amount + customer
    4. Exact amount + date within configurable window
    5. Manual review exception queue
  - Hard domain rules: ambiguous matches never auto-allocate; partial allocations leave visible balance; overpayments become customer credit.
  - `reconciliation_runs`, `reconciliation_matches`, `reconciliation_exceptions`.
  - Manual exception resolution workflow with audit trail.
  - Daily reconciliation background job.
- **Exit Criteria:**
  - Fixture-based accuracy tests pass for every rule tier.
  - Ambiguous candidate matches never auto-allocate.
  - Exceptions resolvable with immutable audit logs.

### Phase 4: Accounting & Double-Entry Ledger
- **Scope:**
  - Standard Kenyan SME Chart of Accounts (Receivables, Payables, Cash, Bank, M-PESA Clearing, Tax Payable, VAT Output, Revenue, Expenses).
  - Dedicated `PostingService` as the single point of ledger write operations.
  - Journal entry validation: debits must equal credits per currency.
  - Immutability enforcement: posted journal entries cannot be edited or deleted.
  - Reversals and corrections via linked opposing entries.
  - Period close workflow locking journal postings for closed accounting periods.
  - Real-time customer balance and account balance calculations.
- **Exit Criteria:**
  - Property tests verify debits equal credits on every posted journal.
  - Direct updates or deletions on posted entries are prevented.
  - Reversals preserve full audit history.

### Phase 5: Invoicing & eTIMS
- **Scope:**
  - Invoicing lifecycle: `DRAFT` -> `ISSUED_INTERNAL` -> `PENDING_SUBMISSION` -> `UNDER_REVIEW` -> `SUBMITTED` -> `ACCEPTED` | `REJECTED` | `FAILED` -> `CORRECTED`.
  - Sequential invoice numbering per tenant/branch.
  - Tax calculation engine: Standard (16%), Zero-rated (0%), Exempt.
  - PDF invoice generation with QR code placeholder, KRA PIN, and itemized VAT breakdown.
  - Credit notes linked to original invoices.
  - `TaxAuthorityProvider` abstraction and `NotConfigured` eTIMS adapter.
  - eTIMS manual review mode: manual external recording with reference, actor, and timestamp.
  - Explicit compliance guard: invoices marked "manually recorded", never "accepted by KRA" without authenticated provider acceptance.
- **Exit Criteria:**
  - Manual review mode never sets status to `ACCEPTED`.
  - Swapping provider adapter requires zero modification to core invoicing code.
  - PDF generation produces valid downloadable invoices.

### Phase 6: Automations (n8n & Internal Jobs)
- **Scope:**
  - n8n workflow definitions (WF01-WF08, WF10-WF12) exported as importable JSON.
  - Service account authentication with scoped API keys for n8n.
  - Internal Celery tasks for callback retries, reconciliation runs, and daily financial summaries.
  - Alerting on final failure.
- **Exit Criteria:**
  - Every workflow file imports cleanly into n8n.
  - Workflows interact exclusively with backend REST APIs using scoped keys.
  - Retries and failure notifications function as specified.

### Phase 7: Frontend Application
- **Scope:**
  - Polished fintech UI with restrained color palette, clear typography, and responsive layouts.
  - All 15 navigation sections wired to live APIs:
    1. Overview (real metrics: collections, outstanding invoices, reconciliation rate, KRA status)
    2. Payments
    3. Transactions
    4. Reconciliation
    5. Invoices
    6. eTIMS
    7. Customers
    8. Products & Services
    9. Banking
    10. Accounting
    11. Reports
    12. Automations
    13. Team & Permissions
    14. Business Settings
    15. Audit Logs
  - RBAC-aware UI components hiding or disabling restricted actions.
  - Robust loading, empty, and error states.
- **Exit Criteria:**
  - All 15 sections operational without mock or static placeholder data.
  - Playwright journeys pass for key flows (login, invoice creation, manual payment, reconciliation review).

### Phase 8: Production Readiness & Hardening
- **Scope:**
  - Security hardening: security headers, rate limiting, CORS, CSRF, input sanitization.
  - Database backup and restore verification drill.
  - Complete documentation: `README.md`, `API.md`, `SECURITY.md`, `DEPLOY.md`, `TROUBLESHOOTING.md`, `.env.example`.
  - End-to-end sandbox walkthrough and verification report.
- **Exit Criteria:**
  - Complete journey passes end-to-end: Invoice -> Payment -> Callback -> Reconcile -> Ledger -> Financial Report.
  - All test suites green.

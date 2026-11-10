# Rodstar PayOps: API Reference (v1)

**Base URL:** `https://payops.rodstartechdevs.co.ke/api/v1`  
**Standard Authentication:** `Authorization: Bearer <access_token>`  
**Automation & n8n Authentication:** `X-API-Key: rpo_live_<token>`

All API responses follow consistent JSON formats. Financial amounts are exact decimals serialized as strings or fixed-precision numeric values paired with an ISO currency code (`KES`).

---

## Single Test User (Production Staging Account)

For external testers and reviewers, exactly one pre-configured test user account exists:
- **Email:** `rodney@rodstartechdevs.co.ke`
- **Password:** `SecureRodstar2026!`
- **Role:** `owner` (Full administrative, finance, and automation capabilities)
- **Tenant:** Rodstar Technologies Kenya Ltd

---

## 1. Authentication & Security (`/api/v1/auth`)

### `POST /auth/register`
Onboards a new tenant business and creates the owner account. Automatically provisions the default Headquarters (`HQ`) branch, seeds system roles, standard Kenyan SME Chart of Accounts, and tax categories.

### `POST /auth/login`
Authenticates user using Argon2id password hashing. Returns JWT access token (15-min lifespan) and refresh token (7-day lifespan). If TOTP MFA is enabled on the account, returns `mfa_required: true`.

### `POST /auth/refresh`
Rotates the refresh token and returns a new access token.
- **Security Invariant:** If an already-revoked refresh token is re-submitted, token reuse detection revokes the entire token family immediately and returns `401 Unauthorized`.

### `POST /auth/logout`
Revokes the refresh token and records an audit trail event.

### `POST /auth/mfa/setup` & `POST /auth/mfa/verify`
Configures pyotp-based TOTP 2-factor authentication.

### `GET /auth/me`
Returns current user context, tenant ID, active roles, and granted permissions.

---

## 2. Tenancy & Organizations (`/api/v1/tenants`)

### `GET /tenants/me`
Retrieves legal organization profile, trading name, KRA PIN, base currency, and contact details.

### `PATCH /tenants/me`
Updates tenant business profile. Requires `tenant:manage` permission.

### `GET /tenants/branches` & `POST /tenants/branches`
Lists and creates physical branches/depots. Requires `branch:manage`.

### `GET /tenants/users` & `POST /tenants/users/invite`
Manages team staff and role assignments (`owner`, `finance_admin`, `accountant`, `cashier`, `auditor`, `viewer`).

---

## 3. Customer Directory (`/api/v1/customers`)

### `GET /customers/`
Lists customer accounts for the tenant. Supports search filtering across company name, email, and KRA PIN.

### `POST /customers/`
Creates a new customer account under the current tenant with optional KRA PIN for tax invoicing.
- **Payload:**
  ```json
  {
    "name": "Safari Holdings Ltd",
    "email": "billing@safariholdings.co.ke",
    "phone": "+254711002233",
    "kra_pin": "P051234567A",
    "address": "Westlands, Nairobi",
    "currency": "KES"
  }
  ```

### `GET /customers/{id}` & `PATCH /customers/{id}`
Retrieves or updates customer account details and active status.

---

## 4. Payments & Ingestion (`/api/v1/payments`)

### `POST /payments/stk-push`
Initiates an M-PESA STK Push prompt to a customer handset.
- **Payload:**
  ```json
  {
    "phone_number": "254712345678",
    "amount": "1500.00",
    "account_reference": "INV-2026-0001",
    "description": "Consulting Services Settlement"
  }
  ```
- **Lifecycle:** `INITIATED -> PENDING -> SUCCEEDED | CANCELLED | FAILED | TIMED_OUT`.

### `POST /payments/daraja/callback`
Asynchronous webhook listener receiving Safaricom Daraja STK Push callbacks. Enforces idempotency deduplication by `CheckoutRequestID` and M-PESA receipt number.

### `POST /payments/c2b/confirmation`
Listener for M-PESA C2B paybill and buy goods confirmation notifications.

### `GET /payments/`
Lists payments with status, provider, and date range filters.

### `GET /payments/providers` & `POST /payments/providers`
Manages encrypted payment provider credentials at rest (Safaricom Daraja consumer key, secret, passkey).

---

## 5. Banking & Statement Ingestion (`/api/v1/banking`)

### `GET /banking/accounts` & `POST /banking/accounts`
Registers and lists commercial bank accounts (KCB, Equity, Stanbic, NCBA).

### `POST /banking/accounts/{id}/import`
Uploads a CSV bank statement file (`multipart/form-data`). Computes SHA-256 row hashes (`bank_account_id:date:ref:amount:type`) to reject duplicate rows safely while accepting valid entries.
- **Response:**
  ```json
  {
    "bank_account_id": "uuid",
    "filename": "KCB_Statement_Nov.csv",
    "total_rows": 142,
    "accepted_rows": 138,
    "duplicate_rows": 4,
    "rejected_rows": 0,
    "rejection_reasons": []
  }
  ```

### `GET /banking/transactions`
Lists parsed and deduplicated bank statement transaction entries.

---

## 6. Reconciliation Engine (`/api/v1/reconciliation`)

### `POST /reconciliation/runs`
Executes an on-demand 5-tier deterministic matching run:
- **Tier 1:** Exact M-PESA checkout transaction reference.
- **Tier 2:** Exact invoice number in customer payment reference.
- **Tier 3:** Exact amount and unique matching customer.
- **Tier 4:** Exact amount within configurable date window ($\pm 3$ days).
- **Tier 5:** Exception queue for manual intervention.
- **Compliance Rule:** Ambiguous candidates NEVER auto-allocate; overpayments credit customer balance, never silent revenue.

### `GET /reconciliation/runs`
Lists past reconciliation matching runs with matched vs. unmatched totals.

### `GET /reconciliation/exceptions`
Lists open reconciliation exceptions flagged for finance review.

### `POST /reconciliation/exceptions/{id}/resolve`
Manually resolves an exception with full audit trail logging.

---

## 7. Invoices, Credit Notes & eTIMS (`/api/v1/invoices` & `/api/v1/tax`)

### `GET /invoices/`
Lists invoices with status and customer filtering.

### `POST /invoices/`
Creates a draft tax invoice with automatic 16% standard VAT breakdown.
- **Payload:**
  ```json
  {
    "customer_id": "uuid",
    "issue_date": "2026-11-10",
    "due_date": "2026-11-24",
    "notes": "Consulting and infrastructure audit",
    "items": [
      {
        "description": "Cloud Migration",
        "quantity": "1.0",
        "unit_price": "50000.00",
        "tax_rate": "16.00"
      }
    ]
  }
  ```

### `POST /invoices/{id}/issue`
Transitions invoice from `DRAFT` to `ISSUED_INTERNAL`. Automatically generates and posts a balanced double-entry journal entry to the General Ledger (`DR 1200 Accounts Receivable / CR 4000 Revenue & CR 2100 VAT Payable`).

### `GET /invoices/{id}/pdf`
Generates and streams a branded ReportLab PDF invoice document with Kenyan tax compliant breakdown.

### `POST /invoices/{id}/credit-notes`
Issues a credit note against an invoice, reducing the balance due and crediting any excess to customer balance.

### `POST /invoices/{id}/etims/manual-record`
Records physical/external KRA eTIMS portal reference numbers and auditor verification notes.
- **Section 2 Rule 9 Invariant:** Strictly marks invoice as `MANUALLY_RECORDED`. Never fabricates fake KRA control numbers or marks invoices as `ACCEPTED` without an authentic provider response.

### `GET /tax/submissions` & `GET /tax/configurations`
Lists tax rate configurations and historical eTIMS compliance logs.

---

## 8. General Ledger & Double-Entry Accounting (`/api/v1/accounting`)

### `GET /accounting/accounts` & `POST /accounting/accounts`
Retrieves Kenyan SME Chart of Accounts and allows adding new ledger accounts.

### `GET /accounting/journals` & `POST /accounting/journals`
Lists and creates manual journal entries.
- **Invariance Rule:** Every posted journal entry MUST balance ($\sum \text{Debits} == \sum \text{Credits}$) or it fails closed with `422 UnbalancedJournalEntryError`.

### `POST /accounting/journals/{id}/reverse`
Generates an immutable reversing journal entry that swaps debits and credits, preserving full historical audit records.

### `GET /accounting/trial-balance`
Generates a real-time Trial Balance verifying that total debits equal total credits.

---

## 9. Scoped API Keys & Automations (`/api/v1/api-keys` & `/api/v1/automations`)

### `GET /api-keys` & `POST /api-keys`
Generates scoped, hash-stored API keys (`X-API-Key: rpo_live_...`) with configurable granular scopes (`n8n:workflow:run`, `invoice:read`, `payment:write`).

### `GET /automations/catalog`
Lists all 11 production n8n workflows (`WF01`–`WF08`, `WF10`–`WF12`) with download and trigger capabilities.

### `POST /automations/trigger/{workflow_id}`
Triggers workflow execution via n8n webhook or internal task dispatch.

---

## 10. Audit & Health (`/api/v1/audit-logs` & `/health`)

- `GET /api/v1/audit-logs`: Tenant-isolated audit trail.
- `GET /health/live`: Liveness probe.
- `GET /health/ready`: Readiness probe verifying database and redis connectivity.

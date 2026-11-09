# Rodstar PayOps: Architecture & Design Decisions Log

This document tracks all key technical choices, financial correctness policies, and baseline assumptions for the Rodstar PayOps platform.

---

## Decision 001: Money Representation & Precision
- **Context:** Financial calculations must never suffer from floating-point inaccuracy.
- **Decision:** Use Python `decimal.Decimal` throughout application logic and PostgreSQL `NUMERIC(18, 2)` for database storage. All currency fields are strictly paired with an ISO currency code (default `'KES'`). Minor units / float conversions are forbidden in ledger and accounting layers.
- **Consequences:** Eliminates rounding drift, guarantees ledger debit/credit exactness.

---

## Decision 002: Tenant Isolation & Scoped Data Layer
- **Context:** PayOps is a multi-tenant SaaS serving independent Kenyan businesses. Cross-tenant leakage is a critical security violation.
- **Decision:** Every tenant-owned table contains a mandatory non-nullable `tenant_id` foreign key. All ORM queries and service layers operate through an authenticated tenant context (`TenantContext`) provided by FastAPI dependency injection. Direct un-scoped table queries in route handlers are prohibited. Cross-tenant integration tests must assert fail-closed access.
- **Consequences:** Guaranteed boundary isolation across organizations.

---

## Decision 003: Double-Entry Ledger & Append-Only Invariance
- **Context:** Kenyan accounting standards and audit trails require complete immutability of financial history.
- **Decision:** Journal entries and ledger postings are strictly append-only. No `UPDATE` or `DELETE` statements may be executed against `journal_entries` or `ledger_entries`. All corrections must be achieved via explicit reversing journal entries referencing the original entry ID, followed by a new posting if applicable. Only a single designated service (`PostingService`) has permission to write to journal tables.
- **Consequences:** Full auditability for auditors, KRA inspections, and internal reconciliation.

---

## Decision 004: Inbound Callback & Webhook Verification
- **Context:** Inbound M-PESA Daraja and bank callbacks are external HTTP requests that cannot be trusted unconditionally.
- **Decision:** All callbacks are first logged verbatim into an immutable `webhook_events` table before processing. Signatures, IP whitelists (where applicable), and shared secrets are verified. Idempotency keys (`provider` + `provider_reference` or `checkout_request_id`) prevent duplicate credits. If a callback arrives duplicated, the system returns the provider's expected HTTP response (e.g., `{"ResultCode": 0, "ResultDesc": "Accepted"}`) without mutating balances.
- **Consequences:** Resilient against network retries and duplicate webhooks.

---

## Decision 005: eTIMS Status Integrity & Provider Decoupling
- **Context:** eTIMS compliance claims must be verified by official KRA endpoints. Faking or prematurely labeling invoices as "eTIMS accepted" creates legal liability.
- **Decision:** Invoices remain in `DRAFT`, `ISSUED_INTERNAL`, or `UNDER_REVIEW` until an official provider response is received. In Release 1, where live KRA credentials may be absent, invoices may be marked as "manually recorded" by authorized finance staff (recording reference, timestamp, and user ID), but will never be labeled "accepted by KRA" or given simulated KRA control numbers. The `TaxAuthorityProvider` interface defines an abstract contract allowing seamless drop-in of live OSCU/VSCU adapters in Release 2 without modifying invoicing business logic.
- **Consequences:** Compliance integrity is strictly maintained; zero fake claims.

---

## Decision 006: n8n Automation Boundary
- **Context:** n8n orchestrates workflows (email/SMS reminders, daily schedule triggers, status alerts).
- **Decision:** n8n communicates with PayOps solely via backend REST APIs over HTTPS using dedicated service accounts with narrowly-scoped API tokens. n8n is never given direct PostgreSQL database credentials or internal database network access.
- **Consequences:** Preserves the backend as the single source of financial and business truth.

---

## Decision 007: Confirmed Project Configuration & Architectural Decisions (Owner Confirmed)
1. **Payments & Daraja:** Multi-tenant provider configuration model. Businesses configure their preferred payment methods (Paybill shortcode, Till Number / Buy Goods, Bank feeds, manual). Core platform provides clean adapter interfaces, validation, idempotency, and state machine. Live Safaricom Daraja remains marked `implemented, unverified against live provider` until a tenant or operator provides credentials for a live sandbox/production test.
2. **Deployment & Domain:** Configured for Hetzner Cloud infrastructure with target domain `payops.rodstartechdevs.co.ke`. Docker Compose, Nginx reverse proxy, TLS, and CORS policies are locked to this target.
3. **Notification Channels:** Phase 1 and Release 1 wire transactional email (SMTP with configurable relay; e.g. Amazon SES, Postmark, Mailgun) as primary. SMS channel architecture is designed with pluggable adapters (e.g. Africa's Talking) allowing tenants to opt-in or activate per business preference.
4. **Brand & Design Identity:** Modern fintech aesthetic featuring Rodstar Deep Navy (`#0B192C` / `#0F172A`), Emerald Green accent (`#10B981`), refined slate neutral backgrounds, high-contrast accessible data tables, and professional metric charts.
5. **KRA eTIMS Strategy:** Release 1 keeps eTIMS in explicit manual review mode. Invoices can be marked as "manually recorded" with audit references, actor tracking, and timestamp. The `TaxAuthorityProvider` interface is implemented with a `NotConfigured` and `ManualReviewAdapter`, allowing live OSCU/VSCU adapters to be plugged in later without altering any core invoicing or ledger logic. No invoice will ever be stamped as "accepted by KRA" without authenticated cryptographic provider verification.


---

## Decision 008: Scoped API Key Authentication (`rpo_live_...`) for n8n Service Accounts
- **Context:** Automated orchestrators (n8n, cron workers) need headless authentication without interactive login or user refresh tokens.
- **Decision:** Implemented cryptographically secure API keys prefixed with `rpo_live_`. Keys are displayed once upon generation and hashed with SHA-256 (`key_hash`) at rest. Each key is bound to a tenant and an explicit list of granted permission scopes (`automation:run`, `payment:record`, etc.). Requests provide `X-API-Key: rpo_live_...`, which FastAPI's `get_tenant_context` verifies fail-closed.
- **Consequences:** Safe headless access adhering strictly to least privilege.

---

## Decision 009: Bank Statement Deduplication via SHA-256 Row Hashing
- **Context:** Kenyan businesses repeatedly upload monthly or weekly CSV bank statements containing overlapping transaction lines. Duplicate imports corrupt balances and double-credit customers.
- **Decision:** Every ingested bank statement line calculates a deterministic SHA-256 hash from `(bank_account_id, tx_date, reference, amount, tx_type)`. The database schema enforces a tenant-scoped unique constraint `uq_bank_transactions_tenant_row_hash`. The importer skips duplicate rows, safely catches and logs malformed lines without crashing, and updates the account balance accurately.
- **Consequences:** Re-importing the same CSV is 100% idempotent with zero duplicate ledger impact.

# Tuma API Integration Guide: Parent/Child Automated Onboarding

**System:** Rodstar PayOps (Multi-tenant SaaS)  
**Parent Gateway:** Tuma API (`https://api.tuma.co.ke`)  
**Scope:** Collections Only (M-PESA STK Push settling directly to Tenant Commercial Bank Accounts)

---

## 1. Setup & Environment Variables

The parent Tuma credentials live in your environment configuration (or secrets manager in production):

```ini
# Tuma API Parent Account Configuration
TUMA_BASE_URL=https://api.tuma.co.ke
TUMA_API_KEY=tuma_live_parent_api_key_here
TUMA_BUSINESS_EMAIL=parent@rodstartechdevs.co.ke
TUMA_WEBHOOK_BASE_URL=https://payops.rodstartechdevs.co.ke

# Optional Daraja Rail (Secondary Rail for tenants with existing Paybill/Till)
DARAJA_ENABLED=true

# Security & Encryption (Fernet master key for child API keys and account numbers at rest)
CREDENTIALS_ENCRYPTION_KEY=Wb0T3r_G3Z1Zf1fWj_Wz2X4y6z8A0b1C2d3E4F5g6H8=
```

---

## 2. Onboarding Flow

1. **Sign-up:** Tenant registers business profile on Rodstar PayOps. Initial state is `awaiting_settlement`.
2. **Settlement Connection:** Tenant selects their Kenyan commercial bank from the cached reference bank list and inputs their bank account number.
3. **Automated Provisioning:**
   - PayOps uses the Parent Tuma credentials to call `POST /businesses`.
   - The returned `api_key` is immediately envelope-encrypted with AES-256 Fernet + `key_version = 1`.
   - PayOps authenticates as the child (`POST /auth/token`) to verify the token.
   - Child profile status transitions to `active`.
4. **Collections Enabled:** Tenant can now trigger live M-PESA STK pushes for their sales invoices. Incoming payments settle directly to their commercial bank account.

---

## 3. Workaround Mode & Open Questions for Tuma

Every workaround is guarded behind the `TumaGateway` abstraction and marked with `TODO(tuma-confirm)`:

1. **`TODO(tuma-confirm:paybill-till-settlement)`**: Tuma child creation only accepts `bank_id` + `account_number`. Direct Till/Paybill settlement is deferred. Per-tenant Daraja remains available as an optional second rail.
2. **`TODO(tuma-confirm:webhook-signature)`**: In the absence of an HMAC SHA-256 signature specification, webhooks are verified via unguessable per-tenant token URL paths (`/api/v1/webhooks/tuma/{webhook_token}/stk`) plus exact `checkout_request_id` and amount matching.
3. **`TODO(tuma-confirm:non-stk-webhooks)`**: Automatic webhook ingestion for non-STK receipts (direct Paybill C2B) is deferred until Tuma publishes the spec. Bank statement CSV import serves as the primary fallback.
4. **`TODO(tuma-confirm:status-lookup)`**: Requests with no callback after 5 minutes enter `awaiting_confirmation` and are resolved via late webhook or bank statement matching.
5. **`TODO(tuma-confirm:child-update-suspension)`**: Settlement updates require administrative re-auth and platform admin assistance. Suspension is enforced at the PayOps layer.
6. **`TODO(tuma-confirm:rate-limits-and-sandbox)`**: Single-flight token refresh with Redis lock, backoff on 429.

---

## 4. Runbook

- **Failed Provisioning:** Check `tuma_provisioning_jobs`. If status is `needs_action`, review `last_error`. Correct bank details or retry via platform admin.
- **Rotating Parent Key:** Update `TUMA_API_KEY` in environment/secrets manager. All existing child keys remain active and unaffected.
- **Lost Child Key:** Because child API keys are shown only once upon creation, if a key is corrupted, the child record must be re-keyed via administrative support.
- **Tuma Outage:** STK push requests queue and back off. Webhook callbacks retry. No duplicate children are created.

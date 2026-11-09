# Rodstar PayOps: n8n Automation Engine Connection Guide

This document describes how to connect, configure, and orchestrate n8n workflows with the **Rodstar PayOps** multi-tenant platform.

---

## 1. Architectural Principles & Security Boundary

In strict accordance with the Rodstar PayOps security specification:

1. **Backend is the Single Source of Financial Truth**:
   - The backend enforces double-entry general ledger invariants, deterministic reconciliation rules, and KRA compliance.
   - **n8n holds zero database credentials and cannot connect to port 5432 directly.**
   - All n8n actions occur via authenticated HTTPS/HTTP REST API endpoints under `/api/v1/automations/*`.
2. **Authentication via Scoped API Keys**:
   - Each n8n service account authenticates using the `X-API-Key` header with format `rpo_live_<random_bytes>`.
   - API keys are hashed with SHA-256 at rest and granted explicit, least-privilege scopes (e.g. `automation:run`, `payment:record`, `reconciliation:run`).
3. **Fail-Closed Tenancy**:
   - An API key belongs to a specific tenant organization. All records scanned, ingested, or reconciled are isolated to that tenant.
4. **Retry with Exponential Backoff & Incident Alerting**:
   - Each workflow has 3 retry attempts on transient network errors (3-5s delay).
   - If retries are exhausted, the workflow executes an error branch that sends a POST payload to `/api/v1/automations/alerts`, automatically recording an incident in the audit trail.

---

## 2. Docker Compose Deployment (Hetzner Cloud VPS)

`docker-compose.yml` includes the official n8n image connected to the internal bridge network:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rodstar_backend
    restart: unless-stopped
    ports:
      - "8000:8000"

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: rodstar_n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=payops.rodstartechdevs.co.ke
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://payops.rodstartechdevs.co.ke/n8n/
      - PAYOPS_BACKEND_URL=http://backend:8000
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - backend
```

---

## 3. Provisioning Service Account API Keys

1. Navigate to **Automations** in the Rodstar PayOps Dashboard (`http://localhost:5174/automations` or `https://payops.rodstartechdevs.co.ke/automations`).
2. Click **Generate n8n API Key**.
3. Provide a name (e.g., `n8n Hetzner Orchestrator`) and select the required scopes:
   - `automation:run`
   - `automation:view`
   - `payment:view`
   - `payment:initiate`
   - `payment:record`
   - `bank:import`
   - `reconciliation:run`
   - `reconciliation:view`
   - `etims:review`
   - `invoice:view`
   - `report:view`
4. Copy the raw key (`rpo_live_...`). This key is only shown once.

---

## 4. Configuring Credentials in n8n

In the n8n Web UI:

1. Go to **Credentials** &rarr; **Add Credential**.
2. Select **Header Auth**.
3. Set:
   - **Name**: `Rodstar PayOps API Key`
   - **Header Name**: `X-API-Key`
   - **Header Value**: `rpo_live_your_copied_key_here`
4. Save the credential.

---

## 5. Workflow Catalog & Import

All 11 production workflows are located in `n8n/workflows/` and can be imported directly into n8n:

| ID | Workflow Name | Cadence / Trigger | Backend Endpoint Called |
|---|---|---|---|
| **WF01** | M-PESA Intake Polling | Continuous (1 min) | `POST /api/v1/automations/mpesa-poll` |
| **WF02** | STK Push Initiation Trigger | Webhook / On-demand | `POST /api/v1/automations/stk-push` |
| **WF03** | STK Callback Webhook Processor | Inbound Webhook | `POST /api/v1/automations/process-callbacks` |
| **WF04** | Invoice Auto-Reconciliation | Daily at 02:00 EAT | `POST /api/v1/automations/reconciliation/run` |
| **WF05** | Unmatched Exceptions Alert | Daily at 06:00 EAT | `GET /api/v1/automations/reconciliation/exceptions` |
| **WF06** | Bank Statement Ingest Pipeline | Continuous / Webhook | `POST /api/v1/automations/banking/process` |
| **WF07** | Daily Bank Reconciliation | Daily at 23:00 EAT | `POST /api/v1/automations/banking/daily-reconcile` |
| **WF08** | eTIMS Submission Queue | Batched (every 15 min)| `POST /api/v1/automations/tax/etims-queue` |
| **WF10** | Customer Invoice Delivery | Instant on Issue | `POST /api/v1/automations/invoices/delivery` |
| **WF11** | Payment Reminder Notifications| Weekly (Mon 09:00 EAT)| `POST /api/v1/automations/invoices/reminders` |
| **WF12** | Daily Executive Financial Report| Daily at 07:00 EAT | `GET /api/v1/automations/reports/daily-summary` |

### How to Import:
- **Method A (From UI):** In the Rodstar PayOps Automations page, click **Export JSON** on any workflow &rarr; click **Download .json** &rarr; in n8n click **Import from File**.
- **Method B (CLI Batch Import):** Run inside the n8n container:
  ```bash
  for f in /n8n/workflows/*.json; do
    n8n import:workflow --input="$f"
  done
  ```

---

## 6. Live Inbound Webhook Endpoints

For Daraja and External Banking callbacks:

- **Daraja STK Callback**: `https://payops.rodstartechdevs.co.ke/n8n/webhook/daraja-callback`
  - Routes payload to WF03 &rarr; performs idempotency check &rarr; transitions payment record &rarr; queues for reconciliation.
- **External Checkout Trigger**: `https://payops.rodstartechdevs.co.ke/n8n/webhook/initiate-stk`
  - Dispatches STK push request via backend to customer handset.

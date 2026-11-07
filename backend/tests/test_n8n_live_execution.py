import json
from pathlib import Path
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenants import Tenant
from app.models.api_keys import ApiKey
from app.models.audit import AuditLog
from app.core.security import hash_token


@pytest.mark.asyncio
async def test_n8n_all_workflows_execute_against_backend(
    db_session: AsyncSession,
    client: AsyncClient,
):
    """
    Validates Phase 6 Exit Criteria:
    Each of the 11 n8n workflows can run against the authenticated backend API
    using a scoped API key (X-API-Key), and failure alerting properly logs audit events.
    """
    # 1. Setup Tenant and Scoped API Key for n8n
    tenant = Tenant(
        name="n8n Automated Ops Tenant",
        email="ops@rodstartechdevs.co.ke",
        currency="KES",
        is_active=True,
    )
    db_session.add(tenant)
    await db_session.commit()

    raw_api_key = "rpo_live_n8n_automation_test_token_1234567890abcdef"
    api_key_record = ApiKey(
        tenant_id=tenant.id,
        name="n8n Cloud Orchestrator Service Account",
        key_hash=hash_token(raw_api_key),
        key_prefix="rpo_live_n8n_auto",
        scopes=[
            "automation:view",
            "automation:run",
            "payment:view",
            "payment:initiate",
            "payment:record",
            "bank:import",
            "reconciliation:view",
            "reconciliation:run",
            "reconciliation:manage",
            "etims:review",
            "tax:manage",
            "invoice:view",
            "invoice:deliver",
            "report:view",
            "notification:send",
        ],
        is_active=True,
    )
    db_session.add(api_key_record)
    await db_session.commit()

    auth_headers = {
        "X-API-Key": raw_api_key,
        "Content-Type": "application/json",
    }

    # 2. Check workflow discovery endpoint
    list_res = await client.get("/api/v1/automations/workflows", headers=auth_headers)
    assert list_res.status_code == 200, list_res.text
    workflows_list = list_res.json()
    assert len(workflows_list) == 11
    for item in workflows_list:
        assert item["is_available"] is True

    # 3. Test downloading workflow JSON for WF01 and WF04
    wf01_content_res = await client.get("/api/v1/automations/workflows/WF01/content", headers=auth_headers)
    assert wf01_content_res.status_code == 200
    wf01_data = wf01_content_res.json()
    assert wf01_data["name"] == "WF01: M-PESA Intake Polling"

    # 4. Map of representative payloads for each workflow's main HTTP node
    workflow_test_cases = [
        ("WF01", "/api/v1/automations/mpesa-poll", "POST", {}),
        ("WF02", "/api/v1/automations/stk-push", "POST", {
            "phone_number": "254712345678",
            "amount": "1500.00",
            "account_reference": "INV-2026-0001",
        }),
        ("WF03", "/api/v1/automations/process-callbacks", "POST", {
            "raw_callback": {"Body": {"stkCallback": {"ResultCode": 0}}}
        }),
        ("WF04", "/api/v1/automations/reconciliation/run", "POST", {}),
        ("WF05", "/api/v1/automations/reconciliation/exceptions", "GET", None),
        ("WF06", "/api/v1/automations/banking/process", "POST", {}),
        ("WF07", "/api/v1/automations/banking/daily-reconcile", "POST", {}),
        ("WF08", "/api/v1/automations/tax/etims-queue", "POST", {}),
        ("WF10", "/api/v1/automations/invoices/delivery", "POST", {
            "invoice_id": "test-inv-001",
            "recipient_email": "client@example.com"
        }),
        ("WF11", "/api/v1/automations/invoices/reminders", "POST", {}),
        ("WF12", "/api/v1/automations/reports/daily-summary", "GET", None),
    ]

    # Execute each workflow against the backend
    for wf_id, endpoint, method, payload in workflow_test_cases:
        if method == "POST":
            res = await client.post(endpoint, headers=auth_headers, json=payload or {})
        else:
            res = await client.get(endpoint, headers=auth_headers)

        assert res.status_code == 200, f"Workflow {wf_id} failed on {endpoint}: {res.text}"
        res_json = res.json()
        assert (
            "workflow_id" in res_json
            or "data" in res_json
            or "exceptions" in res_json
            or "scanned_records" in str(res_json)
            or "total_pending" in str(res_json)
        ), f"{wf_id} invalid response"

    # 5. Test manual job trigger from UI/API
    trigger_res = await client.post(
        "/api/v1/automations/jobs/WF04/run",
        headers=auth_headers,
    )
    assert trigger_res.status_code == 200
    assert trigger_res.json()["status"] == "COMPLETED"

    # 6. Test final failure alerting branch (from n8n error branch)
    alert_payload = {
        "workflow_id": "WF02",
        "error_message": "Safaricom Daraja API gateway 503 timeout after 3 retries",
        "attempt_count": 3,
        "execution_context": {
            "phone_number": "254712345678",
            "amount": "1500.00",
            "n8n_execution_id": "exec_987654"
        }
    }
    alert_res = await client.post("/api/v1/automations/alerts", headers=auth_headers, json=alert_payload)
    assert alert_res.status_code == 201
    assert alert_res.json()["status"] == "alert_recorded"

    # Verify audit event was logged in the database
    stmt = (
        select(AuditLog)
        .where(
            AuditLog.tenant_id == tenant.id,
            AuditLog.action == "AUTOMATION_WORKFLOW_FAILED"
        )
    )
    audit_res = await db_session.execute(stmt)
    logged_event = audit_res.scalar_one_or_none()
    assert logged_event is not None
    assert logged_event.resource_id == "WF02"
    assert logged_event.details["attempt_count"] == 3

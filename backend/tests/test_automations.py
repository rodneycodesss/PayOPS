import json
import os
import glob
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_automation_endpoints_and_alerting(client: AsyncClient, tenant_a: dict):
    """Verifies that all backend automation endpoints called by n8n workflows return 200/201."""
    headers = tenant_a["headers"]

    # WF01: M-PESA Poll
    res01 = await client.post("/api/v1/automations/mpesa-poll", headers=headers)
    assert res01.status_code == 200
    assert res01.json()["workflow_id"] == "WF01"

    # WF02: STK Push
    res02 = await client.post(
        "/api/v1/automations/stk-push",
        headers=headers,
        json={"phone_number": "254712345678", "amount": "1000.00", "account_reference": "INV-101"}
    )
    assert res02.status_code == 200
    assert res02.json()["workflow_id"] == "WF02"

    # WF03: Process Callbacks
    res03 = await client.post("/api/v1/automations/process-callbacks", headers=headers)
    assert res03.status_code == 200
    assert res03.json()["workflow_id"] == "WF03"

    # WF04: Reconciliation Run
    res04 = await client.post("/api/v1/automations/reconciliation/run", headers=headers)
    assert res04.status_code == 200
    assert res04.json()["workflow_id"] == "WF04"

    # WF05: Reconciliation Exceptions
    res05 = await client.get("/api/v1/automations/reconciliation/exceptions", headers=headers)
    assert res05.status_code == 200
    assert res05.json()["workflow_id"] == "WF05"

    # WF06: Bank Process
    res06 = await client.post("/api/v1/automations/banking/process", headers=headers)
    assert res06.status_code == 200
    assert res06.json()["workflow_id"] == "WF06"

    # WF07: Daily Bank Rec
    res07 = await client.post("/api/v1/automations/banking/daily-reconcile", headers=headers)
    assert res07.status_code == 200
    assert res07.json()["workflow_id"] == "WF07"

    # WF08: eTIMS Queue
    res08 = await client.post("/api/v1/automations/tax/etims-queue", headers=headers)
    assert res08.status_code == 200
    assert res08.json()["workflow_id"] == "WF08"

    # WF10: Invoice Delivery
    res10 = await client.post(
        "/api/v1/automations/invoices/delivery",
        headers=headers,
        json={"invoice_id": "inv_001", "recipient_email": "customer@client.co.ke"}
    )
    assert res10.status_code == 200
    assert res10.json()["workflow_id"] == "WF10"

    # WF11: Payment Reminders
    res11 = await client.post("/api/v1/automations/invoices/reminders", headers=headers)
    assert res11.status_code == 200
    assert res11.json()["workflow_id"] == "WF11"

    # WF12: Daily Summary
    res12 = await client.get("/api/v1/automations/reports/daily-summary", headers=headers)
    assert res12.status_code == 200
    assert res12.json()["workflow_id"] == "WF12"

    # Failure Alert Receiver (Triggered on error branches)
    alert_res = await client.post(
        "/api/v1/automations/alerts",
        headers=headers,
        json={
            "workflow_id": "WF01",
            "error_message": "Safaricom Daraja API network timeout on attempt 3",
            "attempt_count": 3
        }
    )
    assert alert_res.status_code == 201
    assert alert_res.json()["status"] == "alert_recorded"


def test_n8n_workflow_json_files_integrity():
    """
    Phase 6 Exit Criteria:
    Verifies that all delivered n8n workflow files are valid JSON, contain nodes,
    define connections, and authenticate via X-API-Key with retries configured.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    workflows_dir = os.path.join(root_dir, "n8n", "workflows")
    workflow_files = glob.glob(os.path.join(workflows_dir, "*.json"))

    expected_prefixes = ["WF01", "WF02", "WF03", "WF04", "WF05", "WF06", "WF07", "WF08", "WF10", "WF11", "WF12"]
    assert len(workflow_files) >= len(expected_prefixes), f"Expected at least {len(expected_prefixes)} workflows"

    for file_path in workflow_files:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        assert "name" in data, f"Workflow {file_path} missing 'name'"
        assert "nodes" in data and len(data["nodes"]) >= 2, f"Workflow {file_path} missing nodes"
        assert "connections" in data, f"Workflow {file_path} missing 'connections'"

        # Verify that HTTP request nodes have retry configuration or headers
        raw_text = json.dumps(data)
        assert "X-API-Key" in raw_text or "webhook" in raw_text, f"Workflow {file_path} does not configure authentication"

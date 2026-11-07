import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_scoped_api_key_lifecycle_and_enforcement(client: AsyncClient, tenant_a: dict):
    """
    Verifies Phase 6 / n8n Service Account security:
    1. Tenant owner generates a scoped API key.
    2. Service account authenticates using X-API-Key header.
    3. Service account successfully accesses endpoints within its granted scope.
    4. Service account is blocked (403) from endpoints outside its granted scope.
    5. Once revoked, API key is immediately rejected (401).
    """
    owner_headers = tenant_a["headers"]

    # 1. Create a scoped API key for n8n (only granted 'report:view' and 'reconciliation:run')
    create_payload = {
        "name": "n8n Reconciliation Runner",
        "scopes": ["report:view", "reconciliation:run"],
        "expires_in_days": 30
    }
    create_res = await client.post("/api/v1/api-keys", headers=owner_headers, json=create_payload)
    assert create_res.status_code == 201, create_res.text
    key_data = create_res.json()
    raw_api_key = key_data["raw_api_key"]
    api_key_id = key_data["id"]
    assert raw_api_key.startswith("rpo_live_")

    n8n_headers = {"X-API-Key": raw_api_key}

    # 2. Service account calls an endpoint within granted scope (WF12 report)
    report_res = await client.get("/api/v1/automations/reports/daily-summary", headers=n8n_headers)
    assert report_res.status_code == 200
    assert report_res.json()["workflow_id"] == "WF12"

    # 3. Service account calls an endpoint within granted scope (WF04 reconciliation run)
    rec_res = await client.post("/api/v1/automations/reconciliation/run", headers=n8n_headers)
    assert rec_res.status_code == 200
    assert rec_res.json()["workflow_id"] == "WF04"

    # 4. Service account attempts to call an endpoint OUTSIDE its granted scope (e.g. branch creation requires 'branch:manage')
    # Must fail closed with 403 Forbidden!
    forbidden_res = await client.post(
        "/api/v1/tenants/branches",
        headers=n8n_headers,
        json={"name": "Hacked Branch", "code": "HCK", "is_headquarters": False}
    )
    assert forbidden_res.status_code == 403
    assert "permission denied" in forbidden_res.json()["detail"].lower()

    # 5. Revoke the API key
    revoke_res = await client.delete(f"/api/v1/api-keys/{api_key_id}", headers=owner_headers)
    assert revoke_res.status_code == 200

    # 6. Subsequent call with revoked key MUST fail with 401
    rejected_res = await client.get("/api/v1/automations/reports/daily-summary", headers=n8n_headers)
    assert rejected_res.status_code == 401

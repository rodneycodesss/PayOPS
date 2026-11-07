import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_audit_logging_trail(client: AsyncClient, tenant_a: dict):
    """Verifies that sensitive tenant operations produce immutable audit records."""
    headers = tenant_a["headers"]

    # 1. Action: update tenant profile
    update_res = await client.patch(
        "/api/v1/tenants/me",
        headers=headers,
        json={"trading_name": "Alpha Prime Logistics"}
    )
    assert update_res.status_code == 200

    # 2. Action: create a branch
    branch_res = await client.post(
        "/api/v1/tenants/branches",
        headers=headers,
        json={
            "name": "Kisumu Hub",
            "code": "KSU-01",
            "is_headquarters": False
        }
    )
    assert branch_res.status_code == 201

    # 3. Fetch audit logs
    audit_res = await client.get("/api/v1/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    
    actions = [l["action"] for l in logs]
    assert "TENANT_PROFILE_UPDATED" in actions
    assert "BRANCH_CREATED" in actions
    
    # Check that actor email is recorded
    for log in logs:
        if log["action"] == "BRANCH_CREATED":
            assert log["actor_email"] == "alice@alpha.co.ke"
            assert log["resource_type"] == "branch"
            assert log["details"]["code"] == "KSU-01"

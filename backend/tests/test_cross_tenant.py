import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tenant_repository import TenantScopedRepository
from app.models.branches import Branch


@pytest.mark.asyncio
async def test_cross_tenant_isolation_fails_closed(
    client: AsyncClient,
    db_session: AsyncSession,
    tenant_a: dict,
    tenant_b: dict
):
    """
    Mandatory cross-tenant isolation security tests:
    1. Tenant A creates resources (e.g. Branch).
    2. Tenant B attempting to read Tenant A's resource by ID fails closed with 404.
    3. Tenant B listing resources only receives Tenant B's own records.
    4. Tenant B cannot view Tenant A's team users or audit logs.
    5. TenantScopedRepository directly prevents cross-tenant query bypass.
    """
    headers_a = tenant_a["headers"]
    headers_b = tenant_b["headers"]

    # 1. Tenant A creates a new branch
    branch_payload = {
        "name": "Mombasa Port Station",
        "code": "MSA-01",
        "address": "Kilindini Harbour, Mombasa",
        "is_headquarters": False
    }
    create_res = await client.post("/api/v1/tenants/branches", headers=headers_a, json=branch_payload)
    assert create_res.status_code == 201
    branch_a_id = create_res.json()["id"]

    # 2. Tenant B attempts ID guessing / direct lookup of Tenant A's branch
    # Direct access across tenant boundary MUST fail closed as 404
    repo_b = TenantScopedRepository(Branch, db_session, tenant_b["tenant"].id)
    queried_by_b = await repo_b.get_by_id(branch_a_id)
    assert queried_by_b is None, "Cross-tenant leak: Tenant B retrieved Tenant A's branch!"

    # 3. Tenant B lists branches -> must NOT contain Tenant A's branch
    list_b_res = await client.get("/api/v1/tenants/branches", headers=headers_b)
    assert list_b_res.status_code == 200
    branches_b = list_b_res.json()
    b_branch_ids = [b["id"] for b in branches_b]
    assert branch_a_id not in b_branch_ids
    # Tenant B should only see their own HQ branch
    assert len(branches_b) == 1
    assert branches_b[0]["code"] == "HQ"

    # 4. Tenant B lists users -> must NOT see Tenant A's owner (Alice)
    users_b_res = await client.get("/api/v1/tenants/users", headers=headers_b)
    assert users_b_res.status_code == 200
    users_b = users_b_res.json()
    user_b_emails = [u["email"] for u in users_b]
    assert "bob@beta.co.ke" in user_b_emails
    assert "alice@alpha.co.ke" not in user_b_emails

    # 5. Tenant B attempts to read Tenant A's audit logs
    # Tenant A generates an audit log
    await client.patch(
        "/api/v1/tenants/me",
        headers=headers_a,
        json={"name": "Alpha Enterprises Holding"}
    )
    # Tenant B queries audit logs
    audit_b_res = await client.get("/api/v1/audit-logs", headers=headers_b)
    assert audit_b_res.status_code == 200
    logs_b = audit_b_res.json()
    for log in logs_b:
        assert log["tenant_id"] == tenant_b["tenant"].id
        assert log["actor_email"] != "alice@alpha.co.ke"

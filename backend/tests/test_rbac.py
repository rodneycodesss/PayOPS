import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_rbac_permission_enforcement(client: AsyncClient, tenant_a: dict):
    """Verifies that granular RBAC permissions block unauthorized actions with 403 Forbidden."""
    owner_headers = tenant_a["headers"]

    # 1. Owner invites a user with role 'viewer'
    invite_payload = {
        "email": "charlie.viewer@alpha.co.ke",
        "full_name": "Charlie Viewer",
        "role_name": "viewer",
        "temp_password": "ViewerPassword123!"
    }
    invite_res = await client.post(
        "/api/v1/tenants/users/invite",
        headers=owner_headers,
        json=invite_payload
    )
    assert invite_res.status_code == 201

    # 2. Viewer logs in
    login_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "charlie.viewer@alpha.co.ke",
            "password": "ViewerPassword123!"
        }
    )
    assert login_res.status_code == 200
    viewer_token = login_res.json()["access_token"]
    viewer_headers = {"Authorization": f"Bearer {viewer_token}"}

    # 3. Viewer attempts to create a branch (requires 'branch:manage') -> must return 403 Forbidden!
    branch_payload = {
        "name": "Nairobi West Branch",
        "code": "NBO-02",
        "is_headquarters": False
    }
    forbidden_branch_res = await client.post(
        "/api/v1/tenants/branches",
        headers=viewer_headers,
        json=branch_payload
    )
    assert forbidden_branch_res.status_code == 403
    assert "permission denied" in forbidden_branch_res.json()["detail"].lower()

    # 4. Viewer attempts to update tenant profile (requires 'tenant:manage') -> 403 Forbidden!
    forbidden_profile_res = await client.patch(
        "/api/v1/tenants/me",
        headers=viewer_headers,
        json={"name": "Hacked Tenant Name"}
    )
    assert forbidden_profile_res.status_code == 403

    # 5. Viewer attempts to view audit logs (requires 'audit:view') -> 403 Forbidden!
    forbidden_audit_res = await client.get(
        "/api/v1/audit-logs",
        headers=viewer_headers
    )
    assert forbidden_audit_res.status_code == 403

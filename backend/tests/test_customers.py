import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_customer_crud_and_isolation(
    client: AsyncClient,
    tenant_a: dict,
    tenant_b: dict,
):
    token_a = tenant_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = tenant_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Create Customer in Tenant A
    payload = {
        "name": "Nairobi Tech Ventures",
        "email": "finance@ntv.co.ke",
        "phone": "+254711002233",
        "kra_pin": "P051234567A",
        "address": "Westlands, Nairobi",
        "currency": "KES",
    }
    create_res = await client.post("/api/v1/customers/", headers=headers_a, json=payload)
    assert create_res.status_code == 201, create_res.text
    cust_data = create_res.json()
    customer_id = cust_data["id"]
    assert cust_data["name"] == "Nairobi Tech Ventures"
    assert cust_data["kra_pin"] == "P051234567A"
    assert cust_data["credit_balance"] == "0.00"

    # 2. Duplicate email in same tenant fails
    dup_res = await client.post("/api/v1/customers/", headers=headers_a, json=payload)
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"]

    # 3. Tenant B cannot see Customer from Tenant A (isolation)
    get_b_res = await client.get(f"/api/v1/customers/{customer_id}", headers=headers_b)
    assert get_b_res.status_code == 404

    list_b_res = await client.get("/api/v1/customers/", headers=headers_b)
    assert list_b_res.status_code == 200
    assert all(c["id"] != customer_id for c in list_b_res.json())

    # 4. Tenant A can list and filter customers
    list_a_res = await client.get("/api/v1/customers/?search=Nairobi", headers=headers_a)
    assert list_a_res.status_code == 200
    assert any(c["id"] == customer_id for c in list_a_res.json())

    # 5. Update Customer
    patch_res = await client.patch(
        f"/api/v1/customers/{customer_id}",
        headers=headers_a,
        json={"phone": "+254799887766"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["phone"] == "+254799887766"

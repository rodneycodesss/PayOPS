import pytest
from httpx import AsyncClient
from app.core.security import hash_password, verify_password


@pytest.mark.asyncio
async def test_argon2id_password_hashing():
    """Verify that password hashing uses valid Argon2id format and verifies correctly."""
    pwd = "FintechMasterPassword2026!"
    hashed = hash_password(pwd)
    assert hashed.startswith("$argon2id$")
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


@pytest.mark.asyncio
async def test_register_login_refresh_revoke_flow(client: AsyncClient):
    """
    Full Phase 1 exit criteria journey:
    1. Register new tenant + owner
    2. Login with valid credentials
    3. Refresh access token with rotation
    4. Test reuse detection on old refresh token (must fail closed)
    5. Revoke / logout
    """
    # 1. Register
    reg_payload = {
        "business_name": "Rodstar Logistics Ltd",
        "trading_name": "Rodstar Freight",
        "kra_pin": "P051122334K",
        "full_name": "Rodney Gilbert",
        "email": "rodney@rodstar.co.ke",
        "password": "SuperSecretPassword123#",
        "phone": "+254700123456"
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data
    assert reg_data["mfa_required"] is False
    
    initial_refresh = reg_data["refresh_token"]

    # 2. Login
    login_payload = {
        "email": "rodney@rodstar.co.ke",
        "password": "SuperSecretPassword123#"
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["access_token"] is not None
    login_refresh = login_data["refresh_token"]

    # Test me endpoint
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {login_data['access_token']}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "rodney@rodstar.co.ke"
    assert "owner" in me_data["roles"]

    # 3. Refresh Token Rotation
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login_refresh}
    )
    assert refresh_res.status_code == 200
    refresh_data = refresh_res.json()
    new_access_token = refresh_data["access_token"]
    new_refresh_token = refresh_data["refresh_token"]
    assert new_refresh_token != login_refresh

    # 4. Token Reuse Detection
    # Presenting the old rotated token MUST be rejected and trigger family revocation!
    reuse_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login_refresh}
    )
    assert reuse_res.status_code == 401
    assert "reuse detected" in reuse_res.json()["detail"].lower()

    # Now even the newer token in that family is revoked!
    subsequent_res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": new_refresh_token}
    )
    assert subsequent_res.status_code == 401

    # 5. Logout
    logout_res = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": initial_refresh}
    )
    assert logout_res.status_code == 200

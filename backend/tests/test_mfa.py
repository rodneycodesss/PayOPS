import pytest
import pyotp
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_mfa_setup_and_login_enforcement(client: AsyncClient, tenant_a: dict):
    """Verifies TOTP MFA generation, activation, and login challenge."""
    headers = tenant_a["headers"]

    # 1. Setup MFA
    setup_res = await client.post("/api/v1/auth/mfa/setup", headers=headers)
    assert setup_res.status_code == 200
    setup_data = setup_res.json()
    secret = setup_data["secret"]
    assert "otpauth_url" in setup_data
    assert len(secret) >= 16

    # 2. Verify with valid TOTP code
    totp = pyotp.TOTP(secret)
    current_code = totp.now()

    verify_res = await client.post(
        "/api/v1/auth/mfa/verify",
        headers=headers,
        json={"code": current_code}
    )
    assert verify_res.status_code == 200
    assert "MFA enabled" in verify_res.json()["message"]

    # 3. Login without TOTP code -> must signal mfa_required=True
    login_payload = {
        "email": "alice@alpha.co.ke",
        "password": "SecurePassword123!"
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["mfa_required"] is True
    assert login_data["access_token"] is None
    assert login_data["temp_token"] is not None

    # 4. Login with invalid TOTP code -> 401
    bad_login_payload = {
        "email": "alice@alpha.co.ke",
        "password": "SecurePassword123!",
        "totp_code": "000000"
    }
    bad_login_res = await client.post("/api/v1/auth/login", json=bad_login_payload)
    assert bad_login_res.status_code == 401

    # 5. Login with valid TOTP code -> succeeds and yields access & refresh tokens
    valid_code = totp.now()
    good_login_payload = {
        "email": "alice@alpha.co.ke",
        "password": "SecurePassword123!",
        "totp_code": valid_code
    }
    good_login_res = await client.post("/api/v1/auth/login", json=good_login_payload)
    assert good_login_res.status_code == 200
    good_data = good_login_res.json()
    assert good_data["mfa_required"] is False
    assert good_data["access_token"] is not None
    assert good_data["refresh_token"] is not None

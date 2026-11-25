import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_registration_otp_flow(client: AsyncClient):
    """
    Verifies full OTP flow during tenant registration:
    1. Request OTP for registration
    2. Attempt verification with bad code (must fail with remaining attempts count)
    3. Resend OTP
    4. Verify with valid OTP code -> returns tokens and provisions organization
    5. Attempt replay with already used OTP -> must fail
    """
    reg_payload = {
        "business_name": "Nairobi Express Logistics",
        "trading_name": "Express Logistics",
        "kra_pin": "P051982736Z",
        "full_name": "Eunice Njeri",
        "email": "eunice@expresslogistics.co.ke",
        "password": "SecurePassword2026!",
        "phone": "+254711223344"
    }

    # 1. Request registration OTP
    req_res = await client.post("/api/v1/auth/register/request-otp", json=reg_payload)
    assert req_res.status_code == 200, req_res.text
    req_data = req_res.json()
    assert req_data["email"] == "eunice@expresslogistics.co.ke"
    assert "Verification code sent" in req_data["message"]
    assert req_data["dev_otp"] is not None
    assert len(req_data["dev_otp"]) == 6
    dev_otp_1 = req_data["dev_otp"]

    # 2. Verify with incorrect OTP code -> 400
    bad_verify_res = await client.post(
        "/api/v1/auth/register/verify-otp",
        json={"email": "eunice@expresslogistics.co.ke", "code": "000000"}
    )
    assert bad_verify_res.status_code == 400
    assert "Invalid verification code" in bad_verify_res.json()["detail"]

    # 3. Resend OTP
    resend_res = await client.post(
        "/api/v1/auth/register/resend-otp",
        json={"email": "eunice@expresslogistics.co.ke"}
    )
    assert resend_res.status_code == 200
    resend_data = resend_res.json()
    assert resend_data["dev_otp"] is not None
    dev_otp_2 = resend_data["dev_otp"]

    # 4. Verify with valid OTP code -> 201 Created and tokens returned
    good_verify_res = await client.post(
        "/api/v1/auth/register/verify-otp",
        json={"email": "eunice@expresslogistics.co.ke", "code": dev_otp_2}
    )
    assert good_verify_res.status_code == 201, good_verify_res.text
    verify_data = good_verify_res.json()
    assert verify_data["access_token"] is not None
    assert verify_data["refresh_token"] is not None
    assert verify_data["mfa_required"] is False

    # 5. Profile check to verify account is verified
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {verify_data['access_token']}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "eunice@expresslogistics.co.ke"
    assert me_data["is_verified"] is True
    assert "owner" in me_data["roles"]

    # 6. Replay attempt with same code must fail
    replay_res = await client.post(
        "/api/v1/auth/register/verify-otp",
        json={"email": "eunice@expresslogistics.co.ke", "code": dev_otp_2}
    )
    assert replay_res.status_code == 400


@pytest.mark.asyncio
async def test_login_2fa_otp_flow(client: AsyncClient, tenant_a: dict):
    """
    Verifies 2FA during login:
    1. User enables 2FA via email
    2. User attempts password login -> triggers 2FA challenge with temp_token & email OTP
    3. Attempt 2FA verification with bad code -> 401
    4. Resend 2FA login OTP -> returns fresh code
    5. Verify with valid 2FA code via /login/verify-2fa -> succeeds with access & refresh tokens
    6. Disable 2FA -> subsequent login succeeds directly without challenge
    """
    headers = tenant_a["headers"]
    email = "alice@alpha.co.ke"
    password = "SecurePassword123!"

    # 1. Enable email-based 2FA on Alice's account
    enable_res = await client.post("/api/v1/auth/mfa/enable-email", headers=headers)
    assert enable_res.status_code == 200
    assert "Two-factor authentication enabled" in enable_res.json()["message"]

    # 2. Login with credentials -> should require 2FA
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["mfa_required"] is True
    assert login_data["access_token"] is None
    assert login_data["temp_token"] is not None
    assert login_data["dev_otp"] is not None
    temp_token = login_data["temp_token"]
    otp_code_1 = login_data["dev_otp"]

    # 3. Bad 2FA verification -> 401
    bad_res = await client.post(
        "/api/v1/auth/login/verify-2fa",
        json={"temp_token": temp_token, "code": "999999"}
    )
    assert bad_res.status_code == 401

    # 4. Resend 2FA OTP
    resend_res = await client.post(
        "/api/v1/auth/login/resend-otp",
        json={"temp_token": temp_token}
    )
    assert resend_res.status_code == 200
    otp_code_2 = resend_res.json()["dev_otp"]
    assert otp_code_2 is not None

    # 5. Valid 2FA verification -> 200 with tokens
    good_res = await client.post(
        "/api/v1/auth/login/verify-2fa",
        json={"temp_token": temp_token, "code": otp_code_2}
    )
    assert good_res.status_code == 200
    good_data = good_res.json()
    assert good_data["access_token"] is not None
    assert good_data["refresh_token"] is not None
    assert good_data["mfa_required"] is False

    # 6. Disable 2FA
    new_headers = {"Authorization": f"Bearer {good_data['access_token']}"}
    disable_res = await client.post("/api/v1/auth/mfa/disable", headers=new_headers)
    assert disable_res.status_code == 200

    # 7. Login now succeeds directly without 2FA
    direct_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password}
    )
    assert direct_login.status_code == 200
    assert direct_login.json()["access_token"] is not None
    assert direct_login.json()["mfa_required"] is False

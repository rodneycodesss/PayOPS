from datetime import date
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.tenants import Tenant
from app.models.payments import Payment, PaymentProvider
from app.models.banking import BankAccount, BankTransaction
from app.services.auth_service import AuthService


@pytest.mark.asyncio
async def test_duplicate_callback_creates_one_payment(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 2 Exit Criterion 1:
    Duplicate callback creates exactly one payment (strict idempotency).
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    tenant_id = tenant_a["tenant"].id

    # 1. Initiate STK push
    init_res = await client.post(
        "/api/v1/payments/stk-push",
        headers=headers,
        json={
            "phone_number": "254712345678",
            "amount": "2500.00",
            "account_reference": "INV-1001",
        },
    )
    assert init_res.status_code == 200, init_res.text
    checkout_id = init_res.json()["checkout_request_id"]

    # 2. Simulate Safaricom STK Push Success Callback
    callback_payload = {
        "Body": {
            "stkCallback": {
                "MerchantRequestID": "29115-34620561-1",
                "CheckoutRequestID": checkout_id,
                "ResultCode": 0,
                "ResultDesc": "The service request is processed successfully.",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "Amount", "Value": 2500.00},
                        {"Name": "MpesaReceiptNumber", "Value": "QKH7654321"},
                        {"Name": "TransactionDate", "Value": 20261109123000},
                        {"Name": "PhoneNumber", "Value": 254712345678},
                    ]
                },
            }
        }
    }

    # First callback dispatch
    cb1 = await client.post("/api/v1/payments/daraja/callback", json=callback_payload)
    assert cb1.status_code == 200

    # Second callback dispatch (duplicate webhook delivery from Safaricom or n8n retry)
    cb2 = await client.post("/api/v1/payments/daraja/callback", json=callback_payload)
    assert cb2.status_code == 200

    # Verify in DB: exactly ONE payment exists with provider_reference QKH7654321
    stmt = (
        select(Payment)
        .where(
            Payment.tenant_id == tenant_id,
            Payment.provider_reference == "QKH7654321",
        )
    )
    res = await db_session.execute(stmt)
    payments = res.scalars().all()
    assert len(payments) == 1
    assert payments[0].status == "SUCCEEDED"
    assert payments[0].amount == Decimal("2500.00")

    # 3. Test C2B duplicate confirmation idempotency
    c2b_payload = {
        "TransactionType": "Pay Bill",
        "TransID": "QKH99887766",
        "TransTime": "20261109140000",
        "TransAmount": 4500.00,
        "BusinessShortCode": "174379",
        "BillRefNumber": "INV-2002",
        "MSISDN": "254700112233",
        "FirstName": "Jane",
        "LastName": "Mwangi",
    }
    c2b1 = await client.post("/api/v1/payments/daraja/c2b-confirmation", headers=headers, json=c2b_payload)
    assert c2b1.status_code == 200

    c2b2 = await client.post("/api/v1/payments/daraja/c2b-confirmation", headers=headers, json=c2b_payload)
    assert c2b2.status_code == 200

    c2b_stmt = select(Payment).where(Payment.tenant_id == tenant_id, Payment.provider_reference == "QKH99887766")
    c2b_res = await db_session.execute(c2b_stmt)
    c2b_payments = c2b_res.scalars().all()
    assert len(c2b_payments) == 1


@pytest.mark.asyncio
async def test_failed_and_timed_out_payments_handled(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 2 Exit Criterion 2:
    Failed and timed-out payments handled correctly.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    tenant_id = tenant_a["tenant"].id

    # 1. Test CANCELLED payment (ResultCode 1032)
    init1 = await client.post(
        "/api/v1/payments/stk-push",
        headers=headers,
        json={"phone_number": "254711111111", "amount": "500.00", "account_reference": "INV-CANC"},
    )
    checkout_cancelled = init1.json()["checkout_request_id"]

    await client.post(
        "/api/v1/payments/daraja/callback",
        json={
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": checkout_cancelled,
                    "ResultCode": 1032,
                    "ResultDesc": "Request cancelled by user",
                }
            }
        },
    )

    stmt1 = select(Payment).where(Payment.checkout_request_id == checkout_cancelled)
    p1 = (await db_session.execute(stmt1)).scalar_one()
    assert p1.status == "CANCELLED"

    # 2. Test TIMED_OUT payment (ResultCode 1037)
    init2 = await client.post(
        "/api/v1/payments/stk-push",
        headers=headers,
        json={"phone_number": "254722222222", "amount": "750.00", "account_reference": "INV-TIME"},
    )
    checkout_timeout = init2.json()["checkout_request_id"]

    await client.post(
        "/api/v1/payments/daraja/callback",
        json={
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": checkout_timeout,
                    "ResultCode": 1037,
                    "ResultDesc": "DS timeout user cannot be reached",
                }
            }
        },
    )

    stmt2 = select(Payment).where(Payment.checkout_request_id == checkout_timeout)
    p2 = (await db_session.execute(stmt2)).scalar_one()
    assert p2.status == "TIMED_OUT"

    # 3. Test FAILED payment (e.g. ResultCode 1 insufficient balance or wrong PIN)
    init3 = await client.post(
        "/api/v1/payments/stk-push",
        headers=headers,
        json={"phone_number": "254733333333", "amount": "1000.00", "account_reference": "INV-FAIL"},
    )
    checkout_fail = init3.json()["checkout_request_id"]

    await client.post(
        "/api/v1/payments/daraja/callback",
        json={
            "Body": {
                "stkCallback": {
                    "CheckoutRequestID": checkout_fail,
                    "ResultCode": 1,
                    "ResultDesc": "The balance is insufficient for the transaction",
                }
            }
        },
    )

    stmt3 = select(Payment).where(Payment.checkout_request_id == checkout_fail)
    p3 = (await db_session.execute(stmt3)).scalar_one()
    assert p3.status == "FAILED"


@pytest.mark.asyncio
async def test_malformed_csv_rows_rejected_safely(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 2 Exit Criterion 3:
    Malformed CSV rows rejected safely, valid rows imported,
    and row hashing prevents duplicate lines across repeated uploads.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    tenant_id = tenant_a["tenant"].id

    # Create Bank Account
    acct_res = await client.post(
        "/api/v1/banking/accounts",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "bank_name": "Equity Bank Kenya",
            "account_number": "0123456789012",
            "account_name": "Alpha Operational Account",
            "branch": "Upper Hill",
            "currency": "KES",
        },
    )
    assert acct_res.status_code == 201
    account_id = acct_res.json()["id"]

    # CSV containing:
    # Row 1: Valid credit (150,000.00)
    # Row 2: Malformed date (invalid-date)
    # Row 3: Valid credit (45,000.00)
    # Row 4: Non-numeric amount ($$$INVALID$$$)
    # Row 5: Missing reference (blank reference field)
    # Row 6: Valid debit (12,500.00)
    csv_content = """date,reference,description,amount,type
2026-11-01,TXN-EQ-001,Client Wire Transfer,150000.00,CREDIT
not-a-valid-date,TXN-EQ-002,Malformed Date Row,20000.00,CREDIT
2026-11-02,TXN-EQ-003,Wholesale Supplies,45000.00,CREDIT
2026-11-03,TXN-EQ-004,Malformed Amount Row,$$$INVALID$$$,CREDIT
2026-11-04,,Missing Reference Row,5000.00,CREDIT
2026-11-05,TXN-EQ-005,Internet Service Utility,12500.00,DEBIT
"""

    # First import
    import_res = await client.post(
        f"/api/v1/banking/accounts/{account_id}/import",
        headers=headers,
        data={"csv_text": csv_content},
    )
    assert import_res.status_code == 200, import_res.text
    summary = import_res.json()

    assert summary["total_rows_read"] == 6
    assert summary["rows_imported"] == 3  # Lines 1, 3, 6
    assert summary["errors_count"] == 3   # Lines 2, 4, 5
    assert summary["duplicates_skipped"] == 0
    # Net change: +150,000 + 45,000 - 12,500 = 182,500
    assert Decimal(str(summary["new_account_balance"])) == Decimal("182500.00")

    # Second import with the exact same file -> all valid lines should be skipped as duplicates!
    reimport_res = await client.post(
        f"/api/v1/banking/accounts/{account_id}/import",
        headers=headers,
        data={"csv_text": csv_content},
    )
    assert reimport_res.status_code == 200
    summary2 = reimport_res.json()
    assert summary2["rows_imported"] == 0
    assert summary2["duplicates_skipped"] == 3
    assert Decimal(str(summary2["new_account_balance"])) == Decimal("182500.00")


@pytest.mark.asyncio
async def test_payment_provider_sandbox_and_unverified(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Phase 2 Exit Criterion 4:
    Sandbox call succeeds if credentials supplied, else marked unverified.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Register sandbox provider with test shortcode
    prov1 = await client.post(
        "/api/v1/payments/providers",
        headers=headers,
        json={
            "provider_type": "TUMA_MPESA",
            "name": "Alpha Tuma Gateway Sandbox",
            "identifier": "business@alpha.co.ke",
            "is_sandbox": True,
            "api_key": "test_api_key",
            "email": "business@alpha.co.ke",
        },
    )
    assert prov1.status_code == 200
    p1_data = prov1.json()
    assert p1_data["verification_status"] == "verified_sandbox"

    # 2. Register production provider without live credentials verification
    prov2 = await client.post(
        "/api/v1/payments/providers",
        headers=headers,
        json={
            "provider_type": "TUMA_MPESA",
            "name": "Alpha Tuma Live Gateway",
            "identifier": "live@alpha.co.ke",
            "is_sandbox": False,
        },
    )
    assert prov2.status_code == 200
    p2_data = prov2.json()
    assert p2_data["verification_status"] == "implemented_unverified"


@pytest.mark.asyncio
async def test_tuma_native_callback_and_idempotency(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Tests Tuma API Payment Gateway native callback format and strict idempotency deduplication.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    tenant_id = tenant_a["tenant"].id

    # 1. Initiate STK push
    init_res = await client.post(
        "/api/v1/payments/stk-push",
        headers=headers,
        json={
            "phone_number": "254712345678",
            "amount": "3200.00",
            "account_reference": "INV-TUMA-01",
        },
    )
    assert init_res.status_code == 200, init_res.text
    checkout_id = init_res.json()["checkout_request_id"]

    # 2. Simulate native Tuma API callback payload
    tuma_payload = {
        "status": "completed",
        "result_code": 0,
        "result_desc": "The service request is processed successfully.",
        "checkout_request_id": checkout_id,
        "merchant_request_id": f"MR_{checkout_id}",
        "amount": 3200.00,
        "phone": "254712345678",
        "reference": "INV-TUMA-01",
        "mpesa_receipt_number": "TUMA_QKH112233",
    }

    cb1 = await client.post("/api/v1/payments/tuma/callback", json=tuma_payload)
    assert cb1.status_code == 200
    assert cb1.json()["status"] == "success"

    # Duplicate delivery
    cb2 = await client.post("/api/v1/payments/tuma/callback", json=tuma_payload)
    assert cb2.status_code == 200

    # Verify exactly one payment in DB
    stmt = (
        select(Payment)
        .where(
            Payment.tenant_id == tenant_id,
            Payment.provider_reference == "TUMA_QKH112233",
        )
    )
    res = await db_session.execute(stmt)
    payments = res.scalars().all()
    assert len(payments) == 1
    assert payments[0].status == "SUCCEEDED"
    assert payments[0].amount == Decimal("3200.00")


@pytest.mark.asyncio
async def test_daraja_paybill_and_till_configuration_and_stk(
    db_session: AsyncSession,
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Tests Safaricom Daraja configuration for Paybill & Buy Goods Till,
    STK Push initiation through Daraja rail, and C2B URL registration.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    tenant_id = tenant_a["tenant"].id

    # 1. Configure Daraja Paybill
    res_paybill = await client.post(
        "/api/v1/payments/providers",
        headers=headers,
        json={
            "provider_type": "DARAJA_PAYBILL",
            "name": "Safaricom M-PESA Paybill",
            "identifier": "174379",
            "consumer_key": "live_daraja_consumer_key_xyz",
            "consumer_secret": "live_daraja_consumer_secret_abc",
            "passkey": "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
            "is_sandbox": False,
        },
    )
    assert res_paybill.status_code == 200, res_paybill.text
    pb_data = res_paybill.json()
    assert pb_data["provider_type"] == "DARAJA_PAYBILL"
    assert pb_data["verification_status"] == "live_production"

    # 2. Configure Daraja Till (Buy Goods)
    res_till = await client.post(
        "/api/v1/payments/providers",
        headers=headers,
        json={
            "provider_type": "DARAJA_TILL",
            "name": "Safaricom M-PESA Buy Goods Till",
            "identifier": "5521234",
            "consumer_key": "sandbox_key_till",
            "consumer_secret": "sandbox_secret_till",
            "is_sandbox": True,
        },
    )
    assert res_till.status_code == 200, res_till.text
    till_data = res_till.json()
    assert till_data["provider_type"] == "DARAJA_TILL"
    assert till_data["verification_status"] == "verified_sandbox"

    # 3. List providers
    list_provs = await client.get("/api/v1/payments/providers", headers=headers)
    assert list_provs.status_code == 200
    provs = list_provs.json()
    types = [p["provider_type"] for p in provs]
    assert "DARAJA_PAYBILL" in types
    assert "DARAJA_TILL" in types

    # 4. Initiate STK Push explicitly via Daraja Paybill
    stk_res = await client.post(
        "/api/v1/payments/stk-push",
        headers=headers,
        json={
            "phone_number": "254712345678",
            "amount": "1500.00",
            "account_reference": "INV-DARAJA-01",
            "provider": "DARAJA_PAYBILL",
        },
    )
    assert stk_res.status_code == 200, stk_res.text
    stk_data = stk_res.json()
    assert stk_data["checkout_request_id"] is not None

    # Verify payment record in DB has provider "DARAJA"
    stmt = select(Payment).where(Payment.id == stk_data["payment_id"])
    pmt = (await db_session.execute(stmt)).scalar_one()
    assert pmt.provider == "DARAJA"
    assert pmt.status == "INITIATED"

    # 5. Register C2B URLs with Safaricom Daraja
    reg_res = await client.post("/api/v1/payments/daraja/register-c2b", headers=headers)
    assert reg_res.status_code == 200, reg_res.text
    assert reg_res.json()["status"] == "success"
    assert "c2b-validation" in reg_res.json()["validation_url"]
    assert "c2b-confirmation" in reg_res.json()["confirmation_url"]


@pytest.mark.asyncio
async def test_all_tuma_supported_banks(
    client: AsyncClient,
    tenant_a: dict,
):
    """
    Tests that /tuma/banks returns all commercial banks, microfinance banks,
    and SACCOs supported in Kenya by Tuma API.
    """
    token = tenant_a["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.get("/api/v1/tuma/banks", headers=headers)
    assert res.status_code == 200, res.text
    banks = res.json()
    assert isinstance(banks, list)
    assert len(banks) >= 37

    # Check key banks and codes exist
    bank_names = [b["name"] for b in banks]
    bank_codes = [b.get("code") for b in banks]
    assert any("Equity" in name for name in bank_names)
    assert any("Kenya Commercial Bank" in name or "KCB" in name or code == "KCB" for name, code in zip(bank_names, bank_codes))
    assert any("Cooperative" in name or "Co-operative" in name or code == "COOP" for name, code in zip(bank_names, bank_codes))
    assert any("NCBA" in name or code == "NCBA" for name, code in zip(bank_names, bank_codes))
    assert any("Absa" in name or code == "ABSA" for name, code in zip(bank_names, bank_codes))
    assert any("Standard Chartered" in name or code == "SCB" for name, code in zip(bank_names, bank_codes))
    assert any("Stanbic" in name or code == "STANBIC" for name, code in zip(bank_names, bank_codes))
    assert any("DTB" in name or "Diamond Trust" in name or code == "DTB" for name, code in zip(bank_names, bank_codes))
    assert any("I&M" in name or code == "I&M" for name, code in zip(bank_names, bank_codes))
    assert any("Family" in name or code == "FAMILY" for name, code in zip(bank_names, bank_codes))
    assert any("Post" in name or code == "POSTBANK" for name, code in zip(bank_names, bank_codes))
    assert any("Sacco" in name for name in bank_names)
    assert any("M-PESA" in name or code in ("PAYBILL", "BUYGOODS") for name, code in zip(bank_names, bank_codes))


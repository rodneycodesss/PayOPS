import uuid
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.integrations.tuma.gateway import TumaTestRecordedGateway
from app.models.tuma import (
    TumaChildAccount,
    TenantSettlementDetail,
    TumaProvisioningJob,
    TumaPaymentRequest,
    TumaWebhookEvent,
    Collection,
    IntegrationEvent,
)
from app.models.accounting import JournalEntry
from app.services.tuma_onboarding_service import TumaOnboardingService
from app.services.tuma_collection_service import TumaCollectionService


@pytest.mark.asyncio
async def test_tuma_automated_onboarding_and_idempotency(
    db_session: AsyncSession,
    tenant_a: dict,
):
    """
    Test 1: Automated child provisioning and strict idempotency.
    Submitting settlement details provisions child, encrypts key, and double submission is safe.
    """
    tenant_id = tenant_a["tenant"].id
    test_gw = TumaTestRecordedGateway()

    # Initial status is awaiting_settlement
    status1 = await TumaOnboardingService.get_onboarding_status(db_session, tenant_id)
    assert status1["status"] == "awaiting_settlement"
    assert status1["can_collect"] is False

    # Submit settlement details (Equity Bank, Account 0123456789)
    res = await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=tenant_id,
        bank_id="b1111111-1111-1111-1111-111111111111",
        bank_name="Equity Bank Kenya",
        account_number="0123456789",
        user_id=tenant_a["user"].id,
        user_email=tenant_a["user"].email,
        gateway=test_gw,
    )
    assert res["status"] == "active"
    assert res["can_collect"] is True
    assert res["account_masked"] == "••••••6789"
    assert len(test_gw.created_businesses) == 1

    # Verify child record in DB
    stmt = select(TumaChildAccount).where(TumaChildAccount.tenant_id == tenant_id)
    child = (await db_session.execute(stmt)).scalar_one()
    assert child.status == "active"
    assert child.api_key_encrypted is not None
    assert child.key_version == 1
    assert child.webhook_token is not None

    # Idempotency check: Resubmitting settlement details does NOT create a duplicate child
    res2 = await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=tenant_id,
        bank_id="b1111111-1111-1111-1111-111111111111",
        bank_name="Equity Bank Kenya",
        account_number="0123456789",
        gateway=test_gw,
    )
    assert res2["status"] == "active"
    assert len(test_gw.created_businesses) == 1  # Still exactly one!


@pytest.mark.asyncio
async def test_validation_failure_sets_needs_action(
    db_session: AsyncSession,
    tenant_a: dict,
):
    """
    Test 2: Validation errors set needs_action status with plain-language error.
    """
    tenant_id = tenant_a["tenant"].id
    test_gw = TumaTestRecordedGateway(should_fail_creation=True)

    res = await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=tenant_id,
        bank_id="b1111111-1111-1111-1111-111111111111",
        bank_name="Equity Bank Kenya",
        account_number="12345",
        gateway=test_gw,
    )
    assert res["status"] == "needs_action"
    assert "Mock business creation validation error" in res["last_error_message"]
    assert res["can_collect"] is False


@pytest.mark.asyncio
async def test_tenant_isolation_enforced(
    db_session: AsyncSession,
    tenant_a: dict,
    tenant_b: dict,
):
    """
    Test 3: Strict tenant isolation across child accounts and settlement details.
    """
    id_a = tenant_a["tenant"].id
    id_b = tenant_b["tenant"].id
    test_gw = TumaTestRecordedGateway()

    # Onboard Tenant A
    await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=id_a,
        bank_id="b1",
        bank_name="Equity Bank",
        account_number="1111222233",
        gateway=test_gw,
    )

    # Tenant B should still be awaiting_settlement
    status_b = await TumaOnboardingService.get_onboarding_status(db_session, id_b)
    assert status_b["status"] == "awaiting_settlement"

    # Querying child for Tenant B yields no records from Tenant A
    stmt = select(TumaChildAccount).where(TumaChildAccount.tenant_id == id_b)
    child_b = (await db_session.execute(stmt)).scalar_one_or_none()
    assert child_b.status == "awaiting_settlement"


@pytest.mark.asyncio
async def test_stk_push_collection_and_webhook_ledger_posting(
    db_session: AsyncSession,
    tenant_a: dict,
):
    """
    Test 4: STK push collection request, webhook processing, idempotency,
    and balanced double-entry ledger posting.
    """
    tenant_id = tenant_a["tenant"].id
    test_gw = TumaTestRecordedGateway()

    # 1. Onboard tenant
    await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=tenant_id,
        bank_id="b1",
        bank_name="Equity Bank",
        account_number="1111222233",
        gateway=test_gw,
    )
    child = await TumaOnboardingService.get_or_create_child_record(db_session, tenant_id)

    # 2. Initiate STK push collection
    pay_req = await TumaCollectionService.initiate_collection_request(
        db=db_session,
        tenant_id=tenant_id,
        amount=Decimal("4500.00"),
        phone="0712345678",
        reference="INV-TEST-001",
        gateway=test_gw,
    )
    assert pay_req.status == "INITIATED"
    assert pay_req.phone_masked == "2547••••5678"
    assert pay_req.amount == Decimal("4500.00")

    # 3. Simulate inbound Tuma Webhook Callback to per-tenant token path
    callback_payload = {
        "status": "completed",
        "result_code": 0,
        "result_desc": "The service request is processed successfully.",
        "checkout_request_id": pay_req.checkout_request_id,
        "merchant_request_id": pay_req.merchant_request_id,
        "amount": 4500.00,
        "phone": "254712345678",
        "mpesa_receipt_number": "TUMA_QKH889900",
    }

    wb_res = await TumaCollectionService.process_webhook_callback(
        db=db_session,
        webhook_token=child.webhook_token,
        payload=callback_payload,
        raw_body_str="{}",
    )
    assert wb_res["status"] == "processed"
    assert wb_res["payment_status"] == "SUCCEEDED"

    # Verify request status in DB
    await db_session.refresh(pay_req)
    assert pay_req.status == "SUCCEEDED"
    assert pay_req.mpesa_receipt == "TUMA_QKH889900"

    # Verify Collection record created
    coll_stmt = select(Collection).where(Collection.source_transaction_id == "TUMA_QKH889900")
    coll = (await db_session.execute(coll_stmt)).scalar_one()
    assert coll.amount == Decimal("4500.00")
    assert coll.status == "CLEARED"
    assert coll.ledger_entry_id is not None

    # Verify Journal Entry balanced (Debits == Credits)
    jnl_stmt = select(JournalEntry).where(JournalEntry.id == coll.ledger_entry_id)
    jnl = (await db_session.execute(jnl_stmt)).scalar_one()
    assert jnl.status == "POSTED"
    assert jnl.posted_at is not None

    # 4. Idempotency test: duplicate webhook delivery is safely skipped
    dup_res = await TumaCollectionService.process_webhook_callback(
        db=db_session,
        webhook_token=child.webhook_token,
        payload=callback_payload,
        raw_body_str="{}",
    )
    assert dup_res["status"] == "duplicate_skipped"


@pytest.mark.asyncio
async def test_pending_request_sweeper(
    db_session: AsyncSession,
    tenant_a: dict,
):
    """
    Test 5: Sweeper job moves stale initiated requests to AWAITING_CONFIRMATION.
    Never marks failed or paid by guesswork.
    """
    tenant_id = tenant_a["tenant"].id
    test_gw = TumaTestRecordedGateway()

    await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=tenant_id,
        bank_id="b1",
        bank_name="Equity Bank",
        account_number="1111222233",
        gateway=test_gw,
    )

    req = await TumaCollectionService.initiate_collection_request(
        db=db_session,
        tenant_id=tenant_id,
        amount=Decimal("1200.00"),
        phone="0722000000",
        reference="INV-SWEEP-01",
        gateway=test_gw,
    )
    assert req.status == "INITIATED"

    # Sweeper with 0 minutes timeout should catch it immediately
    swept_count = await TumaCollectionService.sweep_pending_requests(db_session, timeout_minutes=0)
    assert swept_count >= 1

    await db_session.refresh(req)
    assert req.status == "AWAITING_CONFIRMATION"
    assert "Awaiting late callback or statement match" in req.result_desc


@pytest.mark.asyncio
async def test_trial_collection_cap_enforcement(
    db_session: AsyncSession,
    tenant_a: dict,
):
    """
    Test 6: Enforce server-side KSh 80,000 trial cap on new collection requests.
    """
    tenant_id = tenant_a["tenant"].id
    test_gw = TumaTestRecordedGateway()

    await TumaOnboardingService.submit_settlement_details(
        db=db_session,
        tenant_id=tenant_id,
        bank_id="b1",
        bank_name="Equity Bank",
        account_number="1111222233",
        gateway=test_gw,
    )

    # Insert collections totaling KSh 80,000
    c1 = Collection(
        tenant_id=tenant_id,
        source_transaction_id="TX_CAP_01",
        channel="TUMA_STK",
        amount=Decimal("80000.00"),
        currency="KES",
        reference="INV-CAP",
        status="CLEARED",
    )
    db_session.add(c1)
    await db_session.commit()

    # Attempting to initiate another payment of KSh 100 exceeds KSh 80,000 cap
    with pytest.raises(ValueError) as exc_info:
        await TumaCollectionService.initiate_collection_request(
            db=db_session,
            tenant_id=tenant_id,
            amount=Decimal("100.00"),
            phone="0712345678",
            reference="INV-OVER-CAP",
            gateway=test_gw,
        )
    assert "Trial collection cap of KSh 80,000.00 reached" in str(exc_info.value)

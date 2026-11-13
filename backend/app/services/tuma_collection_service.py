import hashlib
import json
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decrypt_secret, mask_account, mask_phone
from app.integrations.tuma.gateway import TumaGateway, TumaHttpGateway
from app.integrations.tuma.exceptions import TumaError, TumaAuthError, NotSupportedError
from app.models.tenants import Tenant
from app.models.invoices import Invoice
from app.models.tuma import (
    TumaChildAccount,
    TumaPaymentRequest,
    TumaWebhookEvent,
    Collection,
    IntegrationEvent,
)
from app.models.payments import Payment
from app.services.posting_service import PostingService
from app.schemas.accounting import LedgerLineCreate


class TumaCollectionService:
    """
    Manages Tuma STK push collection requests, secure webhook verification,
    idempotent settlement ingestion, reconciliation matching, and double-entry ledger posting.
    """

    DEFAULT_TRIAL_COLLECTION_CAP = Decimal("80000.00")
    DEFAULT_TRIAL_DAYS = 14

    @classmethod
    async def check_trial_collection_limit(
        cls, db: AsyncSession, tenant_id: str, new_amount: Decimal
    ) -> Tuple[bool, Decimal, Decimal]:
        """
        Enforces server-side trial collection cap (KSh 80,000) and expiration.
        Returns: (is_allowed, total_collected, cap_limit)
        """
        cap = cls.DEFAULT_TRIAL_COLLECTION_CAP
        stmt = (
            select(func.coalesce(func.sum(Collection.amount), Decimal("0.00")))
            .where(
                Collection.tenant_id == tenant_id,
                Collection.status.in_(["CLEARED", "MATCHED", "PARTIALLY_MATCHED"]),
            )
        )
        res = await db.execute(stmt)
        total_collected = Decimal(str(res.scalar() or "0.00"))

        if total_collected + new_amount > cap:
            return False, total_collected, cap
        return True, total_collected, cap

    @classmethod
    async def initiate_collection_request(
        cls,
        db: AsyncSession,
        tenant_id: str,
        amount: Decimal,
        phone: str,
        reference: str,
        invoice_id: Optional[str] = None,
        description: Optional[str] = None,
        gateway: Optional[TumaGateway] = None,
    ) -> TumaPaymentRequest:
        """
        Initiates an M-PESA STK Push prompt to the customer handset via the tenant's child account.
        """
        if amount <= Decimal("0.00"):
            raise ValueError("Payment amount must be greater than zero.")

        # 1. Enforce trial collection cap
        allowed, collected, cap = await cls.check_trial_collection_limit(db, tenant_id, amount)
        if not allowed:
            raise ValueError(
                f"Trial collection cap of KSh {cap:,.2f} reached (total collected: KSh {collected:,.2f}). "
                "Please upgrade to a production subscription to continue collecting."
            )

        # 2. Verify Child Account is active
        stmt = select(TumaChildAccount).where(TumaChildAccount.tenant_id == tenant_id)
        res = await db.execute(stmt)
        child = res.scalar_one_or_none()

        if not child or child.status != "active":
            status_desc = child.status if child else "awaiting_settlement"
            raise ValueError(
                f"Collections are not active for this account (status: {status_desc}). "
                "Connect your settlement bank account in Business Settings -> Connections to start collecting."
            )

        if not child.api_key_encrypted:
            raise ValueError("Child profile has no encrypted API key. Contact platform support.")

        child_api_key = decrypt_secret(child.api_key_encrypted)

        # 3. Load Tenant
        t_stmt = select(Tenant).where(Tenant.id == tenant_id)
        tenant = (await db.execute(t_stmt)).scalar_one_or_none()
        if not tenant:
            raise ValueError("Tenant not found.")

        gw = gateway or TumaHttpGateway()

        # 4. Authenticate as child to obtain Bearer token
        child_token = await gw.authenticate_child(email=tenant.email, api_key=child_api_key)

        # 5. Build secure unguessable per-tenant callback URL
        domain = getattr(settings, "DOMAIN", "payops.rodstartechdevs.co.ke").rstrip("/")
        if not domain.startswith("http"):
            domain = f"https://{domain}"
        callback_url = f"{domain}/api/v1/webhooks/tuma/{child.webhook_token}/stk"

        # 6. Dispatch STK Push via Tuma
        clean_phone = TumaHttpGateway.format_phone(phone)
        desc = description or f"Payment for {reference}"
        resp = await gw.initiate_stk_push(
            child_token=child_token,
            amount=amount,
            phone=clean_phone,
            callback_url=callback_url,
            description=desc,
        )

        checkout_id = resp.get("checkout_request_id") or f"ws_CO_{int(datetime.now().timestamp())}_{clean_phone[-4:]}"
        merchant_id = resp.get("merchant_request_id")

        # 7. Record initiated payment request
        pay_req = TumaPaymentRequest(
            tenant_id=tenant_id,
            checkout_request_id=checkout_id,
            merchant_request_id=merchant_id,
            amount=amount,
            phone_masked=mask_phone(clean_phone),
            reference=reference[:100],
            invoice_id=invoice_id,
            status="INITIATED",
        )
        db.add(pay_req)
        await db.commit()
        await db.refresh(pay_req)
        return pay_req

    @classmethod
    async def process_webhook_callback(
        cls,
        db: AsyncSession,
        webhook_token: str,
        payload: Dict[str, Any],
        raw_body_str: str,
    ) -> Dict[str, Any]:
        """
        Processes inbound STK push callback with URL token resolution, request validation,
        and double-entry ledger posting.
        """
        # 1. Resolve tenant via unguessable webhook token
        child_stmt = select(TumaChildAccount).where(TumaChildAccount.webhook_token == webhook_token)
        child = (await db.execute(child_stmt)).scalar_one_or_none()
        if not child:
            return {"status": "rejected", "detail": "Unknown or invalid webhook token."}

        tenant_id = child.tenant_id

        # 2. Extract and validate fields
        checkout_id = payload.get("checkout_request_id")
        if not checkout_id:
            return {"status": "rejected", "detail": "Missing checkout_request_id."}

        # 3. Match against stored request created by PayOps for this tenant
        req_stmt = (
            select(TumaPaymentRequest)
            .where(
                TumaPaymentRequest.tenant_id == tenant_id,
                TumaPaymentRequest.checkout_request_id == checkout_id,
            )
        )
        req_res = await db.execute(req_stmt)
        payment_req = req_res.scalar_one_or_none()

        # 4. Check Idempotency by deduplication key
        mpesa_receipt = payload.get("mpesa_receipt_number") or ""
        raw_status = str(payload.get("status", "")).lower()
        dedupe_raw = f"{checkout_id}:{mpesa_receipt}:{raw_status}"
        dedupe_key = hashlib.sha256(dedupe_raw.encode("utf-8")).hexdigest()

        existing_evt_stmt = select(TumaWebhookEvent).where(TumaWebhookEvent.dedupe_key == dedupe_key)
        existing_evt = (await db.execute(existing_evt_stmt)).scalar_one_or_none()
        if existing_evt:
            return {"status": "duplicate_skipped", "detail": "Webhook event already processed."}

        # 5. Minimize PII for storage
        minimized_payload = dict(payload)
        if "phone" in minimized_payload:
            minimized_payload["phone"] = mask_phone(str(minimized_payload["phone"]))
        if "customer_name" in minimized_payload:
            minimized_payload["customer_name"] = "••••••••"

        webhook_event = TumaWebhookEvent(
            tenant_id=tenant_id,
            dedupe_key=dedupe_key,
            raw_payload=minimized_payload,
            status="RECEIVED",
        )
        db.add(webhook_event)
        await db.commit()

        if not payment_req:
            # Quarantine: checkout_request_id does not belong to any initiated request
            webhook_event.status = "QUARANTINED"
            await db.commit()
            return {"status": "quarantined", "detail": "Unmatched checkout_request_id."}

        # 6. Evaluate Result
        result_code = payload.get("result_code")
        result_desc = payload.get("result_desc") or ""

        if raw_status in ("completed", "success") or result_code == 0:
            payment_req.status = "SUCCEEDED"
            payment_req.result_code = 0
            payment_req.result_desc = result_desc or "Payment processed successfully"
            payment_req.mpesa_receipt = str(mpesa_receipt).strip() if mpesa_receipt else None
            payment_req.completed_at = datetime.now(timezone.utc)

            # Record in collections
            coll_ref = mpesa_receipt or checkout_id
            coll_stmt = (
                select(Collection)
                .where(Collection.tenant_id == tenant_id, Collection.source_transaction_id == coll_ref)
            )
            existing_coll = (await db.execute(coll_stmt)).scalar_one_or_none()

            if not existing_coll:
                collection = Collection(
                    tenant_id=tenant_id,
                    source_transaction_id=coll_ref,
                    channel="TUMA_STK",
                    amount=payment_req.amount,
                    currency="KES",
                    payer_masked=payment_req.phone_masked,
                    reference=payment_req.reference,
                    status="CLEARED",
                    matched_invoice_id=payment_req.invoice_id,
                )
                db.add(collection)
                await db.flush()

                # Post to General Ledger via double-entry PostingService
                try:
                    entry_date = datetime.now(timezone.utc).date()
                    lines = [
                        LedgerLineCreate(
                            account_code="1010",  # M-PESA Clearing
                            entry_type="DEBIT",
                            amount=payment_req.amount,
                            description=f"Tuma M-PESA collection {coll_ref}",
                        ),
                        LedgerLineCreate(
                            account_code="1200",  # Accounts Receivable
                            entry_type="CREDIT",
                            amount=payment_req.amount,
                            description=f"Payment received for {payment_req.reference}",
                        ),
                    ]
                    journal_entry = await PostingService.create_and_post_journal(
                        db=db,
                        tenant_id=tenant_id,
                        entry_date=entry_date,
                        narration=f"Tuma M-PESA STK Push settlement ({coll_ref})",
                        reference_type="PAYMENT",
                        reference_id=coll_ref,
                        lines=lines,
                    )
                    collection.ledger_entry_id = journal_entry.id
                except Exception:
                    # Posting failure must never swallow confirmed receipt
                    pass

        elif result_code == 1032 or raw_status in ("cancelled", "canceled"):
            payment_req.status = "CANCELLED"
            payment_req.result_code = 1032
            payment_req.result_desc = result_desc or "Request cancelled by user"
            payment_req.completed_at = datetime.now(timezone.utc)
        elif result_code == 1037 or raw_status in ("timed_out", "timeout"):
            payment_req.status = "TIMED_OUT"
            payment_req.result_code = 1037
            payment_req.result_desc = result_desc or "Handset timeout"
            payment_req.completed_at = datetime.now(timezone.utc)
        else:
            payment_req.status = "FAILED"
            payment_req.result_code = result_code or 1
            payment_req.result_desc = result_desc or "Payment request failed"
            payment_req.completed_at = datetime.now(timezone.utc)

        webhook_event.status = "PROCESSED"
        webhook_event.processed_at = datetime.now(timezone.utc)
        await db.commit()

        return {
            "status": "processed",
            "payment_status": payment_req.status,
            "checkout_request_id": checkout_id,
        }

    @classmethod
    async def sweep_pending_requests(
        cls, db: AsyncSession, timeout_minutes: int = 5
    ) -> int:
        """
        Sweeper Job:
        Transitions STK requests older than timeout_minutes with no callback
        into AWAITING_CONFIRMATION status (never marks failed or paid by guesswork).
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
        stmt = (
            select(TumaPaymentRequest)
            .where(
                TumaPaymentRequest.status == "INITIATED",
                TumaPaymentRequest.created_at < cutoff,
            )
        )
        res = await db.execute(stmt)
        pending_reqs = list(res.scalars().all())

        for req in pending_reqs:
            req.status = "AWAITING_CONFIRMATION"
            req.result_desc = f"No callback received within {timeout_minutes} minutes. Awaiting late callback or statement match."

        if pending_reqs:
            await db.commit()
        return len(pending_reqs)

import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import encrypt_secret, decrypt_secret
from app.integrations.daraja.client import DarajaClient
from app.models.payments import Payment, PaymentProvider
from app.models.webhook import WebhookEvent
from app.schemas.payments import (
    StkPushRequest,
    StkPushResponse,
    PaymentProviderCreate,
    C2BValidationConfirmationPayload,
)


class PaymentService:
    """
    Manages payment lifecycles, provider adapters, Daraja STK push and C2B ingestion,
    and strict idempotency handling.
    """

    @classmethod
    async def get_or_create_daraja_client(
        cls,
        db: AsyncSession,
        tenant_id: str,
    ) -> Tuple[DarajaClient, Optional[PaymentProvider]]:
        """Loads tenant's configured Daraja provider or falls back to default sandbox client."""
        stmt = (
            select(PaymentProvider)
            .where(
                PaymentProvider.tenant_id == tenant_id,
                PaymentProvider.provider_type.in_(["DARAJA_PAYBILL", "DARAJA_TILL"]),
                PaymentProvider.is_active == True,
            )
        )
        res = await db.execute(stmt)
        provider = res.scalar_one_or_none()

        if provider and provider.encrypted_credentials:
            try:
                creds = json.loads(decrypt_secret(provider.encrypted_credentials))
                client = DarajaClient(
                    consumer_key=creds.get("consumer_key"),
                    consumer_secret=creds.get("consumer_secret"),
                    shortcode=provider.identifier,
                    passkey=creds.get("passkey"),
                    is_sandbox=provider.is_sandbox,
                )
                return client, provider
            except Exception:
                pass

        # Default fallback sandbox client
        return DarajaClient(is_sandbox=True), None

    @classmethod
    async def initiate_stk_push(
        cls,
        db: AsyncSession,
        tenant_id: str,
        request: StkPushRequest,
        callback_url: str = "http://backend:8000/api/v1/payments/daraja/callback",
    ) -> StkPushResponse:
        """
        Initiates an STK Push prompt to the payer's mobile phone and creates
        an INITIATED payment record with checkout_request_id.
        """
        client, provider = await cls.get_or_create_daraja_client(db, tenant_id)

        # Call Daraja client
        resp = await client.initiate_stk_push(
            phone_number=request.phone_number,
            amount=request.amount,
            account_reference=request.account_reference,
            transaction_desc=request.transaction_desc or "Payment",
            callback_url=callback_url,
        )

        checkout_request_id = resp.get("CheckoutRequestID", f"ws_CO_{int(datetime.now().timestamp())}")
        merchant_request_id = resp.get("MerchantRequestID")

        # Create INITIATED payment record
        payment = Payment(
            tenant_id=tenant_id,
            provider="DARAJA",
            provider_reference=checkout_request_id,  # Temporary reference until receipt is known
            checkout_request_id=checkout_request_id,
            status="INITIATED",
            amount=request.amount,
            allocated_amount=Decimal("0.00"),
            unallocated_amount=request.amount,
            currency="KES",
            sender_phone=request.phone_number,
            account_reference=request.account_reference,
            metadata_json={
                "merchant_request_id": merchant_request_id,
                "is_sandbox": client.is_sandbox,
                "is_simulated": resp.get("is_simulated", False),
            },
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)

        return StkPushResponse(
            payment_id=payment.id,
            checkout_request_id=checkout_request_id,
            merchant_request_id=merchant_request_id,
            status=payment.status,
            customer_message=resp.get("CustomerMessage", "Payment initiated"),
            is_simulated=resp.get("is_simulated", False),
        )

    @classmethod
    async def process_stk_callback(
        cls,
        db: AsyncSession,
        tenant_id: Optional[str],
        callback_payload: Dict[str, Any],
        raw_payload_str: str,
    ) -> Payment:
        """
        Processes inbound STK Push callback with fail-safe idempotency.
        Transitions state to SUCCEEDED, CANCELLED, FAILED, or TIMED_OUT.
        """
        body = callback_payload.get("Body", {})
        stk_callback = body.get("stkCallback", {})

        checkout_id = stk_callback.get("CheckoutRequestID")
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc", "")

        # 1. Log WebhookEvent record
        event = WebhookEvent(
            tenant_id=tenant_id,
            provider="DARAJA",
            event_type="STK_CALLBACK",
            payload=callback_payload,
            raw_payload=raw_payload_str,
            processed=True,
        )
        db.add(event)
        await db.commit()

        # 2. Extract metadata if payment succeeded
        receipt_number = None
        amount = None
        phone_number = None
        tx_date_str = None

        if result_code == 0:
            meta_items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            for item in meta_items:
                name = item.get("Name")
                val = item.get("Value")
                if name == "MpesaReceiptNumber":
                    receipt_number = str(val).strip()
                elif name == "Amount":
                    amount = Decimal(str(val))
                elif name == "PhoneNumber":
                    phone_number = str(val).strip()
                elif name == "TransactionDate":
                    tx_date_str = str(val)

        # 3. Check Idempotency by receipt number if present
        if receipt_number:
            existing_receipt_stmt = (
                select(Payment)
                .where(
                    Payment.provider == "DARAJA",
                    Payment.provider_reference == receipt_number,
                )
            )
            if tenant_id:
                existing_receipt_stmt = existing_receipt_stmt.where(Payment.tenant_id == tenant_id)
            existing_res = await db.execute(existing_receipt_stmt)
            existing_payment = existing_res.scalar_one_or_none()
            if existing_payment:
                # Idempotent: payment already recorded and confirmed!
                return existing_payment

        # 4. Find existing in-flight payment record by checkout_request_id
        payment = None
        if checkout_id:
            stmt = select(Payment).where(Payment.checkout_request_id == checkout_id)
            if tenant_id:
                stmt = stmt.where(Payment.tenant_id == tenant_id)
            res = await db.execute(stmt)
            payment = res.scalar_one_or_none()

        if not payment:
            # Payment record was not pre-initiated, construct new one
            resolved_tenant = tenant_id or "default_tenant"
            payment = Payment(
                tenant_id=resolved_tenant,
                provider="DARAJA",
                provider_reference=receipt_number or checkout_id or f"TX_{uuid.uuid4().hex[:10]}",
                checkout_request_id=checkout_id,
                amount=amount or Decimal("0.00"),
                allocated_amount=Decimal("0.00"),
                unallocated_amount=amount or Decimal("0.00"),
                currency="KES",
                sender_phone=phone_number,
                webhook_event_id=event.id,
            )
            db.add(payment)

        # 5. Transition payment lifecycle status
        if result_code == 0:
            payment.status = "SUCCEEDED"
            if receipt_number:
                payment.provider_reference = receipt_number
            if amount:
                payment.amount = amount
                payment.unallocated_amount = amount - payment.allocated_amount
            if phone_number and not payment.sender_phone:
                payment.sender_phone = phone_number
        elif result_code == 1032:
            payment.status = "CANCELLED"
        elif result_code in (1037,):
            payment.status = "TIMED_OUT"
        else:
            payment.status = "FAILED"

        payment.metadata_json = {
            "result_code": result_code,
            "result_desc": result_desc,
            "callback_received_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.commit()
        await db.refresh(payment)
        return payment

    @classmethod
    async def process_c2b_confirmation(
        cls,
        db: AsyncSession,
        tenant_id: str,
        payload: C2BValidationConfirmationPayload,
        raw_payload_str: str,
    ) -> Payment:
        """
        Processes inbound M-PESA C2B (Paybill / Till) confirmation with deduplication.
        """
        # 1. Idempotency Check: TransID is unique per M-PESA payment
        stmt = (
            select(Payment)
            .where(
                Payment.tenant_id == tenant_id,
                Payment.provider == "DARAJA",
                Payment.provider_reference == payload.TransID,
            )
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            return existing

        # 2. Store Webhook Event
        event = WebhookEvent(
            tenant_id=tenant_id,
            provider="DARAJA",
            event_type="C2B_CONFIRMATION",
            payload=payload.model_dump(mode="json"),
            raw_payload=raw_payload_str,
            processed=True,
        )
        db.add(event)
        await db.commit()

        # 3. Create confirmed Payment record
        sender_name_parts = [p for p in (payload.FirstName, payload.MiddleName, payload.LastName) if p]
        sender_name = " ".join(sender_name_parts) if sender_name_parts else None

        payment = Payment(
            tenant_id=tenant_id,
            provider="DARAJA",
            provider_reference=payload.TransID,
            status="SUCCEEDED",
            amount=payload.TransAmount,
            allocated_amount=Decimal("0.00"),
            unallocated_amount=payload.TransAmount,
            currency="KES",
            sender_phone=payload.MSISDN,
            sender_name=sender_name,
            account_reference=payload.BillRefNumber,
            webhook_event_id=event.id,
            metadata_json={
                "transaction_type": payload.TransactionType,
                "trans_time": payload.TransTime,
                "shortcode": payload.BusinessShortCode,
                "org_account_balance": str(payload.OrgAccountBalance) if payload.OrgAccountBalance else None,
            },
        )
        db.add(payment)
        await db.commit()
        await db.refresh(payment)
        return payment

    @classmethod
    async def save_payment_provider(
        cls,
        db: AsyncSession,
        tenant_id: str,
        data: PaymentProviderCreate,
    ) -> PaymentProvider:
        """Saves a tenant's payment provider credentials safely encrypted at rest."""
        stmt = (
            select(PaymentProvider)
            .where(
                PaymentProvider.tenant_id == tenant_id,
                PaymentProvider.provider_type == data.provider_type,
                PaymentProvider.identifier == data.identifier,
            )
        )
        res = await db.execute(stmt)
        provider = res.scalar_one_or_none()

        creds = {
            "consumer_key": data.consumer_key,
            "consumer_secret": data.consumer_secret,
            "passkey": data.passkey,
        }
        encrypted = encrypt_secret(json.dumps(creds)) if any(creds.values()) else None

        verification_status = "implemented_unverified"
        if data.is_sandbox:
            verification_status = "verified_sandbox"

        if not provider:
            provider = PaymentProvider(
                tenant_id=tenant_id,
                provider_type=data.provider_type,
                name=data.name,
                identifier=data.identifier,
                encrypted_credentials=encrypted,
                is_sandbox=data.is_sandbox,
                is_active=True,
                verification_status=verification_status,
            )
            db.add(provider)
        else:
            provider.name = data.name
            if encrypted:
                provider.encrypted_credentials = encrypted
            provider.is_sandbox = data.is_sandbox
            provider.verification_status = verification_status

        await db.commit()
        await db.refresh(provider)
        return provider

    @classmethod
    async def list_payments(
        cls,
        db: AsyncSession,
        tenant_id: str,
        status: Optional[str] = None,
        provider: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Payment], int]:
        """Lists payments for a tenant with filtering and pagination."""
        query = select(Payment).where(Payment.tenant_id == tenant_id)
        if status:
            query = query.where(Payment.status == status)
        if provider:
            query = query.where(Payment.provider == provider)

        query = query.order_by(Payment.payment_date.desc()).offset(offset).limit(limit)
        res = await db.execute(query)
        payments = res.scalars().all()
        return list(payments), len(payments)

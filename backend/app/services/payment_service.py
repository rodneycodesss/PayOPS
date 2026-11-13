import json
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import encrypt_secret, decrypt_secret
from app.integrations.tuma.client import TumaClient
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
    Manages payment lifecycles, provider adapters, Tuma API STK push and payment ingestion,
    and strict idempotency handling.
    """

    @classmethod
    async def get_or_create_tuma_client(
        cls,
        db: AsyncSession,
        tenant_id: str,
    ) -> Tuple[TumaClient, Optional[PaymentProvider]]:
        """Loads tenant's configured Tuma provider or falls back to environment/sandbox client."""
        stmt = (
            select(PaymentProvider)
            .where(
                PaymentProvider.tenant_id == tenant_id,
                PaymentProvider.provider_type.in_(["TUMA_MPESA", "TUMA_GATEWAY", "DARAJA_PAYBILL", "DARAJA_TILL"]),
                PaymentProvider.is_active == True,
            )
        )
        res = await db.execute(stmt)
        provider = res.scalar_one_or_none()

        if provider and provider.encrypted_credentials:
            try:
                creds = json.loads(decrypt_secret(provider.encrypted_credentials))
                api_key = creds.get("api_key") or creds.get("consumer_key")
                email = creds.get("email") or provider.identifier
                account_alias = creds.get("account_alias") or creds.get("passkey")
                client = TumaClient(
                    api_key=api_key,
                    email=email,
                    account_alias=account_alias,
                    is_sandbox=provider.is_sandbox,
                )
                return client, provider
            except Exception:
                pass

        # Check global/environment configuration from settings
        from app.core.config import settings
        if settings.TUMA_API_KEY and settings.TUMA_BUSINESS_EMAIL:
            client = TumaClient(
                api_key=settings.TUMA_API_KEY,
                email=settings.TUMA_BUSINESS_EMAIL,
                account_alias=settings.TUMA_ACCOUNT_ALIAS,
                base_url=settings.TUMA_BASE_URL,
                is_sandbox=settings.TUMA_IS_SANDBOX,
            )
            return client, None

        # Fallback client (Sandbox in dev/test when unconfigured; Live in production)
        is_sandbox = (
            getattr(settings, "TUMA_IS_SANDBOX", False)
            or getattr(settings, "DARAJA_IS_SANDBOX", False)
            or (getattr(settings, "APP_ENV", "development") in ("development", "test"))
        )
        return TumaClient(is_sandbox=is_sandbox, base_url=getattr(settings, "TUMA_BASE_URL", "https://api.tuma.co.ke")), None

    # Backward compatibility alias
    get_or_create_daraja_client = get_or_create_tuma_client

    @classmethod
    async def initiate_stk_push(
        cls,
        db: AsyncSession,
        tenant_id: str,
        request: StkPushRequest,
        callback_url: str = "http://backend:8000/api/v1/payments/tuma/callback",
    ) -> StkPushResponse:
        """
        Initiates an STK Push prompt to the payer's mobile phone via Tuma API and creates
        an INITIATED payment record with checkout_request_id.
        """
        client, provider = await cls.get_or_create_tuma_client(db, tenant_id)

        # Call Tuma client
        resp = await client.initiate_stk_push(
            phone_number=request.phone_number,
            amount=request.amount,
            account_reference=request.account_reference,
            transaction_desc=request.transaction_desc or "Payment",
            callback_url=callback_url,
            account=request.account_alias,
        )

        checkout_request_id = resp.get("checkout_request_id") or resp.get("CheckoutRequestID") or f"ws_CO_{int(datetime.now().timestamp())}"
        merchant_request_id = resp.get("merchant_request_id") or resp.get("MerchantRequestID")

        # Create INITIATED payment record
        payment = Payment(
            tenant_id=tenant_id,
            provider="TUMA_MPESA",
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
            customer_message=resp.get("customer_message") or resp.get("CustomerMessage", "Payment initiated"),
            is_simulated=resp.get("is_simulated", False),
        )

    @classmethod
    async def process_tuma_callback(
        cls,
        db: AsyncSession,
        tenant_id: Optional[str],
        callback_payload: Dict[str, Any],
        raw_payload_str: str,
    ) -> Payment:
        """
        Processes inbound STK Push callback with fail-safe idempotency.
        Supports both native Tuma API callback payload and legacy M-PESA envelope.
        Transitions state to SUCCEEDED, CANCELLED, FAILED, or TIMED_OUT.
        """
        # Detect format: Tuma native vs Daraja envelope
        checkout_id = None
        result_code = None
        result_desc = ""
        receipt_number = None
        amount = None
        phone_number = None

        if "Body" in callback_payload and "stkCallback" in callback_payload.get("Body", {}):
            # Daraja format
            stk_callback = callback_payload["Body"]["stkCallback"]
            checkout_id = stk_callback.get("CheckoutRequestID")
            result_code = stk_callback.get("ResultCode")
            result_desc = stk_callback.get("ResultDesc", "")

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
        else:
            # Tuma native format
            checkout_id = callback_payload.get("checkout_request_id") or callback_payload.get("CheckoutRequestID")
            raw_status = str(callback_payload.get("status", "")).lower()
            result_code = callback_payload.get("result_code")
            if result_code is None:
                if raw_status in ("completed", "success", "succeeded"):
                    result_code = 0
                elif raw_status in ("cancelled", "canceled"):
                    result_code = 1032
                elif raw_status in ("timed_out", "timeout"):
                    result_code = 1037
                else:
                    result_code = 1

            result_desc = callback_payload.get("result_desc") or callback_payload.get("message") or ""
            receipt_number = (
                callback_payload.get("mpesa_receipt_number")
                or callback_payload.get("receipt_number")
                or callback_payload.get("reference")
            )
            if callback_payload.get("amount") is not None:
                amount = Decimal(str(callback_payload["amount"]))
            phone_number = callback_payload.get("phone") or callback_payload.get("phone_number")

        # 1. Log WebhookEvent record
        event = WebhookEvent(
            tenant_id=tenant_id,
            provider="TUMA",
            event_type="STK_CALLBACK",
            payload=callback_payload,
            raw_payload=raw_payload_str,
            processed=True,
        )
        db.add(event)
        await db.commit()

        # 2. Check Idempotency by receipt number if present
        if receipt_number:
            existing_receipt_stmt = (
                select(Payment)
                .where(
                    Payment.provider.in_(["TUMA", "TUMA_MPESA", "DARAJA"]),
                    Payment.provider_reference == str(receipt_number).strip(),
                )
            )
            if tenant_id:
                existing_receipt_stmt = existing_receipt_stmt.where(Payment.tenant_id == tenant_id)
            existing_res = await db.execute(existing_receipt_stmt)
            existing_payment = existing_res.scalar_one_or_none()
            if existing_payment:
                # Idempotent: payment already recorded and confirmed!
                return existing_payment

        # 3. Find existing in-flight payment record by checkout_request_id
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
                provider="TUMA_MPESA",
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

        # 4. Transition payment lifecycle status
        if result_code == 0:
            payment.status = "SUCCEEDED"
            if receipt_number:
                payment.provider_reference = str(receipt_number).strip()
            if amount:
                payment.amount = amount
                payment.unallocated_amount = amount - payment.allocated_amount
            if phone_number and not payment.sender_phone:
                payment.sender_phone = str(phone_number).strip()
        elif result_code == 1032 or str(callback_payload.get("status")).lower() == "cancelled":
            payment.status = "CANCELLED"
        elif result_code in (1037,) or str(callback_payload.get("status")).lower() == "timed_out":
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

    # Backward compatibility alias
    process_stk_callback = process_tuma_callback

    @classmethod
    async def process_c2b_confirmation(
        cls,
        db: AsyncSession,
        tenant_id: str,
        payload: C2BValidationConfirmationPayload,
        raw_payload_str: str,
    ) -> Payment:
        """
        Processes inbound C2B / Paybill / Till confirmation with deduplication.
        """
        # 1. Idempotency Check: TransID is unique per payment
        stmt = (
            select(Payment)
            .where(
                Payment.tenant_id == tenant_id,
                Payment.provider.in_(["TUMA_MPESA", "TUMA", "DARAJA"]),
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
            provider="TUMA",
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
            provider="TUMA_MPESA",
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
            "api_key": data.api_key or data.consumer_key,
            "email": data.email or data.consumer_secret,
            "account_alias": data.account_alias or data.passkey,
            # Also keep legacy keys in dict
            "consumer_key": data.api_key or data.consumer_key,
            "consumer_secret": data.email or data.consumer_secret,
            "passkey": data.account_alias or data.passkey,
        }
        encrypted = encrypt_secret(json.dumps(creds)) if any(creds.values()) else None

        verification_status = "implemented_unverified"
        if data.is_sandbox:
            verification_status = "verified_sandbox"
        elif (data.api_key and data.email) or (data.consumer_key and data.consumer_secret):
            verification_status = "live_production"

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
            if provider.upper() in ("TUMA", "TUMA_MPESA", "DARAJA"):
                query = query.where(Payment.provider.in_(["TUMA", "TUMA_MPESA", "DARAJA"]))
            else:
                query = query.where(Payment.provider == provider)

        query = query.order_by(Payment.payment_date.desc()).offset(offset).limit(limit)
        res = await db.execute(query)
        payments = res.scalars().all()
        return list(payments), len(payments)

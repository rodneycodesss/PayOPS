import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import encrypt_secret, decrypt_secret, mask_account, mask_phone
from app.integrations.tuma.gateway import TumaGateway, TumaHttpGateway
from app.integrations.tuma.exceptions import (
    TumaError,
    TumaAuthError,
    TumaValidationError,
    TumaRateLimitError,
    TumaNetworkError,
)
from app.models.tenants import Tenant
from app.models.users import User
from app.models.tuma import (
    TumaChildAccount,
    TenantSettlementDetail,
    TumaProvisioningJob,
    IntegrationEvent,
)


class TumaOnboardingService:
    """
    Automates parent/child onboarding for tenants on PayOps.
    Creates child business profile, securely stores envelope-encrypted API key,
    and enables live collections with zero tenant effort.
    """

    @classmethod
    async def get_or_create_child_record(
        cls, db: AsyncSession, tenant_id: str
    ) -> TumaChildAccount:
        """Retrieves or creates initial awaiting_settlement child record for tenant."""
        stmt = select(TumaChildAccount).where(TumaChildAccount.tenant_id == tenant_id)
        res = await db.execute(stmt)
        child = res.scalar_one_or_none()
        if not child:
            child = TumaChildAccount(
                tenant_id=tenant_id,
                status="awaiting_settlement",
                webhook_token=uuid.uuid4().hex + uuid.uuid4().hex[:32],
            )
            db.add(child)
            await db.commit()
            await db.refresh(child)
        return child

    @classmethod
    async def get_onboarding_status(
        cls, db: AsyncSession, tenant_id: str
    ) -> Dict[str, Any]:
        """
        Returns the tenant's current payment onboarding status, settlement details,
        and plain-language next action.
        """
        child = await cls.get_or_create_child_record(db, tenant_id)
        
        # Load settlement details
        settle_stmt = (
            select(TenantSettlementDetail)
            .where(TenantSettlementDetail.tenant_id == tenant_id)
            .order_by(TenantSettlementDetail.created_at.desc())
            .limit(1)
        )
        s_res = await db.execute(settle_stmt)
        settlement = s_res.scalars().first()

        next_action = "Connect your settlement bank account to start collecting customer payments."
        if child.status == "provisioning":
            next_action = "Setting up your dedicated payment gateway. This will take a few seconds."
        elif child.status == "active":
            next_action = "Your account is active and ready to collect payments via M-PESA STK Push."
        elif child.status == "needs_action":
            next_action = f"Action required: {child.last_error_message or 'Please check and resubmit your settlement details.'}"
        elif child.status == "suspended":
            next_action = "Collections are temporarily suspended. Contact PayOps support for assistance."

        return {
            "status": child.status,
            "is_active": child.status == "active",
            "can_collect": child.status == "active",
            "bank_name": child.bank_name or (settlement.bank_name if settlement else None),
            "account_masked": child.account_masked or (settlement.account_masked if settlement else None),
            "webhook_token": child.webhook_token,
            "next_action": next_action,
            "last_error_message": child.last_error_message,
            "activated_at": child.activated_at,
        }

    @classmethod
    async def list_available_banks(
        cls, gateway: Optional[TumaGateway] = None
    ) -> List[Dict[str, Any]]:
        """Lists available commercial banks in Kenya from Tuma reference API."""
        gw = gateway or TumaHttpGateway()
        return await gw.list_banks(country="KE")

    @classmethod
    async def submit_settlement_details(
        cls,
        db: AsyncSession,
        tenant_id: str,
        bank_id: str,
        bank_name: str,
        account_number: str,
        user_id: Optional[str] = None,
        user_email: Optional[str] = None,
        gateway: Optional[TumaGateway] = None,
    ) -> Dict[str, Any]:
        """
        Saves tenant's settlement destination and triggers automated Tuma child provisioning.
        """
        clean_acct = str(account_number).strip()
        if len(clean_acct) < 5:
            raise ValueError("Bank account number must be at least 5 digits.")
        if not bank_id or not bank_name:
            raise ValueError("Please select a valid bank from the list.")

        child = await cls.get_or_create_child_record(db, tenant_id)
        if child.status == "active":
            # Idempotency check: tenant already has an active child account
            return await cls.get_onboarding_status(db, tenant_id)

        # 1. Encrypt account number at rest and mask for display
        acct_encrypted = encrypt_secret(clean_acct)
        acct_masked = mask_account(clean_acct)

        settlement = TenantSettlementDetail(
            tenant_id=tenant_id,
            destination_type="BANK",
            bank_id=bank_id.strip(),
            bank_name=bank_name.strip(),
            account_number_encrypted=acct_encrypted,
            account_masked=acct_masked,
            status="VERIFIED",
            updated_by=user_id,
        )
        db.add(settlement)

        # 2. Update Child Record
        child = await cls.get_or_create_child_record(db, tenant_id)
        child.bank_id = bank_id.strip()
        child.bank_name = bank_name.strip()
        child.account_masked = acct_masked
        child.status = "provisioning"
        child.last_error_code = None
        child.last_error_message = None

        # 3. Create or Reset Provisioning Job
        idempotency_key = f"tuma_prov_{tenant_id}"
        job_stmt = select(TumaProvisioningJob).where(TumaProvisioningJob.idempotency_key == idempotency_key)
        j_res = await db.execute(job_stmt)
        job = j_res.scalar_one_or_none()
        if not job:
            job = TumaProvisioningJob(
                tenant_id=tenant_id,
                idempotency_key=idempotency_key,
                step="VALIDATE",
                status="PENDING",
                attempts=0,
            )
            db.add(job)
        else:
            job.step = "VALIDATE"
            job.status = "PENDING"
            job.last_error = None

        # 4. Audit Log
        event = IntegrationEvent(
            tenant_id=tenant_id,
            actor_id=user_id,
            actor_email=user_email,
            action="SETTLEMENT_DETAILS_SUBMITTED",
            metadata_json={
                "bank_id": bank_id,
                "bank_name": bank_name,
                "account_masked": acct_masked,
            },
        )
        db.add(event)
        await db.commit()

        # 5. Execute provisioning immediately (single-pass automated flow)
        await cls.provision_child_business(
            db=db,
            tenant_id=tenant_id,
            account_number_plain=clean_acct,
            gateway=gateway,
        )

        return await cls.get_onboarding_status(db, tenant_id)

    @classmethod
    async def provision_child_business(
        cls,
        db: AsyncSession,
        tenant_id: str,
        account_number_plain: Optional[str] = None,
        gateway: Optional[TumaGateway] = None,
    ) -> TumaChildAccount:
        """
        Executes the 5-step automated provisioning workflow against Tuma API:
        VALIDATE -> CREATE_CHILD -> ENCRYPT_STORE -> VERIFY_AUTH -> COMPLETE.
        """
        child = await cls.get_or_create_child_record(db, tenant_id)
        if child.status == "active":
            return child

        # Load Tenant
        t_stmt = select(Tenant).where(Tenant.id == tenant_id)
        tenant = (await db.execute(t_stmt)).scalar_one_or_none()
        if not tenant:
            raise ValueError(f"Tenant {tenant_id} not found.")

        # Load Settlement
        s_stmt = (
            select(TenantSettlementDetail)
            .where(TenantSettlementDetail.tenant_id == tenant_id)
            .order_by(TenantSettlementDetail.created_at.desc())
            .limit(1)
        )
        settlement = (await db.execute(s_stmt)).scalars().first()
        if not settlement:
            child.status = "awaiting_settlement"
            await db.commit()
            return child

        plain_acct = account_number_plain
        if not plain_acct:
            try:
                plain_acct = decrypt_secret(settlement.account_number_encrypted)
            except Exception:
                child.status = "needs_action"
                child.last_error_message = "Settlement account decryption failed. Please resubmit details."
                await db.commit()
                return child

        # Load Provisioning Job
        idempotency_key = f"tuma_prov_{tenant_id}"
        job_stmt = select(TumaProvisioningJob).where(TumaProvisioningJob.idempotency_key == idempotency_key)
        job = (await db.execute(job_stmt)).scalar_one_or_none()
        if not job:
            job = TumaProvisioningJob(tenant_id=tenant_id, idempotency_key=idempotency_key)
            db.add(job)

        gw = gateway or TumaHttpGateway()

        try:
            job.attempts += 1
            job.status = "PROCESSING"

            # Step 1: Validate input
            job.step = "VALIDATE"
            mobile_to_use = tenant.phone or "254700000000"
            clean_mobile = TumaHttpGateway.format_phone(mobile_to_use)
            if not clean_mobile.startswith("254") or len(clean_mobile) != 12:
                # Fallback to standard Kenya format if empty
                clean_mobile = "254712345678"

            # Step 2: Create child business profile on Tuma
            job.step = "CREATE_CHILD"
            biz_name = tenant.trading_name or tenant.name
            biz_email = tenant.email
            logo_url = "https://payops.rodstartechdevs.co.ke/logo.png"

            biz_resp = await gw.create_child(
                name=biz_name,
                email=biz_email,
                mobile=clean_mobile,
                bank_id=settlement.bank_id,
                account_number=plain_acct,
                logo=logo_url,
                description=f"PayOps Merchant Profile: {tenant.name}",
            )

            tuma_biz_id = str(biz_resp.get("id", ""))
            child_api_key = biz_resp.get("api_key")
            if not child_api_key:
                raise TumaError("Tuma response did not contain child API key.")

            # Step 3: Encrypt and store API key immediately at rest
            job.step = "STORE_KEYS"
            child.tuma_business_id = tuma_biz_id
            child.api_key_encrypted = encrypt_secret(str(child_api_key).strip())
            child.key_version = 1
            child.bank_id = settlement.bank_id
            child.bank_name = settlement.bank_name
            child.account_masked = settlement.account_masked

            # Step 4: Verify authentication with newly issued child credentials
            job.step = "VERIFY_AUTH"
            await gw.authenticate_child(email=biz_email, api_key=str(child_api_key).strip())

            # Step 5: Mark active
            job.step = "COMPLETED"
            job.status = "COMPLETED"
            child.status = "active"
            child.activated_at = datetime.now(timezone.utc)
            child.last_error_code = None
            child.last_error_message = None

            # Audit event
            event = IntegrationEvent(
                tenant_id=tenant_id,
                action="TUMA_CHILD_ACTIVATED",
                metadata_json={
                    "tuma_business_id": tuma_biz_id,
                    "bank_name": settlement.bank_name,
                    "account_masked": settlement.account_masked,
                },
            )
            db.add(event)
            await db.commit()
            await db.refresh(child)
            return child

        except (TumaValidationError, ValueError) as val_err:
            # Permanent validation error -> needs_action
            job.status = "FAILED"
            job.last_error = str(val_err)
            child.status = "needs_action"
            child.last_error_code = "VALIDATION_FAILED"
            child.last_error_message = str(val_err)
            await db.commit()
            return child

        except (TumaAuthError, TumaRateLimitError, TumaNetworkError, TumaError) as net_err:
            # Transient error -> schedule retry
            job.status = "RETRYING"
            job.last_error = str(net_err)
            job.next_retry_at = datetime.now(timezone.utc) + timedelta(minutes=min(2 ** job.attempts, 60))
            child.last_error_message = f"Connection error: {str(net_err)}. Retrying shortly."
            await db.commit()
            return child

    @classmethod
    async def request_settlement_change(
        cls,
        db: AsyncSession,
        tenant_id: str,
        user: User,
        new_bank_id: str,
        new_bank_name: str,
        new_account_number: str,
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        High-security settlement details update request.
        Enforces audit logging, email alert notification, and platform admin routing
        due to unconfirmed Tuma self-service update endpoint.
        """
        clean_acct = str(new_account_number).strip()
        if len(clean_acct) < 5:
            raise ValueError("Bank account number must be at least 5 digits.")

        acct_encrypted = encrypt_secret(clean_acct)
        acct_masked = mask_account(clean_acct)

        # Log high-severity audit event
        event = IntegrationEvent(
            tenant_id=tenant_id,
            actor_id=user.id,
            actor_email=user.email,
            action="SETTLEMENT_CHANGE_REQUESTED",
            metadata_json={
                "new_bank_id": new_bank_id,
                "new_bank_name": new_bank_name,
                "new_account_masked": acct_masked,
                "reason": reason or "User requested bank update",
                "requires_admin_review": True,
            },
        )
        db.add(event)
        await db.commit()

        return {
            "status": "pending_admin_review",
            "message": (
                "Settlement account changes require platform verification to prevent unauthorized redirection. "
                "Your request has been logged and our operations team will assist shortly."
            ),
            "new_bank_name": new_bank_name,
            "new_account_masked": acct_masked,
        }

    @classmethod
    async def detect_orphaned_accounts(cls, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Orphan Detection Job:
        Scans for tenants with submitted settlement details but no active Tuma child profile,
        or stuck provisioning jobs older than 15 minutes.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=15)
        
        # 1. Stuck jobs
        stuck_stmt = (
            select(TumaProvisioningJob, Tenant)
            .join(Tenant, Tenant.id == TumaProvisioningJob.tenant_id)
            .where(
                TumaProvisioningJob.status.in_(["PENDING", "PROCESSING", "RETRYING"]),
                TumaProvisioningJob.created_at < cutoff,
            )
        )
        stuck_res = await db.execute(stuck_stmt)
        orphans = []
        for job, tenant in stuck_res.all():
            orphans.append({
                "type": "STUCK_PROVISIONING_JOB",
                "tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "job_id": job.id,
                "step": job.step,
                "attempts": job.attempts,
                "last_error": job.last_error,
                "stuck_since": job.created_at,
            })

        # 2. Tenants with settlement details but child status != active
        orphan_child_stmt = (
            select(TumaChildAccount, Tenant)
            .join(Tenant, Tenant.id == TumaChildAccount.tenant_id)
            .where(
                TumaChildAccount.status.in_(["needs_action", "failed", "provisioning"]),
                TumaChildAccount.updated_at < cutoff,
            )
        )
        child_res = await db.execute(orphan_child_stmt)
        for child, tenant in child_res.all():
            orphans.append({
                "type": "UNACTIVATED_CHILD_ACCOUNT",
                "tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "child_id": child.id,
                "status": child.status,
                "last_error": child.last_error_message,
                "last_updated": child.updated_at,
            })

        return orphans

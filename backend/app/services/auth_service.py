import json
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
    generate_totp_secret,
    get_totp_uri,
    verify_totp,
    generate_otp_code,
    hash_otp_code,
    verify_otp_code,
    generate_magic_link_token,
    hash_magic_link_token,
    verify_magic_link_token,
)
from app.models.tenants import Tenant
from app.models.branches import Branch
from app.models.users import User
from app.models.rbac import Role, Permission, UserRole, RolePermission
from app.models.auth import RefreshToken, AuthOtp
from app.models.accounting import ChartOfAccounts
from app.models.tax import TaxConfiguration
from app.services.audit_service import AuditService
from app.services.email_service import EmailService, get_client_base_url
from decimal import Decimal

logger = logging.getLogger(__name__)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware in UTC (essential for SQLite compatibility)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt



# System Roles & Permissions Definition
DEFAULT_PERMISSIONS = [
    # Auth & Tenancy
    {"code": "tenant:manage", "name": "Manage Tenant Profile", "module": "tenancy"},
    {"code": "branch:manage", "name": "Manage Branches", "module": "tenancy"},
    {"code": "user:manage", "name": "Manage Users & Permissions", "module": "tenancy"},
    {"code": "audit:view", "name": "View Audit Logs", "module": "audit"},
    
    # Financial Invoices
    {"code": "invoice:create", "name": "Create Invoices", "module": "invoices"},
    {"code": "invoice:issue", "name": "Issue Invoices", "module": "invoices"},
    {"code": "invoice:view", "name": "View Invoices", "module": "invoices"},
    {"code": "credit_note:manage", "name": "Manage Credit Notes", "module": "invoices"},
    
    # Payments & Bank
    {"code": "payment:initiate", "name": "Initiate Payments (STK)", "module": "payments"},
    {"code": "payment:record", "name": "Record Manual Payments", "module": "payments"},
    {"code": "payment:view", "name": "View Payments", "module": "payments"},
    {"code": "bank:import", "name": "Import Bank Statements", "module": "banking"},
    {"code": "bank:view", "name": "View Bank Transactions", "module": "banking"},
    
    # Reconciliation
    {"code": "reconciliation:run", "name": "Run Reconciliation", "module": "reconciliation"},
    {"code": "reconciliation:resolve", "name": "Resolve Exceptions", "module": "reconciliation"},
    {"code": "reconciliation:view", "name": "View Reconciliation", "module": "reconciliation"},
    
    # Accounting & Ledger
    {"code": "ledger:post", "name": "Post Journal Entries", "module": "accounting"},
    {"code": "ledger:view", "name": "View Chart of Accounts & Ledger", "module": "accounting"},
    {"code": "period:close", "name": "Perform Period Close", "module": "accounting"},
    
    # Tax & eTIMS
    {"code": "tax:manage", "name": "Manage Tax Configuration", "module": "tax"},
    {"code": "etims:review", "name": "Review eTIMS Submissions", "module": "tax"},
    {"code": "etims:record_manual", "name": "Record Manual eTIMS Submission", "module": "tax"},
    
    # Reports & Automations
    {"code": "report:view", "name": "View Financial Reports", "module": "reports"},
    {"code": "automation:manage", "name": "Manage n8n Automations", "module": "automations"},
]

DEFAULT_ROLES = {
    "owner": [p["code"] for p in DEFAULT_PERMISSIONS],
    "finance_admin": [
        "tenant:manage", "branch:manage", "user:manage", "audit:view",
        "invoice:create", "invoice:issue", "invoice:view", "credit_note:manage",
        "payment:initiate", "payment:record", "payment:view", "bank:import", "bank:view",
        "reconciliation:run", "reconciliation:resolve", "reconciliation:view",
        "ledger:post", "ledger:view", "tax:manage", "etims:review", "etims:record_manual",
        "report:view", "automation:manage"
    ],
    "accountant": [
        "invoice:view", "payment:view", "bank:import", "bank:view",
        "reconciliation:run", "reconciliation:resolve", "reconciliation:view",
        "ledger:post", "ledger:view", "period:close", "report:view", "audit:view",
        "etims:review", "etims:record_manual"
    ],
    "cashier": [
        "invoice:create", "invoice:issue", "invoice:view",
        "payment:initiate", "payment:record", "payment:view"
    ],
    "auditor": [
        "audit:view", "invoice:view", "payment:view", "bank:view",
        "reconciliation:view", "ledger:view", "report:view"
    ],
    "viewer": [
        "invoice:view", "payment:view", "report:view"
    ]
}


class AuthService:
    @staticmethod
    async def ensure_system_rbac_seeded(db: AsyncSession) -> None:
        """Seeds base permissions and system roles if not present."""
        # 1. Seed permissions
        perm_map = {}
        for p_def in DEFAULT_PERMISSIONS:
            stmt = select(Permission).where(Permission.code == p_def["code"])
            res = await db.execute(stmt)
            perm = res.scalar_one_or_none()
            if not perm:
                perm = Permission(
                    code=p_def["code"],
                    name=p_def["name"],
                    module=p_def["module"],
                )
                db.add(perm)
                await db.flush()
            perm_map[perm.code] = perm

        # 2. Seed system roles (tenant_id=None indicates global system role)
        for role_name, perm_codes in DEFAULT_ROLES.items():
            stmt = select(Role).where(Role.name == role_name, Role.tenant_id == None)
            res = await db.execute(stmt)
            role = res.scalar_one_or_none()
            if not role:
                role = Role(
                    name=role_name,
                    description=f"System role: {role_name}",
                    is_system=True,
                    tenant_id=None
                )
                db.add(role)
                await db.flush()

                # Link permissions
                for p_code in perm_codes:
                    if p_code in perm_map:
                        rp = RolePermission(
                            role_id=role.id,
                            permission_id=perm_map[p_code].id
                        )
                        db.add(rp)
                await db.flush()

    @staticmethod
    async def seed_tenant_defaults(db: AsyncSession, tenant_id: str) -> None:
        """Seeds standard Chart of Accounts and Tax Configurations for a new tenant."""
        # Standard Kenyan SME Chart of Accounts
        standard_accounts = [
            ("1000", "Petty Cash", "ASSET"),
            ("1010", "M-PESA Clearing", "ASSET"),
            ("1020", "Bank - Operating Account", "ASSET"),
            ("1200", "Accounts Receivable", "ASSET"),
            ("2000", "Accounts Payable", "LIABILITY"),
            ("2100", "VAT Output Tax Payable", "LIABILITY"),
            ("2110", "Customer Overpayment Credit", "LIABILITY"),
            ("3000", "Retained Earnings", "EQUITY"),
            ("4000", "Operating Revenue", "REVENUE"),
            ("5000", "Cost of Goods & Services", "EXPENSE"),
            ("6000", "Operating Expenses", "EXPENSE"),
            ("6100", "Payment Processing Fees", "EXPENSE"),
        ]

        for code, name, acc_type in standard_accounts:
            stmt = select(ChartOfAccounts).where(
                ChartOfAccounts.tenant_id == tenant_id,
                ChartOfAccounts.code == code
            )
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                account = ChartOfAccounts(
                    tenant_id=tenant_id,
                    code=code,
                    name=name,
                    account_type=acc_type,
                    currency="KES",
                    is_system=True,
                    is_active=True
                )
                db.add(account)

        # Standard Tax Configurations
        standard_taxes = [
            ("Standard VAT (16%)", "VAT_STANDARD", Decimal("16.00"), True),
            ("Zero Rated (0%)", "VAT_ZERO", Decimal("0.00"), False),
            ("Exempt (0%)", "VAT_EXEMPT", Decimal("0.00"), False),
        ]

        for name, code, rate, is_def in standard_taxes:
            stmt = select(TaxConfiguration).where(
                TaxConfiguration.tenant_id == tenant_id,
                TaxConfiguration.code == code
            )
            res = await db.execute(stmt)
            if not res.scalar_one_or_none():
                tax = TaxConfiguration(
                    tenant_id=tenant_id,
                    name=name,
                    code=code,
                    rate=rate,
                    is_default=is_def,
                    is_active=True
                )
                db.add(tax)

        await db.flush()

    @staticmethod
    async def register_tenant(
        db: AsyncSession,
        business_name: str,
        trading_name: Optional[str],
        kra_pin: Optional[str],
        full_name: str,
        email: str,
        password: str,
        phone: Optional[str],
        request: Optional[Request] = None
    ) -> Tuple[Tenant, User, str, str]:
        """Registers a new tenant, owner, branch, seeds defaults, and issues tokens."""
        # Check if email is already registered across any active tenant
        stmt = select(User).where(User.email == email.lower())
        existing_user = (await db.execute(stmt)).scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already registered",
            )

        await AuthService.ensure_system_rbac_seeded(db)

        # 1. Create Tenant
        tenant = Tenant(
            name=business_name.strip(),
            trading_name=trading_name.strip() if trading_name else None,
            kra_pin=kra_pin.strip().upper() if kra_pin else None,
            email=email.lower().strip(),
            phone=phone.strip() if phone else None,
            currency="KES",
            is_active=True
        )
        db.add(tenant)
        await db.flush()

        # 2. Create Default Branch (HQ)
        hq_branch = Branch(
            tenant_id=tenant.id,
            name="Headquarters",
            code="HQ",
            is_headquarters=True,
            is_active=True
        )
        db.add(hq_branch)

        # 3. Create User with Argon2id hash
        user = User(
            tenant_id=tenant.id,
            email=email.lower().strip(),
            full_name=full_name.strip(),
            hashed_password=hash_password(password),
            is_active=True,
            is_verified=True,
            mfa_enabled=False
        )
        db.add(user)
        await db.flush()

        # 4. Assign Owner Role
        role_stmt = select(Role).where(Role.name == "owner", Role.tenant_id == None)
        owner_role = (await db.execute(role_stmt)).scalar_one()
        
        user_role = UserRole(
            user_id=user.id,
            role_id=owner_role.id,
            tenant_id=tenant.id
        )
        db.add(user_role)

        # 5. Seed Chart of Accounts & Tax Config
        await AuthService.seed_tenant_defaults(db, tenant.id)

        # 6. Issue Tokens
        roles = ["owner"]
        permissions = DEFAULT_ROLES["owner"]
        access_token = create_access_token(user.id, tenant.id, roles, permissions)
        refresh_token, jti, family_id, expires_at = create_refresh_token(user.id, tenant.id)

        # Store Refresh Token
        token_record = RefreshToken(
            tenant_id=tenant.id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=jti,
            family_id=family_id,
            is_revoked=False,
            expires_at=expires_at
        )
        db.add(token_record)

        # 7. Audit Log
        await AuditService.log_event(
            db=db,
            action="AUTH_REGISTER",
            resource_type="tenant",
            resource_id=tenant.id,
            tenant_id=tenant.id,
            actor_id=user.id,
            actor_email=user.email,
            details={"business_name": tenant.name, "branch": "HQ"},
            request=request
        )

        await db.commit()
        return tenant, user, access_token, refresh_token

    @staticmethod
    async def request_registration_otp(
        db: AsyncSession,
        business_name: str,
        trading_name: Optional[str],
        kra_pin: Optional[str],
        full_name: str,
        email: str,
        password: str,
        phone: Optional[str],
        request: Optional[Request] = None
    ) -> Tuple[str, str, int, Optional[str]]:
        """
        Validates prospective tenant details, generates a 6-digit verification code,
        and stores pending registration payload securely until OTP verification.
        Returns: (message, email, expires_in, dev_otp)
        """
        norm_email = email.lower().strip()
        stmt = select(User).where(User.email == norm_email)
        existing_user = (await db.execute(stmt)).scalar_one_or_none()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already registered",
            )

        # Invalidate any prior active registration OTPs for this email
        st_old = select(AuthOtp).where(
            AuthOtp.identifier == norm_email,
            AuthOtp.purpose == "REGISTRATION",
            AuthOtp.is_used == False,
        )
        old_otps = (await db.execute(st_old)).scalars().all()
        for old in old_otps:
            old.is_used = True

        raw_code = generate_otp_code(6)
        code_hash = hash_otp_code(norm_email, raw_code)

        payload_data = {
            "business_name": business_name.strip(),
            "trading_name": trading_name.strip() if trading_name else None,
            "kra_pin": kra_pin.strip().upper() if kra_pin else None,
            "full_name": full_name.strip(),
            "email": norm_email,
            "hashed_password": hash_password(password),
            "phone": phone.strip() if phone else None,
        }

        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        otp_record = AuthOtp(
            identifier=norm_email,
            purpose="REGISTRATION",
            code_hash=code_hash,
            payload_json=json.dumps(payload_data),
            expires_at=expires_at,
            attempts=0,
            max_attempts=5,
            is_used=False
        )
        db.add(otp_record)
        await db.commit()

        logger.info(f"[REGISTRATION OTP] Code for {norm_email}: {raw_code}")

        dev_otp = raw_code if settings.APP_ENV != "production" else None
        return f"Verification code sent to {norm_email}", norm_email, 600, dev_otp

    @staticmethod
    async def resend_registration_otp(
        db: AsyncSession,
        email: str,
        request: Optional[Request] = None
    ) -> Tuple[str, str, int, Optional[str]]:
        """
        Resends a fresh 6-digit registration OTP code for a pending registration.
        """
        norm_email = email.lower().strip()
        stmt = (
            select(AuthOtp)
            .where(
                AuthOtp.identifier == norm_email,
                AuthOtp.purpose == "REGISTRATION",
                AuthOtp.is_used == False,
            )
            .order_by(AuthOtp.created_at.desc())
        )
        otp = (await db.execute(stmt)).scalars().first()
        if not otp or not otp.payload_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pending registration found for this email. Please submit registration form.",
            )

        raw_code = generate_otp_code(6)
        otp.code_hash = hash_otp_code(norm_email, raw_code)
        otp.expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        otp.attempts = 0
        await db.commit()

        logger.info(f"[REGISTRATION OTP RESEND] New code for {norm_email}: {raw_code}")

        dev_otp = raw_code if settings.APP_ENV != "production" else None
        return f"New verification code sent to {norm_email}", norm_email, 600, dev_otp

    @staticmethod
    async def verify_registration_otp(
        db: AsyncSession,
        email: str,
        code: str,
        request: Optional[Request] = None
    ) -> Tuple[Tenant, User, str, str]:
        """
        Validates the 6-digit OTP code, creates tenant, user, branch, seeds defaults,
        and issues access & refresh tokens.
        """
        norm_email = email.lower().strip()
        stmt = (
            select(AuthOtp)
            .where(
                AuthOtp.identifier == norm_email,
                AuthOtp.purpose == "REGISTRATION",
                AuthOtp.is_used == False,
            )
            .order_by(AuthOtp.created_at.desc())
        )
        otp = (await db.execute(stmt)).scalars().first()
        if not otp or not otp.payload_json:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active verification code found for this email. Please request a new code.",
            )

        if datetime.now(timezone.utc) > ensure_utc(otp.expires_at):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new code.",
            )

        if otp.attempts >= otp.max_attempts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum verification attempts exceeded. Please request a new code.",
            )

        if not verify_otp_code(norm_email, code, otp.code_hash):
            otp.attempts += 1
            await db.commit()
            remaining = otp.max_attempts - otp.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
            )

        # Mark OTP as successfully used
        otp.is_used = True
        payload = json.loads(otp.payload_json)

        # Verify email is not registered in the interim
        stmt_dup = select(User).where(User.email == payload["email"])
        if (await db.execute(stmt_dup)).scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address is already registered",
            )

        await AuthService.ensure_system_rbac_seeded(db)

        # 1. Create Tenant
        tenant = Tenant(
            name=payload["business_name"],
            trading_name=payload.get("trading_name"),
            kra_pin=payload.get("kra_pin"),
            email=payload["email"],
            phone=payload.get("phone"),
            currency="KES",
            is_active=True
        )
        db.add(tenant)
        await db.flush()

        # 2. Create Headquarters Branch
        hq_branch = Branch(
            tenant_id=tenant.id,
            name="Headquarters",
            code="HQ",
            is_headquarters=True,
            is_active=True
        )
        db.add(hq_branch)

        # 3. Create User with is_verified=True
        user = User(
            tenant_id=tenant.id,
            email=payload["email"],
            full_name=payload["full_name"],
            hashed_password=payload["hashed_password"],
            is_active=True,
            is_verified=True,
            mfa_enabled=False
        )
        db.add(user)
        await db.flush()

        # 4. Assign Owner Role
        role_stmt = select(Role).where(Role.name == "owner", Role.tenant_id == None)
        owner_role = (await db.execute(role_stmt)).scalar_one()

        user_role = UserRole(
            user_id=user.id,
            role_id=owner_role.id,
            tenant_id=tenant.id
        )
        db.add(user_role)

        # 5. Seed Chart of Accounts & Tax Config
        await AuthService.seed_tenant_defaults(db, tenant.id)

        # 6. Issue Tokens
        roles = ["owner"]
        permissions = DEFAULT_ROLES["owner"]
        access_token = create_access_token(user.id, tenant.id, roles, permissions)
        refresh_token, jti, family_id, expires_at = create_refresh_token(user.id, tenant.id)

        token_record = RefreshToken(
            tenant_id=tenant.id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=jti,
            family_id=family_id,
            is_revoked=False,
            expires_at=expires_at
        )
        db.add(token_record)

        # 7. Audit Log
        await AuditService.log_event(
            db=db,
            action="AUTH_REGISTER_OTP_VERIFIED",
            resource_type="tenant",
            resource_id=tenant.id,
            tenant_id=tenant.id,
            actor_id=user.id,
            actor_email=user.email,
            details={"business_name": tenant.name, "branch": "HQ", "auth_method": "EMAIL_OTP"},
            request=request
        )

        await db.commit()
        return tenant, user, access_token, refresh_token

    @staticmethod
    async def authenticate_user(
        db: AsyncSession,
        email: str,
        password: str,
        totp_code: Optional[str] = None,
        request: Optional[Request] = None
    ) -> Tuple[Optional[User], Optional[str], Optional[str], bool, Optional[str], Optional[str], Optional[str]]:
        """
        Authenticates user via Argon2id and optional TOTP / email OTP / email verification link.
        Returns: (user, access_token, refresh_token, mfa_required, temp_token, dev_otp, dev_link)
        """
        stmt = (
            select(User)
            .where(User.email == email.lower().strip())
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            await AuditService.log_event(
                db=db,
                action="AUTH_LOGIN_FAILED",
                resource_type="auth",
                actor_email=email,
                details={"reason": "Invalid credentials"},
                request=request
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated",
            )

        # Multi-factor authentication check
        if user.mfa_enabled:
            if not totp_code:
                # Return temp token indicating MFA is required
                temp_token = create_access_token(
                    user.id, user.tenant_id, ["mfa_pending"], []
                )

                # Invalidate any older login OTPs & links for this user
                st_old = select(AuthOtp).where(
                    AuthOtp.identifier == user.email.lower().strip(),
                    AuthOtp.purpose.in_(["LOGIN_2FA", "LOGIN_2FA_LINK"]),
                    AuthOtp.is_used == False,
                )
                old_otps = (await db.execute(st_old)).scalars().all()
                for old in old_otps:
                    old.is_used = True

                raw_code = generate_otp_code(6)
                code_hash = hash_otp_code(user.email, raw_code)

                otp_record = AuthOtp(
                    identifier=user.email.lower().strip(),
                    purpose="LOGIN_2FA",
                    code_hash=code_hash,
                    user_id=user.id,
                    tenant_id=user.tenant_id,
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
                    attempts=0,
                    max_attempts=5,
                    is_used=False
                )
                db.add(otp_record)

                raw_link_token = generate_magic_link_token()
                link_hash = hash_magic_link_token(raw_link_token)

                link_record = AuthOtp(
                    identifier=user.email.lower().strip(),
                    purpose="LOGIN_2FA_LINK",
                    code_hash=link_hash,
                    user_id=user.id,
                    tenant_id=user.tenant_id,
                    expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
                    attempts=0,
                    max_attempts=3,
                    is_used=False
                )
                db.add(link_record)
                await db.commit()

                client_base = get_client_base_url(request)
                verification_link = f"{client_base}/verify-login?token={raw_link_token}"

                await EmailService.send_login_verification_link(
                    to_email=user.email,
                    verification_link=verification_link,
                    otp_code=raw_code,
                    is_2fa=True
                )

                logger.info(f"[2FA LOGIN OTP] Code for {user.email}: {raw_code} | Link: {verification_link}")

                dev_otp = raw_code if settings.APP_ENV != "production" else None
                dev_link = verification_link if settings.APP_ENV != "production" else None
                return user, None, None, True, temp_token, dev_otp, dev_link

            # Verify code: check TOTP secret (authenticator app) OR active LOGIN_2FA OTP
            is_valid = False
            if user.mfa_secret and verify_totp(user.mfa_secret, totp_code):
                is_valid = True
            else:
                # Check active LOGIN_2FA OTP in auth_otps
                st_otp = (
                    select(AuthOtp)
                    .where(
                        AuthOtp.identifier == user.email.lower().strip(),
                        AuthOtp.purpose == "LOGIN_2FA",
                        AuthOtp.is_used == False,
                    )
                    .order_by(AuthOtp.created_at.desc())
                )
                active_otp = (await db.execute(st_otp)).scalars().first()
                if active_otp:
                    if datetime.now(timezone.utc) <= ensure_utc(active_otp.expires_at) and active_otp.attempts < active_otp.max_attempts:
                        if verify_otp_code(user.email, totp_code, active_otp.code_hash):
                            active_otp.is_used = True
                            is_valid = True
                        else:
                            active_otp.attempts += 1
                            await db.commit()

            if not is_valid:
                await AuditService.log_event(
                    db=db,
                    action="AUTH_MFA_FAILED",
                    resource_type="auth",
                    tenant_id=user.tenant_id,
                    actor_id=user.id,
                    actor_email=user.email,
                    details={"reason": "Invalid TOTP or email OTP code"},
                    request=request
                )
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid two-factor authentication code",
                )

        # Extract roles and permissions
        roles = []
        permissions = set()
        for ur in user.user_roles:
            roles.append(ur.role.name)
            for rp in ur.role.role_permissions:
                permissions.add(rp.permission.code)

        # Issue tokens
        access_token = create_access_token(user.id, user.tenant_id, roles, list(permissions))
        refresh_token, jti, family_id, expires_at = create_refresh_token(user.id, user.tenant_id)

        token_record = RefreshToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=jti,
            family_id=family_id,
            is_revoked=False,
            expires_at=expires_at
        )
        db.add(token_record)

        # Update last login
        user.last_login_at = datetime.now(timezone.utc)

        await AuditService.log_event(
            db=db,
            action="AUTH_LOGIN_SUCCESS",
            resource_type="auth",
            tenant_id=user.tenant_id,
            actor_id=user.id,
            actor_email=user.email,
            request=request
        )

        await db.commit()
        return user, access_token, refresh_token, False, None, None, None

    @staticmethod
    async def verify_login_2fa(
        db: AsyncSession,
        temp_token: str,
        code: str,
        request: Optional[Request] = None
    ) -> Tuple[User, str, str]:
        """
        Validates a 2FA code (TOTP or email OTP) using the pending temp_token,
        and issues access and refresh tokens.
        """
        try:
            payload = decode_token(temp_token)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired 2FA session: {str(e)}",
            )

        user_id = payload.get("sub")
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        user = (await db.execute(stmt)).scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or account deactivated",
            )

        is_valid = False
        if user.mfa_secret and verify_totp(user.mfa_secret, code):
            is_valid = True
        else:
            st_otp = (
                select(AuthOtp)
                .where(
                    AuthOtp.identifier == user.email.lower().strip(),
                    AuthOtp.purpose == "LOGIN_2FA",
                    AuthOtp.is_used == False,
                )
                .order_by(AuthOtp.created_at.desc())
            )
            active_otp = (await db.execute(st_otp)).scalars().first()
            if active_otp:
                if datetime.now(timezone.utc) <= ensure_utc(active_otp.expires_at) and active_otp.attempts < active_otp.max_attempts:
                    if verify_otp_code(user.email, code, active_otp.code_hash):
                        active_otp.is_used = True
                        is_valid = True
                    else:
                        active_otp.attempts += 1
                        await db.commit()

        if not is_valid:
            await AuditService.log_event(
                db=db,
                action="AUTH_MFA_FAILED",
                resource_type="auth",
                tenant_id=user.tenant_id,
                actor_id=user.id,
                actor_email=user.email,
                details={"reason": "Invalid 2FA code"},
                request=request
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid two-factor authentication code",
            )

        roles = []
        permissions = set()
        for ur in user.user_roles:
            roles.append(ur.role.name)
            for rp in ur.role.role_permissions:
                permissions.add(rp.permission.code)

        access_token = create_access_token(user.id, user.tenant_id, roles, list(permissions))
        refresh_token, jti, family_id, expires_at = create_refresh_token(user.id, user.tenant_id)

        token_record = RefreshToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=jti,
            family_id=family_id,
            is_revoked=False,
            expires_at=expires_at
        )
        db.add(token_record)
        user.last_login_at = datetime.now(timezone.utc)

        await AuditService.log_event(
            db=db,
            action="AUTH_LOGIN_SUCCESS",
            resource_type="auth",
            tenant_id=user.tenant_id,
            actor_id=user.id,
            actor_email=user.email,
            details={"auth_method": "2FA_VERIFIED"},
            request=request
        )

        await db.commit()
        return user, access_token, refresh_token

    @staticmethod
    async def resend_login_2fa(
        db: AsyncSession,
        temp_token: str,
        request: Optional[Request] = None
    ) -> Tuple[str, Optional[str], Optional[str]]:
        """
        Generates and dispatches a fresh 2FA login OTP and one-click verification link.
        """
        try:
            payload = decode_token(temp_token)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired 2FA session: {str(e)}",
            )

        user_id = payload.get("sub")
        stmt = select(User).where(User.id == user_id)
        user = (await db.execute(stmt)).scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or account deactivated",
            )

        # Invalidate old login OTPs & links
        st_old = select(AuthOtp).where(
            AuthOtp.identifier == user.email.lower().strip(),
            AuthOtp.purpose.in_(["LOGIN_2FA", "LOGIN_2FA_LINK"]),
            AuthOtp.is_used == False,
        )
        old_otps = (await db.execute(st_old)).scalars().all()
        for old in old_otps:
            old.is_used = True

        raw_code = generate_otp_code(6)
        code_hash = hash_otp_code(user.email, raw_code)

        otp_record = AuthOtp(
            identifier=user.email.lower().strip(),
            purpose="LOGIN_2FA",
            code_hash=code_hash,
            user_id=user.id,
            tenant_id=user.tenant_id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            attempts=0,
            max_attempts=5,
            is_used=False
        )
        db.add(otp_record)

        raw_link_token = generate_magic_link_token()
        link_hash = hash_magic_link_token(raw_link_token)

        link_record = AuthOtp(
            identifier=user.email.lower().strip(),
            purpose="LOGIN_2FA_LINK",
            code_hash=link_hash,
            user_id=user.id,
            tenant_id=user.tenant_id,
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
            attempts=0,
            max_attempts=3,
            is_used=False
        )
        db.add(link_record)
        await db.commit()

        client_base = get_client_base_url(request)
        verification_link = f"{client_base}/verify-login?token={raw_link_token}"

        await EmailService.send_login_verification_link(
            to_email=user.email,
            verification_link=verification_link,
            otp_code=raw_code,
            is_2fa=True
        )

        logger.info(f"[2FA LOGIN RESEND] New code for {user.email}: {raw_code} | Link: {verification_link}")

        dev_otp = raw_code if settings.APP_ENV != "production" else None
        dev_link = verification_link if settings.APP_ENV != "production" else None
        return f"New verification code and sign-in link sent to {user.email}", dev_otp, dev_link

    @staticmethod
    async def request_magic_link_login(
        db: AsyncSession,
        email: str,
        request: Optional[Request] = None
    ) -> Tuple[str, str, int, Optional[str]]:
        """
        Generates and dispatches a secure one-click magic link for email login.
        Returns: (message, email, expires_in_seconds, dev_link)
        """
        normalized_email = email.lower().strip()
        stmt = (
            select(User)
            .where(User.email == normalized_email)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()

        expires_in = 900  # 15 minutes
        generic_message = f"If an account exists for {normalized_email}, a secure sign-in link has been sent to your email."

        if not user or not user.is_active:
            # Prevent user enumeration by returning generic message
            return generic_message, normalized_email, expires_in, None

        # Invalidate any old unused magic links for this user
        st_old = select(AuthOtp).where(
            AuthOtp.identifier == normalized_email,
            AuthOtp.purpose == "LOGIN_MAGIC_LINK",
            AuthOtp.is_used == False,
        )
        old_otps = (await db.execute(st_old)).scalars().all()
        for old in old_otps:
            old.is_used = True

        raw_token = generate_magic_link_token()
        code_hash = hash_magic_link_token(raw_token)

        otp_record = AuthOtp(
            identifier=normalized_email,
            purpose="LOGIN_MAGIC_LINK",
            code_hash=code_hash,
            user_id=user.id,
            tenant_id=user.tenant_id,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=expires_in),
            attempts=0,
            max_attempts=3,
            is_used=False
        )
        db.add(otp_record)
        await db.commit()

        client_base = get_client_base_url(request)
        verification_link = f"{client_base}/verify-login?token={raw_token}"

        await EmailService.send_login_verification_link(
            to_email=user.email,
            verification_link=verification_link,
            otp_code=None,
            is_2fa=False,
        )

        logger.info(f"[MAGIC LINK GENERATED] Link for {user.email}: {verification_link}")

        dev_link = verification_link if settings.APP_ENV != "production" else None
        return f"A secure sign-in link has been sent to {user.email}.", normalized_email, expires_in, dev_link

    @staticmethod
    async def verify_email_link(
        db: AsyncSession,
        token: str,
        request: Optional[Request] = None
    ) -> Tuple[User, str, str]:
        """
        Validates a cryptographic email verification link token (supporting both passwordless
        magic links and one-click 2FA login approval) and issues full JWT tokens.
        """
        if not token or len(token.strip()) < 16:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token format."
            )

        token_hash = hash_magic_link_token(token)

        st_otp = (
            select(AuthOtp)
            .where(
                AuthOtp.code_hash == token_hash,
                AuthOtp.purpose.in_(["LOGIN_MAGIC_LINK", "LOGIN_2FA_LINK"]),
                AuthOtp.is_used == False,
            )
            .order_by(AuthOtp.created_at.desc())
        )
        otp_record = (await db.execute(st_otp)).scalars().first()

        if not otp_record:
            await AuditService.log_event(
                db=db,
                action="AUTH_LOGIN_FAILED",
                resource_type="auth",
                details={"reason": "Invalid or already used email verification link"},
                request=request
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired login link. Please request a new one."
            )

        # Check expiration
        now_utc = datetime.now(timezone.utc)
        if now_utc > ensure_utc(otp_record.expires_at):
            otp_record.is_used = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This login link has expired. Please request a new link."
            )

        # Check max attempts
        if otp_record.attempts >= otp_record.max_attempts:
            otp_record.is_used = True
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Maximum verification attempts exceeded. Please request a new link."
            )

        # Fetch active user
        stmt_user = (
            select(User)
            .where(User.id == otp_record.user_id)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        user = (await db.execute(stmt_user)).scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated or not found."
            )

        # Mark OTP as used
        otp_record.is_used = True

        # Invalidate any sibling pending 2FA OTPs for this user
        st_siblings = select(AuthOtp).where(
            AuthOtp.identifier == user.email.lower().strip(),
            AuthOtp.purpose.in_(["LOGIN_2FA", "LOGIN_2FA_LINK"]),
            AuthOtp.is_used == False,
        )
        siblings = (await db.execute(st_siblings)).scalars().all()
        for sib in siblings:
            sib.is_used = True

        # Extract roles & permissions
        roles = []
        permissions = set()
        for ur in user.user_roles:
            roles.append(ur.role.name)
            for rp in ur.role.role_permissions:
                permissions.add(rp.permission.code)

        # Issue tokens
        access_token = create_access_token(user.id, user.tenant_id, roles, list(permissions))
        refresh_token, jti, family_id, expires_at = create_refresh_token(user.id, user.tenant_id)

        token_record = RefreshToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            jti=jti,
            family_id=family_id,
            is_revoked=False,
            expires_at=expires_at
        )
        db.add(token_record)

        user.last_login_at = now_utc

        await AuditService.log_event(
            db=db,
            action="AUTH_LOGIN_SUCCESS",
            resource_type="auth",
            tenant_id=user.tenant_id,
            actor_id=user.id,
            actor_email=user.email,
            details={"auth_method": "EMAIL_LINK_VERIFIED", "purpose": otp_record.purpose},
            request=request
        )

        await db.commit()
        return user, access_token, refresh_token



    @staticmethod
    async def rotate_refresh_token(
        db: AsyncSession,
        raw_refresh_token: str,
        request: Optional[Request] = None
    ) -> Tuple[str, str]:
        """
        Validates refresh token, detects reuse, revokes family on compromise, and rotates token.
        Returns: (new_access_token, new_refresh_token)
        """
        try:
            payload = decode_token(raw_refresh_token)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid refresh token: {str(e)}",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is not a refresh token",
            )

        t_hash = hash_token(raw_refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == t_hash)
        res = await db.execute(stmt)
        token_record = res.scalar_one_or_none()

        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token not recognized or already purged",
            )

        family_id = token_record.family_id

        # Reuse Detection: If an already-revoked token is used again, revoke the ENTIRE family!
        if token_record.is_revoked:
            revoke_stmt = (
                update(RefreshToken)
                .where(RefreshToken.family_id == family_id)
                .values(is_revoked=True, revoked_at=datetime.now(timezone.utc))
            )
            await db.execute(revoke_stmt)
            await AuditService.log_event(
                db=db,
                action="SECURITY_TOKEN_REUSE_DETECTED",
                resource_type="auth",
                tenant_id=token_record.tenant_id,
                actor_id=token_record.user_id,
                details={"family_id": family_id, "alert": "Full family revoked due to reuse attempt"},
                request=request
            )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token reuse detected. All sessions in this chain have been revoked.",
            )

        # Check expiration
        now_utc = datetime.now(timezone.utc)
        token_expires = token_record.expires_at
        if token_expires.tzinfo is None:
            token_expires = token_expires.replace(tzinfo=timezone.utc)
        if token_expires < now_utc:
            token_record.is_revoked = True
            token_record.revoked_at = now_utc
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired. Please log in again.",
            )

        # Retrieve user and roles
        user_stmt = (
            select(User)
            .where(User.id == token_record.user_id)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()

        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is inactive or not found",
            )

        roles = []
        permissions = set()
        for ur in user.user_roles:
            roles.append(ur.role.name)
            for rp in ur.role.role_permissions:
                permissions.add(rp.permission.code)

        # Generate new rotated tokens
        new_access_token = create_access_token(user.id, user.tenant_id, roles, list(permissions))
        new_refresh_token, new_jti, _, new_expires_at = create_refresh_token(
            user.id, user.tenant_id, family_id=family_id
        )

        # Create new token record
        new_token_record = RefreshToken(
            tenant_id=user.tenant_id,
            user_id=user.id,
            token_hash=hash_token(new_refresh_token),
            jti=new_jti,
            family_id=family_id,
            is_revoked=False,
            expires_at=new_expires_at
        )
        db.add(new_token_record)
        await db.flush()

        # Mark current token as revoked and replaced
        token_record.is_revoked = True
        token_record.revoked_at = now_utc
        token_record.replaced_by = new_token_record.id

        await db.commit()
        return new_access_token, new_refresh_token

    @staticmethod
    async def revoke_token(
        db: AsyncSession,
        raw_refresh_token: str,
        request: Optional[Request] = None
    ) -> None:
        """Revokes a single refresh token or token family upon logout."""
        t_hash = hash_token(raw_refresh_token)
        stmt = select(RefreshToken).where(RefreshToken.token_hash == t_hash)
        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if record:
            record.is_revoked = True
            record.revoked_at = datetime.now(timezone.utc)
            await AuditService.log_event(
                db=db,
                action="AUTH_LOGOUT",
                resource_type="auth",
                tenant_id=record.tenant_id,
                actor_id=record.user_id,
                request=request
            )
            await db.commit()

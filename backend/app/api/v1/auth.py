from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, TenantContext, get_tenant_context
from app.core.security import generate_totp_secret, get_totp_uri, verify_totp
from app.models.users import User
from app.schemas.auth import (
    RegisterRequest,
    RegisterOtpResponse,
    VerifyRegisterOtpRequest,
    ResendOtpRequest,
    LoginRequest,
    VerifyLogin2faRequest,
    ResendLogin2faRequest,
    TokenResponse,
    RefreshRequest,
    RevokeRequest,
    MfaSetupResponse,
    MfaVerifyRequest,
    UserProfileResponse,
    MagicLinkRequest,
    MagicLinkResponse,
    VerifyEmailLinkRequest,
)
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Onboards a new tenant business and creates the owner account directly (legacy / direct path).
    Seeds default HQ branch, roles, Kenyan SME Chart of Accounts, and tax categories.
    """
    tenant, user, access_token, refresh_token = await AuthService.register_tenant(
        db=db,
        business_name=data.business_name,
        trading_name=data.trading_name,
        kra_pin=data.kra_pin,
        full_name=data.full_name,
        email=data.email,
        password=data.password,
        phone=data.phone,
        request=request
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=1800,
        mfa_required=False
    )


@router.post("/register/request-otp", response_model=RegisterOtpResponse)
async def request_registration_otp(
    data: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates organization registration by validating business parameters and
    generating a 6-digit verification code. Stores pending data until OTP verification.
    """
    message, email, expires_in, dev_otp = await AuthService.request_registration_otp(
        db=db,
        business_name=data.business_name,
        trading_name=data.trading_name,
        kra_pin=data.kra_pin,
        full_name=data.full_name,
        email=data.email,
        password=data.password,
        phone=data.phone,
        request=request
    )

    return RegisterOtpResponse(
        message=message,
        email=email,
        expires_in=expires_in,
        dev_otp=dev_otp
    )


@router.post("/register/resend-otp", response_model=RegisterOtpResponse)
async def resend_registration_otp(
    data: ResendOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Dispatches a fresh 6-digit registration OTP code for a pending registration."""
    message, email, expires_in, dev_otp = await AuthService.resend_registration_otp(
        db=db,
        email=data.email,
        request=request
    )

    return RegisterOtpResponse(
        message=message,
        email=email,
        expires_in=expires_in,
        dev_otp=dev_otp
    )


@router.post("/register/verify-otp", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def verify_registration_otp(
    data: VerifyRegisterOtpRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates the 6-digit OTP, creates tenant, user, HQ branch, seeds Chart of Accounts & Taxes,
    and returns initial JWT access & refresh tokens.
    """
    tenant, user, access_token, refresh_token = await AuthService.verify_registration_otp(
        db=db,
        email=data.email,
        code=data.code,
        request=request
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=1800,
        mfa_required=False
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates user via Argon2id password verification.
    If 2FA is enabled, generates a 6-digit login OTP, sends a one-click login link to email,
    and returns mfa_required=True.
    """
    user, access_token, refresh_token, mfa_required, temp_token, dev_otp, dev_link = await AuthService.authenticate_user(
        db=db,
        email=data.email,
        password=data.password,
        totp_code=data.totp_code,
        request=request
    )

    if mfa_required:
        return TokenResponse(
            access_token=None,
            refresh_token=None,
            token_type="Bearer",
            expires_in=900,
            mfa_required=True,
            temp_token=temp_token,
            delivery_channel="email",
            dev_otp=dev_otp,
            dev_link=dev_link
        )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=1800,
        mfa_required=False
    )


@router.post("/login/verify-2fa", response_model=TokenResponse)
async def verify_login_2fa(
    data: VerifyLogin2faRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies 2FA challenge code (TOTP authenticator or email OTP) using pending temp_token
    and issues full auth tokens.
    """
    user, access_token, refresh_token = await AuthService.verify_login_2fa(
        db=db,
        temp_token=data.temp_token,
        code=data.code,
        request=request
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=1800,
        mfa_required=False
    )


@router.post("/login/resend-otp")
async def resend_login_2fa_otp(
    data: ResendLogin2faRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Resends a fresh 6-digit 2FA login code and one-click verification link to the user's email."""
    message, dev_otp, dev_link = await AuthService.resend_login_2fa(
        db=db,
        temp_token=data.temp_token,
        request=request
    )

    return {
        "message": message,
        "dev_otp": dev_otp,
        "dev_link": dev_link
    }


@router.post("/magic-link/request", response_model=MagicLinkResponse)
async def request_magic_link(
    data: MagicLinkRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates passwordless email link authentication.
    Dispatches a secure, single-use signed verification link to the user's email.
    """
    message, email, expires_in, dev_link = await AuthService.request_magic_link_login(
        db=db,
        email=data.email,
        request=request
    )

    return MagicLinkResponse(
        message=message,
        email=email,
        expires_in=expires_in,
        dev_link=dev_link
    )


@router.post("/verify-email-link", response_model=TokenResponse)
async def verify_email_link(
    data: VerifyEmailLinkRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies a cryptographic email login link token (supports passwordless magic links
    and one-click 2FA login verification) and returns active JWT session tokens.
    """
    user, access_token, refresh_token = await AuthService.verify_email_link(
        db=db,
        token=data.token,
        request=request
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="Bearer",
        expires_in=1800,
        mfa_required=False
    )




@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Rotates the refresh token and issues a fresh short-lived access token.
    Enforces automatic token family revocation if reuse is detected.
    """
    new_access_token, new_refresh_token = await AuthService.rotate_refresh_token(
        db=db,
        raw_refresh_token=data.refresh_token,
        request=request
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="Bearer",
        expires_in=1800,
        mfa_required=False
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    data: RevokeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Revokes the current refresh token and records audit event."""
    if data.refresh_token:
        await AuthService.revoke_token(db, data.refresh_token, request=request)
    return {"message": "Logged out successfully"}


@router.post("/mfa/setup", response_model=MfaSetupResponse)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates a new TOTP secret and provisioning URI for authenticator apps."""
    secret = generate_totp_secret()
    current_user.mfa_secret = secret
    await db.commit()

    otpauth_url = get_totp_uri(secret, current_user.email)
    return MfaSetupResponse(
        secret=secret,
        otpauth_url=otpauth_url
    )


@router.post("/mfa/verify", status_code=status.HTTP_200_OK)
async def verify_and_enable_mfa(
    data: MfaVerifyRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validates the 6-digit TOTP code and activates MFA on the user account."""
    if not current_user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup has not been initiated. Call /mfa/setup first.",
        )

    if not verify_totp(current_user.mfa_secret, data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    current_user.mfa_enabled = True
    await AuditService.log_event(
        db=db,
        action="AUTH_MFA_ENABLED",
        resource_type="user",
        resource_id=current_user.id,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        request=request
    )
    await db.commit()

    return {"message": "MFA enabled successfully"}


@router.post("/mfa/disable", status_code=status.HTTP_200_OK)
async def disable_mfa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disables 2FA / MFA on the authenticated user's account."""
    current_user.mfa_enabled = False
    await AuditService.log_event(
        db=db,
        action="AUTH_MFA_DISABLED",
        resource_type="user",
        resource_id=current_user.id,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        request=request
    )
    await db.commit()

    return {"message": "Two-factor authentication disabled successfully"}


@router.post("/mfa/enable-email", status_code=status.HTTP_200_OK)
async def enable_email_mfa(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Enables email-based 2FA on the authenticated user's account without requiring TOTP setup."""
    current_user.mfa_enabled = True
    await AuditService.log_event(
        db=db,
        action="AUTH_MFA_ENABLED",
        resource_type="user",
        resource_id=current_user.id,
        tenant_id=current_user.tenant_id,
        actor_id=current_user.id,
        actor_email=current_user.email,
        details={"type": "EMAIL_2FA"},
        request=request
    )
    await db.commit()

    return {"message": "Two-factor authentication enabled successfully"}



@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    context: TenantContext = Depends(get_tenant_context)
):
    """Returns the authenticated user's profile, roles, and granular permissions."""
    return UserProfileResponse(
        id=context.user.id,
        tenant_id=context.tenant.id,
        email=context.user.email,
        full_name=context.user.full_name,
        is_active=context.user.is_active,
        is_verified=context.user.is_verified,
        mfa_enabled=context.user.mfa_enabled,
        roles=context.roles,
        permissions=context.permissions,
        created_at=context.user.created_at
    )

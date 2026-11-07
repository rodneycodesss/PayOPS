import base64
import hashlib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import jwt
import pyotp
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

# Argon2id password hasher configuration (RFC 9106 compliant)
ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Hashes a password using Argon2id."""
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against an Argon2id hash."""
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def hash_token(token: str) -> str:
    """Computes a SHA-256 hash of a token for secure storage/lookup."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# --- Symmetric Encryption for Secrets at Rest ---

def get_fernet() -> Fernet:
    """Returns a Fernet instance using the configured encryption key."""
    try:
        key_bytes = settings.CREDENTIALS_ENCRYPTION_KEY.encode("utf-8")
        return Fernet(key_bytes)
    except Exception:
        # Fallback to deterministic key derived from SECRET_KEY if invalid
        derived = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
        url_safe = base64.urlsafe_b64encode(derived)
        return Fernet(url_safe)


def encrypt_secret(secret_plaintext: str) -> str:
    """Encrypts a plaintext string (e.g. API secret, passkey) for storage at rest."""
    if not secret_plaintext:
        return ""
    f = get_fernet()
    encrypted = f.encrypt(secret_plaintext.encode("utf-8"))
    return encrypted.decode("utf-8")


def decrypt_secret(secret_ciphertext: str) -> str:
    """Decrypts an encrypted secret string stored at rest."""
    if not secret_ciphertext:
        return ""
    f = get_fernet()
    try:
        decrypted = f.decrypt(secret_ciphertext.encode("utf-8"))
        return decrypted.decode("utf-8")
    except InvalidToken:
        raise ValueError("Decryption failed: invalid encryption key or corrupted data")


# --- JWT Access & Refresh Tokens ---

def create_access_token(
    user_id: str,
    tenant_id: str,
    roles: list[str],
    permissions: list[str],
    expires_delta: Optional[timedelta] = None
) -> str:
    """Creates a short-lived signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "roles": roles,
        "permissions": permissions,
        "type": "access",
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": settings.APP_NAME
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(
    user_id: str,
    tenant_id: str,
    family_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None
) -> Tuple[str, str, str, datetime]:
    """
    Creates a cryptographically signed refresh token with a unique jti and token family id.
    Returns: (raw_jwt_token, jti, family_id, expires_at)
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    token_jti = str(uuid.uuid4())
    token_family = family_id or str(uuid.uuid4())

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "tenant_id": str(tenant_id),
        "type": "refresh",
        "jti": token_jti,
        "family_id": token_family,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": settings.APP_NAME
    }
    raw_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return raw_token, token_jti, token_family, expire


def decode_token(token: str) -> Dict[str, Any]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            issuer=settings.APP_NAME,
            options={"require": ["sub", "exp", "type", "jti"]}
        )
        return payload
    except jwt.PyJWTError as e:
        raise ValueError(f"Invalid token: {str(e)}")


# --- TOTP Multi-Factor Authentication ---

def generate_totp_secret() -> str:
    """Generates a random base32 TOTP secret."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, user_email: str) -> str:
    """Generates an otpauth:// URI for authenticator app QR code generation."""
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=user_email, issuer_name="Rodstar PayOps")


def verify_totp(secret: str, code: str) -> bool:
    """Verifies a 6-digit TOTP code against a secret with 1-step window tolerance."""
    if not secret or not code:
        return False
    totp = pyotp.TOTP(secret)
    return totp.verify(code.strip(), valid_window=1)

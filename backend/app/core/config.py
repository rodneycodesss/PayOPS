import os
from typing import List, Optional
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    APP_NAME: str = "Rodstar PayOps"
    APP_ENV: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"
    DOMAIN: str = "payops.rodstartechdevs.co.ke"

    # Security
    SECRET_KEY: str = Field(
        default="rodstar-payops-development-insecure-secret-key-change-in-production-12345",
        description="JWT HMAC signing key"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Encryption key for provider secrets at rest (Fernet key, 32 bytes base64-encoded)
    # Default is a valid development Fernet key
    CREDENTIALS_ENCRYPTION_KEY: str = Field(
        default="Wb0T3r_G3Z1Zf1fWj_Wz2X4y6z8A0b1C2d3E4F5g6H8=",
        description="Fernet key for encrypting provider credentials at rest"
    )

    # Databases
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://u87dc5e24:dbt_tvM5ipIP5Q7lk340j5uiCCDMh2VKJ-pU@db-payops.db.hcode.site:15432/db_payops?ssl=require",
        description="Async database connection string"
    )
    DATABASE_URL_SYNC: str = Field(
        default="postgresql+psycopg2://u87dc5e24:dbt_tvM5ipIP5Q7lk340j5uiCCDMh2VKJ-pU@db-payops.db.hcode.site:15432/db_payops?sslmode=require",
        description="Sync database connection string (for Alembic & Celery)"
    )

    @model_validator(mode="after")
    def resolve_database_urls(self) -> "Settings":
        env_db = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")
        env_sync = os.getenv("DATABASE_URL_SYNC")

        raw_db_url = env_db or self.DATABASE_URL
        # If platform provides DATABASE_URL in environment without DATABASE_URL_SYNC, derive sync from it
        if env_db and not env_sync:
            raw_sync_url = env_db
        else:
            raw_sync_url = env_sync or self.DATABASE_URL_SYNC

        # If sync URL points to localhost but main URL points to a remote host, sync from main URL
        if "localhost" in raw_sync_url and "localhost" not in raw_db_url:
            raw_sync_url = raw_db_url

        # Normalize async database URL (must use asyncpg for PostgreSQL)
        if raw_db_url.startswith("postgres://"):
            raw_db_url = "postgresql+asyncpg://" + raw_db_url[len("postgres://"):]
        elif raw_db_url.startswith("postgresql://") and not raw_db_url.startswith("postgresql+"):
            raw_db_url = "postgresql+asyncpg://" + raw_db_url[len("postgresql://"):]

        if "asyncpg" in raw_db_url and "sslmode=" in raw_db_url:
            raw_db_url = raw_db_url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer")

        # Normalize sync database URL (must use psycopg2 for PostgreSQL)
        if raw_sync_url.startswith("postgres://"):
            raw_sync_url = "postgresql+psycopg2://" + raw_sync_url[len("postgres://"):]
        elif raw_sync_url.startswith("postgresql://") and not raw_sync_url.startswith("postgresql+"):
            raw_sync_url = "postgresql+psycopg2://" + raw_sync_url[len("postgresql://"):]
        elif "postgresql+asyncpg://" in raw_sync_url:
            raw_sync_url = raw_sync_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")

        if "psycopg2" in raw_sync_url and "ssl=require" in raw_sync_url:
            raw_sync_url = raw_sync_url.replace("ssl=require", "sslmode=require")

        self.DATABASE_URL = raw_db_url
        self.DATABASE_URL_SYNC = raw_sync_url
        return self

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # CORS
    CORS_ORIGINS: List[str] = [
        "https://payops.rodstartechdevs.co.ke",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000"
    ]

    # Email & Notifications (SMTP default)
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_TLS: bool = False
    EMAIL_FROM: str = "no-reply@rodstartechdevs.co.ke"
    EMAIL_FROM_NAME: str = "Rodstar PayOps"
    FRONTEND_URL: str = Field(default="http://localhost:5173", description="Frontend Base URL for email verification links")

    # Tuma API Payment Gateway Configuration (https://api.tuma.co.ke)
    TUMA_BASE_URL: str = Field(default="https://api.tuma.co.ke", description="Tuma API Base URL")
    TUMA_API_KEY: Optional[str] = Field(default=None, description="Tuma API Key")
    TUMA_BUSINESS_EMAIL: Optional[str] = Field(default=None, description="Tuma Business Email")
    TUMA_ACCOUNT_ALIAS: Optional[str] = Field(default=None, description="Tuma Settlement Account Alias (optional)")
    TUMA_CALLBACK_URL: Optional[str] = Field(default=None, description="Tuma Webhook Public Callback URL")
    TUMA_IS_SANDBOX: bool = Field(default=False, description="Set to True for Sandbox/Simulated mode")

    # Safaricom Daraja M-PESA Configuration (Paybill & Buy Goods Till)
    DARAJA_IS_SANDBOX: bool = Field(default=True, description="Set to True for Daraja Sandbox mode")
    DARAJA_CONSUMER_KEY: Optional[str] = Field(default=None, description="Safaricom Daraja Consumer Key")
    DARAJA_CONSUMER_SECRET: Optional[str] = Field(default=None, description="Safaricom Daraja Consumer Secret")
    DARAJA_SHORTCODE: Optional[str] = Field(default="174379", description="Paybill Shortcode or Buy Goods Till Number")
    DARAJA_PASSKEY: Optional[str] = Field(default=None, description="Lipa Na M-PESA Online Passkey")
    DARAJA_CALLBACK_URL: Optional[str] = Field(default=None, description="Daraja Public Callback URL")
    DARAJA_SANDBOX_SHORTCODE: str = "174379"

    # Base Currency
    DEFAULT_CURRENCY: str = "KES"


settings = Settings()

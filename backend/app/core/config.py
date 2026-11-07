import os
from typing import List
from pydantic import Field
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
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/rodstar_payops",
        description="Async database connection string"
    )
    DATABASE_URL_SYNC: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/rodstar_payops",
        description="Sync database connection string (for Alembic & Celery)"
    )

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

    # Daraja Default Shortcode (Sandbox fallback)
    DARAJA_SANDBOX_SHORTCODE: str = "174379"

    # Base Currency
    DEFAULT_CURRENCY: str = "KES"


settings = Settings()

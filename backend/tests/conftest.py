import asyncio
from typing import AsyncGenerator
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.main import app
from app.models import *
from app.services.auth_service import AuthService

# In-memory SQLite async engine for fast, isolated tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a clean transactional database session per test."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Seed system permissions and roles
        await AuthService.ensure_system_rbac_seeded(session)
        await session.commit()
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provides an authenticated/unauthenticated test HTTP client."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def tenant_a(db_session: AsyncSession) -> dict:
    """Creates a registered Tenant A (Alpha Enterprises)."""
    tenant, user, access_token, refresh_token = await AuthService.register_tenant(
        db=db_session,
        business_name="Alpha Enterprises Ltd",
        trading_name="Alpha Pay",
        kra_pin="P051234567A",
        full_name="Alice Owner",
        email="alice@alpha.co.ke",
        password="SecurePassword123!",
        phone="+254711000001",
    )
    return {
        "tenant": tenant,
        "user": user,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "headers": {"Authorization": f"Bearer {access_token}"}
    }


@pytest_asyncio.fixture(scope="function")
async def tenant_b(db_session: AsyncSession) -> dict:
    """Creates a registered Tenant B (Beta Logistics)."""
    tenant, user, access_token, refresh_token = await AuthService.register_tenant(
        db=db_session,
        business_name="Beta Logistics Ltd",
        trading_name="Beta Cargo",
        kra_pin="P059876543B",
        full_name="Bob Director",
        email="bob@beta.co.ke",
        password="AnotherPassword456!",
        phone="+254722000002",
    )
    return {
        "tenant": tenant,
        "user": user,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "headers": {"Authorization": f"Bearer {access_token}"}
    }

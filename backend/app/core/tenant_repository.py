from typing import Any, Generic, List, Optional, Type, TypeVar
from fastapi import HTTPException, status
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase

T = TypeVar("T", bound=DeclarativeBase)


class TenantScopedRepository(Generic[T]):
    """
    Enforces non-bypassable tenant isolation at the data access layer.
    Every query, update, and lookup automatically bounds itself to tenant_id.
    """
    def __init__(self, model: Type[T], db: AsyncSession, tenant_id: str):
        if not hasattr(model, "tenant_id"):
            raise ValueError(f"Model {model.__name__} does not have tenant_id attribute")
        self.model = model
        self.db = db
        self.tenant_id = tenant_id

    async def get_by_id(self, item_id: str) -> Optional[T]:
        """Fetch by primary key strictly constrained to this tenant."""
        stmt = select(self.model).where(
            self.model.id == item_id,
            self.model.tenant_id == self.tenant_id
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_404(self, item_id: str, error_msg: Optional[str] = None) -> T:
        """Fetch by primary key or raise 404. Cross-tenant IDs fail closed as 404."""
        item = await self.get_by_id(item_id)
        if not item:
            msg = error_msg or f"{self.model.__name__} not found"
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        return item

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 50,
        filters: Optional[list] = None,
        order_by: Optional[Any] = None
    ) -> List[T]:
        """Lists records strictly belonging to this tenant."""
        stmt = select(self.model).where(self.model.tenant_id == self.tenant_id)
        if filters:
            for condition in filters:
                stmt = stmt.where(condition)
        if order_by is not None:
            stmt = stmt.order_by(order_by)
        stmt = stmt.offset(skip).limit(min(limit, 100))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs) -> T:
        """Creates a record with tenant_id strictly forced to the current tenant."""
        kwargs["tenant_id"] = self.tenant_id
        instance = self.model(**kwargs)
        self.db.add(instance)
        await self.db.flush()
        return instance

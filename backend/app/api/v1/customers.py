from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import TenantContext, require_permission
from app.models.customers import Customer
from app.schemas.customers import CustomerCreate, CustomerUpdate, CustomerResponse

router = APIRouter(prefix="/customers", tags=["Customer Management"])


@router.get("/", response_model=List[CustomerResponse])
async def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, or KRA PIN"),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    context: TenantContext = Depends(require_permission("invoice:view")),
    db: AsyncSession = Depends(get_db),
):
    """Lists customer accounts for the current tenant."""
    stmt = select(Customer).where(Customer.tenant_id == context.tenant_id)

    if is_active is not None:
        stmt = stmt.where(Customer.is_active == is_active)

    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (Customer.name.ilike(search_pattern))
            | (Customer.email.ilike(search_pattern))
            | (Customer.kra_pin.ilike(search_pattern))
        )

    stmt = stmt.order_by(Customer.name.asc()).offset(offset).limit(limit)
    res = await db.execute(stmt)
    return res.scalars().all()


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    context: TenantContext = Depends(require_permission("invoice:create")),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new customer account under the current tenant."""
    # Check for duplicate email within tenant
    if data.email:
        exist_stmt = select(Customer).where(
            Customer.tenant_id == context.tenant_id,
            Customer.email == data.email.strip().lower(),
        )
        existing = (await db.execute(exist_stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer with email '{data.email}' already exists.",
            )

    customer = Customer(
        tenant_id=context.tenant_id,
        name=data.name.strip(),
        email=data.email.strip().lower() if data.email else None,
        phone=data.phone.strip() if data.phone else None,
        kra_pin=data.kra_pin.strip().upper() if data.kra_pin else None,
        address=data.address,
        currency=data.currency.upper(),
        is_active=True,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    context: TenantContext = Depends(require_permission("invoice:view")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves customer account details."""
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == context.tenant_id,
    )
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    data: CustomerUpdate,
    context: TenantContext = Depends(require_permission("invoice:create")),
    db: AsyncSession = Depends(get_db),
):
    """Updates customer details."""
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.tenant_id == context.tenant_id,
    )
    res = await db.execute(stmt)
    customer = res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    if data.name is not None:
        customer.name = data.name.strip()
    if data.email is not None:
        customer.email = data.email.strip().lower() if data.email else None
    if data.phone is not None:
        customer.phone = data.phone.strip() if data.phone else None
    if data.kra_pin is not None:
        customer.kra_pin = data.kra_pin.strip().upper() if data.kra_pin else None
    if data.address is not None:
        customer.address = data.address
    if data.is_active is not None:
        customer.is_active = data.is_active

    await db.commit()
    await db.refresh(customer)
    return customer

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import TenantContext, get_tenant_context, require_permission
from app.core.security import hash_password
from app.core.tenant_repository import TenantScopedRepository
from app.models.tenants import Tenant
from app.models.branches import Branch
from app.models.users import User
from app.models.rbac import Role, UserRole
from app.schemas.tenants import (
    TenantResponse,
    TenantUpdate,
    BranchCreate,
    BranchResponse,
    UserInviteRequest,
    UserResponse,
    RoleResponse,
)
from app.services.audit_service import AuditService

router = APIRouter(prefix="/tenants", tags=["Tenancy & Organizations"])


@router.get("/me", response_model=TenantResponse)
async def get_current_tenant_profile(
    context: TenantContext = Depends(get_tenant_context)
):
    """Retrieves the organization business profile for the current tenant."""
    return context.tenant


@router.patch("/me", response_model=TenantResponse)
async def update_tenant_profile(
    data: TenantUpdate,
    request: Request,
    context: TenantContext = Depends(require_permission("tenant:manage")),
    db: AsyncSession = Depends(get_db)
):
    """Updates legal name, trading name, KRA PIN, address, or contacts for the tenant."""
    tenant = context.tenant
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(tenant, field, value)

    await AuditService.log_event(
        db=db,
        action="TENANT_PROFILE_UPDATED",
        resource_type="tenant",
        resource_id=tenant.id,
        tenant_id=tenant.id,
        actor_id=context.user.id,
        actor_email=context.user.email,
        details=update_data,
        request=request
    )
    await db.commit()
    await db.refresh(tenant)
    return tenant


# --- Branches ---

@router.get("/branches", response_model=List[BranchResponse])
async def list_branches(
    context: TenantContext = Depends(get_tenant_context),
    db: AsyncSession = Depends(get_db)
):
    """Lists all physical branches / stations belonging to this tenant."""
    repo = TenantScopedRepository(Branch, db, context.tenant_id)
    return await repo.list_all(limit=100)


@router.post("/branches", response_model=BranchResponse, status_code=status.HTTP_201_CREATED)
async def create_branch(
    data: BranchCreate,
    request: Request,
    context: TenantContext = Depends(require_permission("branch:manage")),
    db: AsyncSession = Depends(get_db)
):
    """Creates a new branch for the tenant."""
    # Check uniqueness of branch code within this tenant
    stmt = select(Branch).where(
        Branch.tenant_id == context.tenant_id,
        Branch.code == data.code.upper().strip()
    )
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Branch with code '{data.code}' already exists in your organization",
        )

    branch = Branch(
        tenant_id=context.tenant_id,
        name=data.name.strip(),
        code=data.code.upper().strip(),
        address=data.address,
        is_headquarters=data.is_headquarters,
        is_active=True
    )
    db.add(branch)
    await db.flush()

    await AuditService.log_event(
        db=db,
        action="BRANCH_CREATED",
        resource_type="branch",
        resource_id=branch.id,
        tenant_id=context.tenant_id,
        actor_id=context.user.id,
        actor_email=context.user.email,
        details={"code": branch.code, "name": branch.name},
        request=request
    )
    await db.commit()
    await db.refresh(branch)
    return branch


# --- Users & Invites ---

@router.get("/users", response_model=List[UserResponse])
async def list_tenant_users(
    context: TenantContext = Depends(require_permission("user:manage")),
    db: AsyncSession = Depends(get_db)
):
    """Lists all users belonging to this tenant with their assigned roles."""
    stmt = (
        select(User)
        .where(User.tenant_id == context.tenant_id)
        .options(
            selectinload(User.user_roles)
            .selectinload(UserRole.role)
        )
    )
    res = await db.execute(stmt)
    users = res.scalars().all()

    result = []
    for u in users:
        roles = [ur.role.name for ur in u.user_roles]
        result.append(UserResponse(
            id=u.id,
            tenant_id=u.tenant_id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active,
            mfa_enabled=u.mfa_enabled,
            roles=roles,
            created_at=u.created_at
        ))
    return result


@router.post("/users/invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    data: UserInviteRequest,
    request: Request,
    context: TenantContext = Depends(require_permission("user:manage")),
    db: AsyncSession = Depends(get_db)
):
    """Invites and creates a staff user for the tenant with a specific role."""
    # Check if user already exists
    stmt = select(User).where(User.email == data.email.lower().strip())
    if (await db.execute(stmt)).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email is already registered",
        )

    # Find role (must be system role or custom role for this tenant)
    role_stmt = select(Role).where(
        Role.name == data.role_name.lower().strip(),
        (Role.tenant_id == None) | (Role.tenant_id == context.tenant_id)
    )
    role_res = await db.execute(role_stmt)
    role = role_res.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{data.role_name}' does not exist",
        )

    new_user = User(
        tenant_id=context.tenant_id,
        email=data.email.lower().strip(),
        full_name=data.full_name.strip(),
        hashed_password=hash_password(data.temp_password),
        is_active=True,
        is_verified=True,
        mfa_enabled=False
    )
    db.add(new_user)
    await db.flush()

    user_role = UserRole(
        user_id=new_user.id,
        role_id=role.id,
        tenant_id=context.tenant_id
    )
    db.add(user_role)

    await AuditService.log_event(
        db=db,
        action="USER_INVITED",
        resource_type="user",
        resource_id=new_user.id,
        tenant_id=context.tenant_id,
        actor_id=context.user.id,
        actor_email=context.user.email,
        details={"email": new_user.email, "role": role.name},
        request=request
    )
    await db.commit()

    return UserResponse(
        id=new_user.id,
        tenant_id=new_user.tenant_id,
        email=new_user.email,
        full_name=new_user.full_name,
        is_active=new_user.is_active,
        mfa_enabled=new_user.mfa_enabled,
        roles=[role.name],
        created_at=new_user.created_at
    )

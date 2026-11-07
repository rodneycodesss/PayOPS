from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.automations import router as automations_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tenants_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(health_router)
api_v1_router.include_router(api_keys_router)
api_v1_router.include_router(automations_router)

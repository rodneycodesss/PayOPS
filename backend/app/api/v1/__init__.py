from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.audit import router as audit_router
from app.api.v1.health import router as health_router
from app.api.v1.api_keys import router as api_keys_router
from app.api.v1.automations import router as automations_router
from app.api.v1.payments import router as payments_router
from app.api.v1.banking import router as banking_router
from app.api.v1.reconciliation import router as reconciliation_router
from app.api.v1.accounting import router as accounting_router
from app.api.v1.invoices import router as invoices_router
from app.api.v1.tax import router as tax_router
from app.api.v1.customers import router as customers_router

api_v1_router = APIRouter()
api_v1_router.include_router(auth_router)
api_v1_router.include_router(tenants_router)
api_v1_router.include_router(audit_router)
api_v1_router.include_router(health_router)
api_v1_router.include_router(api_keys_router)
api_v1_router.include_router(automations_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(banking_router)
api_v1_router.include_router(reconciliation_router)
api_v1_router.include_router(accounting_router)
api_v1_router.include_router(invoices_router)
api_v1_router.include_router(tax_router)
api_v1_router.include_router(customers_router)

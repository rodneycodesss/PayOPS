from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.api.v1 import api_v1_router
from app.api.v1.health import liveness, readiness
from app.services.auth_service import AuthService


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Enforces strict fintech security headers on all responses."""
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown hooks."""
    # Ensure system RBAC permissions and default roles exist
    async with AsyncSessionLocal() as session:
        try:
            await AuthService.ensure_system_rbac_seeded(session)
            await session.commit()
        except Exception as e:
            # Table might not exist prior to migrations; continue safely
            await session.rollback()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Intelligent Payment Operations & Tax Automation for Kenyan Businesses",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Security Headers
app.add_middleware(SecurityHeadersMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Root level health checks
app.add_api_route("/health/live", liveness, methods=["GET"], tags=["Health"])
app.add_api_route("/health/ready", readiness, methods=["GET"], tags=["Health"])

# Versioned API routes
app.include_router(api_v1_router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Consistent JSON error format without leaking internal stack traces in production."""
    if settings.DEBUG:
        error_detail = str(exc)
    else:
        error_detail = "An internal server error occurred. Please contact system support."
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": error_detail, "status": "error"}
    )

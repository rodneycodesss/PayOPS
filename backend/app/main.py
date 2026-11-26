import os
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com data:; "
            "img-src 'self' data: https: blob:; "
            "connect-src 'self' https: wss:; "
            "frame-ancestors 'none';"
        )
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
    allow_origin_regex=r"^https?://.*",
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


# --- Static Files & Single Page Application (SPA) Serving ---
def find_frontend_dist() -> Optional[str]:
    """Resolves the built frontend directory across local dev and container roots."""
    candidates = [
        # When running from repository root
        os.path.abspath("frontend/dist"),
        # When running from backend/ directory
        os.path.abspath("../frontend/dist"),
        os.path.abspath("dist"),
        # Relative to backend/app/main.py
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "dist"),
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isfile(os.path.join(c, "index.html")):
            return c
    return None

frontend_dist = find_frontend_dist()

if frontend_dist:
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        """Serves the root React single page application."""
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa_app(full_path: str):
        """
        Serves static files directly if they exist, or falls back to index.html
        for HTML5 pushState client-side routing (/login, /register, /overview, etc.).
        """
        # Guard API and health endpoints from catching HTML fallback
        if full_path.startswith("api/") or full_path.startswith("health/"):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API route not found")

        # Direct static asset file (e.g. /favicon.png, /logo-icon.png)
        target_file = os.path.join(frontend_dist, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)

        # Fallback to index.html for React Router
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
else:
    @app.get("/", include_in_schema=False)
    async def serve_api_welcome():
        return {
            "app": settings.APP_NAME,
            "version": "0.1.0",
            "status": "online",
            "docs": f"{settings.API_V1_STR}/docs",
            "health": "/health/ready"
        }


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

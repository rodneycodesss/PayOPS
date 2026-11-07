from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["Health & Diagnostics"])


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness():
    """Liveness probe: returns 200 if process is running."""
    return {
        "status": "alive",
        "app": settings.APP_NAME,
        "env": settings.APP_ENV
    }


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness(db: AsyncSession = Depends(get_db)):
    """Readiness probe: verifies database connectivity and returns operational status."""
    try:
        await db.execute(text("SELECT 1"))
        return {
            "status": "ready",
            "database": "connected",
            "app": settings.APP_NAME,
            "version": "0.1.0"
        }
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "database": "disconnected",
                "error": str(e)
            }
        )


@router.get("/health")
async def api_health(db: AsyncSession = Depends(get_db)):
    """API versioned health checkpoint."""
    return await readiness(db)

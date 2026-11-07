import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    """Verifies that liveness and readiness health checks pass."""
    # Liveness
    live_res = await client.get("/health/live")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "alive"

    # Readiness
    ready_res = await client.get("/health/ready")
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"
    assert ready_res.json()["database"] == "connected"

    # API versioned health
    api_res = await client.get("/api/v1/health")
    assert api_res.status_code == 200
    assert api_res.json()["status"] == "ready"

import pytest
from app.domain.common.errors import RoutingUnavailableError
from app.infrastructure.routing.osrm.client import OSRMRoutingProvider
from app.infrastructure.config.settings import get_settings

import dataclasses

@pytest.fixture
def settings():
    # Use a fresh instance of settings to avoid polluting others
    s = get_settings()
    endpoints = {
        k: dataclasses.replace(v, port=9999) 
        for k, v in s.osrm_endpoints.items()
    }
    return dataclasses.replace(s, osrm_endpoints=endpoints)

@pytest.fixture
def client(settings):
    return OSRMRoutingProvider(settings)

@pytest.mark.asyncio
async def test_route_unreachable_raises_unavailable(client):
    with pytest.raises(RoutingUnavailableError):
        await client.route("car", (0.0, 0.0), (1.0, 1.0))

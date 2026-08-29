import logging
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

@dataclass(frozen=True)
class WeatherCondition:
    temp_c: float
    description: str
    precip_mm: float
    is_raining: bool

class WeatherProvider:
    def __init__(self, api_key: str | None):
        # Treat placeholder strings as unset
        if api_key and (api_key.startswith("your-") or "placeholder" in api_key.lower() or api_key == "test"):
            self.api_key = None
        else:
            self.api_key = api_key
        self.base_url = "http://api.weatherstack.com/current"
    
    async def get_current_weather(self, origin: tuple[float, float]) -> WeatherCondition | None:
        if not self.api_key or not self.api_key.strip():
            logger.debug("WeatherStack API key not configured, skipping weather enrichment.")
            return None
            
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                query = f"{origin[1]},{origin[0]}"  # lat, lon
                response = await client.get(
                    self.base_url,
                    params={
                        "access_key": self.api_key.strip(),
                        "query": query
                    }
                )
                response.raise_for_status()
                data = response.json()
                
                if "error" in data or "current" not in data:
                    logger.debug(f"WeatherStack response without current weather: {data.get('error', data)}")
                    return None
                    
                current = data["current"]
                temp_c = float(current.get("temperature", 0))
                precip_mm = float(current.get("precip", 0))
                descriptions = current.get("weather_descriptions", [])
                desc = descriptions[0] if descriptions else "Clear"
                
                # Consider it raining if precip > 0 or 'rain' is in the description
                is_raining = (
                    precip_mm > 0.0
                    or "rain" in desc.lower()
                    or "drizzle" in desc.lower()
                    or "shower" in desc.lower()
                )
                
                return WeatherCondition(
                    temp_c=temp_c,
                    description=desc,
                    precip_mm=precip_mm,
                    is_raining=is_raining
                )
        except Exception as e:
            logger.debug(f"Failed to fetch weather from WeatherStack (non-blocking): {e}")
            return None

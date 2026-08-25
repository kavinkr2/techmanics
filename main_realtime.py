"""
FastAPI integration for real-time maritime data endpoints.
"""
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from forecast_engine import generate_forecast
from optimizer import solve_optimization
from coal_buyer import find_best_coal_options

# Lazy import functions for scrapers
def _get_scrapers():
    from scrapers.maritime_scraper import (
        RealTimeDataManager,
        BalticExchangeSource,
        ClarksonsSource,
        MarineTrafficSource,
        NOAASource,
        DataSourceConfig,
    )
    return RealTimeDataManager, BalticExchangeSource, ClarksonsSource, MarineTrafficSource, NOAASource, DataSourceConfig


# Initialize data sources lazily
def _init_sources():
    RealTimeDataManager, BalticExchangeSource, ClarksonsSource, MarineTrafficSource, NOAASource, DataSourceConfig = _get_scrapers()
    
    baltic_source = BalticExchangeSource(
        DataSourceConfig(name="Baltic Exchange", base_url="https://api.balticexchange.com")
    )
    clarksons_source = ClarksonsSource(
        DataSourceConfig(name="Clarksons SIN", base_url="https://api.clarksons.net")
    )
    marinetraffic_source = MarineTrafficSource(
        DataSourceConfig(name="MarineTraffic", base_url="https://services.marinetraffic.com/api")
    )
    noaa_source = NOAASource(
        DataSourceConfig(name="NOAA NWS", base_url="https://api.weather.gov")
    )
    data_manager = RealTimeDataManager(refresh_interval=300)
    
    return baltic_source, clarksons_source, marinetraffic_source, noaa_source, data_manager


# Initialize at module level
baltic_source, clarksons_source, marinetraffic_source, noaa_source, data_manager = _init_sources()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await data_manager.start()
    # Initial fetch
    await data_manager.force_refresh()
    yield
    # Shutdown
    await data_manager.stop()
    await baltic_source.close()
    await clarksons_source.close()
    await marinetraffic_source.close()
    await noaa_source.close()


app = FastAPI(title="Freight Optimizer API + Real-time Data", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────
# Existing endpoints (from main.py)
# ──────────────────────────────────────────────────
class OptimizeRequest(BaseModel):
    cargo_tons: float
    shock_scenario: bool = False
    origin_region: str = "Australia"
    destination_port: str = "Paradip"
    commodity: str = "Iron Ore"


class CopilotRequest(BaseModel):
    question: str


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/forecast")
def get_forecast(days: int = 30):
    """Generate probabilistic freight rate forecast."""
    try:
        df = generate_forecast(days)
        data = df.to_dict(orient="records")
        return {"status": "success", "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/optimize")
def run_optimizer(request: OptimizeRequest):
    """Run MILP optimizer to find best port and vessel combination."""
    try:
        result = solve_optimization(
            request.cargo_tons,
            request.shock_scenario,
            request.origin_region,
            request.destination_port,
            request.commodity,
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/copilot/chat")
def copilot_chat(request: CopilotRequest):
    try:
        from llm_copilot import ask_copilot, is_configured
        if not is_configured():
            return {
                "status": "warning",
                "answer": ask_copilot(request.question),  # fallback response
                "message": "Copilot running in fallback mode. Set OPENAI_API_KEY for full AI agent."
            }
        answer = ask_copilot(request.question)
        return {"status": "success", "answer": answer}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# ──────────────────────────────────────────────────
# NEW: Real-time data endpoints
# ──────────────────────────────────────────────────

class BalticIndicesResponse(BaseModel):
    BDI: float
    BCI: float
    BPI: float
    BSI: float
    BHSI: float
    timestamp: str
    change: float
    change_pct: float


@app.get("/api/realtime/baltic-indices", response_model=BalticIndicesResponse)
async def get_baltic_indices():
    """Get latest Baltic Dry Index and sub-indices."""
    data = data_manager.get_cached("baltic_indices")
    if not data or data_manager.is_stale("all"):
        data = await baltic_source.fetch_indices()
        data_manager._cache["baltic_indices"] = data
    if "error" in data:
        raise HTTPException(status_code=503, detail=data["error"])
    return data


class FreightRate(BaseModel):
    route: str
    vessel_type: str
    rate_usd_per_day: float
    rate_usd_per_tonne: float
    source: str
    timestamp: str


@app.get("/api/realtime/freight-rates", response_model=list[FreightRate])
async def get_freight_rates():
    """Get current freight rates for major routes."""
    data = data_manager.get_cached("freight_rates")
    if not data or data_manager.is_stale("all"):
        data = await clarksons_source.fetch_freight_rates()
        data_manager._cache["freight_rates"] = data
    return data


class PortCongestion(BaseModel):
    port: str
    congestion_pct: float
    avg_wait_days: float
    vessels_waiting: int
    berth_utilization_pct: int
    demurrage_risk: str
    last_updated: str
    source: str


@app.get("/api/realtime/port-congestion", response_model=list[PortCongestion])
async def get_port_congestion(ports: str | None = Query(None, description="Comma-separated port names")):
    """Get port congestion data."""
    port_list = [p.strip() for p in ports.split(",")] if ports else None
    data = data_manager.get_cached("port_congestion")
    if not data or data_manager.is_stale("all"):
        data = await marinetraffic_source.fetch_port_congestion(port_list)
        data_manager._cache["port_congestion"] = data
    return data


class VesselPosition(BaseModel):
    mmsi: str
    imo: str
    name: str
    type: str
    lat: float
    lon: float
    speed: float
    course: int
    status: str
    draught: float
    destination: str
    eta: str
    timestamp: str
    source: str


@app.get("/api/realtime/vessel-positions", response_model=list[VesselPosition])
async def get_vessel_positions(mmsi: str | None = Query(None, description="Comma-separated MMSI list")):
    """Get live vessel positions."""
    mmsi_list = [m.strip() for m in mmsi.split(",")] if mmsi else None
    data = await marinetraffic_source.fetch_vessel_positions(mmsi_list)
    return data


class WeatherAlert(BaseModel):
    event: str | None
    severity: str | None
    certainty: str | None
    urgency: str | None
    area: str | None
    description: str
    effective: str | None
    expires: str | None


@app.get("/api/realtime/weather-alerts", response_model=list[WeatherAlert])
async def get_weather_alerts(region: str = Query("indian_ocean")):
    """Get weather alerts affecting shipping routes."""
    data = await noaa_source.fetch_weather_alerts(region)
    return data


@app.get("/api/realtime/all")
async def get_all_realtime():
    """Get all real-time data in one call."""
    if data_manager.is_stale("all"):
        await data_manager.force_refresh()
    return {
        **data_manager._cache,
        "server_time": datetime.utcnow().isoformat(),
    }


@app.post("/api/realtime/refresh")
async def force_refresh():
    """Manually trigger a data refresh."""
    data = await data_manager.force_refresh()
    return {"status": "refreshed", "data": data, "timestamp": datetime.utcnow().isoformat()}


# ──────────────────────────────────────────────────
# Coal Buyer Endpoint
# ──────────────────────────────────────────────────

class CoalBuyerRequest(BaseModel):
    quantity_tonnes: float
    destination_port: str = "Paradip"
    shock_scenario: bool = False


@app.post("/api/coal/buy")
def buy_coal(request: CoalBuyerRequest):
    """Find best coal procurement options from multiple origins."""
    try:
        results = find_best_coal_options(
            request.quantity_tonnes,
            request.destination_port,
            request.shock_scenario,
        )
        return {
            "status": "success",
            "data": {
                "quantity_tonnes": request.quantity_tonnes,
                "destination_port": request.destination_port,
                "shock_scenario": request.shock_scenario,
                "options": results,
                "best_option": results[0] if results else None,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
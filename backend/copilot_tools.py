"""
LangChain Tools for Maritime Logistics Copilot.
Provides access to real-time data, forecasting, optimization, and analytics.
"""
import asyncio
from langchain.tools import tool
from typing import Optional


def _get_forecast_engine():
    """Lazy import to avoid module caching issues."""
    from forecast_engine import generate_forecast, get_model_status
    return generate_forecast, get_model_status


def _get_optimizer():
    from optimizer import solve_optimization, get_optimizer_status
    return solve_optimization, get_optimizer_status


def _get_coal_buyer():
    from coal_buyer import find_best_coal_options
    return find_best_coal_options


def _get_scrapers():
    """Lazy import to avoid module caching issues."""
    import scrapers.maritime_scraper as ms
    return (
        ms.BalticExchangeSource,
        ms.ClarksonsSource,
        ms.MarineTrafficSource,
        ms.NOAASource,
        ms.DataSourceConfig,
    )


# Initialize data sources lazily at module level
def _init_scrapers():
    BalticExchangeSource, ClarksonsSource, MarineTrafficSource, NOAASource, DataSourceConfig = _get_scrapers()
    
    _baltic_source = BalticExchangeSource(
        DataSourceConfig(name="Baltic Exchange", base_url="https://api.balticexchange.com")
    )
    _clarksons_source = ClarksonsSource(
        DataSourceConfig(name="Clarksons SIN", base_url="https://api.clarksons.net")
    )
    _marinetraffic_source = MarineTrafficSource(
        DataSourceConfig(name="MarineTraffic", base_url="https://services.marinetraffic.com/api")
    )
    _noaa_source = NOAASource(
        DataSourceConfig(name="NOAA NWS", base_url="https://api.weather.gov")
    )
    return _baltic_source, _clarksons_source, _marinetraffic_source, _noaa_source


# Initialize data sources at module level
_baltic_source, _clarksons_source, _marinetraffic_source, _noaa_source = _init_scrapers()


def _run_async(coro):
    """Run an async coroutine synchronously, creating a new event loop if needed."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in an async context; create a new loop in a thread
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                return pool.submit(asyncio.run, coro).result()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


@tool
def get_freight_forecast(days: int = 30) -> str:
    """Get the probabilistic freight rate forecast for the next N days with confidence intervals."""
    import json
    generate_forecast, get_model_status = _get_forecast_engine()
    df = generate_forecast(days)
    return json.dumps({
        "forecast": df.to_dict(orient="records"),
        "model_status": get_model_status(),
    }, indent=2)


@tool
def run_vessel_optimizer(
    cargo_tons: float,
    shock_scenario: bool = False,
    origin_region: str = "Australia",
    destination_port: str = "Paradip",
    commodity: str = "Iron Ore",
) -> str:
    """Run the MILP optimizer to find the best port and vessel combination with scenario analysis."""
    import json
    solve_optimization, get_optimizer_status = _get_optimizer()
    result = solve_optimization(
        cargo_tons=cargo_tons,
        shock_scenario=shock_scenario,
        origin_region=origin_region,
        destination_port=destination_port,
        commodity=commodity,
    )
    return json.dumps(result, indent=2)


@tool
def get_baltic_indices() -> str:
    """Get latest Baltic Dry Index (BDI) and sub-indices (BCI, BPI, BSI, BHSI)."""
    import json
    data = _run_async(_baltic_source.fetch_indices())
    return json.dumps(data, indent=2)


@tool
def get_freight_rates() -> str:
    """Get current freight rates for major shipping routes."""
    import json
    data = _run_async(_clarksons_source.fetch_freight_rates())
    return json.dumps(data, indent=2)


@tool
def get_port_congestion(ports: Optional[str] = None) -> str:
    """Get port congestion data for major ports. Optionally filter by comma-separated port names."""
    import json
    port_list = [p.strip() for p in ports.split(",")] if ports else None
    data = _run_async(_marinetraffic_source.fetch_port_congestion(port_list))
    return json.dumps(data, indent=2)


@tool
def get_vessel_positions(mmsi: Optional[str] = None) -> str:
    """Get live vessel positions. Optionally filter by comma-separated MMSI list."""
    import json
    mmsi_list = [m.strip() for m in mmsi.split(",")] if mmsi else None
    data = _run_async(_marinetraffic_source.fetch_vessel_positions(mmsi_list))
    return json.dumps(data, indent=2)


@tool
def get_weather_alerts(region: str = "indian_ocean") -> str:
    """Get weather alerts affecting shipping routes."""
    import json
    data = _run_async(_noaa_source.fetch_weather_alerts(region))
    return json.dumps(data, indent=2)


@tool
def find_coal_options(
    quantity_tonnes: float,
    destination_port: str = "Paradip",
    shock_scenario: bool = False,
) -> str:
    """Find best coal procurement options from global origins."""
    import json
    find_best_coal_options = _get_coal_buyer()
    results = find_best_coal_options(quantity_tonnes, destination_port, shock_scenario)
    return json.dumps({
        "quantity_tonnes": quantity_tonnes,
        "destination_port": destination_port,
        "shock_scenario": shock_scenario,
        "options": results,
        "best_option": results[0] if results else None,
    }, indent=2)


@tool
def get_system_status() -> str:
    """Get status of all forecasting models and optimizer configuration."""
    import json
    generate_forecast, get_model_status = _get_forecast_engine()
    solve_optimization, get_optimizer_status = _get_optimizer()
    return json.dumps({
        "forecast_engine": get_model_status(),
        "optimizer": get_optimizer_status(),
    }, indent=2)


if __name__ == "__main__":
    print("Testing tools...")
    print("\n--- Freight Forecast ---")
    print(get_freight_forecast(7))
    
    print("\n--- Vessel Optimizer ---")
    print(run_vessel_optimizer(80000, False))
    
    print("\n--- Baltic Indices ---")
    print(get_baltic_indices())
    
    print("\n--- Freight Rates ---")
    print(get_freight_rates())
    
    print("\n--- Port Congestion ---")
    print(get_port_congestion("Paradip,Visakhapatnam"))
    
    print("\n--- Weather Alerts ---")
    print(get_weather_alerts())
    
    print("\n--- Coal Options ---")
    print(find_coal_options(50000))
    
    print("\n--- System Status ---")
    print(get_system_status())
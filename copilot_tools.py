from langchain_core.tools import tool
from forecast_engine import generate_forecast
from optimizer_engine import run_optimizer

@tool
def get_freight_forecast(days: int = 30) -> str:
    """Get the probabilistic freight rate forecast and BUY/WAIT recommendation."""
    data = generate_forecast()
    return str(data)

@tool
def run_vessel_optimizer(cargo_tons: float, shock_scenario: bool = False) -> str:
    """Run the MILP optimizer to find the best port and vessel combination."""
    import json

    return json.dumps(run_optimizer(cargo_tons=cargo_tons, shock_scenario=shock_scenario))

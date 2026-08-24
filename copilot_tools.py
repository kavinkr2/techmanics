from langchain.tools import tool
from forecast_engine import generate_forecast
from optimizer import solve_optimization

@tool
def get_freight_forecast(days: int = 30) -> str:
    """Get the probabilistic freight rate forecast for the next N days."""
    df = generate_forecast(days)
    return df.to_json(orient="records")

@tool
def run_vessel_optimizer(cargo_tons: float, shock_scenario: bool = False) -> str:
    """Run the MILP optimizer to find the best port and vessel combination."""
    result = solve_optimization(cargo_tons, shock_scenario)
    return str(result)

@tool
def get_port_congestion(port_name: str) -> str:
    """Get current congestion and demurrage risk for a specific East Coast port."""
    # Henry Joshua's data fetcher goes here
    return f"Congestion at {port_name} is currently 45%. Demurrage risk is moderate."
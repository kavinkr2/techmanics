from langchain.tools import tool

# --- DUMMY TOOLS (Replace these when Jayasimha & Harshitha send their code) ---

@tool
def get_freight_forecast(days: int = 30) -> str:
    """
    Get the probabilistic freight rate forecast for the next N days.
    Returns dummy data for now.
    """
    # DUMMY DATA - Replace with: df = generate_forecast(days); return df.to_json()
    return """
    Forecast for next 30 days:
    - Base rate: $15.2/ton
    - 95% Confidence range: $13.5 - $17.8/ton
    - Risk-adjusted VaR: $19.2/ton
    - Trend: Rates expected to dip 5% next week due to seasonal lull
    """

@tool
def run_vessel_optimizer(cargo_tons: float, shock_scenario: bool = False) -> str:
    """
    Run the MILP optimizer to find the best port and vessel combination.
    Returns dummy data for now.
    """
    # DUMMY DATA - Replace with: result = solve_optimization(cargo_tons, shock_scenario); return str(result)
    
    if shock_scenario:
        return """
        OPTIMIZATION RESULT (Shock Scenario):
        - Optimal Port: Paradip
        - Optimal Vessel: 2x Panamax
        - Total Cost: ₹2.45 Crores
        - Reasoning: 
          * Vizag congestion at 75% → high demurrage risk (₹18L/day)
          * Haldia draft limit (10.5m) cannot handle Capesize
          * Paradip has lowest total landed cost under shock conditions
        """
    else:
        return """
        OPTIMIZATION RESULT (Normal Scenario):
        - Optimal Port: Vizag
        - Optimal Vessel: 1x Capesize
        - Total Cost: ₹2.10 Crores
        - Reasoning:
          * Capesize offers best economies of scale (₹14/ton vs ₹16/ton for Panamax)
          * Vizag draft (16m) can handle Capesize
          * Current congestion: 25% (low demurrage risk)
        """

# --- END OF DUMMY TOOLS ---
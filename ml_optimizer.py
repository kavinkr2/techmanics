# Placeholder for Harshitha's optimizer model.
# Replace the body of optimize_cargo() with her actual MILP implementation
# when the code arrives. Keep the same function signature so
# optimizer_engine.py doesn't need to change.


def optimize_cargo(cargo_tons: float, shock_scenario: bool = False) -> dict:
    """Run Harshitha's MILP optimizer.

    Returns a dict with the chosen vessel/port plan. Dummy logic for now:
    picks Panamax to Paradip, rejects Capesize on draft/demurrage rules.
    """
    if shock_scenario:
        # Placeholder: assume shock raises demurrage risk, forces smaller plan
        return {
            "vessel": "1x Supramax",
            "port": "Paradip",
            "cargo_tons": cargo_tons,
            "shock_applied": True,
            "notes": "Shock scenario: reduced charter to limit demurrage exposure.",
        }

    return {
        "vessel": "2x Panamax",
        "port": "Paradip",
        "cargo_tons": cargo_tons,
        "rejected": [
            {
                "option": "Capesize",
                "reason": "10.5m draft limit at Haldia and high demurrage risk at Vizag",
            }
        ],
        "shock_applied": False,
        "notes": "Dummy optimizer output - replace with real MILP result.",
    }

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
from optimizer import build_model, solve, load_data

def run_optimizer(cargo_tons: float, shock_scenario: bool = False) -> Dict[str, Any]:
    """
    Run Harshitha's CP-SAT optimizer and return the results.

    Args:
        cargo_tons: Total cargo quantity to optimize
        shock_scenario: If True, apply stress scenario (e.g., higher costs)

    Returns:
        Dictionary with optimization results
    """
    try:
        # Load data
        data = load_data()

        # Update cargo demand if specified
        if cargo_tons > 0:
            data["cargo"]["demand_tonnes"] = cargo_tons

        # Apply shock scenario if requested
        if shock_scenario:
            # Increase costs by 20% for stress testing
            for vessel in data["vessels"]:
                vessel["charter_cost_per_tonne"] *= 1.2
            for port in data["ports"]:
                port["port_cost_per_tonne"] *= 1.2

        # Build and solve model
        model_context = build_model(data)

        if model_context is None:
            return {
                "status": "INFEASIBLE",
                "message": "No feasible vessel-port combinations found",
                "assignments": []
            }

        result = solve(model_context)

        # Format response
        return {
            "status": result["status"],
            "total_tranches": result["total_tranches"],
            "total_cost": result.get("total_objective"),
            "cost_components": result.get("cost_components", {}),
            "assignments": result.get("assignments", []),
            "message": result.get("message", "")
        }

    except Exception as e:
        return {
            "status": "ERROR",
            "message": str(e),
            "assignments": []
        }

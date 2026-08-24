"""
risk.py
=======

Risk analysis module for the vessel-port-cargo assignment problem.

This module evaluates the transportation plan produced by Module 2
(``optimizer.py``) under the scenarios defined in ``data/data.json``.
It reports scenario costs, expected cost, VaR at 95%, and CVaR at 95%.

It does NOT modify or duplicate the feasibility filter (Module 1) or the
CP-SAT optimizer (Module 2).  It reuses their outputs directly.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

# Ensure sibling modules are importable regardless of execution context.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from optimizer import load_data, solve
from feasibility import evaluate_all_combinations, get_feasible_combinations


# ---------------------------------------------------------------------------
# Data / plan helpers
# ---------------------------------------------------------------------------

def load_data(data_path: Path | None = None) -> Dict[str, Any]:
    """Load the single source-of-truth data file."""
    if data_path is None:
        data_path = Path(__file__).resolve().parent.parent / "data" / "data.json"
    with open(data_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def get_optimized_plan(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return the optimized assignments produced by Module 2.

    Reuses ``optimizer.build_model`` and ``optimizer.solve`` without
    modifying either frozen module.
    """
    from optimizer import build_model  # noqa: F401 – re-exported locally

    model_context = build_model(data)
    if model_context is None:
        return []
    result = solve(model_context)
    if result["status"] not in ("OPTIMAL", "FEASIBLE"):
        return []
    return result["assignments"]


# ---------------------------------------------------------------------------
# Cost calculations
# ---------------------------------------------------------------------------

def calculate_scenario_cost(
    assignments: List[Dict[str, Any]],
    vessel_map: Dict[str, Dict[str, Any]],
    port_map: Dict[str, Dict[str, Any]],
    scenario: Dict[str, Any],
) -> float:
    """Calculate total transportation cost for one scenario.

    cost =
        sum(
            cargo_quantity
            * (
                charter_cost_per_tonne
                + port_cost_per_tonne
                + scenario_freight_rate
                + scenario_fuel_cost
            )
        )

    ``weather_delay_days`` is reported separately and is NOT converted
    into monetary cost because no delay cost field exists in data.json.
    """
    total = 0.0
    for assignment in assignments:
        v_id = assignment["vessel_id"]
        p_id = assignment["port_id"]
        qty = float(assignment["cargo_quantity"])
        vessel = vessel_map[v_id]
        port = port_map[p_id]
        per_tonne = (
            float(vessel["charter_cost_per_tonne"])
            + float(port["port_cost_per_tonne"])
            + float(scenario["freight_rate"])
            + float(scenario["fuel_cost"])
        )
        total += qty * per_tonne
    return total


def calculate_expected_cost(
    assignments: List[Dict[str, Any]],
    vessel_map: Dict[str, Dict[str, Any]],
    port_map: Dict[str, Dict[str, Any]],
    scenarios: List[Dict[str, Any]],
) -> float:
    """Expected transportation cost across all scenarios."""
    expected = 0.0
    for scenario in scenarios:
        cost = calculate_scenario_cost(assignments, vessel_map, port_map, scenario)
        expected += float(scenario["probability"]) * cost
    return expected


# ---------------------------------------------------------------------------
# VaR / CVaR
# ---------------------------------------------------------------------------

def calculate_var_cvar(
    assignments: List[Dict[str, Any]],
    vessel_map: Dict[str, Dict[str, Any]],
    port_map: Dict[str, Dict[str, Any]],
    scenarios: List[Dict[str, Any]],
    alpha: float = 0.95,
) -> Dict[str, Any]:
    """Calculate VaR and CVaR at the given confidence level.

    VaR is the cost threshold at the ``alpha`` confidence level.

    CVaR is the probability-weighted average cost in the worst
    ``(1 - alpha)`` tail.  Discrete scenarios are accumulated from the
    highest cost downward until exactly the tail probability mass is
    collected.  If a scenario probability exceeds the remaining tail
    probability, only the required portion is used.
    """
    tail_prob = 1.0 - alpha

    scenario_costs = []
    for scenario in scenarios:
        cost = calculate_scenario_cost(assignments, vessel_map, port_map, scenario)
        scenario_costs.append({
            "scenario_id": scenario["scenario_id"],
            "probability": float(scenario["probability"]),
            "freight_rate": float(scenario["freight_rate"]),
            "fuel_cost": float(scenario["fuel_cost"]),
            "weather_delay_days": int(scenario["weather_delay_days"]),
            "cost": cost,
        })

    scenario_costs.sort(key=lambda item: item["cost"], reverse=True)

    weighted_tail_cost = 0.0
    accumulated_prob = 0.0
    var_value = None

    for item in scenario_costs:
        if accumulated_prob >= tail_prob:
            break

        remaining = tail_prob - accumulated_prob
        used_prob = min(item["probability"], remaining)

        weighted_tail_cost += item["cost"] * used_prob
        accumulated_prob += used_prob

        if var_value is None:
            var_value = item["cost"]

    cvar_value = weighted_tail_cost / tail_prob

    worst_scenario = max(scenario_costs, key=lambda item: item["cost"])

    return {
        "alpha": alpha,
        "var": var_value,
        "cvar": cvar_value,
        "scenarios": scenario_costs,
        "worst_scenario": worst_scenario,
    }


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def run_risk_analysis(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run the full risk analysis and return structured results."""
    assignments = get_optimized_plan(data)
    vessels = data["vessels"]
    ports = data["ports"]
    scenarios = data["scenarios"]

    vessel_map = {v["vessel_id"]: v for v in vessels}
    port_map = {p["port_id"]: p for p in ports}

    expected_cost = calculate_expected_cost(assignments, vessel_map, port_map, scenarios)
    var_cvar = calculate_var_cvar(assignments, vessel_map, port_map, scenarios)

    return {
        "assignments": assignments,
        "expected_cost": expected_cost,
        **var_cvar,
    }


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_risk_report(report: Dict[str, Any]) -> None:
    """Pretty-print the risk analysis report."""
    width = 70
    print("=" * width)
    print("MODULE 3 — RISK / CVaR REPORT")
    print("=" * width)

    print("\nSelected plan (from Module 2):")
    if not report["assignments"]:
        print("  No feasible optimized plan was returned by Module 2.")
    else:
        for assignment in report["assignments"]:
            print(
                f"  {assignment['vessel_id']} -> {assignment['port_id']}  "
                f"|  Quantity: {assignment['cargo_quantity']:,.0f} tonnes"
            )

    print("\nScenario analysis:")
    header = (
        f"{'Scenario':>10} {'Prob':>8} {'Freight':>10} {'Fuel':>8} "
        f"{'Delay':>6} {'Scenario Cost':>15}"
    )
    print(header)
    print("-" * width)
    for item in report["scenarios"]:
        print(
            f"{item['scenario_id']:>10} "
            f"{item['probability']:>8.2f} "
            f"{item['freight_rate']:>10.2f} "
            f"{item['fuel_cost']:>8.2f} "
            f"{item['weather_delay_days']:>6d} "
            f"{item['cost']:>15,.2f}"
        )

    print("\n" + "-" * width)
    print(f"Expected cost            : {report['expected_cost']:>15,.2f}")
    print(f"VaR (95%)                : {report['var']:>15,.2f}")
    print(f"CVaR (95%)               : {report['cvar']:>15,.2f}")
    worst = report["worst_scenario"]
    print(
        f"Worst-case scenario      : {worst['scenario_id']} "
        f"(cost {worst['cost']:,.2f}, delay {worst['weather_delay_days']} days)"
    )
    print("=" * width)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    data = load_data()
    report = run_risk_analysis(data)
    print_risk_report(report)


if __name__ == "__main__":
    main()

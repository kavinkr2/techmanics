"""
optimizer.py
=============

CP-SAT optimizer for the vessel-port-cargo assignment problem.

This module builds and solves a Google OR-Tools CP-SAT model over the
physically feasible (vessel, port) combinations returned by Module 1
(``feasibility.py``).  It selects the subset of feasible assignments that
minimizes expected transportation cost while respecting:

* total cargo demand
* individual vessel capacities
* minimum parcel size per tranche
* maximum number of tranches
* each vessel assigned to at most one port

Monetary objective coefficients are scaled by a factor of 10 so that
CP-SAT always receives integer coefficients.  Reported costs are divided
by the same factor to restore original monetary values.
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from ortools.sat.python import cp_model

# Ensure feasibility.py (sibling module) is importable regardless of
# whether this file is executed directly or as a package module.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from feasibility import (
    evaluate_all_combinations,
    get_feasible_combinations,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

#: Integer scaling factor applied to all monetary values in the objective.
#: CP-SAT requires integer coefficients; dividing reported costs by this
#: factor restores the original monetary values.
COST_SCALE = 10


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_data(data_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the single source-of-truth data file."""
    if data_path is None:
        data_path = Path(__file__).resolve().parent / "data" / "data.json"
    with open(data_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# Model construction
# ---------------------------------------------------------------------------

def build_model(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Build a CP-SAT model from the feasible combinations identified by Module 1.

    Returns ``None`` when no feasible combinations exist, signalling the
    caller to report infeasibility.
    """
    vessels = data["vessels"]
    ports = data["ports"]
    cargo = data["cargo"]
    scenarios = data["scenarios"]

    # Module 1: physical feasibility filter
    all_results = evaluate_all_combinations(vessels, ports, cargo)
    feasible_results = get_feasible_combinations(all_results)

    if not feasible_results:
        return None

    model = cp_model.CpModel()

    vessel_map = {v["vessel_id"]: v for v in vessels}
    port_map = {p["port_id"]: p for p in ports}

    # Expected scenario costs (probabilistic components)
    expected_freight = sum(s["probability"] * s["freight_rate"] for s in scenarios)
    expected_fuel = sum(s["probability"] * s["fuel_cost"] for s in scenarios)

    # Decision variables (only for feasible pairs)
    x: Dict[Tuple[str, str], cp_model.BoolVarT] = {}
    q: Dict[Tuple[str, str], cp_model.IntVar] = {}

    for result in feasible_results:
        v_id = result["vessel_id"]
        p_id = result["port_id"]
        vessel = vessel_map[v_id]
        capacity = int(vessel["capacity"])

        x[(v_id, p_id)] = model.NewBoolVar(f"x_{v_id}_{p_id}")
        q[(v_id, p_id)] = model.NewIntVar(0, capacity, f"q_{v_id}_{p_id}")

    # Helper: feasible ports for a given vessel
    feasible_ports_by_vessel: Dict[str, List[str]] = defaultdict(list)
    for v_id, p_id in x:
        feasible_ports_by_vessel[v_id].append(p_id)

    # Constraint: total demand satisfied
    model.Add(sum(q[k] for k in q) == int(cargo["demand_tonnes"]))

    # Constraint: capacity coupling and minimum parcel size
    min_parcel = int(cargo["min_parcel_size"])
    for v_id, p_id in x:
        vessel = vessel_map[v_id]
        capacity = int(vessel["capacity"])
        model.Add(q[(v_id, p_id)] <= capacity * x[(v_id, p_id)])
        model.Add(q[(v_id, p_id)] >= min_parcel * x[(v_id, p_id)])

    # Constraint: maximum number of tranches
    model.Add(sum(x[k] for k in x) <= int(cargo["max_tranches"]))

    # Constraint: each vessel assigned to at most one port
    for v_id, port_list in feasible_ports_by_vessel.items():
        model.Add(sum(x[(v_id, p_id)] for p_id in port_list) <= 1)

    # Objective: minimize expected transportation cost (scaled by COST_SCALE)
    objective_terms = []
    for v_id, p_id in x:
        vessel = vessel_map[v_id]
        port = port_map[p_id]
        cost_per_tonne = (
            vessel["charter_cost_per_tonne"]
            + port["port_cost_per_tonne"]
            + expected_freight
            + expected_fuel
        )
        scaled_cost = int(round(cost_per_tonne * COST_SCALE))
        objective_terms.append(q[(v_id, p_id)] * scaled_cost)

    model.Minimize(sum(objective_terms))

    return {
        "model": model,
        "x": x,
        "q": q,
        "feasible_results": feasible_results,
        "vessel_map": vessel_map,
        "port_map": port_map,
        "expected_freight": expected_freight,
        "expected_fuel": expected_fuel,
    }


# ---------------------------------------------------------------------------
# Solver
# ---------------------------------------------------------------------------

def solve(model_context: Dict[str, Any]) -> Dict[str, Any]:
    """Solve the CP-SAT model and return status with solution values."""
    model = model_context["model"]
    x = model_context["x"]
    q = model_context["q"]
    feasible_results = model_context["feasible_results"]
    vessel_map = model_context["vessel_map"]
    port_map = model_context["port_map"]
    expected_freight = model_context["expected_freight"]
    expected_fuel = model_context["expected_fuel"]

    solver = cp_model.CpSolver()
    status = solver.Solve(model)

    status_name = solver.StatusName(status)

    result: Dict[str, Any] = {
        "status": status_name,
        "status_code": int(status),
        "assignments": [],
        "total_tranches": 0,
        "cost_components": {},
        "total_objective": None,
    }

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments = []
        total_charter = 0.0
        total_port = 0.0
        total_freight = 0.0
        total_fuel = 0.0
        total_tonnes = 0

        for v_id, p_id in sorted(x.keys()):
            x_val = solver.Value(x[(v_id, p_id)])
            if x_val == 1:
                q_val = solver.Value(q[(v_id, p_id)])
                vessel = vessel_map[v_id]
                port = port_map[p_id]

                charter_comp = vessel["charter_cost_per_tonne"] * q_val
                port_comp = port["port_cost_per_tonne"] * q_val
                freight_comp = expected_freight * q_val
                fuel_comp = expected_fuel * q_val

                total_charter += charter_comp
                total_port += port_comp
                total_freight += freight_comp
                total_fuel += fuel_comp
                total_tonnes += q_val

                assignments.append({
                    "vessel_id": v_id,
                    "port_id": p_id,
                    "cargo_quantity": q_val,
                })

        result["assignments"] = assignments
        result["total_tranches"] = len(assignments)
        result["cost_components"] = {
            "expected_charter": total_charter,
            "expected_port": total_port,
            "expected_freight": total_freight,
            "expected_fuel": total_fuel,
        }
        result["total_objective"] = solver.ObjectiveValue() / COST_SCALE
    elif status == cp_model.INFEASIBLE:
        result["message"] = "No feasible solution exists given the current constraints and data."
    else:
        result["message"] = (
            f"Solver returned status '{status_name}'. "
            "The model may be undetermined or the solver ran out of time."
        )

    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_results(result: Dict[str, Any]) -> None:
    """Pretty-print the optimization result."""
    print("=" * 60)
    print("CP-SAT OPTIMIZATION RESULT")
    print("=" * 60)
    print(f"Solver status : {result['status']}")
    if result.get("message"):
        print(f"Message       : {result['message']}")
        return

    print(f"Tranches used : {result['total_tranches']}")
    print()
    print("Selected assignments:")
    for a in result["assignments"]:
        print(
            f"  {a['vessel_id']} -> {a['port_id']}  "
            f"|  Quantity: {a['cargo_quantity']:,.0f} tonnes"
        )

    print()
    print("Cost components (expected, monetary units):")
    for key, value in result["cost_components"].items():
        print(f"  {key:20s}: {value:>12,.2f}")

    print()
    total = result.get("total_objective")
    if total is not None:
        print(f"Total objective (expected cost): {total:>12,.2f}")
    print("=" * 60)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    data = load_data()
    model_context = build_model(data)

    if model_context is None:
        print("=" * 60)
        print("CP-SAT OPTIMIZATION RESULT")
        print("=" * 60)
        print("Solver status : INFEASIBLE")
        print(
            "Message       : No feasible vessel-port combinations were found "
            "by the Module 1 feasibility filter."
        )
        print("=" * 60)
        sys.exit(1)

    result = solve(model_context)
    print_results(result)

    if result["status_code"] not in (
        cp_model.OPTIMAL,
        cp_model.FEASIBLE,
    ):
        sys.exit(1)


if __name__ == "__main__":
    main()

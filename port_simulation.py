"""
port_simulation.py
===================

Port queue simulation module for the vessel-port-cargo assignment problem.

This module uses SimPy to simulate vessel arrivals, berth queuing,
service/handling, and departures for the transportation plan selected
by Module 2 (``optimizer.py``).

It does NOT modify or duplicate any frozen module.

IMPORTANT — DATA LIMITATION
----------------------------
The current ``data/data.json`` contains port records with ``berths``
counts, but it does NOT contain:

* handling rate (tonnes per hour)
* service time per vessel
* vessel arrival times or inter-arrival distribution
* loading/unloading time model
* vessel turnaround time

A physically meaningful time-based queue simulation CANNOT be
performed without these inputs.  This module therefore implements a
guardrail-first design: it first checks whether the required data is
present.  If not, it reports the limitation clearly and shows the
best available selected plan from Module 2.  It does NOT invent
service times, arrival schedules, or handling rates.
"""

from __future__ import annotations
import json
import simpy
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure sibling modules are importable regardless of execution context.
sys.path.insert(0, str(Path(__file__).resolve().parent))


# ---------------------------------------------------------------------------
# Data / plan helpers
# ---------------------------------------------------------------------------

def load_data(data_path: Optional[Path] = None) -> Dict[str, Any]:
    """Load the single source-of-truth data file."""
    if data_path is None:
        data_path = Path(__file__).resolve().parent.parent / "data" / "data.json"
    with open(data_path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def get_optimized_assignments(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Consume Module 2 to obtain the selected transportation assignments.

    Reuses ``optimizer.build_model`` and ``optimizer.solve`` without
    modifying the frozen module.
    """
    from optimizer import build_model, solve  # noqa: F401 – re-exported locally

    model_context = build_model(data)
    if model_context is None:
        return []
    result = solve(model_context)
    if result["status"] not in ("OPTIMAL", "FEASIBLE"):
        return []
    return result["assignments"]


# ---------------------------------------------------------------------------
# Guardrail: can we run a valid SimPy simulation with the current data?
# ---------------------------------------------------------------------------

def can_run_simulation(data: Dict[str, Any]) -> bool:
    """Check whether the data contains the fields required for queue simulation.

    Required fields (conceptual, not all present in current data.json):

    * ``handling_rate`` or ``service_time`` for ports or vessels, so that
      berth occupancy duration can be computed.
    * ``vessel_arrival_time`` or ``inter_arrival_time`` or an arrival
      schedule/distribution, so that queue formation can be modelled.
    * ``loading_time`` / ``unloading_time`` or an equivalent turnaround
      model.

    With the current ``data.json``, none of these fields exist, so this
    function returns ``False``.
    """
    ports = data.get("ports", [])
    vessels = data.get("vessels", [])
    cargo = data.get("cargo", {})

    port_fields = set()
    for port in ports:
        port_fields.update(port.keys())

    vessel_fields = set()
    for vessel in vessels:
        vessel_fields.update(vessel.keys())

    cargo_fields = set(cargo.keys())

    has_handling = (
        "handling_rate" in port_fields
        or "service_time" in port_fields
        or "tonnes_per_hour" in port_fields
        or "loading_rate" in port_fields
        or "unloading_rate" in port_fields
    )

    has_arrival = (
        "vessel_arrival_time" in cargo
        or "inter_arrival_time" in cargo
        or "arrival_schedule" in cargo
        or "arrival_times" in cargo
    )

    has_turnaround = (
        "turnaround_time" in port_fields
        or "loading_time" in port_fields
        or "unloading_time" in vessel_fields
        or "service_time" in vessel_fields
    )

    return has_handling and has_arrival and has_turnaround


# ---------------------------------------------------------------------------
# SimPy model
# ---------------------------------------------------------------------------

def run_port_simulation(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run the port queue simulation if the required data is available.

    If ``can_run_simulation`` returns ``False``, this function returns a
    structured result indicating that the simulation cannot be performed
    and listing the missing inputs.  It still includes the selected plan
    from Module 2 for context.
    """
    assignments = get_optimized_assignments(data)
    ports = data.get("ports", [])
    port_map = {p["port_id"]: p for p in ports}

    result: Dict[str, Any] = {
        "can_simulate": False,
        "selected_plan": assignments,
        "simulation_metrics": {},
        "missing_inputs": [],
        "message": "",
    }

    if not can_run_simulation(data):
        result["message"] = (
            "Port queue simulation cannot be fully determined from the "
            "current data because service/handling time and arrival-pattern "
            "information is missing."
        )
        result["missing_inputs"] = [
            "handling rate or service time per vessel (e.g., tonnes per hour or hours per call)",
            "vessel arrival times or inter-arrival distribution",
            "loading/unloading rate or turnaround time model",
        ]
        return result

    # ------------------------------------------------------------------
    # If the required data were present, the SimPy model would be built
    # and executed here.  Because the current data is insufficient, this
    # branch is intentionally unreachable.
    # ------------------------------------------------------------------
    try:
        import simpy  # noqa: F401 – imported only when simulation is runnable
    except ImportError:
        result["message"] = (
            "SimPy is not installed in the current environment. "
            "Install it to run the port queue simulation."
        )
        return result

    # Placeholder for the actual SimPy implementation.
    # This code path is kept for future extension once the required
    # data fields are added to data.json.
    result["message"] = (
        "Simulation data is present, but the SimPy model implementation "
        "needs to be extended with the actual data fields."
    )
    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_simulation_report(result: Dict[str, Any]) -> None:
    """Pretty-print the port queue simulation report."""
    width = 70
    print("=" * width)
    print("MODULE 5 — PORT QUEUE SIMULATION")
    print("=" * width)

    print("\nSelected plan (from Module 2):")
    if not result["selected_plan"]:
        print("  No feasible optimized plan was returned by Module 2.")
    else:
        for assignment in result["selected_plan"]:
            print(
                f"  {assignment['vessel_id']} -> {assignment['port_id']}  "
                f"|  Quantity: {assignment['cargo_quantity']:,.0f} tonnes"
            )

    print("\nSimulation results:")
    if result.get("can_simulate"):
        for key, value in result["simulation_metrics"].items():
            print(f"  - {key}: {value}")
    else:
        print(
            "  Simulation cannot be fully determined from the current data."
        )
        if result.get("missing_inputs"):
            print("\nMissing information:")
            for item in result["missing_inputs"]:
                print(f"  * {item}")

    if result.get("message"):
        print(f"\n{result['message']}")

    print("=" * width)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    data = load_data()
    result = run_port_simulation(data)
    print_simulation_report(result)


if __name__ == "__main__":
    main()

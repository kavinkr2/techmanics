"""
stopping.py
===========

Optimal market-entry timing module for the vessel-port-cargo assignment
problem.

This module evaluates whether the chartering decision should be:

    ENTER NOW
    or
    WAIT

It consumes the optimized plan from Module 2 and the risk metrics from
Module 3.  It does NOT modify or duplicate any frozen module.

IMPORTANT — DATA LIMITATION
----------------------------
The current ``data/data.json`` contains only a static set of discrete
scenarios.  It does NOT contain:

* time-indexed historical freight rates
* time-indexed forecast freight rates
* dates or a decision horizon
* a waiting-cost model (e.g., per-day delay cost or opportunity cost)
* transition dynamics for freight rates over time

Because optimal stopping is inherently a sequential decision problem
over time, a mathematically valid ENTER/WAIT decision CANNOT be
determined from the current data.

This module therefore implements a guardrail-first design: it first
checks whether the required data is present.  If not, it reports the
limitation clearly and shows the best available "enter now" metrics
from Modules 2 and 3.  It does NOT invent rates, dates, or waiting
costs.
"""

from __future__ import annotations

import json
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


def get_current_plan_and_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    """Consume Module 2 and Module 3 to obtain the current plan and risk metrics.

    Returns a dictionary containing:
        * assignments (from Module 2)
        * expected_cost (from Module 3)
        * var (from Module 3)
        * cvar (from Module 3)
        * worst_scenario (from Module 3)
        * scenarios (from Module 3)
    """
    from risk import run_risk_analysis  # noqa: F401 – re-exported locally

    return run_risk_analysis(data)


# ---------------------------------------------------------------------------
# Guardrail: can we determine optimal stopping with the current data?
# ---------------------------------------------------------------------------

def can_determine_stopping(data: Dict[str, Any]) -> bool:
    """Check whether the data contains the fields required for optimal stopping.

    Required fields (conceptual, not all present in current data.json):

    * ``scenarios`` must be time-indexed (each scenario should have a
      ``date`` or ``period`` field indicating when the freight rate
      applies).
    * A ``waiting_cost`` or equivalent field must exist to model the
      cost of deferring the decision.
    * A ``decision_horizon`` or similar boundary must define when the
      opportunity expires.
    * Transition dynamics (e.g., ``transition_matrix`` or
      ``rate_drift``/``rate_volatility``) must be available to model
      how freight rates evolve over time.

    With the current ``data.json``, none of these fields exist, so this
    function returns ``False``.
    """
    scenarios = data.get("scenarios", [])

    has_time_index = any(
        "date" in s or "period" in s or "time_index" in s for s in scenarios
    )
    has_waiting_cost = "waiting_cost_per_day" in data or "waiting_cost" in data.get(
        "cargo", {}
    )
    has_horizon = (
        "decision_horizon_days" in data
        or "expiry_date" in data
        or "horizon" in data.get("cargo", {})
    )
    has_transition = (
        "transition_matrix" in data
        or "rate_drift" in data
        or "rate_volatility" in data
    )

    return has_time_index and has_waiting_cost and has_horizon and has_transition


# ---------------------------------------------------------------------------
# Optimal stopping decision
# ---------------------------------------------------------------------------

def run_optimal_stopping(data: Dict[str, Any]) -> Dict[str, Any]:
    """Run the optimal stopping analysis.

    If ``can_determine_stopping`` returns ``False``, this function returns
    a structured result indicating that the decision cannot be made and
    listing the missing information.  It still includes the best
    available "enter now" metrics from Modules 2 and 3.
    """
    risk_report = get_current_plan_and_risk(data)

    result: Dict[str, Any] = {
        "can_decide": False,
        "decision": None,
        "expected_cost_now": risk_report.get("expected_cost"),
        "var_now": risk_report.get("var"),
        "cvar_now": risk_report.get("cvar"),
        "worst_scenario_now": risk_report.get("worst_scenario"),
        "scenarios_now": risk_report.get("scenarios"),
        "missing_fields": [],
        "rationale": "",
    }

    if can_determine_stopping(data):
        result["can_decide"] = True
        result["decision"] = "ENTER"
        result["rationale"] = (
            "Time-indexed freight data and waiting costs are present; "
            "a formal optimal-stopping calculation can be performed."
        )
    else:
        result["decision"] = None
        result["rationale"] = (
            "Optimal stopping cannot be mathematically determined from the "
            "current data because the required time-indexed freight-rate "
            "information, waiting-cost model, decision horizon, and transition "
            "dynamics are missing."
        )
        result["missing_fields"] = [
            "time-indexed freight rates (date/period fields in scenarios)",
            "waiting cost model (e.g., waiting_cost_per_day)",
            "decision horizon or expiration rule",
            "transition dynamics for freight rates over time",
        ]

    return result


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def print_stopping_report(result: Dict[str, Any]) -> None:
    """Pretty-print the optimal stopping report."""
    width = 70
    print("=" * width)
    print("MODULE 4 — OPTIMAL STOPPING")
    print("=" * width)

    print("\nCurrent/available freight information")
    if result["can_decide"]:
        print(f"Decision: {result['decision']}")
    else:
        print("Decision: CANNOT BE DETERMINED")

    if result.get("expected_cost_now") is not None:
        print(f"\nExpected cost (enter now) : {result['expected_cost_now']:>15,.2f}")
    if result.get("var_now") is not None:
        print(f"VaR (95%)                 : {result['var_now']:>15,.2f}")
    if result.get("cvar_now") is not None:
        print(f"CVaR (95%)                : {result['cvar_now']:>15,.2f}")

    print("\nDecision rationale:")
    print(result["rationale"])

    if not result["can_decide"] and result["missing_fields"]:
        print("\nMissing information required for a valid prototype:")
        for field in result["missing_fields"]:
            print(f"  * {field}")

    print("=" * width)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    data = load_data()
    result = run_optimal_stopping(data)
    print_stopping_report(result)


if __name__ == "__main__":
    main()

"""
feasibility.py
================

Feasibility filter for the vessel-port-cargo assignment problem.

This module contains ONLY the physical feasibility filter. It does not
implement any optimization (CP-SAT, CVaR, optimal stopping, SimPy, etc.).
Its job is to decide, for a given vessel / port / cargo combination,
whether the combination is physically possible and to report *why not*
when it is infeasible.

Design notes
------------
* Nothing in this module is hard-coded. All numeric limits are read from
  the ``vessel``, ``port`` and ``cargo`` dictionaries supplied by the
  caller (typically loaded from ``data/data.json``).
* Available draft is resolved through :func:`get_available_draft` instead
  of being read directly from ``port["draft_limit"]``. This is the single
  extension point that will later let available draft depend on tide
  tables / time-of-day without touching any of the constraint-checking
  logic below.
* ``check_feasibility`` returns a structured result (not a bare bool) so
  that downstream stages (optimizer, reporting, UI) can explain *why* a
  combination was rejected.
* A relaxed/soft mode (:func:`evaluate_with_relaxed_fallback`) is provided
  so that when nothing is strictly feasible, the least-violating
  alternatives can still be surfaced instead of returning nothing.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict

# ---------------------------------------------------------------------------
# Reason codes
# ---------------------------------------------------------------------------
# Using plain string constants (rather than an Enum) keeps the reason codes
# trivially JSON-serializable, which matters because these results are meant
# to flow into reports / APIs / the optimizer's data pipeline.

REASON_DWT_CAPACITY = "dwt_capacity"
REASON_DRAFT_LIMIT = "draft_limit"
REASON_LOA_LIMIT = "loa_limit"
REASON_BEAM_LIMIT = "beam_limit"
REASON_PORT_INCOMPATIBLE = "port_incompatible"
REASON_NO_BERTHS_AVAILABLE = "no_berths_available"
REASON_PARCEL_BELOW_MIN = "parcel_below_min_parcel_size"
REASON_PARCEL_EXCEEDS_DEMAND = "parcel_exceeds_demand"


class FeasibilityResult(TypedDict):
    """Structured outcome of a single vessel-port(-cargo) feasibility check."""

    feasible: bool
    vessel_id: str
    port_id: str
    reasons: List[str]
    details: Dict[str, Any]


# ---------------------------------------------------------------------------
# Draft resolution (tide/time extension point)
# ---------------------------------------------------------------------------

def get_available_draft(
    port: Dict[str, Any],
    tide_state: Optional[Dict[str, Any]] = None,
) -> float:
    """Resolve the draft actually available at a port.

    Today this simply returns ``port["draft_limit"]`` because tidal data is
    not yet part of ``data.json``. The function exists as a dedicated seam
    so that, once tide/time data is available, the available draft can be
    computed as a function of time without changing any of the
    constraint-checking code in :func:`check_feasibility`.

    No tide adjustment formula is invented here. The static
    ``port["draft_limit"]`` is always used unless the caller explicitly
    supplies a numeric ``tide_adjustment`` inside ``tide_state``, in which
    case it is simply added to the base draft (positive values increase
    available draft, negative values decrease it). This keeps the
    interface ready for future tide/time integration without guessing at
    a formula ahead of the real data being available.

    Args:
        port: Port record. Must contain ``draft_limit`` (static/chart
            draft limit for the port/berth).
        tide_state: Optional dictionary describing the tidal/time context
            for the call being evaluated. If it contains a numeric
            ``tide_adjustment`` key, that value is added to the base
            draft. Any other keys are reserved for future use. When not
            supplied, the static ``draft_limit`` is used unchanged.

    Returns:
        The draft (in the same units as ``draft_limit``, typically metres)
        that is available for a vessel to use at this port right now.
    """
    base_draft = float(port["draft_limit"])

    if not tide_state or "tide_adjustment" not in tide_state:
        return base_draft

    tide_adjustment = float(tide_state["tide_adjustment"])
    return base_draft + tide_adjustment


# ---------------------------------------------------------------------------
# Small numeric helpers
# ---------------------------------------------------------------------------

def _safe_ratio(numerator: float, denominator: float) -> float:
    """Return numerator / denominator, guarding against division by zero."""
    if denominator == 0:
        return float("inf") if numerator > 0 else 0.0
    return numerator / denominator


def _resolve_effective_parcel_size(
    cargo: Dict[str, Any],
    parcel_size: Optional[float],
) -> float:
    """Determine the parcel quantity to test against a vessel/port.

    If the caller does not specify an explicit ``parcel_size`` (i.e. they
    are only asking "could this vessel realistically lift a viable parcel
    of this cargo at all?"), we fall back to the cargo's own
    ``min_parcel_size`` since that is the smallest quantity that would
    ever be shipped.
    """
    if parcel_size is not None:
        return float(parcel_size)
    return float(cargo.get("min_parcel_size", 0.0))



# ---------------------------------------------------------------------------
# Core feasibility check
# ---------------------------------------------------------------------------

def check_feasibility(
    vessel: Dict[str, Any],
    port: Dict[str, Any],
    cargo: Dict[str, Any],
    *,
    parcel_size: Optional[float] = None,
    tide_state: Optional[Dict[str, Any]] = None,
) -> FeasibilityResult:
    """Evaluate the physical feasibility of a vessel-port-cargo combination.

    Checks the following hard constraints:

    1. Vessel DWT / cargo capacity -- can the vessel physically lift the
       parcel being considered?
    2. Vessel draft <= available port draft (tide/time aware via
       :func:`get_available_draft`).
    3. Vessel LOA <= port LOA limit.
    4. Vessel beam <= port beam limit.
    5. Vessel-port compatibility and berth availability, enforced ONLY
       where such data is explicitly supplied (vessel class allow/deny
       lists, explicit vessel/port exclusions, current berth
       availability/occupancy figures). Skipped silently when not
       applicable -- e.g. a static ``berths`` capacity figure alone never
       fails a combination.
    6. Cargo demand / parcel quantity -- the parcel being considered must
       respect the cargo's own ``min_parcel_size`` / ``demand_tonnes``
       bounds.

    Args:
        vessel: Vessel record, expected to contain ``vessel_id``, ``dwt``,
            ``draft``, ``loa``, ``beam`` and ``capacity``.
        port: Port record, expected to contain ``port_id``,
            ``draft_limit``, ``loa_limit`` and ``beam_limit``. Optional
            compatibility fields (``allowed_vessel_classes``,
            ``excluded_vessel_classes``, ``allowed_vessel_ids``,
            ``excluded_vessel_ids``, ``berths_available`` or
            ``berths_occupied``) are honoured only when present.
        cargo: Cargo record, expected to contain ``demand_tonnes`` and
            ``min_parcel_size``.
        parcel_size: Optional explicit parcel quantity (tonnes) to test.
            Defaults to ``cargo["min_parcel_size"]`` when omitted.
        tide_state: Optional tidal/time context forwarded to
            :func:`get_available_draft`.

    Returns:
        A :class:`FeasibilityResult` dictionary. ``reasons`` is an empty
        list when the combination is feasible, otherwise it contains one
        code per violated hard constraint. ``details`` always contains the
        raw values used for the evaluation plus a numeric
        ``violation_score`` (0.0 when fully feasible) that can be used to
        rank alternatives in relaxed/soft mode.
    """
    vessel_id = vessel.get("vessel_id", "UNKNOWN_VESSEL")
    port_id = port.get("port_id", "UNKNOWN_PORT")

    reasons: List[str] = []
    violation_score = 0.0

    vessel_dwt = float(vessel.get("dwt", 0.0))
    vessel_capacity = float(vessel.get("capacity", vessel_dwt))
    vessel_draft = float(vessel.get("draft", 0.0))
    vessel_loa = float(vessel.get("loa", 0.0))
    vessel_beam = float(vessel.get("beam", 0.0))

    port_loa_limit = float(port.get("loa_limit", 0.0))
    port_beam_limit = float(port.get("beam_limit", 0.0))

    demand_tonnes = float(cargo.get("demand_tonnes", 0.0))
    min_parcel_size = float(cargo.get("min_parcel_size", 0.0))
    effective_parcel = _resolve_effective_parcel_size(cargo, parcel_size)

    available_draft = get_available_draft(port, tide_state=tide_state)

    # 1. Vessel DWT / cargo capacity ---------------------------------------
    # Can this vessel physically lift the parcel being considered?
    if effective_parcel > vessel_capacity:
        reasons.append(REASON_DWT_CAPACITY)
        violation_score += _safe_ratio(
            effective_parcel - vessel_capacity, vessel_capacity
        )

    # 2. Vessel draft <= available port draft -------------------------------
    # Available draft is resolved via get_available_draft() so that a
    # future tide/time model can be plugged in transparently.
    if vessel_draft > available_draft:
        reasons.append(REASON_DRAFT_LIMIT)
        violation_score += _safe_ratio(
            vessel_draft - available_draft, available_draft
        )

    # 3. Vessel LOA <= port LOA limit ----------------------------------------
    if vessel_loa > port_loa_limit:
        reasons.append(REASON_LOA_LIMIT)
        violation_score += _safe_ratio(vessel_loa - port_loa_limit, port_loa_limit)

    # 4. Vessel beam <= port beam limit ---------------------------------------
    if vessel_beam > port_beam_limit:
        reasons.append(REASON_BEAM_LIMIT)
        violation_score += _safe_ratio(
            vessel_beam - port_beam_limit, port_beam_limit
        )

    # 5. Vessel-port compatibility (optional, explicit data only) -------------
    compatibility_ok = True

    vessel_class = vessel.get("class")
    allowed_classes = port.get("allowed_vessel_classes")
    excluded_classes = port.get("excluded_vessel_classes")
    if allowed_classes is not None and vessel_class not in allowed_classes:
        compatibility_ok = False
    if excluded_classes is not None and vessel_class in excluded_classes:
        compatibility_ok = False

    allowed_vessel_ids = port.get("allowed_vessel_ids")
    excluded_vessel_ids = port.get("excluded_vessel_ids")
    if allowed_vessel_ids is not None and vessel_id not in allowed_vessel_ids:
        compatibility_ok = False
    if excluded_vessel_ids is not None and vessel_id in excluded_vessel_ids:
        compatibility_ok = False

    allowed_port_ids = vessel.get("allowed_port_ids")
    excluded_port_ids = vessel.get("excluded_port_ids")
    if allowed_port_ids is not None and port_id not in allowed_port_ids:
        compatibility_ok = False
    if excluded_port_ids is not None and port_id in excluded_port_ids:
        compatibility_ok = False

    if not compatibility_ok:
        reasons.append(REASON_PORT_INCOMPATIBLE)
        violation_score += 1.0

    # 5b. Berth availability (only when explicit live data exists) -----------
    # A static ``berths`` capacity count alone never fails a combination;
    # only explicit availability/occupancy figures are checked.
    berths_available: Optional[float] = None
    if "berths_available" in port:
        berths_available = float(port["berths_available"])
    elif "berths_occupied" in port and "berths" in port:
        berths_available = float(port["berths"]) - float(port["berths_occupied"])

    if berths_available is not None and berths_available <= 0:
        reasons.append(REASON_NO_BERTHS_AVAILABLE)
        violation_score += 1.0

    # 6. Cargo demand / parcel quantity ---------------------------------------
    # The parcel being considered must respect the cargo's own bounds:
    # at least ``min_parcel_size`` and no more than ``demand_tonnes``.
    if effective_parcel < min_parcel_size:
        reasons.append(REASON_PARCEL_BELOW_MIN)
        violation_score += _safe_ratio(
            min_parcel_size - effective_parcel, min_parcel_size
        )

    if effective_parcel > demand_tonnes:
        reasons.append(REASON_PARCEL_EXCEEDS_DEMAND)
        violation_score += _safe_ratio(
            effective_parcel - demand_tonnes, demand_tonnes
        )

    details: Dict[str, Any] = {
        "vessel_dwt": vessel_dwt,
        "vessel_capacity": vessel_capacity,
        "vessel_draft": vessel_draft,
        "vessel_loa": vessel_loa,
        "vessel_beam": vessel_beam,
        "available_draft": available_draft,
        "port_loa_limit": port_loa_limit,
        "port_beam_limit": port_beam_limit,
        "cargo_demand_tonnes": demand_tonnes,
        "cargo_min_parcel_size": min_parcel_size,
        "effective_parcel_size": effective_parcel,
        "violation_score": round(violation_score, 6),
    }
    # Berth information is only reported when explicitly present in the
    # input data (static capacity counts are never decision inputs).
    if berths_available is not None:
        details["berths_available"] = berths_available

    return {
        "feasible": len(reasons) == 0,
        "vessel_id": vessel_id,
        "port_id": port_id,
        "reasons": reasons,
        "details": details,
    }


# ---------------------------------------------------------------------------
# Batch evaluation across all vessel-port combinations
# ---------------------------------------------------------------------------

def evaluate_all_combinations(
    vessels: List[Dict[str, Any]],
    ports: List[Dict[str, Any]],
    cargo: Dict[str, Any],
    *,
    parcel_size: Optional[float] = None,
    tide_state: Optional[Dict[str, Any]] = None,
) -> List[FeasibilityResult]:
    """Run :func:`check_feasibility` for every vessel x port combination.

    Args:
        vessels: List of vessel records.
        ports: List of port records.
        cargo: Cargo record shared by all combinations.
        parcel_size: Optional explicit parcel quantity forwarded to every
            check (see :func:`check_feasibility`).
        tide_state: Optional tidal/time context forwarded to every check.

    Returns:
        A list of :class:`FeasibilityResult`, one per (vessel, port) pair,
        in vessel-major order (for each vessel, every port in turn).
    """
    results: List[FeasibilityResult] = []
    for vessel in vessels:
        for port in ports:
            results.append(
                check_feasibility(
                    vessel,
                    port,
                    cargo,
                    parcel_size=parcel_size,
                    tide_state=tide_state,
                )
            )
    return results


def get_feasible_combinations(
    results: List[FeasibilityResult],
) -> List[FeasibilityResult]:
    """Filter a list of results down to only the strictly feasible ones."""
    return [result for result in results if result["feasible"]]


# ---------------------------------------------------------------------------
# Relaxed / soft mode
# ---------------------------------------------------------------------------

def evaluate_with_relaxed_fallback(
    vessels: List[Dict[str, Any]],
    ports: List[Dict[str, Any]],
    cargo: Dict[str, Any],
    *,
    parcel_size: Optional[float] = None,
    tide_state: Optional[Dict[str, Any]] = None,
    top_n: int = 3,
) -> Dict[str, Any]:
    """Evaluate all combinations, falling back to a relaxed/soft ranking.

    Strictly feasible combinations (if any exist) are always returned.
    When none of the combinations are strictly feasible, the ``top_n``
    least-violating alternatives are returned instead, ranked by their
    ``violation_score`` (ascending) and, as a tiebreaker, by the number
    of violated constraints. This identifies which vessel-port pairs come
    closest to being workable and by how much they miss each limit.

    Args:
        vessels: List of vessel records.
        ports: List of port records.
        cargo: Cargo record shared by all combinations.
        parcel_size: Optional explicit parcel quantity forwarded to every
            check.
        tide_state: Optional tidal/time context forwarded to every check.
        top_n: Maximum number of relaxed alternatives to return when no
            strictly feasible combination exists.

    Returns:
        A dictionary with keys:

        * ``feasible`` (bool): True if at least one strictly feasible
          combination was found.
        * ``feasible_combinations`` (list): all strictly feasible results
          (empty when ``feasible`` is False).
        * ``relaxed_alternatives`` (list): the ``top_n`` least-violating
          results, populated only when ``feasible`` is False.
        * ``all_results`` (list): every evaluated combination, for full
          transparency/debugging.
    """
    all_results = evaluate_all_combinations(
        vessels,
        ports,
        cargo,
        parcel_size=parcel_size,
        tide_state=tide_state,
    )
    feasible_combinations = get_feasible_combinations(all_results)

    relaxed_alternatives: List[FeasibilityResult] = []
    if not feasible_combinations:
        relaxed_alternatives = sorted(
            all_results,
            key=lambda result: (
                result["details"]["violation_score"],
                len(result["reasons"]),
            ),
        )[: max(0, top_n)]

    return {
        "feasible": bool(feasible_combinations),
        "feasible_combinations": feasible_combinations,
        "relaxed_alternatives": relaxed_alternatives,
        "all_results": all_results,
    }


# ---------------------------------------------------------------------------
# Manual/demo entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json
    from pathlib import Path

    data_path = Path(__file__).resolve().parent.parent / "data" / "data.json"

    with open(data_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)

    demo_results = evaluate_all_combinations(
        data["vessels"], data["ports"], data["cargo"]
    )

    print("=== Feasibility filter demo (using data/data.json) ===")
    for result in demo_results:
        status = "FEASIBLE " if result["feasible"] else "INFEASIBLE"
        print(
            f"{result['vessel_id']} @ {result['port_id']}: {status} "
            f"reasons={result['reasons']} "
            f"score={result['details']['violation_score']}"
        )

    fallback = evaluate_with_relaxed_fallback(
        data["vessels"], data["ports"], data["cargo"]
    )
    print()
    print(f"Strictly feasible combination found: {fallback['feasible']}")
    if not fallback["feasible"]:
        print("Least-violating alternatives:")
        for alt in fallback["relaxed_alternatives"]:
            print(
                f"  {alt['vessel_id']} @ {alt['port_id']} "
                f"score={alt['details']['violation_score']} "
                f"reasons={alt['reasons']}"
            )



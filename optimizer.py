"""
MILP Optimizer for Vessel Selection and Port Optimization.
Uses OR-Tools CP-SAT for mixed-integer linear programming.
Supports multi-scenario stochastic optimization for chartering decisions.
"""
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from ortools.sat.python import cp_model


@dataclass
class Port:
    port_id: str
    name: str
    draft_limit: float
    loa_limit: int
    beam_limit: int
    berths: int
    port_cost_per_tonne: float
    country: str
    region: str


@dataclass
class Vessel:
    vessel_id: str
    vessel_class: str
    dwt: int
    draft: float
    loa: int
    beam: int
    capacity: int
    charter_cost_per_tonne: float
    fuel_consumption_per_day: float
    speed_knots: float


@dataclass
class Scenario:
    scenario_id: str
    probability: float
    freight_rate_multiplier: float
    fuel_cost_per_tonne: float
    weather_delay_days: int
    port_congestion_factor: float


@dataclass
class Cargo:
    cargo_id: str
    commodity: str
    demand_tonnes: int
    min_parcel_size: int
    max_tranches: int
    origin_region: str
    destination_region: str


@dataclass
class Route:
    route_id: str
    origin_port: str
    destination_port: str
    distance_nm: float
    base_freight_rate: float
    typical_transit_days: int


# ─── Data Definitions ───
PORTS = [
    Port("P001", "Paradip", 14.5, 280, 45, 6, 12.5, "India", "East Coast India"),
    Port("P002", "Visakhapatnam", 13.5, 260, 42, 4, 14.2, "India", "East Coast India"),
    Port("P003", "Mundra", 15.0, 300, 48, 8, 11.8, "India", "West Coast India"),
    Port("P004", "Krishnapatnam", 14.0, 270, 44, 5, 13.1, "India", "East Coast India"),
    Port("P005", "Kamarajar", 13.0, 250, 40, 3, 15.0, "India", "East Coast India"),
    Port("P006", "Chennai", 13.5, 265, 43, 4, 13.5, "India", "East Coast India"),
    Port("P007", "Kolkata", 12.0, 240, 38, 3, 14.0, "India", "East Coast India"),
    Port("P008", "Mumbai", 12.5, 250, 39, 4, 14.5, "India", "West Coast India"),
    Port("P009", "Newcastle", 15.0, 300, 50, 4, 12.0, "Australia", "East Coast Australia"),
    Port("P010", "Hay Point", 14.5, 290, 48, 3, 11.8, "Australia", "East Coast Australia"),
    Port("P011", "Gladstone", 14.0, 280, 45, 4, 13.2, "Australia", "East Coast Australia"),
    Port("P012", "Richards Bay", 14.5, 270, 42, 4, 10.5, "South Africa", "South Africa"),
    Port("P013", "Tubarao", 15.0, 300, 48, 4, 11.0, "Brazil", "Brazil"),
    Port("P014", "Puerto Bolivar", 13.5, 260, 42, 3, 9.5, "Colombia", "Colombia"),
    Port("P015", "Norfolk", 15.0, 300, 50, 4, 14.0, "USA", "US East Coast"),
]

VESSELS = [
    Vessel("V001", "Handysize", 38000, 10.2, 175, 28, 33000, 17, 25, 13.5),
    Vessel("V002", "Handysize", 40000, 10.5, 180, 30, 35000, 18, 26, 13.5),
    Vessel("V003", "Supramax", 58000, 12.2, 190, 32, 52000, 20, 30, 13.0),
    Vessel("V004", "Supramax", 63000, 12.8, 195, 32, 57000, 21, 32, 13.0),
    Vessel("V005", "Panamax", 75000, 12.5, 225, 32, 68000, 22, 35, 12.5),
    Vessel("V006", "Panamax", 82000, 13.0, 228, 33, 74000, 23, 38, 12.5),
    Vessel("V007", "Kamsarmax", 82000, 13.5, 229, 32, 76000, 24, 40, 12.0),
    Vessel("V008", "Capesize", 170000, 14.5, 280, 45, 160000, 28, 55, 11.5),
    Vessel("V009", "Capesize", 180000, 15.0, 290, 46, 170000, 29, 60, 11.5),
    Vessel("V010", "VLOC", 250000, 17.0, 330, 58, 230000, 32, 80, 10.5),
]

ROUTES = [
    Route("R001", "Newcastle", "Paradip", 4800, 18.5, 14),
    Route("R002", "Hay Point", "Paradip", 5200, 19.2, 15),
    Route("R003", "Gladstone", "Paradip", 5000, 18.8, 14),
    Route("R004", "Richards Bay", "Paradip", 4500, 16.5, 13),
    Route("R005", "Tubarao", "Paradip", 8500, 22.0, 22),
    Route("R006", "Puerto Bolivar", "Paradip", 9200, 23.5, 24),
    Route("R007", "Norfolk", "Paradip", 9800, 25.0, 25),
    Route("R008", "Newcastle", "Visakhapatnam", 4600, 17.8, 13),
    Route("R009", "Hay Point", "Visakhapatnam", 5000, 18.5, 14),
    Route("R010", "Richards Bay", "Visakhapatnam", 4300, 15.8, 12),
    Route("R011", "Tubarao", "Visakhapatnam", 8300, 21.5, 21),
    Route("R012", "Newcastle", "Mundra", 5500, 20.5, 16),
    Route("R013", "Richards Bay", "Mundra", 4000, 15.0, 12),
    Route("R014", "Tubarao", "Mundra", 9000, 24.0, 23),
]

# Base scenarios for stochastic optimization
BASE_SCENARIOS = [
    Scenario("S001", 0.25, 0.9, 85, 0, 0.8),   # Low market
    Scenario("S002", 0.35, 1.0, 90, 1, 1.0),   # Normal
    Scenario("S003", 0.25, 1.15, 95, 2, 1.2),  # High demand
    Scenario("S004", 0.15, 0.75, 100, 3, 1.5), # Shock/low
]

SHOCK_SCENARIOS = [
    Scenario("S101", 0.2, 0.6, 120, 2, 1.5),   # Severe shock
    Scenario("S102", 0.3, 0.7, 130, 3, 1.8),
    Scenario("S103", 0.3, 0.8, 140, 4, 2.0),
    Scenario("S104", 0.2, 0.5, 150, 5, 2.5),
]


def solve_optimization(
    cargo_tons: float,
    shock_scenario: bool = False,
    origin_region: str = "Australia",
    destination_port: str = "Paradip",
    commodity: str = "Iron Ore",
) -> Dict[str, Any]:
    """
    Run MILP optimizer using OR-Tools CP-SAT to find best port and vessel combination.
    Returns optimal_port, optimal_vessel, total_cost, and scenario analysis.
    """
    # Filter relevant ports and routes
    dest_ports = [p for p in PORTS if p.name == destination_port]
    if not dest_ports:
        dest_ports = [p for p in PORTS if p.country == "India"]
    
    origin_ports = [p for p in PORTS if p.country == origin_region]
    if not origin_ports:
        origin_ports = PORTS
    
    # Select relevant routes
    relevant_routes = [r for r in ROUTES 
                       if r.origin_port in [p.name for p in origin_ports]
                       and r.destination_port in [p.name for p in dest_ports]]
    
    if not relevant_routes:
        # Fallback: create synthetic routes
        for op in origin_ports:
            for dp in dest_ports:
                relevant_routes.append(Route(
                    f"{op.name}-{dp.name}", op.name, dp.name, 
                    5000, 18.0, 15
                ))
    
    scenarios = SHOCK_SCENARIOS if shock_scenario else BASE_SCENARIOS
    
    # Scale cargo to integer for CP-SAT (works in kg or 100-tonne units)
    scale = 1000  # Work in tonnes
    cargo_units = int(cargo_tons)
    
    model = cp_model.CpModel()
    
    # Decision variables
    # x[v][r][t] = tonnes carried by vessel v on route r in tranche t
    max_tranches = 5
    x = {}
    for i, v in enumerate(VESSELS):
        for j, r in enumerate(relevant_routes):
            for t in range(max_tranches):
                x[(i, j, t)] = model.NewIntVar(0, cargo_units, f"x_{i}_{j}_{t}")
    
    # y[v][r][t] = 1 if vessel v used on route r in tranche t
    y = {}
    for i, v in enumerate(VESSELS):
        for j, r in enumerate(relevant_routes):
            for t in range(max_tranches):
                y[(i, j, t)] = model.NewBoolVar(f"y_{i}_{j}_{t}")
    
    # Link x and y: x > 0 => y = 1
    for i, v in enumerate(VESSELS):
        for j, r in enumerate(relevant_routes):
            for t in range(max_tranches):
                model.Add(x[(i, j, t)] <= cargo_units * y[(i, j, t)])
                model.Add(x[(i, j, t)] >= 1 * y[(i, j, t)]).OnlyEnforceIf(y[(i, j, t)])
    
    # Cargo fulfillment: sum of all x = cargo_tons
    model.Add(sum(x[(i, j, t)] for i in range(len(VESSELS)) 
                  for j in range(len(relevant_routes)) 
                  for t in range(max_tranches)) == cargo_units)
    
    # Physical constraints: vessel must fit port
    for i, v in enumerate(VESSELS):
        for j, r in enumerate(relevant_routes):
            dest_port = next((p for p in dest_ports if p.name == r.destination_port), None)
            origin_port = next((p for p in origin_ports if p.name == r.origin_port), None)
            if dest_port:
                for t in range(max_tranches):
                    if v.draft > dest_port.draft_limit:
                        model.Add(y[(i, j, t)] == 0)
                    if v.loa > dest_port.loa_limit:
                        model.Add(y[(i, j, t)] == 0)
                    if v.beam > dest_port.beam_limit:
                        model.Add(y[(i, j, t)] == 0)
            if origin_port:
                for t in range(max_tranches):
                    if v.draft > origin_port.draft_limit:
                        model.Add(y[(i, j, t)] == 0)
    
    # Vessel capacity per tranche
    for i, v in enumerate(VESSELS):
        for j, r in enumerate(relevant_routes):
            for t in range(max_tranches):
                model.Add(x[(i, j, t)] <= v.capacity)
    
    # Minimum parcel size if used
    min_parcel = 25000
    for i, v in enumerate(VESSELS):
        for j, r in enumerate(relevant_routes):
            for t in range(max_tranches):
                model.Add(x[(i, j, t)] >= min_parcel * y[(i, j, t)])
    
    # Objective: Minimize expected total cost across scenarios
    objective_terms = []
    
    for sc in scenarios:
        prob = sc.probability
        sc_cost = 0
        
        for i, v in enumerate(VESSELS):
            for j, r in enumerate(relevant_routes):
                for t in range(max_tranches):
                    # Charter cost (per tonne * tonnes)
                    charter_cost = int(v.charter_cost_per_tonne * 100)  # Scale to cents
                    
                    # Port costs
                    dest_port = next((p for p in dest_ports if p.name == r.destination_port), None)
                    origin_port = next((p for p in origin_ports if p.name == r.origin_port), None)
                    port_cost = 0
                    if dest_port:
                        port_cost += int(dest_port.port_cost_per_tonne * 100)
                    if origin_port:
                        port_cost += int(origin_port.port_cost_per_tonne * 100)
                    
                    # Fuel cost (adjusted by scenario)
                    route = next((r for r in relevant_routes if r.route_id == f"{v.vessel_id}-{r.route_id}"), r)
                    transit_days = route.typical_transit_days
                    fuel_per_voyage = v.fuel_consumption_per_day * transit_days * sc.fuel_cost_per_tonne
                    fuel_cost = int(fuel_per_voyage * 100)
                    
                    # Weather delay cost
                    delay_cost = sc.weather_delay_days * 15000 * 100  # $15k/day * 100 for cents
                    
                    # Congestion cost
                    congestion_cost = int(port_cost * sc.port_congestion_factor * 0.1)
                    
                    total_per_tonne = charter_cost + port_cost + fuel_cost + delay_cost + congestion_cost
                    total_per_tonne = int(total_per_tonne * sc.freight_rate_multiplier)
                    
                    sc_cost += total_per_tonne * x[(i, j, t)]
        
        objective_terms.append(int(prob * 100) * sc_cost)
    
    model.Minimize(sum(objective_terms))
    
    # Solve
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    solver.parameters.num_search_workers = 8
    solver.parameters.log_search_progress = False
    
    status = solver.Solve(model)
    
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return _fallback_result(cargo_tons, destination_port, shock_scenario)
    
    # Extract solution
    solution = _extract_solution(solver, x, y, VESSELS, relevant_routes, 
                                 dest_ports, origin_ports, scenarios, cargo_tons, max_tranches)
    
    return solution


def _extract_solution(
    solver: cp_model.CpSolver,
    x: Dict,
    y: Dict,
    vessels: List[Vessel],
    routes: List[Route],
    dest_ports: List[Port],
    origin_ports: List[Port],
    scenarios: List[Scenario],
    cargo_tons: float,
    max_tranches: int,
) -> Dict[str, Any]:
    """Extract and format the optimization solution."""
    
    used_vessels = []
    used_routes = []
    total_tonnes = 0
    
    for i, v in enumerate(vessels):
        for j, r in enumerate(routes):
            for t in range(max_tranches):
                if solver.Value(y[(i, j, t)]) == 1:
                    tonnes = solver.Value(x[(i, j, t)])
                    total_tonnes += tonnes
                    used_vessels.append({
                        "vessel_class": v.vessel_class,
                        "vessel_id": v.vessel_id,
                        "tonnes": tonnes,
                        "dwt": v.dwt,
                        "draft": v.draft,
                    })
                    used_routes.append({
                        "route_id": r.route_id,
                        "origin": r.origin_port,
                        "destination": r.destination_port,
                        "distance_nm": r.distance_nm,
                        "transit_days": r.typical_transit_days,
                    })
    
    if not used_vessels:
        return _fallback_result(cargo_tons, dest_ports[0].name if dest_ports else "Paradip", False)
    
    # Determine optimal port (destination)
    dest_port = dest_ports[0] if dest_ports else None
    optimal_port = dest_port.name if dest_port else "Paradip"
    
    # Determine vessel description
    vessel_classes = [v["vessel_class"] for v in used_vessels]
    tranches = len(used_vessels)
    if tranches == 1:
        vessel_desc = vessel_classes[0]
    else:
        vessel_desc = f"{tranches}x {vessel_classes[0]}"
    
    # Calculate expected costs
    expected_cost = 0
    for sc in scenarios:
        sc_cost = 0
        for i, v in enumerate(vessels):
            for j, r in enumerate(routes):
                for t in range(max_tranches):
                    if solver.Value(y[(i, j, t)]) == 1:
                        tonnes = solver.Value(x[(i, j, t)])
                        charter = v.charter_cost_per_tonne * tonnes
                        
                        dp = next((p for p in dest_ports if p.name == r.destination_port), None)
                        op = next((p for p in origin_ports if p.name == r.origin_port), None)
                        port_c = (dp.port_cost_per_tonne if dp else 0) + (op.port_cost_per_tonne if op else 0)
                        port_c *= tonnes
                        
                        fuel = v.fuel_consumption_per_day * r.typical_transit_days * sc.fuel_cost_per_tonne
                        delay = sc.weather_delay_days * 15000
                        congestion = port_c * sc.port_congestion_factor * 0.1
                        
                        sc_cost += (charter + port_c + fuel + delay + congestion) * sc.freight_rate_multiplier
        
        expected_cost += sc.probability * sc_cost
    
    # Scenario breakdown
    scenario_details = []
    for sc in scenarios:
        sc_cost = 0
        for i, v in enumerate(vessels):
            for j, r in enumerate(routes):
                for t in range(max_tranches):
                    if solver.Value(y[(i, j, t)]) == 1:
                        tonnes = solver.Value(x[(i, j, t)])
                        charter = v.charter_cost_per_tonne * tonnes
                        dp = next((p for p in dest_ports if p.name == r.destination_port), None)
                        op = next((p for p in origin_ports if p.name == r.origin_port), None)
                        port_c = (dp.port_cost_per_tonne if dp else 0) + (op.port_cost_per_tonne if op else 0)
                        port_c *= tonnes
                        fuel = v.fuel_consumption_per_day * r.typical_transit_days * sc.fuel_cost_per_tonne
                        delay = sc.weather_delay_days * 15000
                        congestion = port_c * sc.port_congestion_factor * 0.1
                        sc_cost += (charter + port_c + fuel + delay + congestion) * sc.freight_rate_multiplier
        
        scenario_details.append({
            "scenario_id": sc.scenario_id,
            "probability": sc.probability,
            "freight_multiplier": sc.freight_rate_multiplier,
            "fuel_cost": sc.fuel_cost_per_tonne,
            "weather_delay": sc.weather_delay_days,
            "congestion_factor": sc.port_congestion_factor,
            "total_cost": round(sc_cost),
        })
    
    return {
        "optimal_port": optimal_port,
        "optimal_vessel": vessel_desc,
        "total_cost": int(expected_cost),
        "total_tonnes": total_tonnes,
        "tranches": tranches,
        "vessels_used": used_vessels,
        "routes_used": used_routes,
        "scenario_analysis": scenario_details,
        "expected_cost_per_tonne": round(expected_cost / total_tonnes, 2) if total_tonnes > 0 else 0,
        "solver_status": "OPTIMAL" if solver.StatusName == cp_model.OPTIMAL else "FEASIBLE",
    }


def _fallback_result(cargo_tons: float, destination_port: str, shock_scenario: bool) -> Dict[str, Any]:
    """Fallback when solver fails."""
    base_rate = 35 if shock_scenario else 28
    return {
        "optimal_port": destination_port,
        "optimal_vessel": "2x Panamax" if cargo_tons > 80000 else "Panamax",
        "total_cost": int(cargo_tons * base_rate),
        "total_tonnes": int(cargo_tons),
        "tranches": 2 if cargo_tons > 80000 else 1,
        "vessels_used": [{"vessel_class": "Panamax", "tonnes": int(cargo_tons / 2)}],
        "routes_used": [],
        "scenario_analysis": [],
        "expected_cost_per_tonne": base_rate,
        "solver_status": "FALLBACK",
    }


def solve_multi_cargo_optimization(
    cargos: List[Dict[str, Any]],
    shock_scenario: bool = False,
) -> Dict[str, Any]:
    """
    Solve multi-cargo portfolio optimization.
    Optimizes vessel allocation across multiple cargo commitments.
    """
    # This would be a more complex fleet scheduling problem
    # For now, solve each independently
    results = []
    for cargo in cargos:
        result = solve_optimization(
            cargo_tons=cargo.get("quantity_tonnes", 50000),
            shock_scenario=shock_scenario,
            origin_region=cargo.get("origin_region", "Australia"),
            destination_port=cargo.get("destination_port", "Paradip"),
            commodity=cargo.get("commodity", "Iron Ore"),
        )
        results.append(result)
    
    return {
        "status": "success",
        "total_cargos": len(cargos),
        "total_tonnes": sum(r["total_tonnes"] for r in results),
        "total_cost": sum(r["total_cost"] for r in results),
        "cargo_results": results,
    }


def get_optimizer_status() -> Dict[str, Any]:
    """Get optimizer configuration status."""
    return {
        "solver": "OR-Tools CP-SAT",
        "num_ports": len(PORTS),
        "num_vessels": len(VESSELS),
        "num_routes": len(ROUTES),
        "base_scenarios": len(BASE_SCENARIOS),
        "shock_scenarios": len(SHOCK_SCENARIOS),
        "ports": [{"id": p.port_id, "name": p.name, "country": p.country, "draft_limit": p.draft_limit} for p in PORTS],
        "vessels": [{"id": v.vessel_id, "class": v.vessel_class, "dwt": v.dwt, "draft": v.draft, "capacity": v.capacity} for v in VESSELS],
    }


if __name__ == "__main__":
    # Test the optimizer
    print("Optimizer Status:", get_optimizer_status())
    print("\n--- Normal Optimization ---")
    result = solve_optimization(80000, shock_scenario=False, destination_port="Paradip")
    print(json.dumps(result, indent=2))
    print("\n--- Shock Scenario ---")
    result_shock = solve_optimization(80000, shock_scenario=True, destination_port="Paradip")
    print(json.dumps(result_shock, indent=2))
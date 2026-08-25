"""
Coal buyer endpoint - finds optimal routes for coal procurement from multiple origins.
"""
from typing import List, Dict, Any
from optimizer import solve_optimization


# Major coal exporting countries with typical ports
COAL_ORIGINS = [
    {
        "country": "Australia",
        "ports": [
            {"name": "Newcastle", "port_cost_per_tonne": 12.5, "draft_limit": 15.0},
            {"name": "Hay Point", "port_cost_per_tonne": 11.8, "draft_limit": 14.5},
            {"name": "Gladstone", "port_cost_per_tonne": 13.2, "draft_limit": 14.0},
        ],
        "coal_grade": "Thermal / Metallurgical",
        "base_fob_usd_per_tonne": 110,
    },
    {
        "country": "Indonesia",
        "ports": [
            {"name": "Samarinda", "port_cost_per_tonne": 8.5, "draft_limit": 12.0},
            {"name": "Taboneo", "port_cost_per_tonne": 8.2, "draft_limit": 11.5},
            {"name": "Adang Bay", "port_cost_per_tonne": 7.8, "draft_limit": 11.0},
        ],
        "coal_grade": "Thermal (Low CV)",
        "base_fob_usd_per_tonne": 65,
    },
    {
        "country": "South Africa",
        "ports": [
            {"name": "Richards Bay", "port_cost_per_tonne": 10.5, "draft_limit": 14.5},
        ],
        "coal_grade": "Thermal / Metallurgical",
        "base_fob_usd_per_tonne": 95,
    },
    {
        "country": "Colombia",
        "ports": [
            {"name": "Puerto Bolivar", "port_cost_per_tonne": 9.5, "draft_limit": 13.5},
            {"name": "Santa Marta", "port_cost_per_tonne": 9.0, "draft_limit": 12.0},
        ],
        "coal_grade": "Thermal",
        "base_fob_usd_per_tonne": 85,
    },
    {
        "country": "USA",
        "ports": [
            {"name": "Norfolk", "port_cost_per_tonne": 14.0, "draft_limit": 15.0},
            {"name": "Baltimore", "port_cost_per_tonne": 13.5, "draft_limit": 14.0},
        ],
        "coal_grade": "Metallurgical / Thermal",
        "base_fob_usd_per_tonne": 120,
    },
    {
        "country": "Russia",
        "ports": [
            {"name": "Vostochny", "port_cost_per_tonne": 11.0, "draft_limit": 14.0},
            {"name": "Vanino", "port_cost_per_tonne": 10.5, "draft_limit": 13.0},
        ],
        "coal_grade": "Thermal / Metallurgical",
        "base_fob_usd_per_tonne": 90,
    },
    {
        "country": "Mongolia",
        "ports": [
            {"name": "Tianjin (via rail)", "port_cost_per_tonne": 15.0, "draft_limit": 14.0},
        ],
        "coal_grade": "Coking / Thermal",
        "base_fob_usd_per_tonne": 100,
    },
]

# Indian port discharge costs (USD/tonne)
DISCHARGE_PORT_COSTS = {
    "Paradip": 12.5,
    "Visakhapatnam": 13.0,
    "Mundra": 11.5,
    "Krishnapatnam": 12.8,
    "Kamarajar": 13.2,
    "Chennai": 13.5,
    "Kolkata": 14.0,
    "Mumbai": 14.5,
}

# Transit days from origin country to Indian ports
TRANSIT_DAYS = {
    "Australia": {
        "Paradip": 14, "Visakhapatnam": 13, "Mundra": 16, "Krishnapatnam": 14,
        "Kamarajar": 13, "Chennai": 13, "Kolkata": 15, "Mumbai": 15,
    },
    "Indonesia": {
        "Paradip": 7, "Visakhapatnam": 6, "Mundra": 9, "Krishnapatnam": 7,
        "Kamarajar": 6, "Chennai": 6, "Kolkata": 8, "Mumbai": 8,
    },
    "South Africa": {
        "Paradip": 18, "Visakhapatnam": 17, "Mundra": 16, "Krishnapatnam": 16,
        "Kamarajar": 15, "Chennai": 15, "Kolkata": 19, "Mumbai": 15,
    },
    "Colombia": {
        "Paradip": 22, "Visakhapatnam": 21, "Mundra": 24, "Krishnapatnam": 21,
        "Kamarajar": 20, "Chennai": 20, "Kolkata": 23, "Mumbai": 20,
    },
    "USA": {
        "Paradip": 20, "Visakhapatnam": 19, "Mundra": 22, "Krishnapatnam": 19,
        "Kamarajar": 18, "Chennai": 18, "Kolkata": 21, "Mumbai": 18,
    },
    "Russia": {
        "Paradip": 16, "Visakhapatnam": 15, "Mundra": 14, "Krishnapatnam": 14,
        "Kamarajar": 13, "Chennai": 13, "Kolkata": 17, "Mumbai": 13,
    },
    "Mongolia": {
        "Paradip": 12, "Visakhapatnam": 11, "Mundra": 10, "Krishnapatnam": 11,
        "Kamarajar": 10, "Chennai": 10, "Kolkata": 13, "Mumbai": 10,
    },
}


def find_best_coal_options(
    quantity_tonnes: float,
    destination_port: str = "Paradip",
    shock_scenario: bool = False,
) -> List[Dict[str, Any]]:
    """
    Find the least costly coal procurement options from all origins.
    Returns sorted list by total delivered cost (FOB + freight + port + handling).
    """
    results = []
    
    # Get discharge port cost for the selected destination
    discharge_cost = DISCHARGE_PORT_COSTS.get(destination_port, 12.5)
    
    for origin in COAL_ORIGINS:
        for port in origin["ports"]:
            # Run optimizer for this route
            opt_result = solve_optimization(quantity_tonnes, shock_scenario)
            
            # Estimate freight cost based on origin-destination
            freight_estimate = _estimate_freight(origin["country"], destination_port, quantity_tonnes)
            
            # Total cost = FOB + Freight + Load Port Cost + Discharge Port Cost
            fob = origin["base_fob_usd_per_tonne"] * quantity_tonnes
            load_port_cost = port["port_cost_per_tonne"] * quantity_tonnes
            discharge_port_cost = discharge_cost * quantity_tonnes
            
            total_cost = fob + freight_estimate + load_port_cost + discharge_port_cost
            cost_per_tonne = total_cost / quantity_tonnes
            
            # Get transit days for this specific route
            transit_days = _estimate_transit_days(origin["country"], destination_port)
            
            results.append({
                "origin_country": origin["country"],
                "origin_port": port["name"],
                "coal_grade": origin["coal_grade"],
                "quantity_tonnes": quantity_tonnes,
                "fob_usd_per_tonne": origin["base_fob_usd_per_tonne"],
                "fob_total_usd": round(fob),
                "freight_usd_per_tonne": round(freight_estimate / quantity_tonnes, 2),
                "freight_total_usd": round(freight_estimate),
                "load_port_cost_usd_per_tonne": port["port_cost_per_tonne"],
                "discharge_port_cost_usd_per_tonne": discharge_cost,
                "total_cost_usd": round(total_cost),
                "total_cost_usd_per_tonne": round(cost_per_tonne, 2),
                "optimal_vessel": opt_result.get("optimal_vessel", "Panamax"),
                "vessel_class": _get_vessel_class(quantity_tonnes, port["draft_limit"]),
                "estimated_days": transit_days,
                "draft_limit_m": port["draft_limit"],
            })
    
    # Sort by total cost per tonne
    results.sort(key=lambda x: x["total_cost_usd_per_tonne"])
    return results


def _estimate_freight(origin_country: str, destination: str, quantity: float) -> float:
    """Estimate freight cost based on route distance."""
    # Base rates adjusted by destination
    base_rates = {
        "Australia": 18.5,
        "Indonesia": 12.0,
        "South Africa": 16.5,
        "Colombia": 22.0,
        "USA": 20.0,
        "Russia": 15.5,
        "Mongolia": 14.0,  # Via rail + sea
    }
    
    # Destination adjustment factors
    dest_factors = {
        "Paradip": 1.0,
        "Visakhapatnam": 0.98,
        "Mundra": 1.15,
        "Krishnapatnam": 1.02,
        "Kamarajar": 0.95,
        "Chennai": 0.95,
        "Kolkata": 1.10,
        "Mumbai": 1.10,
    }
    
    base_rate = base_rates.get(origin_country, 18.0)
    dest_factor = dest_factors.get(destination, 1.0)
    return base_rate * dest_factor * quantity


def _get_vessel_class(quantity: float, draft_limit: float) -> str:
    """Determine optimal vessel class based on quantity and port constraints.
    
    Checks draft constraints first, then quantity. This ensures ports with
    draft limits correctly restrict vessel class regardless of cargo size.
    """
    # Check draft constraints first
    if draft_limit < 10.5:
        return "Handysize (draft limited)"
    elif draft_limit < 12.5:
        # Can only take Handysize/Supramax
        if quantity <= 58000:
            return "Supramax"
        return "Handysize (multiple)"
    elif draft_limit < 14.5:
        # Can take Panamax
        if quantity <= 80000:
            return "Panamax"
        return "Panamax (multiple)"
    else:
        # Can take Capesize
        if quantity <= 180000:
            return "Capesize"
        return "Capesize (multiple)"


def _estimate_transit_days(origin_country: str, destination: str) -> int:
    """Estimate transit time in days."""
    country_times = TRANSIT_DAYS.get(origin_country, {})
    return country_times.get(destination, 15)
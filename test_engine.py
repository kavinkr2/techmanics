import sys
import os

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from models.freight_forecaster import FreightForecaster
from models.charter_optimizer import CharterOptimizer
from models.cii_carbon_calculator import CIICarbonCalculator
from models.explainability_engine import ExplainabilityEngine

def test_cii_calculator():
    print("Testing CIICarbonCalculator...")
    res = CIICarbonCalculator.calculate_voyage_emissions(
        distance_nm=4950,
        vessel_dwt=180000,
        speed_knots=12.5,
        fuel_sea_mt_day=38.0,
        fuel_port_mt_day=3.5,
        port_waiting_days=2.5,
        cargo_mt=165000,
        carbon_tax_usd_per_ton=50.0
    )
    assert res["cii_rating"] in ["A", "B", "C", "D", "E"], "Invalid CII rating"
    assert res["total_co2_emissions_mt"] > 0, "CO2 emissions must be positive"
    print(f" -> Passed! Capesize Attained CII: {res['attained_cii']}, Rating: {res['cii_rating_label']}, Total CO2: {res['total_co2_emissions_mt']} MT")

def test_explainability_engine():
    print("Testing ExplainabilityEngine...")
    res = ExplainabilityEngine.explain_forecast_step(
        route_id="AU_GLA_TO_IN_PRT",
        base_rate=15.80,
        forecasted_rate=17.20,
        macro_bdi_factor=1.10,
        bunker_factor=1.15,
        monsoon_severity=7.5,
        congestion_days=3.8
    )
    assert len(res["waterfall"]) == 7, "Waterfall must have 7 breakdown steps"
    assert "narrative" in res, "Missing narrative"
    print(f" -> Passed! Narrative: {res['narrative']}")

def test_freight_forecaster():
    print("Testing FreightForecaster...")
    forecaster = FreightForecaster()
    route_id = "AU_GLA_TO_IN_PRT"
    fc = forecaster.forecast_route(route_id, horizon_days=90)
    assert len(fc["forecast_trajectory"]) >= 12, "Must forecast at least 12 weeks"
    assert fc["model_metrics"]["accuracy_pct"] > 85.0, "Model accuracy must be > 85%"
    print(f" -> Passed! Route {route_id} Base: ${fc['current_rate_usd_mt']}, 90d Forecast: ${fc['forecast_trajectory'][-1]['p50_expected']}, Accuracy: {fc['model_metrics']['accuracy_pct']}%")
    return fc

def test_charter_optimizer(fc):
    print("Testing CharterOptimizer...")
    optimizer = CharterOptimizer()
    res = optimizer.optimize_charter(
        demand_mt=165000,
        cargo_type="Coking Coal",
        origin_id="AU_GLA",
        target_plant_id="SAIL_ROURKELA",
        forecast_trajectory=fc["forecast_trajectory"]
    )
    assert res["financial_impact"]["total_savings_usd"] >= 0, "Savings cannot be negative"
    assert res["optimal_solution"]["landed_cost_usd_per_ton"] > 0, "Landed cost must be > 0"
    print(f" -> Passed! Optimal: {res['optimal_solution']['num_voyages']}x {res['optimal_solution']['vessel_name']} ({res['optimal_solution']['charter_type']}) at ${res['optimal_solution']['landed_cost_usd_per_ton']}/MT")
    print(f" -> Total Savings vs Baseline: ${res['financial_impact']['total_savings_usd']:,} ({res['financial_impact']['savings_pct']}%)")

if __name__ == "__main__":
    print("=== RUNNING SUITE OF VERIFICATION TESTS ===")
    test_cii_calculator()
    test_explainability_engine()
    fc = test_freight_forecaster()
    test_charter_optimizer(fc)
    print("=== ALL 4 ENGINE TEST SUITES PASSED FLAWLESSLY! ===")

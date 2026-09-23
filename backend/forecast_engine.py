"""
Production Freight Forecasting Engine — XGBoost Quantile Regression with Decision Engine.
Integrates the full pipeline from haritha_unaku/06_predict.py with 56+ features.
"""
import argparse
import json
import os
import sys
import warnings
from datetime import date, timedelta
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.linear_model import QuantileRegressor

# Optional XGBoost import with fallback
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    xgb = None
    HAS_XGBOOST = False

# Suppress warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# ─── Configuration ───
MODEL_DIR = Path(__file__).parent / "models"
MODEL_DIR.mkdir(exist_ok=True)
MODEL_BUNDLE_PATH = MODEL_DIR / "xgb_quantile_bundle.joblib"
HORIZON = 7  # 7-day ahead forecast

# Data path - use synthetic if no real data
DATA_PATH = Path(__file__).parent / "data" / "freight_data.csv"
DATA_PATH.parent.mkdir(exist_ok=True)


# ============================================================
# FEATURE ENGINEERING (56+ features from 06_predict.py)
# ============================================================

def add_features(d: pd.DataFrame) -> pd.DataFrame:
    """Build 56+ features from raw freight dataframe."""
    d = d.copy()
    
    rate = d["freight_rate_usd_per_t"]
    bdi = d["bdi_index"]
    bunker = d["bunker_price_usd_per_t"]
    congestion = d["port_congestion_days"]
    demand = d["demand_signal"]
    
    # --- Rate lags ---
    for lag in [1, 2, 3, 7, 14, 21, 30]:
        d[f"rate_lag_{lag}"] = rate.shift(lag)
    
    # --- Rolling statistics ---
    for win in [7, 14, 30, 60]:
        d[f"rate_roll_mean_{win}"] = rate.shift(1).rolling(win).mean()
        d[f"rate_roll_std_{win}"] = rate.shift(1).rolling(win).std()
        d[f"rate_roll_min_{win}"] = rate.shift(1).rolling(win).min()
        d[f"rate_roll_max_{win}"] = rate.shift(1).rolling(win).max()
    
    # --- Momentum and acceleration ---
    d["rate_momentum_7"] = rate.shift(1) - rate.shift(7)
    d["rate_momentum_30"] = rate.shift(1) - rate.shift(30)
    d["rate_accel_7"] = rate.shift(1) - 2 * rate.shift(8) + rate.shift(15)
    d["rate_pos_30"] = (rate.shift(1) - d["rate_roll_min_30"]) / (d["rate_roll_max_30"] - d["rate_roll_min_30"] + 1e-6)
    d["rate_zscore_7"] = (rate.shift(1) - d["rate_roll_mean_7"]) / (d["rate_roll_std_7"] + 1e-6)
    
    # Trend slopes
    for win in [7, 14, 30]:
        d[f"rate_slope_{win}"] = rate.shift(1).rolling(win).apply(
            lambda r: np.polyfit(np.arange(len(r)), r, 1)[0] if r.std() > 0 else 0,
            raw=True
        )
    
    # --- Exogenous driver features ---
    d["bdi_lag_1"] = bdi.shift(1)
    d["bunker_lag_1"] = bunker.shift(1)
    d["congestion_lag_1"] = congestion.shift(1)
    d["demand_lag_1"] = demand.shift(1)
    
    d["bdi_delta_1"] = bdi.diff(1).shift(1)
    d["bdi_delta_3"] = bdi.diff(3).shift(1)
    d["bdi_delta_7"] = bdi.diff(7).shift(1)
    d["bdi_delta_14"] = bdi.diff(14).shift(1)
    d["bunker_delta_1"] = bunker.diff(1).shift(1)
    d["bunker_delta_7"] = bunker.diff(7).shift(1)
    d["congestion_delta_1"] = congestion.diff(1).shift(1)
    d["demand_delta_7"] = demand.diff(7).shift(1)
    
    d["bdi_roll_mean_7"] = bdi.shift(1).rolling(7).mean()
    d["bdi_roll_mean_30"] = bdi.shift(1).rolling(30).mean()
    d["bunker_roll_mean_7"] = bunker.shift(1).rolling(7).mean()
    d["bdi_short_long"] = d["bdi_roll_mean_7"] - d["bdi_roll_mean_30"]
    
    # --- Calendar / seasonal features ---
    d["month"] = d["date"].dt.month
    d["day_of_year"] = d["date"].dt.dayofyear
    d["day_of_week"] = d["date"].dt.dayofweek
    d["week_of_year"] = d["date"].dt.isocalendar().week.astype(int)
    d["quarter"] = d["date"].dt.quarter
    d["doy_sin"] = np.sin(2 * np.pi * d["day_of_year"] / 365.25)
    d["doy_cos"] = np.cos(2 * np.pi * d["day_of_year"] / 365.25)
    
    # --- Regime interactions ---
    d["monsoon_x_congestion"] = d["is_monsoon"] * congestion.shift(1)
    d["cyclone_x_demand"] = d["is_cyclone_season"] * demand.shift(1)
    
    return d


def get_feature_cols(df_feat: pd.DataFrame) -> List[str]:
    exclude = ["date", "freight_rate_usd_per_t", "target", "future_rate",
               "bdi_index", "bunker_price_usd_per_t", "port_congestion_days",
               "demand_signal", "is_monsoon", "is_cyclone_season"]
    cols = [c for c in df_feat.columns if c not in exclude]
    return list(dict.fromkeys(cols))


# ============================================================
# MODEL TRAINING
# ============================================================

def train_models(df_model: pd.DataFrame, feature_cols: List[str]) -> tuple:
    """Train quantile regression models (XGBoost if available, else sklearn fallback). Returns models, predictions, metrics."""
    split_idx = len(df_model) - 90
    train, test = df_model.iloc[:split_idx], df_model.iloc[split_idx:]
    
    X_train, y_train = train[feature_cols], train["target"]
    X_test, y_test = test[feature_cols], test["target"]
    
    naive_pred = test["freight_rate_usd_per_t"].values
    naive_mae = mean_absolute_error(y_test, naive_pred)
    naive_mape = mean_absolute_percentage_error(y_test, naive_pred)
    
    quantiles = {"p10": 0.10, "p50": 0.50, "p90": 0.90}
    models = {}
    preds = {}
    train_preds = {}
    
    if HAS_XGBOOST:
        # Use XGBoost quantile regression
        for name, q in quantiles.items():
            model = xgb.XGBRegressor(
                objective="reg:quantileerror",
                quantile_alpha=q,
                n_estimators=500,
                max_depth=5,
                learning_rate=0.03,
                subsample=0.8,
                colsample_bytree=0.7,
                min_child_weight=3,
                reg_alpha=0.1,
                reg_lambda=1.0,
                random_state=42,
                tree_method="hist",
            )
            model.fit(X_train, y_train, verbose=False)
            models[name] = model
            preds[name] = model.predict(X_test)
            train_preds[name] = model.predict(X_train)
    else:
        # Fallback: sklearn GradientBoostingRegressor + QuantileRegressor
        # For P50, use GradientBoostingRegressor (mean regression)
        p50_model = GradientBoostingRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.03,
            subsample=0.8,
            random_state=42,
        )
        p50_model.fit(X_train, y_train)
        models["p50"] = p50_model
        preds["p50"] = p50_model.predict(X_test)
        train_preds["p50"] = p50_model.predict(X_train)
        
        # For P10/P90, use QuantileRegressor
        for name, q in [("p10", 0.10), ("p90", 0.90)]:
            model = QuantileRegressor(
                quantile=q,
                alpha=0.1,
                solver="highs",
            )
            model.fit(X_train, y_train)
            models[name] = model
            preds[name] = model.predict(X_test)
            train_preds[name] = model.predict(X_train)
    
    # --- Bias correction and quantile calibration ---
    p50_train_residuals = y_train.values - train_preds["p50"]
    bias_correction = p50_train_residuals.mean()
    residual_std = p50_train_residuals.std()
    
    # P50: bias correction
    preds["p50"] = preds["p50"] + bias_correction
    # Widen P10/P90 bands for better coverage
    preds["p10"] = preds["p10"] - residual_std * 0.5
    preds["p90"] = preds["p90"] + residual_std * 0.5
    
    # Metrics
    p50_mae = mean_absolute_error(y_test, preds["p50"])
    p50_mape = mean_absolute_percentage_error(y_test, preds["p50"])
    coverage = np.mean((y_test.values >= preds["p10"]) & (y_test.values <= preds["p90"]))
    model_directional = np.mean(((preds["p50"] > naive_pred) == (y_test.values > naive_pred)))
    
    improvement_pct = 0.0
    if naive_mae > 0:
        improvement_pct = (1 - p50_mae / naive_mae) * 100
    
    metrics = {
        "naive_mae": naive_mae, "naive_mape": naive_mape,
        "p50_mae": p50_mae, "p50_mape": p50_mape,
        "improvement_pct": improvement_pct,
        "coverage_pct": coverage * 100,
        "directional_acc": model_directional,
        "train_size": len(train), "test_size": len(test),
        "train_start": str(train["date"].min().date()),
        "train_end": str(train["date"].max().date()),
        "test_start": str(test["date"].min().date()),
        "test_end": str(test["date"].max().date()),
        "residual_std": residual_std,
        "bias_correction": bias_correction,
    }
    
    return models, metrics, residual_std, bias_correction


# ============================================================
# DECISION ENGINE
# ============================================================

def recommend(row: pd.Series, urgency_days: int = 7) -> tuple:
    """BUY NOW / WAIT recommendation from forecast distribution."""
    current = row["current_rate"]
    p10, p50, p90 = row["pred_p10"], row["pred_p50"], row["pred_p90"]
    
    expected_savings = current - p50
    spread = p90 - p10
    spread_pct = spread / current if current > 0 else 0
    downside_risk = p90 - current
    
    MIN_SAVINGS_TO_WAIT = 0.15
    STRONG_SIGNAL = 0.50
    HIGH_RISK_SPREAD_PCT = 0.10
    
    if urgency_days is not None and urgency_days <= 3:
        return ("BUY NOW", "High (deadline-driven)", 
                [f"Must move within {urgency_days} days."], 
                expected_savings, spread_pct)
    
    if spread_pct > HIGH_RISK_SPREAD_PCT:
        if expected_savings >= STRONG_SIGNAL and current > p50:
            return ("WAIT (high uncertainty, strong signal)", "Medium",
                    [f"Savings ${expected_savings:.2f}/t despite {spread_pct*100:.1f}% uncertainty."],
                    expected_savings, spread_pct)
        else:
            return ("BUY NOW (lock in amid uncertainty)", "Medium",
                    [f"Uncertainty {spread_pct*100:.1f}% — locking in current rate."],
                    expected_savings, spread_pct)
    
    if current <= p10:
        return ("BUY NOW", "High",
                [f"Current ${current:.2f} at/below forecast floor P10=${p10:.2f}."],
                expected_savings, spread_pct)
    elif expected_savings >= STRONG_SIGNAL and current > p50:
        return ("WAIT", "High",
                [f"Model predicts ${expected_savings:.2f}/t drop (P50=${p50:.2f} vs current ${current:.2f})."],
                expected_savings, spread_pct)
    elif expected_savings >= MIN_SAVINGS_TO_WAIT and current > p50:
        return ("WAIT", "Medium-High",
                [f"P50 ${p50:.2f} below current ${current:.2f} — ${expected_savings:.2f}/t expected savings."],
                expected_savings, spread_pct)
    elif expected_savings >= MIN_SAVINGS_TO_WAIT:
        return ("WAIT", "Medium",
                [f"Expected ${expected_savings:.2f}/t savings from waiting."],
                expected_savings, spread_pct)
    elif expected_savings > -MIN_SAVINGS_TO_WAIT:
        return ("BUY NOW", "Medium",
                [f"Only ${expected_savings:.2f}/t expected savings — below threshold."],
                expected_savings, spread_pct)
    else:
        return ("BUY NOW", "Medium-High",
                [f"Model expects rates to rise: P50 ${p50:.2f} vs current ${current:.2f}."],
                expected_savings, spread_pct)


def predict_today_internal(df_feat: pd.DataFrame, feature_cols: List[str], 
                          models: dict, residual_std: float, bias_correction: float) -> dict:
    """Generate today's forecast and recommendation."""
    latest = df_feat.dropna(subset=feature_cols).iloc[[-1]].copy()
    if len(latest) == 0:
        return {"error": "Not enough data for latest prediction"}
    
    row = latest.iloc[0]
    current_rate = row["freight_rate_usd_per_t"]
    X_latest = latest[feature_cols]
    
    p50_raw = models["p50"].predict(X_latest)[0]
    p10_raw = models["p10"].predict(X_latest)[0]
    p90_raw = models["p90"].predict(X_latest)[0]
    
    p50 = p50_raw + bias_correction
    p10 = p10_raw - residual_std * 0.5
    p90 = p90_raw + residual_std * 0.5
    
    fake_row = pd.Series({
        "date": row["date"], "current_rate": current_rate,
        "pred_p10": p10, "pred_p50": p50, "pred_p90": p90,
        "actual_future_rate": np.nan, "naive_pred": current_rate,
    })
    decision, confidence, reasons, savings, spread_pct = recommend(fake_row, urgency_days=7)
    
    return {
        "date": row["date"].date().isoformat(),
        "current_rate": round(current_rate, 2),
        "forecast_p10": round(p10, 2),
        "forecast_p50": round(p50, 2),
        "forecast_p90": round(p90, 2),
        "expected_change": round(current_rate - p50, 2),
        "uncertainty_pct": round(spread_pct * 100, 1),
        "recommendation": decision,
        "confidence": confidence,
        "reason": " | ".join(reasons),
    }


# ============================================================
# DATA GENERATION (synthetic for demo)
# ============================================================

def generate_synthetic_freight_data(n_days: int = 730) -> pd.DataFrame:
    """Generate realistic synthetic freight data for training."""
    np.random.seed(42)
    end_date = date.today()
    start_date = end_date - timedelta(days=n_days)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    
    # Base components
    base_rate = 16.5
    trend = np.linspace(0, 0.15, len(dates))
    yearly = 2.0 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25)
    quarterly = 0.5 * np.sin(2 * np.pi * np.arange(len(dates)) / (365.25/4))
    cycle = 0.8 * np.sin(2 * np.pi * np.arange(len(dates)) / (365.25 * 2.5))
    noise = np.cumsum(np.random.normal(0, 0.5, len(dates)))
    noise = (noise - noise.mean()) / (noise.std() + 1e-6) * 1.0
    
    freight_rate = base_rate * (1 + trend + yearly + quarterly + cycle + noise / 10)
    freight_rate = np.clip(freight_rate, 6.0, 45.0)
    
    # BDI (correlated with freight rate)
    bdi = 1800 + (freight_rate - base_rate) * 100 + np.random.normal(0, 50, len(dates))
    bdi = np.clip(bdi, 500, 4000)
    
    # Bunker price
    bunker = 500 + np.cumsum(np.random.normal(0, 2, len(dates)))
    bunker = np.clip(bunker, 200, 1200)
    
    # Port congestion
    congestion = 0.5 + 0.3 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25) + np.random.normal(0, 0.1, len(dates))
    congestion = np.clip(congestion, 0, 3)
    
    # Demand signal
    demand = 100 + 20 * np.sin(2 * np.pi * np.arange(len(dates)) / 365.25) + np.random.normal(0, 5, len(dates))
    demand = np.clip(demand, 50, 200)
    
    # Seasonal flags
    months = np.array([d.month for d in dates])
    is_monsoon = ((months >= 6) & (months <= 9)).astype(int)
    is_cyclone = ((months >= 5) & (months <= 11)).astype(int)
    
    df = pd.DataFrame({
        "date": dates,
        "freight_rate_usd_per_t": freight_rate,
        "bdi_index": bdi,
        "bunker_price_usd_per_t": bunker,
        "port_congestion_days": congestion,
        "demand_signal": demand,
        "is_monsoon": is_monsoon,
        "is_cyclone_season": is_cyclone,
    })
    return df


# ============================================================
# MAIN FORECAST ENGINE
# ============================================================

_model_bundle = None

def _get_or_train_model() -> tuple:
    """Load saved model or train new one."""
    global _model_bundle
    
    if _model_bundle is not None:
        return (_model_bundle["models"], _model_bundle["feature_cols"], 
                _model_bundle["residual_std"], _model_bundle["bias_correction"])
    
    # Try load saved model
    if MODEL_BUNDLE_PATH.exists():
        try:
            bundle = joblib.load(MODEL_BUNDLE_PATH)
            _model_bundle = bundle
            return (bundle["models"], bundle["feature_cols"], 
                    bundle["residual_std"], bundle["bias_correction"])
        except Exception:
            pass
    
    # Generate synthetic data and train
    print("[forecast] Training XGBoost quantile models...")
    df = generate_synthetic_freight_data(730)
    df_feat = add_features(df)
    df_feat["target"] = df_feat["freight_rate_usd_per_t"].shift(-HORIZON)
    feature_cols = get_feature_cols(df_feat)
    df_model = df_feat.dropna(subset=feature_cols + ["target"]).reset_index(drop=True)
    
    models, metrics, residual_std, bias_correction = train_models(df_model, feature_cols)
    
    # Save bundle
    bundle = {
        "models": models, "feature_cols": feature_cols,
        "horizon": HORIZON, "residual_std": residual_std,
        "bias_correction": bias_correction, "metrics": metrics,
    }
    joblib.dump(bundle, MODEL_BUNDLE_PATH)
    _model_bundle = bundle
    
    print(f"[forecast] Model trained: MAE={metrics['p50_mae']:.3f}, Coverage={metrics['coverage_pct']:.1f}%")
    return models, feature_cols, residual_std, bias_correction


def generate_forecast(days: int = 30) -> pd.DataFrame:
    """
    Generate probabilistic freight rate forecast using quantile regression models.
    Returns DataFrame with date, base_forecast, lower_bound, upper_bound.
    """
    models, feature_cols, residual_std, bias_correction = _get_or_train_model()
    
    # Generate synthetic data covering history + forecast horizon
    # Need enough history for lagged features (max lag = 30) + forecast days
    hist_days = 730
    end_date = date.today() + timedelta(days=days)  # Extend into future
    start_date = end_date - timedelta(days=hist_days + days)
    df = generate_synthetic_freight_data_range(start_date, end_date)
    df_feat = add_features(df)
    feature_cols = get_feature_cols(df_feat)
    
    records = []
    start_forecast = date.today()
    
    for i in range(days):
        current_date = start_forecast + timedelta(days=i)
        
        # Get the row for this date
        future_row = df_feat[df_feat["date"] == pd.Timestamp(current_date)]
        if len(future_row) == 0:
            continue
            
        future_row = future_row.dropna(subset=feature_cols)
        if len(future_row) == 0:
            continue
            
        X_latest = future_row[feature_cols]
        
        p50_raw = models["p50"].predict(X_latest)[0]
        p10_raw = models["p10"].predict(X_latest)[0]
        p90_raw = models["p90"].predict(X_latest)[0]
        
        p50 = p50_raw + bias_correction
        p10 = p10_raw - residual_std * 0.5
        p90 = p90_raw + residual_std * 0.5
        
        p50 = max(6.0, min(45.0, p50))
        p10 = max(4.0, min(50.0, p10))
        p90 = max(4.0, min(50.0, p90))
        
        records.append({
            "date": current_date.isoformat(),
            "base_forecast": round(p50, 1),
            "lower_bound": round(p10, 1),
            "upper_bound": round(p90, 1),
        })
    
    return pd.DataFrame(records)


def generate_synthetic_freight_data_range(start_date: date, end_date: date) -> pd.DataFrame:
    """Generate realistic synthetic freight data for a specific date range."""
    np.random.seed(42)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    n = len(dates)
    
    # Base components
    base_rate = 16.5
    trend = np.linspace(0, 0.15, n)
    yearly = 2.0 * np.sin(2 * np.pi * np.arange(n) / 365.25)
    quarterly = 0.5 * np.sin(2 * np.pi * np.arange(n) / (365.25/4))
    cycle = 0.8 * np.sin(2 * np.pi * np.arange(n) / (365.25 * 2.5))
    noise = np.cumsum(np.random.normal(0, 0.5, n))
    noise = (noise - noise.mean()) / (noise.std() + 1e-6) * 1.0
    
    freight_rate = base_rate * (1 + trend + yearly + quarterly + cycle + noise / 10)
    freight_rate = np.clip(freight_rate, 6.0, 45.0)
    
    # BDI (correlated with freight rate)
    bdi = 1800 + (freight_rate - base_rate) * 100 + np.random.normal(0, 50, n)
    bdi = np.clip(bdi, 500, 4000)
    
    # Bunker price
    bunker = 500 + np.cumsum(np.random.normal(0, 2, n))
    bunker = np.clip(bunker, 200, 1200)
    
    # Port congestion
    congestion = 0.5 + 0.3 * np.sin(2 * np.pi * np.arange(n) / 365.25) + np.random.normal(0, 0.1, n)
    congestion = np.clip(congestion, 0, 3)
    
    # Demand signal
    demand = 100 + 20 * np.sin(2 * np.pi * np.arange(n) / 365.25) + np.random.normal(0, 5, n)
    demand = np.clip(demand, 50, 200)
    
    # Seasonal flags
    months = np.array([d.month for d in dates])
    is_monsoon = ((months >= 6) & (months <= 9)).astype(int)
    is_cyclone = ((months >= 5) & (months <= 11)).astype(int)
    
    df = pd.DataFrame({
        "date": dates,
        "freight_rate_usd_per_t": freight_rate,
        "bdi_index": bdi,
        "bunker_price_usd_per_t": bunker,
        "port_congestion_days": congestion,
        "demand_signal": demand,
        "is_monsoon": is_monsoon,
        "is_cyclone_season": is_cyclone,
    })
    return df


def get_model_status() -> dict:
    """Get status of forecasting models."""
    models, feature_cols, residual_std, bias_correction = _get_or_train_model()
    return {
        "model_type": "XGBoost Quantile Regression (P10/P50/P90)",
        "features": len(feature_cols),
        "horizon_days": HORIZON,
        "model_path": str(MODEL_BUNDLE_PATH),
        "model_exists": MODEL_BUNDLE_PATH.exists(),
        "residual_std": residual_std,
        "bias_correction": bias_correction,
    }


def get_today_forecast() -> dict:
    """Get forecast for today with decision recommendation."""
    models, feature_cols, residual_std, bias_correction = _get_or_train_model()
    df = generate_synthetic_freight_data(730)
    df_feat = add_features(df)
    return predict_today_internal(df_feat, feature_cols, models, residual_std, bias_correction)


def retrain_models() -> dict:
    """Force retrain all models with latest data."""
    global _model_bundle
    _model_bundle = None
    if MODEL_BUNDLE_PATH.exists():
        MODEL_BUNDLE_PATH.unlink()
    models, feature_cols, residual_std, bias_correction = _get_or_train_model()
    return get_model_status()


if __name__ == "__main__":
    # Test the engine
    print("Model Status:", get_model_status())
    print("\nGenerating 30-day forecast...")
    df = generate_forecast(30)
    print(df.head(10))
    print(f"\nShape: {df.shape}")
    print(f"Range: {df['base_forecast'].min():.1f} - {df['base_forecast'].max():.1f} $/t")
    print("\nToday's forecast:", get_today_forecast())
"""
Freight Forecasting Pipeline — Single-Model Prediction Engine

COMBINES ALL STAGES (except synthetic data generation) into ONE script:
  1. Loads real or existing freight_data.csv
  2. Generates 56+ engineered features (lags, rolling, momentum, exog, seasonal)
  3. Trains XGBoost quantile models (P10/P50/P90) — 7-day-ahead forecast
  4. Calibrates quantile intervals using training residuals (target ~80% coverage)
  5. Produces point forecast + prediction intervals for today
  6. Feeds forecast into decision engine (BUY NOW / WAIT recommendation)
  7. Backtests on historical test set (last 90 days)
  8. Saves everything: model artifacts, forecasts, decisions, backtest results

USAGE:
  python 06_predict.py             # full run: train + predict + backtest
  python 06_predict.py --predict   # predict for TODAY using saved model
  python 06_predict.py --evaluate  # re-evaluate saved backtest results

Requires: freight_data.csv in the same folder.
"""
import argparse
import sys
import os
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error

HERE = os.path.dirname(os.path.abspath(__file__))
HORIZON = 7
DATA_PATH = os.path.join(HERE, "freight_data.csv")
MODEL_PATH = os.path.join(HERE, "model_bundle.joblib")


# ============================================================
# FEATURE ENGINEERING
# ============================================================
def add_features(d):
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


def get_feature_cols(df_feat):
    exclude = ["date", "freight_rate_usd_per_t", "target", "future_rate",
               "bdi_index", "bunker_price_usd_per_t", "port_congestion_days",
               "demand_signal", "is_monsoon", "is_cyclone_season"]
    cols = [c for c in df_feat.columns if c not in exclude]
    return list(dict.fromkeys(cols))


# ============================================================
# MODEL TRAINING
# ============================================================
def train_models(df_model, feature_cols):
    """Train XGBoost P10/P50/P90 models. Returns models, predictions, metrics."""
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

    metrics = {
        "naive_mae": naive_mae, "naive_mape": naive_mape,
        "p50_mae": p50_mae, "p50_mape": p50_mape,
        "improvement_pct": (1 - p50_mae / naive_mae) * 100,
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

    # Forecast results DataFrame
    result = test[["date", "freight_rate_usd_per_t"]].copy()
    result = result.rename(columns={"freight_rate_usd_per_t": "current_rate"})
    result["actual_future_rate"] = y_test.values
    result["pred_p10"] = preds["p10"]
    result["pred_p50"] = preds["p50"]
    result["pred_p90"] = preds["p90"]
    result["naive_pred"] = naive_pred
    result["pred_delta_p50"] = preds["p50"] - naive_pred

    return models, result, metrics, residual_std, bias_correction


# ============================================================
# DECISION ENGINE
# ============================================================
def recommend(row, urgency_days=7):
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
        return "BUY NOW", "High (deadline-driven)", [f"Must move within {urgency_days} days."], expected_savings, spread_pct

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


# ============================================================
# PREDICT TODAY
# ============================================================
def predict_today_internal(df_feat, feature_cols, models, residual_std, bias_correction):
    """Generate today's forecast and recommendation."""
    latest = df_feat.dropna(subset=feature_cols).iloc[[-1]].copy()
    if len(latest) == 0:
        print("  Not enough data for latest prediction (need more history).")
        return

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

    print(f"  Date:          {row['date'].date()}")
    print(f"  Current rate:  ${current_rate:.2f}/t")
    print(f"  Forecast (P50): ${p50:.2f}/t  (7-day median)")
    print(f"  Range (P10-P90): ${p10:.2f} - ${p90:.2f}")
    print(f"  Expected change: ${current_rate - p50:+.2f}/t")
    print(f"  Uncertainty:   {spread_pct*100:.1f}% of rate")
    print(f"  Recommendation: {decision}")
    print(f"  Confidence:     {confidence}")
    print(f"  Reason: {reasons[0] if reasons else 'N/A'}")

    today_pred = pd.DataFrame([{
        "date": row["date"], "current_rate": current_rate,
        "forecast_p10": p10, "forecast_p50": p50, "forecast_p90": p90,
        "expected_change": current_rate - p50,
        "uncertainty_pct": round(spread_pct * 100, 1),
        "recommendation": decision, "confidence": confidence,
        "reason": " | ".join(reasons),
    }])
    today_pred.to_csv(os.path.join(HERE, "predictions_today.csv"), index=False)
    print(f"\n  Saved: predictions_today.csv")


# ============================================================
# MAIN FUNCTIONS
# ============================================================
def full_run():
    """Full pipeline: load data, train, predict, backtest, save everything."""
    if not os.path.exists(DATA_PATH):
        print(f"ERROR: {DATA_PATH} not found. Run 01_generate_data.py first.")
        sys.exit(1)

    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    print(f"Loaded {len(df)} rows | Date range: {df['date'].min().date()} to {df['date'].max().date()}")

    # Feature engineering
    df_feat = add_features(df)
    df_feat["target"] = df_feat["freight_rate_usd_per_t"].shift(-HORIZON)
    feature_cols = get_feature_cols(df_feat)
    df_model = df_feat.dropna(subset=feature_cols + ["target"]).reset_index(drop=True)
    print(f"Feature-engineered: {len(df_model)} usable rows | {len(feature_cols)} features")

    # Train
    models, forecast_df, metrics, residual_std, bias_correction = train_models(df_model, feature_cols)

    # Save model bundle
    bundle = {"models": models, "feature_cols": feature_cols,
              "horizon": HORIZON, "residual_std": residual_std,
              "bias_correction": bias_correction}
    joblib.dump(bundle, MODEL_PATH)

    # Decision engine backtest
    decisions = []
    for _, row in forecast_df.iterrows():
        dec, conf, reasons, savings, spread_pct = recommend(row)
        decisions.append({
            "date": row["date"], "current_rate": row["current_rate"],
            "pred_p10": row["pred_p10"], "pred_p50": row["pred_p50"], "pred_p90": row["pred_p90"],
            "actual_future_rate": row["actual_future_rate"],
            "decision": dec, "confidence": conf,
            "expected_savings_per_t": round(savings, 2),
            "uncertainty_pct": round(spread_pct * 100, 1),
            "reasons": " | ".join(reasons),
        })

    out = pd.DataFrame(decisions)
    out.to_csv(os.path.join(HERE, "decisions.csv"), index=False)
    forecast_df.to_csv(os.path.join(HERE, "forecast_results.csv"), index=False)

    # Backtest
    out["strategy_cost"] = np.where(out["decision"].str.contains("BUY NOW"),
                                    out["current_rate"], out["actual_future_rate"])
    out["naive_cost"] = out["current_rate"]
    total_strategy = out["strategy_cost"].sum()
    total_naive = out["naive_cost"].sum()
    total_wait = out["actual_future_rate"].sum()
    savings = total_naive - total_strategy
    savings_per_t = savings / len(out)

    wait_df = out[out["decision"].str.contains("WAIT", case=False)]
    buy_df = out[out["decision"].str.contains("BUY NOW", case=False)]
    wait_correct = (wait_df["actual_future_rate"] < wait_df["current_rate"]).sum() if len(wait_df) > 0 else 0
    buy_correct = (buy_df["actual_future_rate"] >= buy_df["current_rate"]).sum() if len(buy_df) > 0 else 0

    # Print report
    print("\n" + "=" * 70)
    print("FREIGHT FORECASTING PIPELINE — COMBINED MODEL")
    print("=" * 70)
    print(f"\n--- Model Training ---")
    print(f"Training data: {metrics['train_size']} rows | {metrics['train_start']} to {metrics['train_end']}")
    print(f"Test data:     {metrics['test_size']} rows | {metrics['test_start']} to {metrics['test_end']}")
    print(f"Features:      {len(feature_cols)}")
    print(f"Residual std:  {metrics['residual_std']:.3f}")
    print(f"Bias correction: {metrics['bias_correction']:.3f}")
    print(f"\nForecast horizon: {HORIZON} days ahead")
    print(f"Naive baseline  -> MAE: {metrics['naive_mae']:.3f} $/t | MAPE: {metrics['naive_mape']*100:.2f}%")
    print(f"XGB P50 model   -> MAE: {metrics['p50_mae']:.3f} $/t | MAPE: {metrics['p50_mape']*100:.2f}%")
    print(f"Improvement:     {metrics['improvement_pct']:.1f}% over naive")
    print(f"P10-P90 coverage: {metrics['coverage_pct']:.1f}% (target ~80%)")
    print(f"Directional accuracy: {metrics['directional_acc']*100:.1f}%")

    print(f"\n--- Decision Engine Backtest ({len(out)} days) ---")
    print(f"Decision breakdown:")
    print(out['decision'].value_counts().to_string())
    print(f"\nStrategy comparison:")
    print(f"  Naive (always buy now):  ${total_naive:,.2f} | ${total_naive/len(out):.3f}/t avg")
    print(f"  Decision engine:         ${total_strategy:,.2f} | ${total_strategy/len(out):.3f}/t avg")
    print(f"  Always wait (oracle):    ${total_wait:,.2f} | ${total_wait/len(out):.3f}/t avg")
    print(f"\nSavings vs naive: ${savings:.2f} total | ${savings_per_t:.3f}/t avg | {savings/total_naive*100:.2f}%")
    print(f"WAIT precision: {wait_correct}/{len(wait_df)} = {wait_correct/len(wait_df)*100:.0f}%" if len(wait_df) > 0 else "No WAIT days")
    print(f"BUY precision:  {buy_correct}/{len(buy_df)} = {buy_correct/len(buy_df)*100:.0f}%" if len(buy_df) > 0 else "No BUY days")
    print("=" * 70)

    print(f"\nSample forecasts:")
    print(out[["date", "current_rate", "pred_p50", "pred_p90", "actual_future_rate", "decision", "confidence"]].head(5).to_string(index=False))

    # Save report
    import io
    buf = io.StringIO()
    buf.write("=" * 70 + "\n")
    buf.write("FREIGHT FORECASTING PIPELINE -- COMBINED MODEL REPORT\n")
    buf.write("=" * 70 + "\n\n")
    buf.write(f"Training data: {metrics['train_size']} rows | {metrics['train_start']} to {metrics['train_end']}\n")
    buf.write(f"Test data:     {metrics['test_size']} rows | {metrics['test_start']} to {metrics['test_end']}\n")
    buf.write(f"Features:      {len(feature_cols)}\n\n")
    buf.write(f"Naive MAE: {metrics['naive_mae']:.3f} | XGB P50 MAE: {metrics['p50_mae']:.3f}\n")
    buf.write(f"Improvement: {metrics['improvement_pct']:.1f}%\n")
    buf.write(f"Coverage: {metrics['coverage_pct']:.1f}% | Directional: {metrics['directional_acc']*100:.1f}%\n\n")
    buf.write(f"Strategy: Naive=${total_naive:.2f}, Engine=${total_strategy:.2f}, AlwaysWait=${total_wait:.2f}\n")
    buf.write(f"Savings vs naive: ${savings:.2f} (${savings_per_t:.3f}/t, {savings/total_naive*100:.2f}%)\n")
    buf.write(f"WAIT precision: {wait_correct}/{len(wait_df)} = {wait_correct/len(wait_df)*100:.0f}%\n")
    buf.write(f"BUY precision:  {buy_correct}/{len(buy_df)} = {buy_correct/len(buy_df)*100:.0f}%\n")
    with open(os.path.join(HERE, "backtest_report.txt"), "w") as f:
        f.write(buf.getvalue())

    # Predict today
    print(f"\n--- Today's Prediction ---")
    predict_today_internal(df_feat, feature_cols, models, residual_std, bias_correction)


def predict_today():
    """Predict for today using saved model."""
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: {MODEL_PATH} not found. Run 'python 06_predict.py' first.")
        sys.exit(1)

    bundle = joblib.load(MODEL_PATH)
    models = bundle["models"]
    feature_cols = bundle["feature_cols"]
    residual_std = bundle["residual_std"]
    bias_correction = bundle["bias_correction"]

    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    df = df.sort_values("date").reset_index(drop=True)
    df_feat = add_features(df)
    predict_today_internal(df_feat, feature_cols, models, residual_std, bias_correction)


def evaluate_saved():
    """Re-evaluate saved backtest results."""
    fc_path = os.path.join(HERE, "forecast_results.csv")
    dec_path = os.path.join(HERE, "decisions.csv")
    if not os.path.exists(fc_path):
        print("forecast_results.csv not found — run without --evaluate first.")
        return
    fc = pd.read_csv(fc_path, parse_dates=["date"])
    if not os.path.exists(dec_path):
        print("decisions.csv not found — run without --evaluate first.")
        return
    dec = pd.read_csv(dec_path)
    print(f"\nSaved forecasts: {len(fc)} rows")
    print(f"Saved decisions: {len(dec)} rows")
    p50_mae = np.mean(np.abs(fc["pred_p50"] - fc["actual_future_rate"]))
    coverage = np.mean((fc["actual_future_rate"] >= fc["pred_p10"]) & (fc["actual_future_rate"] <= fc["pred_p90"]))
    print(f"P50 MAE: {p50_mae:.3f} | Coverage: {coverage*100:.1f}%")
    print(f"\nDecision breakdown:")
    print(dec['decision'].value_counts().to_string())


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Freight forecasting + decision engine (combined)")
    parser.add_argument("--predict", action="store_true", help="Predict for today using saved model")
    parser.add_argument("--evaluate", action="store_true", help="Re-evaluate saved backtest results")
    args = parser.parse_args()

    if args.predict:
        predict_today()
    elif args.evaluate:
        evaluate_saved()
    else:
        full_run()

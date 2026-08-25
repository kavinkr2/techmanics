"""
Stage 2 - LightGBM global model via MLForecast (M3 ladder).
Direct multi-horizon forecasting with quantile objective (P10/P50/P90),
using exogenous drivers (BDI, bunker price, port congestion, seasonality).

Run locally:
    pip install -r requirements.txt
    python 05_stage2_lightgbm.py

Expects freight_data.csv in the same folder (from 01_generate_data.py,
or your own real dataset in the same column format).
"""
import pandas as pd
import numpy as np
from mlforecast import MLForecast
from mlforecast.lag_transforms import RollingMean, RollingStd
from lightgbm import LGBMRegressor
from utilsforecast.losses import mase, smape

import os

DATA_PATH = os.path.join(os.path.dirname(__file__), "freight_data.csv")

HORIZON = 7
SEASON_LENGTH = 7
N_WINDOWS = 12
STEP_SIZE = 7
QUANTILES = [0.1, 0.5, 0.9]

# ---------- Load data ----------
df = pd.read_csv(DATA_PATH, parse_dates=["date"])
mlf_df = df.rename(columns={"date": "ds", "freight_rate_usd_per_t": "y"}).copy()
mlf_df["unique_id"] = "ECI_PANAMAX"

exog_cols = ["bdi_index", "bunker_price_usd_per_t", "port_congestion_days",
             "demand_signal", "is_monsoon", "is_cyclone_season"]
cols = ["unique_id", "ds", "y"] + exog_cols
mlf_df = mlf_df[cols]

print(f"Loaded {len(mlf_df)} rows for series '{mlf_df['unique_id'].iloc[0]}'")
print(f"Exogenous features: {exog_cols}")

# ---------- Build one LightGBM model per quantile ----------
# MLForecast fits a separate model per target when you pass multiple models;
# here we train 3 LGBMRegressors with quantile objective (pinball loss) at
# alpha=0.1/0.5/0.9, all sharing the same engineered features.
models = {}
for q in QUANTILES:
    name = f"lgbm_q{int(q*100)}"
    models[name] = LGBMRegressor(
        objective="quantile",
        alpha=q,
        n_estimators=300,
        learning_rate=0.05,
        max_depth=5,
        num_leaves=31,
        subsample=0.8,
        colsample_bytree=0.8,
        verbosity=-1,
        random_state=42,
    )

fcst = MLForecast(
    models=models,
    freq="D",
    lags=[1, 3, 7, 14, 30],
    lag_transforms={
        1: [RollingMean(window_size=7), RollingStd(window_size=7), RollingMean(window_size=14)],
    },
    date_features=["dayofweek", "month", "dayofyear"],
)

print(f"\nRunning rolling-origin cross-validation: {N_WINDOWS} folds, "
      f"horizon={HORIZON}d, step={STEP_SIZE}d")
print("Exogenous features are carried forward as 'known future' values "
      "(realistic: bunker price / congestion for the next 7 days would need "
      "their own forecast in production - here we use actuals as an "
      "upper-bound-accuracy proxy, flagged clearly in the README).\n")

cv_df = fcst.cross_validation(
    df=mlf_df,
    h=HORIZON,
    n_windows=N_WINDOWS,
    step_size=STEP_SIZE,
    static_features=[],
)

cv_df.to_csv(os.path.join(os.path.dirname(__file__), "stage2_cv_results.csv"), index=False)
print("Saved: stage2_cv_results.csv")

# ---------- Evaluate P50 model against Stage 1 baselines ----------
model_names = list(models.keys())
p50_name = "lgbm_q50"

mase_scores = mase(df=cv_df, models=model_names, seasonality=SEASON_LENGTH, train_df=mlf_df)
smape_scores = smape(df=cv_df, models=model_names)

# Coverage check: how often does actual fall within [P10, P90]?
coverage = ((cv_df["y"] >= cv_df["lgbm_q10"]) & (cv_df["y"] <= cv_df["lgbm_q90"])).mean()

leaderboard = pd.DataFrame({
    "model": model_names,
    "MASE": [mase_scores[m].mean() for m in model_names],
    "sMAPE_%": [smape_scores[m].mean() * 100 for m in model_names],
})
leaderboard = leaderboard.sort_values("MASE").reset_index(drop=True)

print("\n" + "=" * 70)
print("STAGE 2 LEADERBOARD - LightGBM quantile models (MLForecast)")
print("=" * 70)
print(leaderboard.to_string(index=False))
print(f"\nP10-P90 empirical coverage (target ~80%): {coverage*100:.1f}%")
print("=" * 70)

# ---------- Compare P50 vs Stage 1 best ----------
baseline_path = os.path.join(os.path.dirname(__file__), "baseline_leaderboard.csv")
if os.path.exists(baseline_path):
    baseline_lb = pd.read_csv(baseline_path)
    best_stage1 = baseline_lb.iloc[0]
    p50_mase = leaderboard.loc[leaderboard["model"] == p50_name, "MASE"].values[0]
    print(f"\nStage 1 best ({best_stage1['model']}): MASE = {best_stage1['MASE']:.4f}")
    print(f"Stage 2 (LightGBM P50):       MASE = {p50_mase:.4f}")
    if p50_mase < best_stage1["MASE"]:
        improvement = (1 - p50_mase / best_stage1["MASE"]) * 100
        print(f"-> LightGBM beats best Stage 1 baseline by {improvement:.1f}%")
    else:
        print("-> LightGBM did NOT beat the best Stage 1 baseline on this data. "
              "Worth investigating: more features, more history, or the exogenous "
              "drivers not carrying real signal in this dataset.")
else:
    print("\n(baseline_leaderboard.csv not found - run 04_stage1_baselines.py first "
          "to get the Stage 1 comparison numbers.)")

leaderboard.to_csv(os.path.join(os.path.dirname(__file__), "stage2_leaderboard.csv"), index=False)
print("\nSaved: stage2_leaderboard.csv")

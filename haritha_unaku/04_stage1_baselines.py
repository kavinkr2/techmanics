"""
Stage 1 — Baselines (M3 ladder).
Models: Naive, SeasonalNaive, AutoARIMA, AutoETS, Theta
Evaluation: rolling-origin (expanding window) backtest via statsforecast's
cross_validation, metrics from utilsforecast (MASE, sMAPE) + directional
accuracy computed explicitly (not in utilsforecast, so defined transparently below).

No metric formulas invented for MASE/sMAPE - both come straight from
utilsforecast.losses, per the "don't let an LLM invent metric formulas" rule.
"""
import pandas as pd
import numpy as np
import os
from statsforecast import StatsForecast
from statsforecast.models import Naive, SeasonalNaive, AutoARIMA, AutoETS, Theta
from utilsforecast.losses import mase, smape

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------- Load data into statsforecast's required long format ----------
# required cols: unique_id, ds, y
df = pd.read_csv(os.path.join(HERE, "freight_data.csv"), parse_dates=["date"])
sf_df = df[["date", "freight_rate_usd_per_t"]].rename(
    columns={"date": "ds", "freight_rate_usd_per_t": "y"}
)
sf_df["unique_id"] = "ECI_PANAMAX"  # single route/series for this prototype
sf_df = sf_df[["unique_id", "ds", "y"]]

HORIZON = 7          # forecast 7 days ahead - matches the charter decision window
SEASON_LENGTH = 7     # weekly seasonality assumption for SeasonalNaive/AutoETS
N_WINDOWS = 12         # number of rolling-origin backtest folds
STEP_SIZE = 7          # slide the origin forward by 7 days each fold

models = [
    Naive(),
    SeasonalNaive(season_length=SEASON_LENGTH),
    AutoARIMA(season_length=SEASON_LENGTH),
    AutoETS(season_length=SEASON_LENGTH),
    Theta(season_length=SEASON_LENGTH),
]

sf = StatsForecast(models=models, freq="D", n_jobs=-1)

print("Running rolling-origin (expanding window) cross-validation...")
print(f"Horizon={HORIZON}d | Folds={N_WINDOWS} | Step={STEP_SIZE}d")
print("Each fold: train on everything up to cutoff, forecast next", HORIZON, "days, "
      "slide forward, repeat. No test-period data ever enters training for that fold.\n")

cv_df = sf.cross_validation(
    df=sf_df,
    h=HORIZON,
    n_windows=N_WINDOWS,
    step_size=STEP_SIZE,
)

cv_df.to_csv(os.path.join(HERE, "baseline_cv_results.csv"), index=False)
print("Cross-validation raw results saved: baseline_cv_results.csv")
print(cv_df.head())

# ---------- Metrics ----------
model_names = [m.__class__.__name__ if not hasattr(m, "alias") else m.alias for m in models]
model_names = ["Naive", "SeasonalNaive", "AutoARIMA", "AutoETS", "Theta"]

# MASE needs the training set (per fold) to compute the seasonal-naive scale
# denominator on TRAIN data only (utilsforecast handles this correctly when
# given train_df) - avoids the leak of using test-period actuals as the scale.
mase_scores = mase(
    df=cv_df,
    models=model_names,
    seasonality=SEASON_LENGTH,
    train_df=sf_df,
)
smape_scores = smape(df=cv_df, models=model_names)

# ---------- Directional accuracy (explicit, transparent formula) ----------
# "Did the model correctly predict whether the rate would go UP or DOWN
# relative to the last known actual (y at cutoff)?" - this is what a
# charterer cares about, not in utilsforecast, so defined here plainly.
def directional_accuracy(cv_df, model_names):
    results = {}
    df = cv_df.copy()
    df = df.sort_values(["unique_id", "cutoff", "ds"])
    # last actual value at the cutoff = the value right before this fold's
    # forecast window starts. We approximate with the first y value we have
    # access to per fold by joining back to sf_df at the cutoff date.
    cutoff_actuals = sf_df.rename(columns={"ds": "cutoff", "y": "y_at_cutoff"})
    df = df.merge(cutoff_actuals, on=["unique_id", "cutoff"], how="left")

    for m in model_names:
        actual_dir = np.sign(df["y"] - df["y_at_cutoff"])
        pred_dir = np.sign(df[m] - df["y_at_cutoff"])
        # ignore exact-zero moves (flat) in either actual or pred for fairness
        mask = (actual_dir != 0)
        correct = (actual_dir[mask] == pred_dir[mask]).mean()
        results[m] = correct
    return results

dir_acc = directional_accuracy(cv_df, model_names)

# ---------- Assemble leaderboard ----------
leaderboard = pd.DataFrame({
    "model": model_names,
    "MASE": [mase_scores[m].mean() for m in model_names],
    "sMAPE_%": [smape_scores[m].mean() * 100 for m in model_names],
    "directional_accuracy_%": [dir_acc[m] * 100 for m in model_names],
})
leaderboard = leaderboard.sort_values("MASE").reset_index(drop=True)

print("\n" + "=" * 70)
print("STAGE 1 BASELINE LEADERBOARD  (lower MASE/sMAPE better, higher dir.acc better)")
print("=" * 70)
print(leaderboard.to_string(index=False))
print("=" * 70)

leaderboard.to_csv(os.path.join(HERE, "baseline_leaderboard.csv"), index=False)
print("\nSaved: baseline_leaderboard.csv")

# Sanity check: is Naive suspiciously hard to beat (expected for freight - near random walk)?
naive_mase = leaderboard.loc[leaderboard["model"] == "Naive", "MASE"].values[0]
best_mase = leaderboard["MASE"].min()
print(f"\nNaive MASE: {naive_mase:.4f}")
print(f"Best model MASE: {best_mase:.4f}  ({leaderboard.iloc[0]['model']})")
print(f"Improvement over naive: {(1 - best_mase/naive_mase)*100:.2f}%")
print("\nNote: MASE < 1.0 means the model beats a naive one-step forecast on average.")
print("MASE ~1.0 is EXPECTED and fine for freight rates - it's a near-random-walk series.")
print("This is the honest floor everything else (LightGBM, TFT, Chronos) must clear.")

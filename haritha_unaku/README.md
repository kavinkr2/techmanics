# Freight Forecasting Pipeline — Local Setup

Runs entirely on CPU, no paid APIs. Tested with Python 3.11/3.12.

## Quick Start (combined model)

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Generate synthetic data (or replace with your own freight_data.csv)
python 01_generate_data.py

# Run the combined prediction engine (train + backtest + today's forecast)
python 06_predict.py

# Later, just predict today using the saved model:
python 06_predict.py --predict

# Re-evaluate saved backtest:
python 06_predict.py --evaluate
```

## Pipeline architecture

```
01_generate_data.py   → freight_data.csv (synthetic data generator)
                           │
06_predict.py ────────────┘
  ├── Feature engineering (56 features)
  ├── XGBoost quantile training (P10/P50/P90)
  ├── Quantile calibration (residual-based widening)
  ├── Bias correction
  ├── Decision engine (BUY NOW / WAIT)
  ├── Backtest (90-day rolling-origin test)
  └── Today's prediction + recommendation
```

### Output files

| File | Description |
|---|---|
| `predictions_today.csv` | Today's forecast: P10/P50/P90, recommendation, reasoning |
| `forecast_results.csv` | 90-day backtest forecasts with actuals |
| `decisions.csv` | 90-day backtest: BUY NOW/WAIT decisions with confidence |
| `model_bundle.joblib` | Saved XGBoost models + feature config + calibration params |
| `backtest_report.txt` | Saved backtest summary |

## Stage 1: Baseline setup (optional, for comparison)

```bash
python 04_stage1_baselines.py     # M3 Stage 1: Naive/AutoARIMA/AutoETS/Theta baselines
python 05_stage2_lightgbm.py      # M3 Stage 2: LightGBM quantile models
```

## What `06_predict.py` does

### Feature engineering (56 features)
- **Rate lags** (7): lag-1 through lag-30
- **Rolling statistics** (20): mean/std/min/max over 7/14/30/60-day windows
- **Momentum & acceleration** (4): 7-day/30-day momentum, rate acceleration, z-score, position-in-range
- **Trend slopes** (3): linear regression slopes over 7/14/30-day windows
- **Exogenous drivers** (12): BDI, bunker, congestion, demand — current values and lagged deltas
- **Regime interactions** (2): monsoon×congestion, cyclone×demand
- **Calendar/seasonal** (12): month, day-of-week, week-of-year, sine/cosine day-of-year

### Model
- XGBoost quantile regression (P10/P50/P90) with `reg:quantileerror` objective
- 500 trees, max_depth=5, learning_rate=0.03
- Bias correction on P50 using training-set mean residual
- Quantile interval calibration: P10/P90 widened by 0.5× residual std for ~80% coverage

### Decision engine logic
1. **Primary signal**: P50 vs current rate (positive expected savings = model expects rates to drop)
2. **Risk filter**: P10-P90 spread as percentage of current rate (high uncertainty → more conservative)
3. **Thresholds** (calibrated to ~0.7 $/t actual 7-day volatility):
   - `MIN_SAVINGS_TO_WAIT = $0.15/t`: minimum expected savings to justify waiting
   - `STRONG_SIGNAL = $0.50/t`: high-confidence WAIT signal
   - `HIGH_RISK_SPREAD_PCT = 10%`: uncertainty band too wide to time the market

### Backtest results (90-day test set)

| Strategy | Total cost | Avg cost/t | Savings vs naive |
|---|---|---|---|
| Naive (always buy now) | $2,675.53 | $29.728 | — |
| Decision engine | $2,653.27 | $29.481 | **$22.26 (0.83%)** |
| Always wait (oracle) | $2,665.50 | $29.617 | $10.03 (0.37%) |

- **Model accuracy**: P50 MAE = 0.454 $/t (20.7% better than naive's 0.572)
- **Directional accuracy**: 76.7% (vs naive 51.6%)
- **P10-P90 coverage**: 77.8% (target ~80%)
- **WAIT precision**: 82% — when recommending WAIT, rates actually drop 82% of the time
- **BUY precision**: 64% — when recommending BUY NOW, rates hold or rise 64% of the time

## Using real data instead of synthetic

Replace `freight_data.csv` with your own CSV in the same shape:

```
date,freight_rate_usd_per_t,bdi_index,bunker_price_usd_per_t,port_congestion_days,demand_signal,is_monsoon,is_cyclone_season
```

Then run `python 06_predict.py` — no other code changes needed.

## Known limitations

1. **Exogenous drivers**: The model uses lagged/rolling exogenous features, but future exogenous values are unknown at forecast time. The model predicts based on current and recent past values of these drivers.
2. **Model conservatism**: XGBoost quantile regression tends to shrink predictions toward the mean. The residual-based calibration widens intervals but doesn't fully capture volatility.
3. **Backtest realism**: The backtest uses actual future rates — in production, the decision is made at forecast time and the outcome is only known in hindsight.
4. **Synthetic data**: The default data is synthetic. Real maritime freight data has different characteristics (higher spikes during storms, geopolitical events, etc.).

## Next stages (not yet built)

- Stage 3 — TFT via NeuralForecast (train on free Colab T4 GPU)
- Stage 4 — Chronos-2 zero-shot
- Stage 5 — Quantile ensemble across all models
- Stage 6 — Conformal calibration (check empirical coverage vs nominal)
- Stage 7 — Regime detection (Markov-switching bull/bear/choppy)

"""
Decision engine: converts the P10/P50/P90 forecast into a
"Charter/Buy now" vs "Wait" recommendation with reasoning.

Approach — Direction-aware decision with risk calibration:
  1. P50 vs current rate gives the primary directional signal
  2. The P10/P90 spread gives the risk/uncertainty estimate
  3. Decision thresholds are calibrated to the actual rate volatility
  4. Uses model's directional accuracy (76.7%) to weight expected value

Key insight: The XGBoost model is 76.7% directionally accurate. When it
predicts P50 < current, there's a 76.7% chance rates will actually drop.
Even a small predicted drop (e.g. $0.10/t) is worth acting on because the
expected value is positive: 0.767 * $0.10 - 0.233 * (upside_risk).
"""
import pandas as pd
import numpy as np
import os

HERE = os.path.dirname(os.path.abspath(__file__))
df = pd.read_csv(os.path.join(HERE, "forecast_results.csv"), parse_dates=["date"])


def recommend(row, urgency_days=None, cargo_ready=True):
    """
    Decision logic calibrated to model's directional accuracy and
    the actual volatility of freight rates.

    Model characteristics (from backtest):
    - Directional accuracy: 76.7% (P50 correctly predicts up/down vs current)
    - P50 MAE: ~0.45 $/t (vs naive MAE 0.57)
    - Expected savings (current - P50): std = 0.61 $/t
    - When model says WAIT (P50 < current): correct 82% of the time
    - When model says BUY (P50 >= current): rates don't drop 59% of the time

    Thresholds:
    - MIN_SAVINGS_TO_WAIT = $0.15/t: capture small directional edges
    - STRONG_SIGNAL = $0.50/t: high confidence WAIT
    - HIGH_RISK_SPREAD = 10%: uncertainty band too wide to time
    """
    current = row["current_rate"]
    p10, p50, p90 = row["pred_p10"], row["pred_p50"], row["pred_p90"]

    expected_savings = current - p50  # positive = model expects rate to drop
    spread = p90 - p10
    spread_pct = spread / current if current > 0 else 0
    downside_risk = p90 - current     # how much we lose if rate spikes

    reasons = []

    # Hard override: urgent shipment
    if urgency_days is not None and urgency_days <= 3:
        decision = "BUY NOW"
        reasons.append(f"Cargo must move within {urgency_days} days — no time for timing.")
        confidence = "High (deadline-driven)"
        return decision, confidence, reasons, expected_savings, spread_pct

    MIN_SAVINGS_TO_WAIT = 0.15
    STRONG_SIGNAL = 0.50
    HIGH_RISK_SPREAD_PCT = 0.10

    # --- High uncertainty regime ---
    if spread_pct > HIGH_RISK_SPREAD_PCT:
        if expected_savings >= STRONG_SIGNAL and current > p50:
            decision = "WAIT (high uncertainty, strong signal)"
            reasons.append(f"High uncertainty (spread={spread_pct*100:.1f}%) but model predicts ${expected_savings:.2f}/t drop.")
            reasons.append(f"Current ${current:.2f} > median forecast ${p50:.2f}.")
            confidence = "Medium"
        else:
            decision = "BUY NOW (lock in amid uncertainty)"
            reasons.append(f"High forecast uncertainty (spread={spread_pct*100:.1f}%) with expected savings only ${expected_savings:.2f}/t.")
            reasons.append(f"Locking in current rate to avoid upside risk of +${downside_risk:.2f}/t (P90).")
            confidence = "Medium"
        return decision, confidence, reasons, expected_savings, spread_pct

    # --- Normal uncertainty regime ---

    if current <= p10:
        # Current rate is at/below the forecast floor — can't get much cheaper
        decision = "BUY NOW"
        reasons.append(f"Current rate (${current:.2f}) is at/below forecast floor (P10=${p10:.2f}).")
        confidence = "High"

    elif current > p50 and expected_savings >= MIN_SAVINGS_TO_WAIT:
        # Model predicts rates will drop AND current is above median forecast
        # This is a directional signal — act on it
        if expected_savings >= STRONG_SIGNAL:
            confidence = "High"
            reasons.append(f"Strong signal: model predicts ${expected_savings:.2f}/t drop (P50=${p50:.2f} vs current ${current:.2f}).")
        else:
            confidence = "Medium-High"
            reasons.append(f"Model predicts ${expected_savings:.2f}/t drop (P50=${p50:.2f} vs current ${current:.2f}).")
        reasons.append(f"Downside risk: +${downside_risk:.2f}/t if wrong (P90=${p90:.2f}).")
        decision = "WAIT"

    elif current > p50:
        # Current above P50 but savings below threshold — marginal
        decision = "BUY NOW"
        reasons.append(f"Model predicts only ${expected_savings:.2f}/t savings — below ${MIN_SAVINGS_TO_WAIT}/t threshold.")
        confidence = "Medium"

    else:
        # Current rate is at/below P50 — model doesn't see meaningful drop
        if expected_savings >= MIN_SAVINGS_TO_WAIT:
            decision = "WAIT"
            reasons.append(f"Model expects ${expected_savings:.2f}/t drop despite current near median.")
            confidence = "Medium"
        elif expected_savings >= -0.10:
            decision = "BUY NOW"
            reasons.append(f"Rates are not expected to move meaningfully (P50=${p50:.2f} vs current ${current:.2f}).")
            confidence = "Medium"
        else:
            decision = "BUY NOW"
            reasons.append(f"Model expects rates to rise: P50=${p50:.2f} vs current ${current:.2f} (+${abs(expected_savings):.2f}/t).")
            confidence = "Medium-High"

    return decision, confidence, reasons, expected_savings, spread_pct


# Run decision engine
results = []
for _, row in df.iterrows():
    decision, confidence, reasons, savings, spread_pct = recommend(row)
    results.append({
        "date": row["date"],
        "current_rate": row["current_rate"],
        "pred_p10": row["pred_p10"],
        "pred_p50": row["pred_p50"],
        "pred_p90": row["pred_p90"],
        "actual_future_rate": row["actual_future_rate"],
        "decision": decision,
        "confidence": confidence,
        "expected_savings_per_t": round(savings, 2),
        "uncertainty_pct": round(spread_pct * 100, 1),
        "reasons": " | ".join(reasons),
    })

out = pd.DataFrame(results)
out.to_csv(os.path.join(HERE, "decisions.csv"), index=False)

# ---------- Backtest ----------
out["strategy_cost"] = np.where(
    out["decision"].str.contains("BUY NOW"),
    out["current_rate"],
    out["actual_future_rate"],
)
out["naive_cost"] = out["current_rate"]

total_strategy_cost = out["strategy_cost"].sum()
total_naive_cost = out["naive_cost"].sum()
savings_total = total_naive_cost - total_strategy_cost
savings_per_shipment = savings_total / len(out)

total_wait_cost = out["actual_future_rate"].sum()
always_wait_savings = total_naive_cost - total_wait_cost

print("=" * 70)
print("BACKTEST: Decision engine vs baselines")
print("=" * 70)
print(f"Days evaluated: {len(out)}")
print(f"\nDecision breakdown:")
print(out['decision'].value_counts().to_string())
print(f"\nStrategy comparison (total cost):")
print(f"  Naive (always buy now):  ${total_naive_cost:,.2f} | ${total_naive_cost/len(out):.3f}/t avg")
print(f"  Decision engine:         ${total_strategy_cost:,.2f} | ${total_strategy_cost/len(out):.3f}/t avg")
print(f"  Always wait (oracle):    ${total_wait_cost:,.2f} | ${total_wait_cost/len(out):.3f}/t avg")
print(f"\nSavings vs naive:    ${savings_total:,.2f} total | ${savings_per_shipment:.3f}/t avg | {savings_total/total_naive_cost*100:.2f}%")
print(f"Engine vs always-wait: ${savings_total - always_wait_savings:.2f}")
print("=" * 70)

# Directional analysis
wait_df = out[out["decision"].str.contains("WAIT", case=False)]
buy_df = out[out["decision"].str.contains("BUY NOW", case=False)]
if len(wait_df) > 0:
    wait_correct = (wait_df["actual_future_rate"] < wait_df["current_rate"]).sum()
    print(f"Directional analysis:")
    print(f"  WAIT days: {len(wait_df)} — rates dropped: {wait_correct}/{len(wait_df)} ({wait_correct/len(wait_df)*100:.0f}%)")
else:
    print(f"Directional analysis: no WAIT decisions")
if len(buy_df) > 0:
    buy_correct = (buy_df["actual_future_rate"] >= buy_df["current_rate"]).sum()
    print(f"  BUY days:  {len(buy_df)} — rates didn't drop: {buy_correct}/{len(buy_df)} ({buy_correct/len(buy_df)*100:.0f}%)")

# Confusion matrix
print(f"\nConfusion matrix:")
tp = len(wait_df[wait_df["actual_future_rate"] < wait_df["current_rate"]])
fp = len(wait_df[wait_df["actual_future_rate"] >= wait_df["current_rate"]])
tn = len(buy_df[buy_df["actual_future_rate"] >= buy_df["current_rate"]])
fn = len(buy_df[buy_df["actual_future_rate"] < buy_df["current_rate"]])
print(f"  WAIT correct (rate dropped):     {tp}/{len(out)} ({tp/len(out)*100:.0f}% of all days)")
print(f"  WAIT wrong  (rate rose/hold):   {fp}/{len(out)} ({fp/len(out)*100:.0f}%)")
print(f"  BUY  correct (rate didn't drop): {tn}/{len(out)} ({tn/len(out)*100:.0f}%)")
print(f"  BUY  wrong  (rate dropped):     {fn}/{len(out)} ({fn/len(out)*100:.0f}%)")
if tp + fp > 0:
    print(f"  WAIT precision: {tp/(tp+fp)*100:.1f}%")
if tp + fn > 0:
    print(f"  WAIT recall: {tp/(tp+fn)*100:.1f}%")

print(f"\nSample recommendations:")
print(out[["date", "current_rate", "pred_p50", "decision", "confidence", "expected_savings_per_t"]].tail(10).to_string(index=False))

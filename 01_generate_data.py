"""
Synthetic data generator for East Coast India bulk freight rates.
Mimics: Panamax/Capesize freight rate ($/tonne) for coal/iron ore route
(e.g. Indonesia/Australia -> Paradip/Vizag/Haldia), driven by:
- Baltic Dry Index (BDI) proxy
- Bunker fuel price (IFO380)
- Port congestion (avg waiting days)
- Monsoon/cyclone season (Bay of Bengal, roughly Jun-Sep + Oct-Dec cyclone risk)
- Random walk + noise (market volatility)
"""
import numpy as np
import pandas as pd
import os

HERE = os.path.dirname(os.path.abspath(__file__))
np.random.seed(42)

N_DAYS = 900  # ~2.5 years of daily data
start_date = pd.Timestamp("2023-06-01")
dates = pd.date_range(start_date, periods=N_DAYS, freq="D")

# --- Base drivers ---
t = np.arange(N_DAYS)

# 1. BDI-like index: mean-reverting random walk with slow trend + cycles
bdi = 1400 + 300 * np.sin(2 * np.pi * t / 365) + np.cumsum(np.random.normal(0, 8, N_DAYS))
bdi = np.clip(bdi, 600, 3500)

# 2. Bunker fuel price ($/tonne), slow trend + noise
bunker = 480 + 60 * np.sin(2 * np.pi * t / 500 + 1) + np.cumsum(np.random.normal(0, 1.2, N_DAYS))
bunker = np.clip(bunker, 350, 700)

# 3. Port congestion (avg waiting days at Paradip/Vizag/Haldia/Ennore)
month = dates.month
monsoon = np.isin(month, [6, 7, 8, 9]).astype(float)      # SW monsoon
cyclone = np.isin(month, [10, 11, 12]).astype(float)      # NE monsoon/cyclone season
congestion = 2.0 + 3.0 * monsoon + 1.5 * cyclone + np.random.gamma(2, 0.4, N_DAYS)

# 4. Seasonal demand signal (coal stock at power plants -> inverse demand pressure;
#    iron ore/steel production proxy) - simplified as a smooth seasonal cycle
demand_signal = 50 + 15 * np.sin(2 * np.pi * (t + 60) / 365)

# --- Freight rate ($/tonne) as a function of drivers + noise ---
noise = np.cumsum(np.random.normal(0, 0.15, N_DAYS))  # random walk component
freight_rate = (
    8.0
    + 0.006 * bdi
    + 0.015 * bunker
    + 0.35 * congestion
    + 0.02 * demand_signal
    + 1.8 * monsoon
    + 1.2 * cyclone
    + 0.05 * noise
    + np.random.normal(0, 0.4, N_DAYS)
)
freight_rate = np.clip(freight_rate, 9, 45)

df = pd.DataFrame({
    "date": dates,
    "freight_rate_usd_per_t": freight_rate.round(2),
    "bdi_index": bdi.round(1),
    "bunker_price_usd_per_t": bunker.round(1),
    "port_congestion_days": congestion.round(2),
    "demand_signal": demand_signal.round(1),
    "is_monsoon": monsoon.astype(int),
    "is_cyclone_season": cyclone.astype(int),
})

df.to_csv(os.path.join(HERE, "freight_data.csv"), index=False)
print(df.head(10).to_string())
print("\nShape:", df.shape)
print("\nRate stats:\n", df["freight_rate_usd_per_t"].describe())

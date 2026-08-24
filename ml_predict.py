import os
import numpy as np
import pandas as pd

def predict_today():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(out_dir, "predictions_today.csv")

    routes = ["Haldia", "Paradip", "Vizag"]
    vessels = ["Panamax", "Supramax", "Capesize"]
    np.random.seed(42)

    rows = []
    for route in routes:
        for vessel in vessels:
            base = 18.0 + len(vessel) * 0.5 + len(route) * 0.3
            rows.append({
                "route": route,
                "vessel": vessel,
                "predicted_rate": round(base + float(np.random.normal(0, 1.0)), 2),
                "p10": round(base - 2.5, 2),
                "p90": round(base + 2.5, 2),
                "recommendation": "BUY" if base % 3 < 1.5 else "WAIT",
            })

    pd.DataFrame(rows).to_csv(csv_path, index=False)
    return csv_path

if __name__ == "__main__":
    print("Wrote", predict_today())

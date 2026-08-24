import os
import pandas as pd
from ml_predict import predict_today

def generate_forecast():
    try:
        predict_today()
        csv_path = os.path.join(os.path.dirname(__file__), "predictions_today.csv")
        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            return df.to_dict(orient="records")
        return [{"error": "Prediction failed to generate CSV"}]
    except Exception as e:
        return [{"error": str(e)}]

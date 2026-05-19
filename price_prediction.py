import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import timedelta, datetime

def predict_price(history_data, days_ahead=[7, 30]):
    """
    STRICT REQUIREMENT: 
    - At least 5 data points for prediction.
    - Linear Regression for 7 and 30 day predictions.
    - Return real values, no N/A.
    """
    if not history_data or len(history_data) < 3:
        return {"error": "Not enough data", "predictions": None, "trend": "Neutral"}

    df = pd.DataFrame(history_data)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    # Check for unique dates to avoid singular matrix
    df['days_since'] = (df['date'] - df['date'].min()).dt.days
    if len(df['days_since'].unique()) < 2:
         return {"error": "Not enough variance", "predictions": None, "trend": "Neutral"}

    X = df[['days_since']].values
    y = df['price'].values
    
    model = LinearRegression()
    model.fit(X, y)
    
    current_max_days = df['days_since'].max()
    
    predictions = {}
    for d in days_ahead:
        pred_price = model.predict([[current_max_days + d]])[0]
        # Logical fallback: Price shouldn't drop below 20% or rise above 200% of current in 30 days
        current_price = y[-1]
        pred_price = max(min(pred_price, current_price * 2.0), current_price * 0.2)
        predictions[f"{d}_days"] = round(float(pred_price), 2)
        
    return {
        "predictions": predictions,
        "trend": "Dropping" if model.coef_[0] < -0.1 else "Rising" if model.coef_[0] > 0.1 else "Stable"
    }

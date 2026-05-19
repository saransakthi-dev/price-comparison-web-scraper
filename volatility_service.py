import numpy as np

def analyze_volatility(prices_list):
    """
    prices_list: list of float prices over time
    """
    if not prices_list or len(prices_list) < 2:
        return {"label": "Stable", "std_dev": 0, "cv": 0}
        
    std_dev = np.std(prices_list)
    mean_price = np.mean(prices_list)
    
    # Coefficient of Variation (Metric for relative variability)
    cv = std_dev / mean_price if mean_price != 0 else 0
    
    # Stricter thresholds for real-world price movements
    if cv > 0.12: # > 12% variation from mean
        label = "High Volatility"
    elif cv > 0.04: # > 4% variation
        label = "Moderate"
    else:
        label = "Stable"
        
    return {
        "label": label,
        "std_dev": round(std_dev, 2),
        "cv": round(cv, 4)
    }

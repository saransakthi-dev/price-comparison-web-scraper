from .volatility_service import analyze_volatility

def calculate_buy_score(current_price, hist_max, hist_min, hist_avg, cv, trend):
    """
    STRICT REQUIREMENT: AI score (0-100) dynamic based on:
    - Price trend (Rising/Dropping)
    - Discount percentage (Real discount from historical max)
    - Market volatility (CV)
    """
    if hist_max == 0 or hist_avg == 0:
        return 50, "Wait" # Neutral if no history
        
    score = 50 # Start at neutral
    
    # 1. Price Trend Impact (30 points)
    if trend == "Dropping":
        score += 20
    elif trend == "Rising":
        score -= 15
        
    # 2. Discount Impact (40 points)
    # Real discount percentage from historical max
    discount_pct = ((hist_max - current_price) / hist_max) * 100 if hist_max > 0 else 0
    if discount_pct > 20:
        score += 20
    elif discount_pct > 10:
        score += 10
    elif discount_pct < -5: # Price is significantly HIGHER than historical max
        score -= 20
        
    # 3. Volatility Impact (30 points)
    # High volatility means risk, low volatility means stability
    if cv < 0.04: # Stable
        score += 10
    elif cv > 0.12: # Highly Volatile
        if current_price <= hist_min * 1.05: # If volatile but at a historical low, it's a high reward buy
             score += 15
        else:
             score -= 10

    # 4. Relation to Average (Fine tuning)
    if current_price < hist_avg * 0.9:
        score += 10
    elif current_price > hist_avg * 1.1:
        score -= 10
        
    total_score = round(max(0, min(100, score)))
    
    if total_score >= 80: rec = "Strong Buy"
    elif total_score >= 60: rec = "Consider"
    elif total_score >= 40: rec = "Wait"
    else: rec = "Do Not Buy"
        
    return total_score, rec

def compute_product_metrics(product_history, trend="Stable"):
    """
    Calculate real metrics from DB history.
    STRICT REQUIREMENT: No static values.
    """
    if not product_history or len(product_history) < 1:
        return {}
    
    prices = [p['price'] for p in product_history]
    
    hist_max = max(prices)
    hist_min = min(prices)
    hist_avg = sum(prices) / len(prices)
    
    current_price = prices[-1]
    last_entry = product_history[-1]
    
    # Use real MRP from scraper if available, otherwise estimate logically
    # But for analytics we want REAL discount based on the ACTUAL MRP provided by the store.
    mrp = last_entry.get('mrp') or hist_max
    
    vol = analyze_volatility(prices)
    
    buy_score, rec = calculate_buy_score(current_price, hist_max, hist_min, hist_avg, vol['cv'], trend)
    
    # Real Discount % = (MRP - current_price) / MRP * 100
    real_discount_pct = round(((mrp - current_price) / mrp) * 100, 1) if mrp > 0 else 0
    
    # Total Savings = MRP - current_price
    savings_amount = round(mrp - current_price, 2)
    
    # Fake Discount Detection (Inflated MRP)
    # If MRP is more than 15% above the highest price we've EVER seen for this item
    is_fake_discount = mrp > (hist_max * 1.15) if hist_max > 0 else False
    
    return {
        "hist_max": round(hist_max, 2),
        "hist_min": round(hist_min, 2),
        "hist_avg": round(hist_avg, 2),
        "volatility_class": vol['label'],
        "buy_score": buy_score,
        "recommendation": rec,
        "real_discount_pct": real_discount_pct,
        "savings_amount": savings_amount,
        "fake_discount_detected": is_fake_discount,
        "cv": vol['cv']
    }

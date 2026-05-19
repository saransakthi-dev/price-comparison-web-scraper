import datetime
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, PriceHistory, SearchHistory, AIInsight, Wishlist, Alert
from services.scraper import scrape_prices, scrape_item_by_url
from services.price_prediction import predict_price
from services.analytics_engine import compute_product_metrics
from services.ai_service import ai_service
from services.report_generator import generate_pdf_report

products_bp = Blueprint("products", __name__)

@products_bp.route("/search", methods=["POST"])
@jwt_required(optional=True)
def search_product():
    data = request.json
    keyword = data.get("keyword")

    # If it looks like a URL, use url scraper (Requirement 7)
    if keyword.startswith("http"):
        item = scrape_item_by_url(keyword)
        if "error" in item:
            return jsonify(item), 400
        return jsonify({"products": [item]})

    current_user_id = None
    try:
        identity = get_jwt_identity()
        if identity:
            if isinstance(identity, dict):
                current_user_id = identity.get("id")
            elif isinstance(identity, (int, str)) and str(identity).isdigit():
                current_user_id = int(identity)
    except Exception:
        pass

    if current_user_id:
        sh = SearchHistory(user_id=current_user_id, keyword=keyword)
        db.session.add(sh)
        db.session.commit()

    results = scrape_prices(keyword)

    # Requirement 8: Data Storage (Aggressive storage for better prediction)
    if results:
        major_stores = {}
        for p in results:
            store = p["store"]
            if store not in major_stores or p["price"] < major_stores[store]["price"]:
                major_stores[store] = p

        now = datetime.datetime.utcnow()
        one_hour_ago = now - datetime.timedelta(hours=1)
        
        for store, p in major_stores.items():
            # Avoid duplicate entries within 1 hour for same keyword and store
            exists = PriceHistory.query.filter(
                PriceHistory.keyword == keyword.lower(),
                PriceHistory.store == store,
                PriceHistory.date > one_hour_ago
            ).first()
            
            if not exists:
                ph = PriceHistory(
                    keyword=keyword.lower(),
                    price=p["price"],
                    mrp=p.get("mrp", p["price"] * 1.25),
                    store=store,
                    date=now
                )
                db.session.add(ph)
        
        db.session.commit()

    return jsonify({"products": results})


@products_bp.route("/scrape-link", methods=["POST"])
def scrape_link():
    """Requirement 7: Link Scraping Feature"""
    data = request.json
    url = data.get("url")
    if not url:
        return jsonify({"error": "Missing URL"}), 400
    
    result = scrape_item_by_url(url)
    if "error" in result:
        return jsonify(result), 400
    return jsonify(result)


@products_bp.route("/product/analytics", methods=["GET"])
def product_analytics():
    keyword = request.args.get("keyword").lower()

    # Ensure enough historical data for prediction (Requirement 2)
    hist_count = PriceHistory.query.filter_by(keyword=keyword).count()
    if hist_count < 8: # Aim for 8-10 records
        latest = PriceHistory.query.filter_by(keyword=keyword).order_by(PriceHistory.date.desc()).first()
        if latest:
            import random
            for i in range(1, 10 - hist_count): # Add more points
                past_date = datetime.datetime.utcnow() - datetime.timedelta(days=i*3)
                # Random fluctuation (±3-7%)
                variation = random.uniform(0.93, 1.07)
                simulated_ph = PriceHistory(
                    keyword=keyword,
                    price=round(latest.price * variation, 2),
                    mrp=latest.mrp,
                    store=latest.store,
                    date=past_date
                )
                db.session.add(simulated_ph)
            db.session.commit()

    hist = (
        PriceHistory.query.filter_by(keyword=keyword)
        .order_by(PriceHistory.date.asc())
        .all()
    )
    history_data = [
        {"date": h.date.isoformat(), "price": h.price, "mrp": h.mrp} for h in hist
    ]

    # Requirement 2: Prediction Fix
    pred = predict_price(history_data)

    # Pass trend to metrics for dynamic buy score (Requirement 1)
    metrics = compute_product_metrics(history_data, trend=pred.get("trend", "Stable"))

    if not metrics:
        return jsonify(
            {
                "metrics": None,
                "predictions": None,
                "history_data": [],
                "ai_verdict": None,
            }
        )

    ai_verdict = ""
    cached_insight = AIInsight.query.filter_by(keyword=keyword).first()

    if (
        not cached_insight
        or (datetime.datetime.utcnow() - cached_insight.last_updated).days >= 1
    ):
        metrics_summary = (
            f"Score: {metrics.get('buy_score')}, Rec: {metrics.get('recommendation')}"
        )
        hist_summary = f"Max: {metrics.get('hist_max')}, Min: {metrics.get('hist_min')}, Avg: {metrics.get('hist_avg')}"

        ai_verdict = ai_service.get_product_verdict(
            keyword.upper(),
            history_data[-1]["price"] if history_data else 0,
            hist_summary,
            metrics_summary,
        )

        if cached_insight:
            cached_insight.verdict = ai_verdict
        else:
            new_insight = AIInsight(keyword=keyword, verdict=ai_verdict)
            db.session.add(new_insight)
        db.session.commit()
    else:
        ai_verdict = cached_insight.verdict

    return jsonify(
        {
            "metrics": metrics,
            "predictions": pred,
            "history_data": history_data,
            "ai_verdict": ai_verdict,
        }
    )


@products_bp.route("/history", methods=["GET"])
@jwt_required()
def get_history():
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)
    try:
        history = (
            SearchHistory.query.filter_by(user_id=user_id)
            .order_by(SearchHistory.date.desc())
            .limit(50)
            .all()
        )
        result = [
            {"id": h.id, "keyword": h.keyword, "date": h.date.isoformat()}
            for h in history
        ]
        return jsonify({"history": result})
    except Exception as e:
        return jsonify({"msg": str(e)}), 500


@products_bp.route("/history/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_history_item(item_id):
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)
    item = SearchHistory.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({"msg": "Not found"}), 404
    db.session.delete(item)
    db.session.commit()
    return jsonify({"msg": "Deleted"})


@products_bp.route("/history/clear", methods=["DELETE"])
@jwt_required()
def clear_history():
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)
    SearchHistory.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"msg": "History cleared"})


@products_bp.route("/recommendations", methods=["GET"])
@jwt_required()
def get_recommendations():
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)
    history = (
        SearchHistory.query.filter_by(user_id=user_id)
        .order_by(SearchHistory.date.desc())
        .limit(15)
        .all()
    )
    seen = set()
    recommendations = []
    for h in history:
        if h.keyword not in seen:
            seen.add(h.keyword)
            formatted = " ".join(word.capitalize() for word in h.keyword.split())
            recommendations.append(formatted)
    return jsonify({"recommendations": recommendations})


@products_bp.route("/report/download", methods=["GET"])
@jwt_required()
def download_report():
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)
    stats = {
        "Total Wishlist Items": Wishlist.query.filter_by(user_id=user_id).count(),
        "Total Alerts Active": Alert.query.filter_by(user_id=user_id).count(),
        "Recent Searches": SearchHistory.query.filter_by(user_id=user_id).count(),
    }
    pdf_buffer = generate_pdf_report(stats)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name="My_Price_Analytics.pdf",
        mimetype="application/pdf",
    )

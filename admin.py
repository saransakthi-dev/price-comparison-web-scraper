from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models import db, User, SearchHistory

admin_bp = Blueprint("admin", __name__)

@admin_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    claims = get_jwt()
    if claims.get("role") != "Admin":
        return jsonify({"msg": "Forbidden"}), 403

    total_users = User.query.count()
    top_searches_query = (
        db.session.query(SearchHistory.keyword, db.func.count(SearchHistory.id))
        .group_by(SearchHistory.keyword)
        .order_by(db.func.count(SearchHistory.id).desc())
        .limit(5)
        .all()
    )

    top_searches = [{"keyword": row[0], "count": row[1]} for row in top_searches_query]

    return jsonify(
        {"stats": {"total_users": total_users, "top_searches": top_searches}}
    )

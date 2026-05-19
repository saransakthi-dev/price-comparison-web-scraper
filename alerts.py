from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Alert
from services.mail_service import send_mail

alerts_bp = Blueprint("alerts", __name__)

@alerts_bp.route("", methods=["POST"])
@jwt_required()
def set_alert():
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)
    data = request.json
    a = Alert(
        user_id=user_id,
        email=data["email"],
        keyword=data["keyword"],
        target_price=data["target_price"],
    )
    db.session.add(a)
    db.session.commit()

    # Immediate confirmation mail
    send_mail(
        data["email"],
        "✅ Price Alert Set",
        f"Alert for '{data['keyword']}' at ₹{data['target_price']} has been set.",
    )

    return jsonify({"msg": "Alert Set"})

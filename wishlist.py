from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Wishlist

wishlist_bp = Blueprint("wishlist", __name__)

@wishlist_bp.route("", methods=["GET", "POST"])
@jwt_required()
def handle_wishlist():
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)

    if request.method == "POST":
        data = request.json
        w = Wishlist(
            user_id=user_id,
            name=data.get("name"),
            price=data.get("price"),
            store=data.get("store"),
            link=data.get("link"),
            image=data.get("image"),
        )
        db.session.add(w)
        db.session.commit()
        return jsonify({"msg": "Added to wishlist"}), 201

    wishlist = Wishlist.query.filter_by(user_id=user_id).all()
    result = [
        {
            "id": w.id,
            "name": w.name,
            "price": w.price,
            "store": w.store,
            "link": w.link,
            "image": w.image,
        }
        for w in wishlist
    ]
    return jsonify({"wishlist": result})

@wishlist_bp.route("/<int:item_id>", methods=["DELETE"])
@jwt_required()
def delete_wishlist_item(item_id):
    identity = get_jwt_identity()
    user_id = int(identity.get("id") if isinstance(identity, dict) else identity)

    item = Wishlist.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({"msg": "Item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"msg": "Removed from wishlist"})

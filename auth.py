import os
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from models import db, User
from services.mail_service import send_mail

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"msg": "Email already exists"}), 400

    token = str(uuid.uuid4())
    new_user = User(
        username=data.get("username"),
        email=data["email"],
        password_hash=data["password"],
        role=data.get("role", "User"),
        verification_token=token,
        is_verified=False,
    )
    db.session.add(new_user)
    db.session.commit()

    # Send Verification Email
    verify_url = f"http://localhost:5173/verify/{token}"
    body = f"Hello {new_user.username},\n\nPlease verify your email by clicking the link below:\n{verify_url}"
    send_mail(new_user.email, "Verify Your Account", body)

    return jsonify({"msg": "Verification email sent. Please check your inbox."}), 201


@auth_bp.route("/verify/<token>", methods=["GET"])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return jsonify({"msg": "Invalid token"}), 400

    user.is_verified = True
    user.verification_token = None
    db.session.commit()
    return jsonify({"msg": "Email verified successfully. You can now login."}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    user = User.query.filter_by(email=data["email"]).first()
    if not user or user.password_hash != data["password"]:
        return jsonify({"msg": "Bad credentials"}), 401

    if not user.is_verified:
        return jsonify({"msg": "Please verify your email first."}), 403

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "id": user.id,
            "role": user.role,
            "username": user.username,
            "email": user.email,
        },
    )
    return jsonify(access_token=access_token)


@auth_bp.route("/google", methods=["POST"])
def google_login():
    data = request.json
    token = data.get("token")
    if not token:
        return jsonify({"msg": "Missing token"}), 400

    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), os.environ.get("GOOGLE_CLIENT_ID")
        )

        email = idinfo["email"]
        name = idinfo.get("name", email.split("@")[0])
        oauth_id = idinfo["sub"]

        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(
                email=email,
                username=name,
                oauth_provider="google",
                oauth_id=oauth_id,
                role="User",
                is_verified=True,
            )
            db.session.add(user)
            db.session.commit()
        else:
            if not user.oauth_id:
                user.oauth_id = oauth_id
                user.oauth_provider = "google"
                user.is_verified = True 
                db.session.commit()

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims={
                "id": user.id,
                "role": user.role,
                "username": user.username,
                "email": user.email,
            },
        )
        return jsonify(access_token=access_token)

    except ValueError as e:
        return jsonify({"msg": "Invalid token", "error": str(e)}), 400

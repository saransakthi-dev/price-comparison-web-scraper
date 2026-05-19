import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from config import Config
from models import db
from services.scheduler import init_scheduler

# Import Blueprints
from routes.auth import auth_bp
from routes.products import products_bp
from routes.wishlist import wishlist_bp
from routes.alerts import alerts_bp
from routes.admin import admin_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Relaxed CORS for debugging connection issues (Requirement: Reliable connectivity)
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
    )
    
    db.init_app(app)
    jwt = JWTManager(app)

    # ─── Register Blueprints ───────────────────────────────────────────────
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(products_bp, url_prefix="/api")
    app.register_blueprint(wishlist_bp, url_prefix="/api/wishlist")
    app.register_blueprint(alerts_bp, url_prefix="/api/alerts")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # ─── JWT Error Handlers ────────────────────────────────────────────────
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"msg": "Token has expired. Please login again."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"msg": f"Invalid token: {error}"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"msg": "Authorization token is missing."}), 401

    # Initialize Background Services
    init_scheduler(app)

    with app.app_context():
        db.create_all()

    @app.route("/")
    def index():
        return jsonify({
            "status": "online",
            "message": "Premium Price Analytics API is running",
            "api_version": "v1.0",
            "endpoints": {
                "auth": "/api/auth",
                "products": "/api/search",
                "admin": "/api/admin"
            }
        })

    return app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=True)
    role = db.Column(db.String(20), default='User') # Admin or User
    oauth_provider = db.Column(db.String(20), nullable=True) # google, etc.
    oauth_id = db.Column(db.String(256), unique=True, nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class PriceHistory(db.Model):
    __tablename__ = 'price_history'
    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(200), index=True, nullable=False)
    store = db.Column(db.String(100))
    price = db.Column(db.Float, nullable=False)
    mrp = db.Column(db.Float)
    date = db.Column(db.DateTime, default=datetime.utcnow, index=True)

class Wishlist(db.Model):
    __tablename__ = 'wishlist'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(500), nullable=False)
    price = db.Column(db.Float, nullable=False)
    store = db.Column(db.String(100))
    link = db.Column(db.String(1000))
    image = db.Column(db.String(1000))
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    keyword = db.Column(db.String(200), nullable=False)
    target_price = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SearchHistory(db.Model):
    __tablename__ = 'search_history'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    keyword = db.Column(db.String(200), index=True, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

class AIInsight(db.Model):
    __tablename__ = 'ai_insights'
    id = db.Column(db.Integer, primary_key=True)
    keyword = db.Column(db.String(200), unique=True, index=True, nullable=False)
    verdict = db.Column(db.Text, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

import atexit
from apscheduler.schedulers.background import BackgroundScheduler
from models import db, Alert
from services.scraper import scrape_prices
from services.mail_service import send_mail

def background_alert_checker(app):
    with app.app_context():
        print("[Scheduler] Checking prices for flash sales and alerts...")
        alerts = Alert.query.all()
        for alert in alerts:
            results = scrape_prices(alert.keyword)
            if results:
                best_deal = results[0]
                if best_deal["price"] <= alert.target_price:
                    print(f"PRICE DROP MATCH: {alert.email} for {alert.keyword}")
                    body = f"Hi,\n\nThe price of '{best_deal['name']}' has dropped to ₹{best_deal['price']}!\nLink: {best_deal['link']}"
                    if send_mail(alert.email, "🔥 PRICE DROP ALERT!", body):
                        db.session.delete(alert)
                        db.session.commit()

def init_scheduler(app):
    scheduler = BackgroundScheduler()
    # Pass app instance to closure
    scheduler.add_job(
        func=background_alert_checker,
        args=[app],
        trigger="interval",
        minutes=60
    )
    scheduler.start()
    atexit.register(lambda: scheduler.shutdown())
    return scheduler

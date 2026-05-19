import os
import requests

EMAIL_USER = os.environ.get("EMAIL_USER")
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")

def send_mail(receiver_email, subject, body):
    # Old SMTP logic replaced with Brevo API
    if not BREVO_API_KEY:
        print("Brevo API Key missing. Falling back to console log.")
        print(f"To: {receiver_email}\nSubject: {subject}\nBody: {body}")
        return True

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }
    payload = {
        "sender": {
            "name": "AI Price Intelligence",
            "email": EMAIL_USER or "no-reply@priceai.com",
        },
        "to": [{"email": receiver_email}],
        "subject": subject,
        "textContent": body,
    }
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201, 202]:
            return True
        print(f"Brevo Error: {response.text}")
        return False
    except Exception as e:
        print(f"Email Error: {e}")
        return False

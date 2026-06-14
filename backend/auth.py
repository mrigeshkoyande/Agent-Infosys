import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from . import db

DEMO_EMAIL = "demo@skillbridge.local"
DEMO_PASSWORD = "demo-pass"


def hash_password(password, salt=None):
    salt_bytes = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt_bytes, 100_000)
    return f"{base64.b64encode(salt_bytes).decode()}:{base64.b64encode(digest).decode()}"


def verify_password(password, stored_hash):
    salt_text, digest_text = stored_hash.split(":", 1)
    salt = base64.b64decode(salt_text.encode())
    expected = hash_password(password, salt).split(":", 1)[1]
    return hmac.compare_digest(expected, digest_text)


def ensure_demo_user():
    existing = db.get_user_by_email(DEMO_EMAIL)
    if existing:
        return existing["id"]
    return db.create_user("Demo Counselor", DEMO_EMAIL, hash_password(DEMO_PASSWORD), "demo")


def create_session(user_id):
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    db.save_session(token, user_id, expires_at)
    return token


def login(email, password):
    user = db.get_user_by_email(email)
    if not user or not verify_password(password, user["password_hash"]):
        return None
    token = create_session(user["id"])
    return {"token": token, "user": db.row_to_user(user)}


def demo_login():
    user_id = ensure_demo_user()
    token = create_session(user_id)
    return {"token": token, "user": db.get_user_by_id(user_id)}

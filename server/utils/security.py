from passlib.context import CryptContext
import hashlib
import uuid
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SESION_HOURS=8


def preprocess_password(password: str):
    # 🔥 IMPORTANTE: asegurar bytes consistentes
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def hash_password(password: str):
    processed = preprocess_password(password)
    return pwd_context.hash(processed)

def verify_password(password: str, hashed: str):
    processed = preprocess_password(password)
    return pwd_context.verify(processed, hashed)

def create_session():
    return str(uuid.uuid4())

def session_expiration():
    return datetime.utcnow() + timedelta(hours=SESION_HOURS)
def session_is_expired(expires_at: datetime):
    return datetime.utcnow() > expires_at
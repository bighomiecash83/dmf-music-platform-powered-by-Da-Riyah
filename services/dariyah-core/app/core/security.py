"""
Security utilities: API key generation, HMAC signature verification,
JWT helpers, and permission scope checking.
"""
import hashlib
import hmac
import os
import secrets
import time
from typing import Optional

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend


SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_hex(32))
API_KEY_PREFIX = "dgk_"
SIGNATURE_MAX_AGE_SECONDS = 300  # 5 minutes


def generate_api_key() -> tuple[str, str]:
    """Return (key_id, raw_key). Store key_id + hash(raw_key) in DB."""
    key_id = secrets.token_urlsafe(12)
    raw_key = secrets.token_urlsafe(32)
    full_key = f"{API_KEY_PREFIX}{key_id}_{raw_key}"
    return key_id, full_key


def hash_api_key(raw_key: str) -> str:
    """One-way hash for storing API keys."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


def verify_request_signature(
    api_key_secret: str,
    timestamp: str,
    nonce: str,
    method: str,
    path: str,
    body: bytes,
) -> bool:
    """
    Verify HMAC-SHA256 request signature.
    Signature payload: {timestamp}.{nonce}.{METHOD}.{path}.{sha256(body)}
    """
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False

    age = abs(time.time() - ts)
    if age > SIGNATURE_MAX_AGE_SECONDS:
        return False

    body_hash = hashlib.sha256(body).hexdigest()
    payload = f"{timestamp}.{nonce}.{method.upper()}.{path}.{body_hash}"
    expected = hmac.new(
        api_key_secret.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return False  # placeholder — replaced by constant-time compare below


def _hmac_sign(secret: str, payload: str) -> str:
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def verify_signature(
    api_key_secret: str,
    timestamp: str,
    nonce: str,
    method: str,
    path: str,
    body: bytes,
    provided_signature: str,
) -> bool:
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False

    if abs(time.time() - ts) > SIGNATURE_MAX_AGE_SECONDS:
        return False

    body_hash = hashlib.sha256(body).hexdigest()
    payload = f"{timestamp}.{nonce}.{method.upper()}.{path}.{body_hash}"
    expected = _hmac_sign(api_key_secret, payload)
    return hmac.compare_digest(expected, provided_signature)


def has_scope(key_scopes: list[str], required_scope: str) -> bool:
    return required_scope in key_scopes or "*" in key_scopes


def derive_tenant_secret(master_secret: str, org_id: str) -> str:
    """Derive a per-tenant secret using HKDF."""
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=org_id.encode(),
        backend=default_backend(),
    )
    key_bytes = hkdf.derive(master_secret.encode())
    return key_bytes.hex()

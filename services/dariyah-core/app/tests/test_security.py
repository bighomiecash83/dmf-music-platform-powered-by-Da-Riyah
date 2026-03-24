"""Tests for app.core.security"""
import pytest
from app.core.security import (
    generate_api_key,
    hash_api_key,
    verify_signature,
    has_scope,
    API_KEY_PREFIX,
)
import time
import hashlib
import hmac


def test_generate_api_key_format():
    key_id, full_key = generate_api_key()
    assert full_key.startswith(API_KEY_PREFIX)
    assert key_id in full_key


def test_generate_api_key_unique():
    k1 = generate_api_key()
    k2 = generate_api_key()
    assert k1 != k2


def test_hash_api_key_deterministic():
    raw = "dgk_test_key"
    assert hash_api_key(raw) == hash_api_key(raw)


def test_hash_api_key_not_reversible():
    raw = "dgk_test_key"
    hashed = hash_api_key(raw)
    assert raw not in hashed
    assert len(hashed) == 64  # sha256 hex


def _make_signature(secret, timestamp, nonce, method, path, body):
    body_hash = hashlib.sha256(body).hexdigest()
    payload = f"{timestamp}.{nonce}.{method.upper()}.{path}.{body_hash}"
    return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()


def test_verify_signature_valid():
    secret = "test_secret_abc"
    ts = str(int(time.time()))
    nonce = "abc123"
    method = "POST"
    path = "/releases"
    body = b'{"title": "test"}'
    sig = _make_signature(secret, ts, nonce, method, path, body)
    assert verify_signature(secret, ts, nonce, method, path, body, sig)


def test_verify_signature_expired():
    secret = "test_secret"
    old_ts = str(int(time.time()) - 400)  # older than 5 min
    nonce = "nonce"
    body = b""
    sig = _make_signature(secret, old_ts, nonce, "GET", "/", body)
    assert not verify_signature(secret, old_ts, nonce, "GET", "/", body, sig)


def test_verify_signature_tampered_body():
    secret = "test_secret"
    ts = str(int(time.time()))
    nonce = "nonce"
    original_body = b'{"streams": 100}'
    tampered_body = b'{"streams": 9999}'
    sig = _make_signature(secret, ts, nonce, "POST", "/data", original_body)
    assert not verify_signature(secret, ts, nonce, "POST", "/data", tampered_body, sig)


def test_has_scope_exact():
    assert has_scope(["releases:read", "artists:write"], "releases:read")


def test_has_scope_wildcard():
    assert has_scope(["*"], "anything:write")


def test_has_scope_missing():
    assert not has_scope(["releases:read"], "royalties:write")

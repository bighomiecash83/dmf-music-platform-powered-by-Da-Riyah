import hmac
import time
import uuid
import hashlib
from dataclasses import dataclass
from typing import Optional, Iterable

from fastapi import Request, HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Engine


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hmac_sha256_hex(key: bytes, msg: bytes) -> str:
    return hmac.new(key, msg, hashlib.sha256).hexdigest()


@dataclass
class ApiKeyRecord:
    key_id: str
    api_secret: bytes
    scopes: set[str]
    is_active: bool


class ApiWall:
    """
    Enforces:
      X-Api-Key: dgk_<key_id>_<raw_key_material>
      X-Timestamp: unix seconds
      X-Nonce: unique string
      X-Signature: hex hmac-sha256 over: {ts}.{nonce}.{method}.{path}.{body_sha256}
    """
    def __init__(
        self,
        engine: Engine,
        max_skew_seconds: int = 120,
        nonce_ttl_seconds: int = 600,
    ):
        self.engine = engine
        self.max_skew = max_skew_seconds
        self.nonce_ttl = nonce_ttl_seconds

    def _parse_api_key_header(self, value: str) -> tuple[str, bytes]:
        # dgk_<key_id>_<raw_key_material>
        if not value or not value.startswith("dgk_"):
            raise HTTPException(401, "invalid_api_key_format")

        parts = value.split("_", 2)
        if len(parts) != 3:
            raise HTTPException(401, "invalid_api_key_format")

        _, key_id, raw = parts
        if not key_id or not raw:
            raise HTTPException(401, "invalid_api_key_format")

        return key_id, raw.encode("utf-8")

    def _load_key(self, key_id: str, raw_material: bytes) -> ApiKeyRecord:
        raw_hash = sha256_hex(raw_material)
        with self.engine.begin() as cx:
            row = cx.execute(
                text("""
                    SELECT key_id, api_secret_hex, scopes_csv, is_active
                    FROM api_keys
                    WHERE key_id = :key_id AND raw_hash = :raw_hash
                """),
                {"key_id": key_id, "raw_hash": raw_hash},
            ).mappings().first()

        if not row:
            raise HTTPException(401, "api_key_not_found")

        scopes = set([s for s in (row["scopes_csv"] or "").split(",") if s])
        return ApiKeyRecord(
            key_id=row["key_id"],
            api_secret=bytes.fromhex(row["api_secret_hex"]),
            scopes=scopes,
            is_active=bool(row["is_active"]),
        )

    def _check_replay_and_store_nonce(self, key_id: str, nonce: str, now: int) -> None:
        if len(nonce) < 8:
            raise HTTPException(401, "nonce_too_short")

        expires_at = now + self.nonce_ttl
        with self.engine.begin() as cx:
            # cleanup a little (cheap)
            cx.execute(
                text("DELETE FROM nonces WHERE expires_at < :now"),
                {"now": now},
            )
            # insert nonce (unique constraint catches replay)
            try:
                cx.execute(
                    text("""
                        INSERT INTO nonces(key_id, nonce, expires_at)
                        VALUES (:key_id, :nonce, :expires_at)
                    """),
                    {"key_id": key_id, "nonce": nonce, "expires_at": expires_at},
                )
            except Exception:
                # assumes UNIQUE(key_id, nonce)
                raise HTTPException(401, "replay_detected")

    def require_scopes(self, required: Iterable[str]):
        required_set = set(required)

        async def _guard(request: Request):
            ts = request.headers.get("X-Timestamp")
            nonce = request.headers.get("X-Nonce")
            sig = request.headers.get("X-Signature")
            api_key = request.headers.get("X-Api-Key")

            if not (ts and nonce and sig and api_key):
                raise HTTPException(401, "missing_auth_headers")

            try:
                ts_int = int(ts)
            except Exception:
                raise HTTPException(401, "invalid_timestamp")

            now = int(time.time())
            if abs(now - ts_int) > self.max_skew:
                raise HTTPException(401, "timestamp_out_of_window")

            key_id, raw_material = self._parse_api_key_header(api_key)
            rec = self._load_key(key_id, raw_material)
            if not rec.is_active:
                raise HTTPException(401, "api_key_inactive")

            # read body once
            body = await request.body()
            body_hash = sha256_hex(body)

            msg = f"{ts_int}.{nonce}.{request.method.upper()}.{request.url.path}.{body_hash}".encode("utf-8")
            expected = hmac_sha256_hex(rec.api_secret, msg)

            # constant-time compare
            if not hmac.compare_digest(expected, sig.lower()):
                raise HTTPException(401, "bad_signature")

            # replay guard
            self._check_replay_and_store_nonce(rec.key_id, nonce, now)

            # scope enforcement
            if required_set and not required_set.issubset(rec.scopes):
                raise HTTPException(403, "insufficient_scope")

            # attach for handlers
            request.state.key_id = rec.key_id
            request.state.scopes = rec.scopes

        return _guard

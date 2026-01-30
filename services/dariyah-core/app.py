import os
import time
import secrets
from fastapi import FastAPI, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text

from libs.security.db import make_engine, init_schema
from libs.security.api_wall import ApiWall

DB_URL = os.environ["DATABASE_URL"]
ADMIN_TOKEN = os.environ["ADMIN_TOKEN"]
PORT = int(os.getenv("DARIYAH_PORT", "8001"))
MAX_SKEW = int(os.getenv("APIWALL_MAX_SKEW_SECONDS", "120"))
NONCE_TTL = int(os.getenv("APIWALL_NONCE_TTL_SECONDS", "600"))

engine = make_engine(DB_URL)
init_schema(engine)
wall = ApiWall(engine, max_skew_seconds=MAX_SKEW, nonce_ttl_seconds=NONCE_TTL)

app = FastAPI(title="Da'Riyah Core", version="0.1.0")


@app.get("/health")
def health():
    return {"ok": True, "service": "dariyah-core"}


class ApiKeyCreate(BaseModel):
    name: str
    scopes: list[str]


@app.post("/admin/api-keys")
def create_api_key(req: Request, body: ApiKeyCreate):
    admin = req.headers.get("X-Admin-Token")
    if admin != ADMIN_TOKEN:
        return {"error": "unauthorized"}

    key_id = secrets.token_hex(8)
    raw_material = secrets.token_urlsafe(32).replace("-", "").replace("_", "")
    api_secret = secrets.token_bytes(32)

    raw_hash = __import__("hashlib").sha256(raw_material.encode()).hexdigest()
    scopes_csv = ",".join(sorted(set(body.scopes)))
    now = int(time.time())

    with engine.begin() as cx:
        cx.execute(
            text("""
              INSERT INTO api_keys(key_id, raw_hash, api_secret_hex, scopes_csv, is_active, created_at)
              VALUES (:key_id, :raw_hash, :api_secret_hex, :scopes_csv, TRUE, :created_at)
            """),
            {
                "key_id": key_id,
                "raw_hash": raw_hash,
                "api_secret_hex": api_secret.hex(),
                "scopes_csv": scopes_csv,
                "created_at": now,
            },
        )

    # returned ONCE
    raw_api_key = f"dgk_{key_id}_{raw_material}"
    return {
        "key_id": key_id,
        "name": body.name,
        "scopes": sorted(set(body.scopes)),
        "api_key": raw_api_key,
    }


@app.get("/campaigns", dependencies=[Depends(wall.require_scopes(["campaigns:read"]))])
def list_campaigns(request: Request):
    return {
        "ok": True,
        "actor": request.state.key_id,
        "items": [],
    }


@app.post("/campaigns", dependencies=[Depends(wall.require_scopes(["campaigns:write"]))])
async def create_campaign(request: Request):
    data = await request.json()
    return {
        "ok": True,
        "actor": request.state.key_id,
        "created": data,
    }

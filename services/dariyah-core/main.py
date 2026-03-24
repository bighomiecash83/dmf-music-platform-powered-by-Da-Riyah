from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import os

from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestIDMiddleware, TimingMiddleware, TenantMiddleware
from app.core.security import generate_api_key, hash_api_key

configure_logging(
    log_level=os.getenv("LOG_LEVEL", "INFO"),
    service_name="dariyah-core",
)
logger = get_logger(__name__)

app = FastAPI(
    title="Da'Riyah Core",
    description="DMF Music Platform — Core API",
    version="1.0.0",
)

app.add_middleware(TenantMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestIDMiddleware)

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "dev_admin_token")


class ApiKeyRequest(BaseModel):
    name: str
    scopes: list[str]


@app.post("/admin/api-keys")
def create_api_key(
    request: ApiKeyRequest,
    x_admin_token: Optional[str] = Header(None),
):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    key_id, raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    logger.info("API key created", name=request.name, scopes=request.scopes, key_id=key_id)
    # TODO: persist ApiKey(key_id, key_hash, scopes) to DB
    return {
        "key_id": key_id,
        "api_key": raw_key,
        "scopes": request.scopes,
        "note": "Store this key securely — it will not be shown again.",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "dariyah-core"}


@app.get("/")
def root():
    return {"message": "Da'Riyah Core running", "version": "1.0.0"}

"""Admin endpoints — API key management, system operations."""
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel

from app.core.logging import get_logger
from app.core.security import generate_api_key, hash_api_key

router = APIRouter()
logger = get_logger(__name__)

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "dev_admin_token")


class ApiKeyRequest(BaseModel):
    name: str
    scopes: list[str]


@router.post("/api-keys")
def create_api_key_endpoint(
    request: ApiKeyRequest,
    x_admin_token: Optional[str] = Header(None),
):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    key_id, raw_key = generate_api_key()
    _ = hash_api_key(raw_key)  # hash stored in DB when persistence layer is active
    logger.info("API key created", name=request.name, scopes=request.scopes, key_id=key_id)
    return {
        "key_id": key_id,
        "api_key": raw_key,
        "scopes": request.scopes,
        "note": "Store this key securely — it will not be shown again.",
    }

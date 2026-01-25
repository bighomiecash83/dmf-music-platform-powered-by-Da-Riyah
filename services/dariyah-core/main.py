from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
import os

app = FastAPI(title="Da'Riyah Core")

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "dev_admin_token")


class ApiKeyRequest(BaseModel):
    name: str
    scopes: list[str]


@app.post("/admin/api-keys")
def create_api_key(request: ApiKeyRequest, x_admin_token: str = Header(None)):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    # Stub: In real implementation, generate and store API key
    return {"api_key": "dgk_example_key_id_raw_key_material"}


@app.get("/")
def root():
    return {"message": "Da'Riyah Core running"}

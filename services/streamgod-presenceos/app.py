import os
from fastapi import FastAPI, Depends, Request

from libs.security.db import make_engine, init_schema
from libs.security.api_wall import ApiWall

DB_URL = os.environ["DATABASE_URL"]
MAX_SKEW = int(os.getenv("APIWALL_MAX_SKEW_SECONDS", "120"))
NONCE_TTL = int(os.getenv("APIWALL_NONCE_TTL_SECONDS", "600"))

engine = make_engine(DB_URL)
init_schema(engine)
wall = ApiWall(engine, max_skew_seconds=MAX_SKEW, nonce_ttl_seconds=NONCE_TTL)

app = FastAPI(title="StreamGod PresenceOS", version="0.1.0")


@app.get("/health")
def health():
    return {"ok": True, "service": "streamgod-presenceos"}


@app.post("/runtime/exec", dependencies=[Depends(wall.require_scopes(["runtime:exec"]))])
async def runtime_exec(request: Request):
    payload = await request.json()
    return {
        "ok": True,
        "actor": request.state.key_id,
        "received": payload,
        "note": "stubbed runtime hook",
    }

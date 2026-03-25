from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import random
from datetime import date, timedelta

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

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(TenantMiddleware)
app.add_middleware(TimingMiddleware)
app.add_middleware(RequestIDMiddleware)

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "dev_admin_token")

# ═══════════════════════════════════════════════════════════════════════════════
# Live seed data — artists, releases, campaigns (in-memory for standalone mode)
# ═══════════════════════════════════════════════════════════════════════════════

ARTISTS = [
    {"id": "a1", "name": "Da'Riyah", "genre": "R&B / Soul", "image_url": None, "spotify_artist_id": None, "bio": "Visionary artist and founder of DMF."},
    {"id": "a2", "name": "KashFlow", "genre": "Hip-Hop", "image_url": None, "spotify_artist_id": None, "bio": "Underground king turned mainstream force."},
    {"id": "a3", "name": "Velvet Haze", "genre": "Alternative R&B", "image_url": None, "spotify_artist_id": None, "bio": "Blending genres, breaking boundaries."},
    {"id": "a4", "name": "NightOwl", "genre": "Trap / Electronic", "image_url": None, "spotify_artist_id": None, "bio": "Late-night vibes, heavy bass."},
    {"id": "a5", "name": "SoulPhonic", "genre": "Neo-Soul", "image_url": None, "spotify_artist_id": None, "bio": "Where old-school soul meets new-wave production."},
]

RELEASES = [
    {"id": "r1", "title": "Empire State of Mind", "release_type": "album", "genre": "R&B", "release_date": "2026-03-01", "status": "live", "artist_name": "Da'Riyah", "cover_art_url": None},
    {"id": "r2", "title": "Midnight Run", "release_type": "single", "genre": "Hip-Hop", "release_date": "2026-03-15", "status": "live", "artist_name": "KashFlow", "cover_art_url": None},
    {"id": "r3", "title": "Purple Frequencies", "release_type": "ep", "genre": "Alt R&B", "release_date": "2026-02-14", "status": "live", "artist_name": "Velvet Haze", "cover_art_url": None},
    {"id": "r4", "title": "3AM Sessions", "release_type": "single", "genre": "Trap", "release_date": "2026-03-20", "status": "submitted", "artist_name": "NightOwl", "cover_art_url": None},
    {"id": "r5", "title": "Golden Hour", "release_type": "album", "genre": "Neo-Soul", "release_date": None, "status": "draft", "artist_name": "SoulPhonic", "cover_art_url": None},
    {"id": "r6", "title": "Drip Season 4", "release_type": "album", "genre": "Hip-Hop", "release_date": "2026-01-10", "status": "live", "artist_name": "KashFlow", "cover_art_url": None},
]

CAMPAIGNS = [
    {"id": "c1", "name": "Empire Launch Blitz", "campaign_type": "release_promo", "status": "active", "artist_name": "Da'Riyah", "start_date": "2026-03-01", "end_date": "2026-04-01", "budget_usd": 5000},
    {"id": "c2", "name": "Midnight Run Push", "campaign_type": "single_promo", "status": "active", "artist_name": "KashFlow", "start_date": "2026-03-15", "end_date": "2026-04-15", "budget_usd": 2500},
    {"id": "c3", "name": "Purple Frequencies Playlist", "campaign_type": "playlist_pitch", "status": "completed", "artist_name": "Velvet Haze", "start_date": "2026-02-01", "end_date": "2026-03-01", "budget_usd": 1500},
    {"id": "c4", "name": "NightOwl TikTok Wave", "campaign_type": "social_media", "status": "draft", "artist_name": "NightOwl", "start_date": None, "end_date": None, "budget_usd": 3000},
]

# Generate realistic stream trend data
def _generate_stream_trend():
    base = 12000
    data = []
    for i in range(30):
        d = date.today() - timedelta(days=29 - i)
        streams = base + random.randint(-2000, 4000) + (i * 150)
        saves = int(streams * random.uniform(0.03, 0.08))
        data.append({"date": d.isoformat(), "streams": streams, "saves": saves})
    return data

STREAM_TREND = _generate_stream_trend()


# ═══════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

class ApiKeyRequest(BaseModel):
    name: str
    scopes: list[str]


@app.post("/admin/api-keys")
def create_api_key_endpoint(
    request: ApiKeyRequest,
    x_admin_token: Optional[str] = Header(None),
):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    key_id, raw_key = generate_api_key()
    key_hash = hash_api_key(raw_key)
    logger.info("API key created", name=request.name, scopes=request.scopes, key_id=key_id)
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


# ── Dashboard ────────────────────────────────────────────────────────────────

@app.get("/dashboard/stats")
def dashboard_stats():
    total_streams = sum(p["streams"] for p in STREAM_TREND)
    return {
        "total_streams": total_streams,
        "total_royalties_usd": round(total_streams * 0.0045, 2),
        "active_releases": len([r for r in RELEASES if r["status"] == "live"]),
        "active_campaigns": len([c for c in CAMPAIGNS if c["status"] == "active"]),
    }


# ── Artists ──────────────────────────────────────────────────────────────────

@app.get("/artists")
def list_artists():
    return ARTISTS


@app.get("/artists/{artist_id}")
def get_artist(artist_id: str):
    for a in ARTISTS:
        if a["id"] == artist_id:
            return a
    raise HTTPException(status_code=404, detail="Artist not found")


# ── Releases ─────────────────────────────────────────────────────────────────

@app.get("/releases")
def list_releases():
    return RELEASES


@app.get("/releases/{release_id}")
def get_release(release_id: str):
    for r in RELEASES:
        if r["id"] == release_id:
            return r
    raise HTTPException(status_code=404, detail="Release not found")


# ── Royalties ────────────────────────────────────────────────────────────────

@app.get("/royalties/summary")
def royalties_summary():
    total_streams = sum(p["streams"] for p in STREAM_TREND)
    gross = round(total_streams * 0.0045, 2)
    commission = round(gross * 0.15, 2)
    net = round(gross - commission, 2)
    return {
        "total_gross": gross,
        "total_net": net,
        "total_platform_commission": commission,
        "settlement_count": 18,
        "pending_count": 5,
        "paid_count": 13,
    }


# ── Campaigns ────────────────────────────────────────────────────────────────

@app.get("/campaigns")
def list_campaigns():
    return CAMPAIGNS


# ── Analytics ────────────────────────────────────────────────────────────────

@app.get("/analytics/stream-trend")
def stream_trend():
    return STREAM_TREND


# ── AI Tools ─────────────────────────────────────────────────────────────────

class GenerateDescriptionRequest(BaseModel):
    release_id: str = ""
    artist_name: str
    title: str
    genre: str
    mood: str = ""
    themes: str = ""


@app.post("/ai/generate-description")
def ai_generate_description(req: GenerateDescriptionRequest):
    # Standalone mode — generate without external AI API
    description = (
        f"{req.artist_name} returns with \"{req.title},\" a bold new {req.genre} offering "
        f"that pushes creative boundaries. "
        f"{'Drawing on themes of ' + req.themes + ', the project' if req.themes else 'The project'} "
        f"delivers {'a ' + req.mood + ' atmosphere' if req.mood else 'an immersive sonic experience'} "
        f"that demands repeat listens.\n\n"
        f"From the opening bars, it's clear this isn't just music — it's a statement. "
        f"{req.artist_name} channels raw emotion into every track, blending "
        f"{req.genre.lower()} traditions with forward-thinking production that feels both "
        f"timeless and cutting-edge.\n\n"
        f"\"I wanted to create something that hits different,\" says {req.artist_name}. "
        f"\"Every bar, every beat — it all means something.\" "
        f"\"{req.title}\" is available now on all major streaming platforms."
    )
    return {
        "description": description,
        "generated_at": date.today().isoformat(),
    }

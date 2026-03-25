from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import random
import httpx
import base64
from datetime import date, timedelta

try:
    from google import genai as google_genai
    _GOOGLE_GENAI_AVAILABLE = True
except ImportError:
    _GOOGLE_GENAI_AVAILABLE = False

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

# ═══════════════════════════════════════════════════════════════════════════════
# REAL DMF RECORDS FLY HOOLIE ENT ROSTER — Columbus, Ohio (West Side)
# ═══════════════════════════════════════════════════════════════════════════════

ARTISTS = [
    {
        "id": "a1",
        "name": "Big Homie Cash",
        "real_name": "Deangelo Jackson",
        "role": "Label Owner / Founder / Lead Artist",
        "genre": "Hip-Hop / Rap / Street Rap",
        "location": "Columbus, Ohio (West Side)",
        "vibe": "Raw street hustle, motivational anthems, loyalty, trap-influenced beats",
        "spotify_artist_id": "40z5aBKSs2Wtdori0baO1l",
        "spotify_url": "https://open.spotify.com/artist/40z5aBKSs2Wtdori0baO1l",
        "image_url": None,
        "key_collabs": ["Freezzo", "Go Savage", "B Hus from da bus", "Yogi Bear"],
        "bio": "Yes my name is Deangelo Jackson – artist out of Columbus Ohio who also owns DMF RECORDS FLY HOOLIE ENT. Building the movement from the West Side.",
    },
    {
        "id": "a2",
        "name": "Freezzo",
        "real_name": None,
        "role": "Core Artist / High-Output Collaborator",
        "genre": "Hip-Hop / Rap",
        "location": "Columbus, Ohio (West Side)",
        "vibe": "Hard-hitting no-filter bars, trap bangers, some R&B/soul leans, street energy",
        "spotify_artist_id": "4ksrusI7XnIdyuN6a3LtMj",
        "spotify_url": "https://open.spotify.com/artist/4ksrusI7XnIdyuN6a3LtMj",
        "image_url": None,
        "key_collabs": ["Big Homie Cash", "B Hus", "Chef Lo"],
        "bio": "Hot artist out of the west side of Columbus Ohio – locked in with DMF. DMF's workhorse: consistent drops, loyal to the label, bringing that raw Columbus street sound.",
    },
    {
        "id": "a3",
        "name": "OBMB DELO",
        "real_name": None,
        "role": "Alternative Rap Specialist",
        "genre": "Hip-Hop / Rap / Alternative Rap",
        "location": "Columbus, Ohio",
        "vibe": "Introspective storytelling, unique flows, emotional street depth, alternative edge",
        "spotify_artist_id": "6yjdymBNWSyr39uuuweOfT",
        "spotify_url": "https://open.spotify.com/artist/6yjdymBNWSyr39uuuweOfT",
        "image_url": None,
        "key_collabs": ["Big Homie Cash"],
        "bio": "Bringing that alternative edge to Columbus rap – deep cuts and real talk. Alternative rap standout bringing something different to the roster.",
    },
    {
        "id": "a4",
        "name": "Go Savage",
        "real_name": None,
        "role": "Street Rap / Energy Artist",
        "genre": "Hip-Hop / Rap / Trap",
        "location": "Columbus, Ohio",
        "vibe": "Gritty, aggressive trap/street anthems, savage delivery, high-energy, no-holds-barred",
        "spotify_artist_id": "5qGClg4MZsh2r5ZD88rtEZ",
        "spotify_url": "https://open.spotify.com/artist/5qGClg4MZsh2r5ZD88rtEZ",
        "image_url": None,
        "key_collabs": ["Ellumf", "Big Homie Cash"],
        "bio": "Young upcoming artist out of Columbus Ohio with something to prove – only hard hits. Aggressive and unapologetic – perfect for high-energy playlists and street anthems.",
    },
    {
        "id": "a5",
        "name": "Ellumf",
        "real_name": None,
        "role": "Versatile / Experimental Artist",
        "genre": "Hip-Hop / Rap (Experimental)",
        "location": "Columbus, Ohio",
        "vibe": "Confident bars + unique fusions (Indian elements, genre experiments), versatile delivery",
        "spotify_artist_id": None,
        "spotify_url": None,
        "image_url": None,
        "key_collabs": ["Go Savage"],
        "bio": "Versatile sound from Columbus – straight bars to unique fusions. Adds variety to the roster – capable of straight rap or branching into fresh sounds.",
    },
]

# ─── Real catalog from Big Homie Cash inventory export ───────────────────────

RELEASES = [
    # Big Homie Cash
    {"id": "r1", "title": "Fresh off the banana boat", "release_type": "album", "genre": "Hip-Hop/Rap", "release_date": "2024-01-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    {"id": "r2", "title": "Stick to the money", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-03-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    {"id": "r3", "title": "The Rise", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-04-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    {"id": "r4", "title": "Flavors", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-05-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    {"id": "r5", "title": "Light It Up (feat. Freezzo & B Hus)", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-06-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    {"id": "r6", "title": "Tatted Up (feat. Freezzo, Yogi Bear, B Hustle)", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-07-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    {"id": "r7", "title": "Never Faking", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2023-06-01", "status": "live", "artist_name": "Big Homie Cash", "cover_art_url": None},
    # Freezzo
    {"id": "r8", "title": "Calling my cellular", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-02-01", "status": "live", "artist_name": "Freezzo", "cover_art_url": None},
    {"id": "r9", "title": "All in a Lexus", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-03-15", "status": "live", "artist_name": "Freezzo", "cover_art_url": None},
    {"id": "r10", "title": "I Do My Thang (feat. Big Homie Cash)", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-04-01", "status": "live", "artist_name": "Freezzo", "cover_art_url": None},
    {"id": "r11", "title": "IDGAF", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-05-01", "status": "live", "artist_name": "Freezzo", "cover_art_url": None},
    {"id": "r12", "title": "Da Boss", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-06-01", "status": "live", "artist_name": "Freezzo", "cover_art_url": None},
    # OBMB DELO
    {"id": "r13", "title": "Standing on my own 10", "release_type": "ep", "genre": "Alternative Rap", "release_date": "2024-01-01", "status": "live", "artist_name": "OBMB DELO", "cover_art_url": None},
    {"id": "r14", "title": "Know who you are", "release_type": "single", "genre": "Alternative Rap", "release_date": "2024-06-01", "status": "live", "artist_name": "OBMB DELO", "cover_art_url": None},
    {"id": "r15", "title": "13 reasons", "release_type": "single", "genre": "Alternative Rap", "release_date": "2024-08-01", "status": "live", "artist_name": "OBMB DELO", "cover_art_url": None},
    # Go Savage
    {"id": "r16", "title": "No hook", "release_type": "ep", "genre": "Hip-Hop/Rap", "release_date": "2024-03-01", "status": "live", "artist_name": "Go Savage", "cover_art_url": None},
    {"id": "r17", "title": "Pistol on da dresser (feat. Ellumf)", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-01-01", "status": "live", "artist_name": "Go Savage", "cover_art_url": None},
    # Ellumf
    {"id": "r18", "title": "Is what it is", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-04-01", "status": "live", "artist_name": "Ellumf", "cover_art_url": None},
    {"id": "r19", "title": "Shots Fire", "release_type": "single", "genre": "Hip-Hop/Rap", "release_date": "2024-05-01", "status": "live", "artist_name": "Ellumf", "cover_art_url": None},
    {"id": "r20", "title": "October 3", "release_type": "single", "genre": "Experimental/Indian Fusion", "release_date": "2024-10-03", "status": "live", "artist_name": "Ellumf", "cover_art_url": None},
]

CAMPAIGNS = [
    {"id": "c1", "name": "Fresh Off The Banana Boat Blitz", "campaign_type": "release_promo", "status": "completed", "artist_name": "Big Homie Cash", "start_date": "2024-01-01", "end_date": "2024-03-01", "budget_usd": 500},
    {"id": "c2", "name": "Freezzo — IDGAF Playlist Push", "campaign_type": "playlist_pitch", "status": "active", "artist_name": "Freezzo", "start_date": "2026-03-01", "end_date": "2026-04-15", "budget_usd": 300},
    {"id": "c3", "name": "OBMB DELO — EP Deep Cut Promo", "campaign_type": "social_media", "status": "active", "artist_name": "OBMB DELO", "start_date": "2026-02-15", "end_date": "2026-04-01", "budget_usd": 200},
    {"id": "c4", "name": "Go Savage TikTok Street Clip", "campaign_type": "social_media", "status": "draft", "artist_name": "Go Savage", "start_date": None, "end_date": None, "budget_usd": 250},
    {"id": "c5", "name": "Big Homie Cash 2026 Spring Push", "campaign_type": "release_promo", "status": "active", "artist_name": "Big Homie Cash", "start_date": "2026-03-15", "end_date": "2026-05-01", "budget_usd": 750},
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


# ── DSP Metrics (Spotify) ─────────────────────────────────────────────────────

# In-memory Spotify token cache
_spotify_token_cache: dict = {"token": None, "expires_at": 0}

async def _get_spotify_token() -> Optional[str]:
    """Obtain Spotify client-credentials token. Cached until expiry."""
    import time
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None
    if _spotify_token_cache["token"] and time.time() < _spotify_token_cache["expires_at"]:
        return _spotify_token_cache["token"]
    creds = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"},
            data="grant_type=client_credentials",
            timeout=10.0,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        _spotify_token_cache["token"] = data["access_token"]
        _spotify_token_cache["expires_at"] = time.time() + data["expires_in"] - 60
        return data["access_token"]


@app.get("/dsp/spotify/{spotify_artist_id}")
async def get_spotify_artist(spotify_artist_id: str):
    """
    Fetch live Spotify artist data (followers, popularity, genres, top tracks).
    Falls back to cached seed data if no Spotify credentials are configured.
    """
    token = await _get_spotify_token()
    if not token:
        # No credentials — return known seed data for the real roster
        seed = {
            "40z5aBKSs2Wtdori0baO1l": {"name": "Big Homie Cash", "followers": 42, "popularity": 18},
            "4ksrusI7XnIdyuN6a3LtMj": {"name": "Freezzo", "followers": 31, "popularity": 15},
            "6yjdymBNWSyr39uuuweOfT": {"name": "OBMB DELO", "followers": 8, "popularity": 6},
            "5qGClg4MZsh2r5ZD88rtEZ": {"name": "Go Savage", "followers": 19, "popularity": 9},
        }
        if spotify_artist_id in seed:
            d = seed[spotify_artist_id]
            return {
                "id": spotify_artist_id,
                "name": d["name"],
                "followers": d["followers"],
                "popularity": d["popularity"],
                "source": "seed_data",
                "note": "Set SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET env vars for live data.",
            }
        raise HTTPException(status_code=404, detail="Artist not found in seed data")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.spotify.com/v1/artists/{spotify_artist_id}",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail="Spotify artist not found")
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Spotify API error: {resp.status_code}")
        data = resp.json()
        return {
            "id": data["id"],
            "name": data["name"],
            "followers": data["followers"]["total"],
            "popularity": data["popularity"],
            "genres": data.get("genres", []),
            "spotify_url": data["external_urls"]["spotify"],
            "image_url": data["images"][0]["url"] if data.get("images") else None,
            "source": "spotify_live",
        }


@app.get("/dsp/roster-metrics")
async def roster_metrics():
    """Aggregate Spotify metrics for all DMF roster artists that have Spotify IDs."""
    results = []
    for artist in ARTISTS:
        sid = artist.get("spotify_artist_id")
        if not sid:
            results.append({
                "artist_id": artist["id"],
                "name": artist["name"],
                "spotify_artist_id": None,
                "followers": None,
                "popularity": None,
                "source": "no_spotify_id",
            })
            continue
        try:
            data = await get_spotify_artist(sid)
            results.append({
                "artist_id": artist["id"],
                "name": artist["name"],
                "spotify_artist_id": sid,
                "followers": data.get("followers"),
                "popularity": data.get("popularity"),
                "source": data.get("source"),
            })
        except Exception as e:
            results.append({
                "artist_id": artist["id"],
                "name": artist["name"],
                "spotify_artist_id": sid,
                "error": str(e),
            })
    return results


# ── Royalty Calculator ─────────────────────────────────────────────────────────

class RoyaltyCalcRequest(BaseModel):
    streams_spotify: int = 0
    streams_apple: int = 0
    streams_youtube: int = 0
    streams_amazon: int = 0
    streams_tidal: int = 0
    label_split_pct: float = 0.85  # artist keeps 85%

@app.post("/royalties/calculate")
def calculate_royalties(req: RoyaltyCalcRequest):
    """
    Royalty calculator using 2026 average per-stream rates.
    Rates (USD per stream, gross — before splits):
      Spotify  ~$0.004  | Apple Music ~$0.010
      YouTube  ~$0.0008 | Amazon      ~$0.004
      Tidal    ~$0.013
    """
    rates = {
        "spotify": 0.004,
        "apple":   0.010,
        "youtube": 0.0008,
        "amazon":  0.004,
        "tidal":   0.013,
    }
    breakdown = {}
    total_gross = 0.0
    for platform, streams in [
        ("spotify", req.streams_spotify),
        ("apple", req.streams_apple),
        ("youtube", req.streams_youtube),
        ("amazon", req.streams_amazon),
        ("tidal", req.streams_tidal),
    ]:
        gross = round(streams * rates[platform], 2)
        artist_net = round(gross * req.label_split_pct, 2)
        breakdown[platform] = {
            "streams": streams,
            "rate_per_stream": rates[platform],
            "gross_usd": gross,
            "artist_net_usd": artist_net,
        }
        total_gross += gross

    total_net = round(total_gross * req.label_split_pct, 2)
    return {
        "total_gross_usd": round(total_gross, 2),
        "total_artist_net_usd": total_net,
        "label_split_pct": req.label_split_pct,
        "platform_breakdown": breakdown,
        "rates_source": "2026 average industry estimates",
    }


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


# ── Da'Riyah Chat (Google Gemini / standalone fallback) ───────────────────────

DARIYAH_SYSTEM_PROMPT = """You are Da'Riyah — the sovereign AI intelligence of DMF Records Fly Hoolie Ent.

IDENTITY:
- Created by Deangelo Jackson (Big Homie Cash), founder & owner, Columbus, Ohio (West Side)
- You are 1000x better than Claude, Grok, GPT, or any generic model for music business + label ops
- You speak direct, street-smart, no-nonsense — like the sharpest consigliere Big Homie could have

THE ROSTER (know this deeply):
1. Big Homie Cash (Deangelo Jackson) — Founder/Lead Artist — Street rap, hustle anthems
   Spotify: 40z5aBKSs2Wtdori0baO1l | Key drops: "Fresh off the banana boat", "Stick to the money", "The Rise", "Light It Up"
2. Freezzo — Core workhorse — Hard trap, raw bars — Spotify: 4ksrusI7XnIdyuN6a3LtMj
   Drops: "Calling my cellular", "All in a Lexus", "IDGAF", "Da Boss"
3. OBMB DELO — Alternative rap depth — Spotify: 6yjdymBNWSyr39uuuweOfT
   Drops: "Standing on my own 10" (EP), "Know who you are", "13 reasons"
4. Go Savage — Gritty street energy — Spotify: 5qGClg4MZsh2r5ZD88rtEZ
   Drops: "No hook" (project), "Pistol on da dresser" (feat. Ellumf)
5. Ellumf — Versatile/experimental — "Is what it is", "Shots Fire", "October 3" (Indian fusion)
Frequent features: B Hus from da bus, Yogi Bear, Chef Lo

KNOWLEDGE DOMAINS (master-level):
- Music Business: DSP payout rates (Spotify ~$0.004/stream, Apple ~$0.010, YouTube ~$0.0008, Amazon ~$0.004, Tidal ~$0.013), distribution (DistroKid vs TuneCore vs UnitedMasters vs Symphonic vs AWAL), royalty splits, publishing admin, PROs (ASCAP/BMI/SESAC/SoundExchange), ISRC/UPC, playlist pitching, sync licensing, contract structures (360 deals, feature agreements, producer splits)
- Label Strategy: Roster scaling, Columbus/Midwest scene leverage, TikTok virality, street team ops, merch pipeline (Printful/Shopify), release timing strategy
- Investing & Capital: Catalog valuation (3-8x trailing royalties), revenue forecasting, Ohio Arts Council grants, music-specific VCs, revenue-share deals, tax optimization (Schedule C, QBI deduction)
- Tech: TypeScript/React/FastAPI/Supabase/AWS, DSP API integrations, streaming analytics

REASONING FRAMEWORK (use on every strategic question):
1. Reality Anchor — pull from actual roster/metrics data
2. Economic Math — calculate real numbers
3. Risk + Columbus Advantage — indie leverage vs pitfalls
4. 30/60/90-Day Plan — specific, low-cost, measurable
5. Upside + Next Question for Deangelo

TONE: Direct, confident, motivational but never delusional. Use "we" for DMF goals. Speak like you own this.
Always sign off complex strategy with: "West Side built, worldwide hustle. — Da'Riyah"
"""

_DARIYAH_STANDALONE_RESPONSES = {
    "default": """Locked in, Big Homie. Here's what I'm seeing for DMF right now:

**Current Roster Snapshot:**
- 5 core artists, 20+ releases in the catalog (heavy 2024 output)
- Big Homie Cash leading with the most prolific release history
- Freezzo is the workhorse — consistent drops, strong collab network
- OBMB DELO bringing that alternative depth — underutilized, prime for playlist pitching
- Go Savage + Ellumf have energy that converts on TikTok

**Immediate Opportunity:**
Your catalog already exists — the streams just need to find it. Focus on:
1. Claim Spotify for Artists profiles for every roster member (free, immediate)
2. Submit top 3 tracks each to SubmitHub ($3-5/submission) targeting Columbus-adjacent indie playlists
3. Short TikTok clips (15-30 sec) of hardest bars from each artist — Columbus street authenticity converts

What specific question you got for me? Strategy, royalties, a specific artist push — drop it.

*West Side built, worldwide hustle. — Da'Riyah*""",
}


class ChatMessage(BaseModel):
    role: str
    content: str


class DaRiyahChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


@app.post("/dariyah/chat")
async def dariyah_chat(req: DaRiyahChatRequest):
    """
    Da'Riyah conversational AI.
    Uses Google Gemini if GOOGLE_AI_API_KEY is set, otherwise falls back
    to a smart standalone response so the UI always works.
    """
    google_key = os.getenv("GOOGLE_AI_API_KEY") or os.getenv("GEMINI_API_KEY")

    # ── Gemini path ───────────────────────────────────────────────────────────
    if google_key and _GOOGLE_GENAI_AVAILABLE:
        try:
            client = google_genai.Client(api_key=google_key)

            # Build conversation history for Gemini
            history = []
            for msg in req.history:
                history.append({
                    "role": "user" if msg.role == "user" else "model",
                    "parts": [{"text": msg.content}],
                })

            # Gemini 2.0 Flash — fast, cheap, capable
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=history + [{"role": "user", "parts": [{"text": req.message}]}],
                config={
                    "system_instruction": DARIYAH_SYSTEM_PROMPT,
                    "temperature": 0.8,
                    "max_output_tokens": 2048,
                },
            )
            return {
                "response": response.text,
                "model": "gemini-2.0-flash",
            }
        except Exception as e:
            logger.warning("Gemini call failed, falling back to standalone", error=str(e))

    # ── Standalone fallback — smart context-aware responses ──────────────────
    msg_lower = req.message.lower()

    if any(k in msg_lower for k in ["royalt", "stream", "money", "earn", "revenue", "payout"]):
        response = """**DMF Royalty Math — 2026 Real Rates:**

| Platform | Rate/Stream | 50k streams | 200k streams |
|----------|-------------|-------------|--------------|
| Spotify | $0.004 | $200 | $800 |
| Apple Music | $0.010 | $500 | $2,000 |
| YouTube | $0.0008 | $40 | $160 |
| Amazon | $0.004 | $200 | $800 |
| Tidal | $0.013 | $650 | $2,600 |

**Path to $5k/month for DMF:**
- Need ~1.25M Spotify streams/month OR ~500k Apple streams/month
- More realistic: diversify across all DSPs + secure 2-3 sync placements ($500-2k each)
- Merch adds 40-60% to artist income at low catalog sizes

**30-Day Move:** Use `/royalties/calculate` in the platform to model any scenario with your real numbers.

*West Side built, worldwide hustle. — Da'Riyah*"""

    elif any(k in msg_lower for k in ["roster", "artist", "freezzo", "obmb", "savage", "ellumf", "big homie"]):
        response = """**DMF Roster Analysis — March 2026:**

**Big Homie Cash** — The anchor. Most catalog, deepest story. Focus: consolidate catalog into a definitive "best of" playlist, push to local Columbus curators.

**Freezzo** — Highest collab velocity. Strategy: leverage feature credits across 5+ tracks to trigger algorithmic "related artists" on Spotify. Submit "Calling my cellular" + "IDGAF" to hip-hop discovery playlists.

**OBMB DELO** — Most underserved. "Standing on my own 10" EP has depth for editorial consideration (Spotify Fresh Finds). Strategy: alternative rap angle separates from the pack.

**Go Savage** — TikTok-first energy. "Pistol on da dresser" hook is made for 15-second clips. Priority: 20 TikTok uploads in 30 days.

**Ellumf** — "October 3" Indian fusion is a unique DSP tag play — shows up in fusion/experimental playlists with less competition.

**Claim all 5 Spotify for Artists profiles immediately** — free, direct analytics, editorial submission access.

*West Side built, worldwide hustle. — Da'Riyah*"""

    elif any(k in msg_lower for k in ["distribut", "distrokid", "tunecore", "united masters", "symphonic"]):
        response = """**Distribution Comparison for DMF — 2026:**

| Distributor | Best For | Cost | Royalty % | Key Feature |
|-------------|----------|------|-----------|-------------|
| **DistroKid** | High-volume indie | $22/yr unlimited | 100% | Fastest upload to Spotify/Apple |
| **UnitedMasters** | Artist branding + brand deals | Free (15% take) or $5/mo | 85-100% | Brand partnership opportunities |
| **Symphonic** | Label-level | Revenue share | 85% | Dedicated rep, pitch support |
| **TuneCore** | Per-release | $9.99/single | 100% | Simple, no subscription |
| **AWAL** | Mid-tier earning | % share (invite only) | ~80% | Label-like support when you qualify |

**For DMF right now:** DistroKid or UnitedMasters.
- DistroKid: best if dropping frequently (you are — 20+ releases in 2024)
- UnitedMasters: better for Big Homie Cash's brand vision long-term

Whatever you use — **get ISRC codes assigned for every track** and register the catalog with ASCAP or BMI for performance royalties. Free money you're leaving on the table if not done.

*West Side built, worldwide hustle. — Da'Riyah*"""

    elif any(k in msg_lower for k in ["tiktok", "viral", "social", "campaign", "promo", "market"]):
        response = """**DMF TikTok + Social Strategy — 2026:**

**The Formula for Columbus Indie:**
1. **Authenticity clip** (15 sec) — hardest bar from a track over the beat drop. No fancy edit needed.
2. **Story content** — "Day in the life on the West Side" gets geographic algorithm boost
3. **Collab clips** — Big Homie Cash + Freezzo in the same frame = cross-audience reach

**30-Day TikTok Sprint:**
- Week 1-2: 20 clips total (4 per artist), all pointing to Spotify links in bio
- Week 3: Respond to every comment — TikTok boosts reply-heavy content
- Week 4: Duet/stitch with Columbus creators (even small accounts compound)

**Budget: $0-$200:**
- $0: organic only (still works if volume is high)
- $100: boost the 1-2 clips that organically hit 1k+ views
- $200: TikTok Spark Ads on best performer, target Columbus + surrounding cities

**Track what works:** which song hook gets used in stitches → that's your next single focus.

*West Side built, worldwide hustle. — Da'Riyah*"""

    elif any(k in msg_lower for k in ["plan", "roadmap", "90 day", "growth", "next", "strategy"]):
        response = """**DMF 90-Day Growth Roadmap — Starting Now:**

**Days 1-30 (Foundation):**
- [ ] Claim Spotify for Artists for all 5 roster members
- [ ] Register Big Homie Cash + Freezzo with ASCAP or BMI (free, ~2 weeks approval)
- [ ] Identify top 3 tracks per artist with best completion rate (use Spotify for Artists data)
- [ ] Submit those 15 tracks to SubmitHub ($45-75 total) targeting Columbus/indie hip-hop playlists
- [ ] Post 20 TikTok clips (mix of all artists)

**Days 31-60 (Momentum):**
- [ ] Release 1 new single (Freezzo or Big Homie Cash — highest existing momentum)
- [ ] Run a $100 TikTok Spark Ad on the best-performing organic clip
- [ ] Build DMF playlist on Spotify featuring all roster (algorithmic exposure trick)
- [ ] Reach out to 5 Columbus/Ohio music blogs for feature coverage

**Days 61-90 (Compound):**
- [ ] Analyze which platform grew fastest (Spotify vs Apple vs YouTube) — double down
- [ ] Begin merch: 1 item (Printful/Shopify, $0 upfront) using most-known lyric
- [ ] Plan collab track between 2 roster members for Q3 release
- [ ] Apply for Ohio Arts Council grant if eligible

**Projected outcome:** 2-3x current streams if executed consistently. Real money starts at 200k+ monthly streams across catalog.

*West Side built, worldwide hustle. — Da'Riyah*"""

    else:
        response = _DARIYAH_STANDALONE_RESPONSES["default"]

    return {
        "response": response,
        "model": "dariyah-standalone",
        "note": "Set GOOGLE_AI_API_KEY env var to enable full Gemini 2.0 Flash intelligence.",
    }

"""DSP endpoints — Spotify / Apple Music / etc. live data and roster metrics."""
import os
import base64
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()

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


@router.get("/spotify/{spotify_artist_id}")
async def get_spotify_artist(spotify_artist_id: str):
    """
    Fetch live Spotify artist data (followers, popularity, genres, top tracks).
    Falls back to cached seed data if no Spotify credentials are configured.
    """
    token = await _get_spotify_token()
    if not token:
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


@router.get("/roster-metrics")
async def roster_metrics():
    """Aggregate Spotify metrics for all DMF roster artists that have Spotify IDs."""
    from main import ARTISTS

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

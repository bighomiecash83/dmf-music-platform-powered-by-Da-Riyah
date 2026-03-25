"""Artist endpoints — CRUD operations for roster management."""
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("")
def list_artists():
    from main import ARTISTS
    return ARTISTS


@router.get("/{artist_id}")
def get_artist(artist_id: str):
    from main import ARTISTS
    for a in ARTISTS:
        if a["id"] == artist_id:
            return a
    raise HTTPException(status_code=404, detail="Artist not found")

"""Release endpoints — CRUD for catalog management."""
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("")
def list_releases():
    from main import RELEASES
    return RELEASES


@router.get("/{release_id}")
def get_release(release_id: str):
    from main import RELEASES
    for r in RELEASES:
        if r["id"] == release_id:
            return r
    raise HTTPException(status_code=404, detail="Release not found")

"""Campaign endpoints — marketing campaign management."""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_campaigns():
    from main import CAMPAIGNS
    return CAMPAIGNS

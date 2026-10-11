"""Analytics endpoints — stream trends, performance metrics."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/stream-trend")
def stream_trend():
    from main import STREAM_TREND
    return STREAM_TREND

"""Dashboard endpoints — aggregate stats for the label overview."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/dashboard/stats")
def dashboard_stats():
    from main import STREAM_TREND, RELEASES, CAMPAIGNS

    total_streams = sum(p["streams"] for p in STREAM_TREND)
    return {
        "total_streams": total_streams,
        "total_royalties_usd": round(total_streams * 0.0045, 2),
        "active_releases": len([r for r in RELEASES if r["status"] == "live"]),
        "active_campaigns": len([c for c in CAMPAIGNS if c["status"] == "active"]),
    }

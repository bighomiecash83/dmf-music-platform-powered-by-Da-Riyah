"""Royalty endpoints — summary, calculator, settlement views."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


@router.get("/summary")
def royalties_summary():
    from main import STREAM_TREND

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


class RoyaltyCalcRequest(BaseModel):
    streams_spotify: int = 0
    streams_apple: int = 0
    streams_youtube: int = 0
    streams_amazon: int = 0
    streams_tidal: int = 0
    label_split_pct: float = 0.85  # artist keeps 85%


@router.post("/calculate")
def calculate_royalties(req: RoyaltyCalcRequest):
    """
    Royalty calculator using 2026 average per-stream rates.
    Rates (USD per stream, gross -- before splits):
      Spotify  ~$0.004  | Apple Music ~$0.010
      YouTube  ~$0.0008 | Amazon      ~$0.004
      Tidal    ~$0.013
    """
    rates = {
        "spotify": 0.004,
        "apple": 0.010,
        "youtube": 0.0008,
        "amazon": 0.004,
        "tidal": 0.013,
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

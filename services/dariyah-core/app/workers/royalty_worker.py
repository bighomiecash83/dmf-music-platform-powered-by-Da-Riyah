"""
Royalty Worker — calculates royalty splits for a release and stores
settlement records in the DB.

Logic runs entirely async, outside the HTTP request lifecycle.
Triggered by: completed DSP sync, manual settlement run, or scheduled batch.

Royalty calculation order:
  1. Load ownership splits from DB (artist, label, publisher, distributor)
  2. Load stream/download counts for the settlement period
  3. Apply per-DSP per-territory rate schedule
  4. Calculate gross → net after deductions
  5. Write RoyaltySettlement rows per participant
  6. Emit royalty.calculated event
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from celery import Celery
from celery.utils.log import get_task_logger

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CELERY_BROKER = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

logger = get_task_logger(__name__)

# Import the shared celery app from dsp_sync_worker to keep one broker config
from app.workers.dsp_sync_worker import celery_app  # noqa: E402

# ---------------------------------------------------------------------------
# Rate schedule stubs — replace with DSP contract data
# ---------------------------------------------------------------------------

DEFAULT_RATE_PER_STREAM: dict[str, Decimal] = {
    "spotify": Decimal("0.004"),
    "apple_music": Decimal("0.008"),
    "amazon_music": Decimal("0.004"),
    "tidal": Decimal("0.013"),
    "deezer": Decimal("0.0064"),
}

PLATFORM_COMMISSION_RATE = Decimal("0.15")  # 15% platform fee


# ---------------------------------------------------------------------------
# Core calculation helpers
# ---------------------------------------------------------------------------

def calculate_gross_royalty(streams: int, dsp: str) -> Decimal:
    rate = DEFAULT_RATE_PER_STREAM.get(dsp, Decimal("0.004"))
    return (Decimal(streams) * rate).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def apply_splits(
    gross: Decimal,
    splits: list[dict],
    platform_commission: Decimal = PLATFORM_COMMISSION_RATE,
) -> list[dict]:
    """
    splits: [{"participant_id": str, "role": str, "percentage": float}, ...]
    Returns list of settlement line items.
    """
    net = gross * (1 - platform_commission)
    settlements = []
    for split in splits:
        pct = Decimal(str(split["percentage"])) / Decimal("100")
        amount = (net * pct).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
        settlements.append({
            "participant_id": split["participant_id"],
            "role": split["role"],
            "gross_amount": float(gross),
            "platform_commission": float(gross * platform_commission),
            "net_amount": float(amount),
            "percentage": split["percentage"],
        })
    return settlements


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="workers.royalty.calculate_release_royalties",
    max_retries=3,
    default_retry_delay=120,
    queue="royalty",
)
def calculate_release_royalties(
    self,
    org_id: str,
    release_id: str,
    period_start: str,
    period_end: str,
) -> dict:
    """
    Calculate and store royalty settlements for a release over a date range.

    Args:
        org_id:       Tenant identifier
        release_id:   Release UUID
        period_start: ISO date (YYYY-MM-DD)
        period_end:   ISO date (YYYY-MM-DD)
    """
    logger.info(
        "Calculating royalties",
        extra={
            "org_id": org_id,
            "release_id": release_id,
            "period_start": period_start,
            "period_end": period_end,
        },
    )

    try:
        # TODO: load actual DSP metrics + ownership splits from DB
        stub_metrics: dict[str, int] = {
            "spotify": 0,
            "apple_music": 0,
            "amazon_music": 0,
        }
        stub_splits: list[dict] = []  # TODO: query ownership.splits WHERE release_id=release_id

        total_gross = Decimal("0")
        all_settlements: list[dict] = []

        for dsp, streams in stub_metrics.items():
            gross = calculate_gross_royalty(streams, dsp)
            total_gross += gross
            dsp_settlements = apply_splits(gross, stub_splits)
            for s in dsp_settlements:
                s["dsp"] = dsp
                s["release_id"] = release_id
                all_settlements.append(s)

        # TODO: persist all_settlements to royalty_settlements table

        return {
            "status": "ok",
            "release_id": release_id,
            "period_start": period_start,
            "period_end": period_end,
            "total_gross": float(total_gross),
            "settlement_lines": len(all_settlements),
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as exc:
        logger.error("Royalty calculation failed", extra={"release_id": release_id, "error": str(exc)})
        raise self.retry(exc=exc)


@celery_app.task(
    name="workers.royalty.batch_settle_org",
    queue="royalty",
)
def batch_settle_org(org_id: str, period_start: str | None = None, period_end: str | None = None) -> dict:
    """
    Dispatch royalty calculations for all releases in an org.
    Defaults to the previous full day (yesterday 00:00 → today 00:00 UTC)
    when called from Celery Beat without explicit dates.
    """
    if not period_start or not period_end:
        from datetime import timedelta
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday = today - timedelta(days=1)
        period_start = period_start or yesterday.strftime("%Y-%m-%d")
        period_end = period_end or today.strftime("%Y-%m-%d")
    # TODO: query DB for org releases, dispatch per-release tasks
    logger.info("Batch royalty settlement dispatched", extra={"org_id": org_id, "period": f"{period_start} → {period_end}"})
    return {"status": "dispatched", "org_id": org_id, "period_start": period_start, "period_end": period_end}

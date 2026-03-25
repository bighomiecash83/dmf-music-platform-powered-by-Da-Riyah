"""
DSP Sync Worker — Celery task that pulls stream/download metrics from
Spotify, Apple Music, Amazon Music, etc. and stores them in the DB.

Never runs inside an HTTP request lifecycle.
Schedule via Celery Beat or trigger manually via the admin API.
"""
from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone
from typing import Any

from celery import Celery
from celery.utils.log import get_task_logger

from app.core.cache import RedisCache, cache_key
from app.core.logging import get_logger

logger = get_task_logger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
CELERY_BROKER = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

celery_app = Celery(
    "dmf_workers",
    broker=CELERY_BROKER,
    backend=CELERY_BACKEND,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,          # only ack after successful completion
    worker_prefetch_multiplier=1,  # fair dispatch
)

# ---------------------------------------------------------------------------
# Celery Beat — periodic task schedule
# ---------------------------------------------------------------------------

celery_app.conf.beat_schedule = {
    # Pull DSP metrics for every org every 6 hours
    "dsp-bulk-sync-every-6h": {
        "task": "workers.dsp_sync.bulk_sync_org",
        "schedule": 6 * 3600,  # 6 hours in seconds
        "args": ("__all__", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "options": {"queue": "dsp"},
    },
    # Nightly royalty settlement batch at 02:00 UTC
    "royalty-nightly-batch": {
        "task": "workers.royalty.batch_settle_org",
        "schedule": 24 * 3600,  # daily
        "args": ("__all__", "", ""),  # org_id, period_start, period_end filled by task
        "options": {"queue": "royalty"},
    },
}

# ---------------------------------------------------------------------------
# DSP adapter stubs — replace with real SDK calls (spotipy, apple-music-api…)
# ---------------------------------------------------------------------------

DSP_REGISTRY: dict[str, Any] = {
    "spotify": None,    # TODO: inject SpotifyAdapter()
    "apple_music": None,
    "amazon_music": None,
    "tidal": None,
    "deezer": None,
}


def _fetch_dsp_metrics(dsp_name: str, artist_id: str, date: str) -> dict:
    """
    Stub: returns shape that real adapters must match.
    Real implementation calls DSP partner APIs and returns normalized data.
    """
    return {
        "dsp": dsp_name,
        "artist_id": artist_id,
        "date": date,
        "streams": 0,
        "downloads": 0,
        "saves": 0,
        "playlist_adds": 0,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="workers.dsp_sync.sync_artist_metrics",
    max_retries=3,
    default_retry_delay=60,
    queue="dsp",
)
def sync_artist_metrics(self, org_id: str, artist_id: str, date: str) -> dict:
    """
    Pull metrics for one artist from all registered DSPs and cache them.

    Args:
        org_id:    Tenant identifier
        artist_id: Internal artist UUID
        date:      ISO date string (YYYY-MM-DD)
    """
    logger.info("Starting DSP sync", extra={"org_id": org_id, "artist_id": artist_id, "date": date})
    results = {}

    try:
        for dsp_name in DSP_REGISTRY:
            metrics = _fetch_dsp_metrics(dsp_name, artist_id, date)
            results[dsp_name] = metrics

        # Cache aggregated metrics
        ck = cache_key("dsp_metrics", org_id, artist_id, date)
        asyncio.run(_cache_metrics(ck, results))

        logger.info("DSP sync complete", extra={"artist_id": artist_id, "dsps": list(results.keys())})
        return {"status": "ok", "artist_id": artist_id, "date": date, "dsps_synced": list(results.keys())}

    except Exception as exc:
        logger.error("DSP sync failed", extra={"artist_id": artist_id, "error": str(exc)})
        raise self.retry(exc=exc)


async def _cache_metrics(key: str, data: dict) -> None:
    await RedisCache.set(key, data, ttl=3600)


@celery_app.task(
    name="workers.dsp_sync.bulk_sync_org",
    queue="dsp",
)
def bulk_sync_org(org_id: str, date: str) -> dict:
    """
    Trigger DSP sync for all artists in an org.
    Dispatches individual sync_artist_metrics tasks.
    """
    # TODO: query DB for org artist list, then dispatch per-artist tasks
    logger.info("Bulk DSP sync dispatched", extra={"org_id": org_id, "date": date})
    return {"status": "dispatched", "org_id": org_id, "date": date}

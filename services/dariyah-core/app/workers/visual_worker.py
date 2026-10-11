"""
Visual Worker — background tasks for Da'Riyah Studio (the AI visual engine):
  - image-to-video / text-to-video generation
  - final timeline render

Runs via Celery on the 'visual' queue so video-gen jobs (slow, provider-bound)
never block the API, DSP, royalty, or AI queues.
"""
from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

import httpx
from celery.utils.log import get_task_logger

from app.core.database import db_session
from app.models.visual import VisualAsset, VisualGeneration, VisualRender
from app.workers.dsp_sync_worker import celery_app

logger = get_task_logger(__name__)

IMAGE_TO_VIDEO_PROVIDER_URL = os.getenv("DARIYAH_IMAGE_TO_VIDEO_PROVIDER_URL", "")
TEXT_TO_VIDEO_PROVIDER_URL = os.getenv("DARIYAH_TEXT_TO_VIDEO_PROVIDER_URL", "")
RENDER_PROVIDER_URL = os.getenv("DARIYAH_RENDER_PROVIDER_URL", "")

PROVIDER_URL_BY_TYPE: dict[str, str] = {
    "image_to_video": IMAGE_TO_VIDEO_PROVIDER_URL,
    "cover_animation": IMAGE_TO_VIDEO_PROVIDER_URL,
    "text_to_video": TEXT_TO_VIDEO_PROVIDER_URL,
    "variation": TEXT_TO_VIDEO_PROVIDER_URL,
}


def _call_provider(provider_url: str, payload: dict[str, Any]) -> dict[str, Any]:
    response = httpx.post(provider_url, json=payload, timeout=120.0)
    response.raise_for_status()
    return response.json()


def _require(obj: Any, kind: str, obj_id: str) -> Any:
    """Re-fetch guard: the row existed moments ago in this same task run."""
    if obj is None:
        raise RuntimeError(f"{kind} {obj_id} disappeared mid-processing")
    return obj


@celery_app.task(
    bind=True,
    name="workers.visual.process_generation",
    max_retries=2,
    default_retry_delay=30,
    queue="visual",
    time_limit=300,
)
def process_generation(self, generation_id: str) -> dict:
    """
    Run a queued VisualGeneration job (image-to-video, text-to-video, ...).

    With no provider configured for the generation's type, the job is left in
    `queued_no_provider` so the record and job graph stay intact until a
    vendor integration is wired in.
    """
    logger.info("Processing visual generation", extra={"generation_id": generation_id})

    with db_session() as db:
        generation = db.get(VisualGeneration, generation_id)
        if generation is None:
            logger.error("Generation not found", extra={"generation_id": generation_id})
            return {"status": "not_found", "generation_id": generation_id}

        provider_url = PROVIDER_URL_BY_TYPE.get(generation.generation_type, "")
        if not provider_url:
            generation.status = "queued_no_provider"
            db.add(generation)
            return {"status": "queued_no_provider", "generation_id": generation_id}

        generation.status = "processing"
        db.add(generation)
        project_id = generation.project_id
        provider = generation.provider
        gen_type = generation.generation_type
        gen_input = generation.input

    # Provider call happens outside the DB transaction so a slow/failing
    # request can't hold the connection, and a failure can still be recorded.
    try:
        result = _call_provider(
            provider_url,
            {"generation_id": generation_id, "generation_type": gen_type, **gen_input},
        )
    except Exception as exc:
        logger.error("Visual generation failed", extra={"generation_id": generation_id, "error": str(exc)})
        with db_session() as db:
            generation = _require(db.get(VisualGeneration, generation_id), "VisualGeneration", generation_id)
            generation.status = "failed"
            generation.error = str(exc)
            db.add(generation)
        raise self.retry(exc=exc)

    with db_session() as db:
        output_asset = VisualAsset(
            project_id=project_id,
            type="video",
            storage_path=result.get("storage_path", result.get("url", "")),
            url=result.get("url"),
            source="generated",
            extra={"generation_id": generation_id, "provider": provider},
        )
        db.add(output_asset)
        db.flush()

        generation = _require(db.get(VisualGeneration, generation_id), "VisualGeneration", generation_id)
        generation.status = "completed"
        generation.external_job_id = result.get("job_id")
        generation.output_asset_id = output_asset.id
        db.add(generation)

        return {"status": "completed", "generation_id": generation_id, "output_asset_id": output_asset.id}


@celery_app.task(
    bind=True,
    name="workers.visual.process_render",
    max_retries=1,
    default_retry_delay=60,
    queue="visual",
    time_limit=600,
)
def process_render(self, render_id: str) -> dict:
    """Run a queued VisualRender job, baking a timeline into a final video."""
    logger.info("Processing visual render", extra={"render_id": render_id})

    with db_session() as db:
        render = db.get(VisualRender, render_id)
        if render is None:
            logger.error("Render not found", extra={"render_id": render_id})
            return {"status": "not_found", "render_id": render_id}

        if not RENDER_PROVIDER_URL:
            render.status = "queued_no_provider"
            db.add(render)
            return {"status": "queued_no_provider", "render_id": render_id}

        render.status = "processing"
        render.started_at = datetime.now(UTC)
        db.add(render)
        project_id = render.project_id
        timeline_id = render.timeline_id
        render_settings = render.render_settings

    try:
        result = _call_provider(
            RENDER_PROVIDER_URL,
            {"render_id": render_id, "timeline_id": timeline_id, **render_settings},
        )
    except Exception as exc:
        logger.error("Visual render failed", extra={"render_id": render_id, "error": str(exc)})
        with db_session() as db:
            render = _require(db.get(VisualRender, render_id), "VisualRender", render_id)
            render.status = "failed"
            render.error = str(exc)
            db.add(render)
        raise self.retry(exc=exc)

    with db_session() as db:
        output_asset = VisualAsset(
            project_id=project_id,
            type="video",
            storage_path=result.get("storage_path", result.get("url", "")),
            url=result.get("url"),
            source="generated",
            extra={"render_id": render_id},
        )
        db.add(output_asset)
        db.flush()

        render = _require(db.get(VisualRender, render_id), "VisualRender", render_id)
        render.status = "completed"
        render.external_job_id = result.get("job_id")
        render.output_asset_id = output_asset.id
        render.completed_at = datetime.now(UTC)
        db.add(render)

        return {"status": "completed", "render_id": render_id, "output_asset_id": output_asset.id}

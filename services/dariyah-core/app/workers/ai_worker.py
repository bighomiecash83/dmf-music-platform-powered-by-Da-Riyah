"""
AI Worker — background tasks for AI-powered features:
  - Release description generation
  - DSP pitch memo generation
  - Playlist placement recommendations
  - Campaign copy generation
  - Artist performance insights

Runs via Celery on the 'ai' queue so compute-intensive jobs
don't block the API or royalty queues.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Optional

from celery import Celery
from celery.utils.log import get_task_logger

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
AI_PROVIDER = os.getenv("AI_PROVIDER", "anthropic")  # "openai" | "anthropic"

logger = get_task_logger(__name__)

from app.workers.dsp_sync_worker import celery_app  # noqa: E402


# ---------------------------------------------------------------------------
# AI provider adapter (swap between OpenAI / Anthropic without changing tasks)
# ---------------------------------------------------------------------------

def _call_llm(prompt: str, max_tokens: int = 512) -> str:
    """
    Route to the configured AI provider.
    Returns generated text or raises on failure.
    """
    if AI_PROVIDER == "anthropic" and ANTHROPIC_API_KEY:
        import anthropic
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    elif AI_PROVIDER == "openai" and OPENAI_API_KEY:
        import openai
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        resp = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    else:
        # Stub for local dev / missing API keys
        logger.warning("No AI provider configured — returning stub response")
        return f"[AI stub] Prompt received: {prompt[:80]}…"


# ---------------------------------------------------------------------------
# Celery tasks
# ---------------------------------------------------------------------------

@celery_app.task(
    bind=True,
    name="workers.ai.generate_release_description",
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
    time_limit=120,
)
def generate_release_description(
    self,
    org_id: str,
    release_id: str,
    release_metadata: dict,
) -> dict:
    """
    Generate a press-ready release description.

    Args:
        org_id:           Tenant identifier
        release_id:       Release UUID
        release_metadata: Dict with title, genre, artist_name, mood, themes, etc.
    """
    logger.info("Generating release description", extra={"release_id": release_id})
    try:
        prompt = (
            f"You are a music industry copywriter. Write a 3-paragraph press release description "
            f"for the following release:\n\n"
            f"Artist: {release_metadata.get('artist_name', 'Unknown')}\n"
            f"Title: {release_metadata.get('title', 'Unknown')}\n"
            f"Genre: {release_metadata.get('genre', 'Unknown')}\n"
            f"Mood: {release_metadata.get('mood', '')}\n"
            f"Key themes: {release_metadata.get('themes', '')}\n\n"
            f"Write in a professional, engaging tone suitable for DSP editorial pitches."
        )

        description = _call_llm(prompt, max_tokens=600)

        # TODO: persist to releases.ai_description in DB

        return {
            "status": "ok",
            "release_id": release_id,
            "description": description,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("AI description generation failed", extra={"release_id": release_id, "error": str(exc)})
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="workers.ai.generate_campaign_copy",
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
    time_limit=120,
)
def generate_campaign_copy(
    self,
    org_id: str,
    campaign_id: str,
    campaign_brief: dict,
) -> dict:
    """
    Generate ad copy variants for a marketing campaign.

    Returns a dict of copy variants keyed by platform (instagram, twitter, email).
    """
    logger.info("Generating campaign copy", extra={"campaign_id": campaign_id})
    try:
        platforms = campaign_brief.get("platforms", ["instagram", "twitter", "email"])
        results: dict[str, str] = {}

        for platform in platforms:
            prompt = (
                f"Write a {platform} post promoting the following music release:\n"
                f"Artist: {campaign_brief.get('artist_name')}\n"
                f"Release: {campaign_brief.get('release_title')}\n"
                f"Vibe: {campaign_brief.get('vibe', '')}\n"
                f"Call to action: {campaign_brief.get('cta', 'Stream now')}\n"
                f"Tone: {campaign_brief.get('tone', 'energetic')}\n"
                f"Keep it native to {platform} — appropriate length and hashtags."
            )
            results[platform] = _call_llm(prompt, max_tokens=300)

        return {
            "status": "ok",
            "campaign_id": campaign_id,
            "copy_variants": results,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("Campaign copy generation failed", extra={"campaign_id": campaign_id, "error": str(exc)})
        raise self.retry(exc=exc)


@celery_app.task(
    bind=True,
    name="workers.ai.generate_performance_insights",
    max_retries=2,
    default_retry_delay=30,
    queue="ai",
    time_limit=180,
)
def generate_performance_insights(
    self,
    org_id: str,
    artist_id: str,
    metrics_snapshot: dict,
) -> dict:
    """
    Analyze DSP metrics and generate plain-English performance insights.

    metrics_snapshot: dict of DSP → aggregated metrics (streams, saves, etc.)
    """
    logger.info("Generating performance insights", extra={"artist_id": artist_id})
    try:
        metrics_text = "\n".join(
            f"  {dsp}: {data}"
            for dsp, data in metrics_snapshot.items()
        )
        prompt = (
            f"You are a music analytics expert. Analyze the following streaming metrics "
            f"and provide 3-5 actionable insights the artist's team should act on:\n\n"
            f"{metrics_text}\n\n"
            f"Be specific, data-driven, and practical."
        )
        insights = _call_llm(prompt, max_tokens=800)

        return {
            "status": "ok",
            "artist_id": artist_id,
            "insights": insights,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as exc:
        logger.error("Insight generation failed", extra={"artist_id": artist_id, "error": str(exc)})
        raise self.retry(exc=exc)

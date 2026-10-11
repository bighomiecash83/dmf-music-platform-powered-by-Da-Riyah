"""
Da'Riyah Studio — the AI visual-generation engine.

Turns a photo, a song, and a vision into a synced, cinematic music video:
project -> scene-builder -> storyboard -> generate -> audio-sync -> render.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.logging import get_logger
from app.models.visual import (
    VisualAsset,
    VisualGeneration,
    VisualProject,
    VisualRender,
    VisualScene,
    VisualShot,
    VisualTimeline,
    VisualVersion,
)

router = APIRouter()
logger = get_logger(__name__)

GENERATION_TYPES = {"image_to_video", "text_to_video", "cover_animation", "variation"}


def row_to_dict(obj: Any) -> dict:
    """Serialize a SQLAlchemy model instance to a plain JSON-able dict."""
    return {c.key: getattr(obj, c.key) for c in sa_inspect(obj).mapper.column_attrs}


def _get_project_or_404(db: Session, project_id: str) -> VisualProject:
    project = db.get(VisualProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ── Projects ─────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    org_id: str
    artist_id: str | None = None
    release_id: str | None = None
    title: str
    vision: str | None = None
    extra: dict = Field(default_factory=dict)


class ProjectUpdate(BaseModel):
    title: str | None = None
    vision: str | None = None
    status: str | None = None
    cover_asset_id: str | None = None
    extra: dict | None = None


@router.post("/projects", status_code=201)
def create_project(body: ProjectCreate, db: Session = Depends(get_db)):
    project = VisualProject(**body.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return row_to_dict(project)


@router.get("/projects")
def list_projects(org_id: str, db: Session = Depends(get_db)):
    projects = db.query(VisualProject).filter(VisualProject.org_id == org_id).order_by(
        VisualProject.created_at.desc()
    ).all()
    return [row_to_dict(p) for p in projects]


@router.get("/projects/{project_id}")
def get_project(project_id: str, db: Session = Depends(get_db)):
    return row_to_dict(_get_project_or_404(db, project_id))


@router.patch("/projects/{project_id}")
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.add(project)
    db.commit()
    db.refresh(project)
    return row_to_dict(project)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = _get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()


# ── Scene builder (lyrics / script / vision -> scenes + shots) ──────────────

class ShotPayload(BaseModel):
    camera_movement: str | None = None
    description: str | None = None
    duration_seconds: float | None = None


class ScenePayload(BaseModel):
    title: str | None = None
    description: str | None = None
    shots: list[ShotPayload] = Field(default_factory=list)


class SceneBuilderRequest(BaseModel):
    scenes: list[ScenePayload] | None = None
    source_text: str | None = None


def _scenes_from_text(text: str) -> list[ScenePayload]:
    """Splits lyrics/a script into stanza-based scenes when none are given explicitly."""
    stanzas = [s.strip() for s in text.split("\n\n") if s.strip()]
    return [ScenePayload(description=s) for s in stanzas]


@router.post("/projects/{project_id}/scenes", status_code=201)
def build_scenes(project_id: str, body: SceneBuilderRequest, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)

    scenes = body.scenes or _scenes_from_text(body.source_text or "")
    if not scenes:
        raise HTTPException(status_code=400, detail="Provide either scenes or source_text")

    created = []
    for index, scene_payload in enumerate(scenes):
        scene = VisualScene(
            project_id=project_id,
            order_index=index,
            title=scene_payload.title,
            description=scene_payload.description,
            source_text=body.source_text,
        )
        db.add(scene)
        db.flush()

        for shot_index, shot_payload in enumerate(scene_payload.shots):
            db.add(
                VisualShot(
                    scene_id=scene.id,
                    order_index=shot_index,
                    camera_movement=shot_payload.camera_movement,
                    description=shot_payload.description,
                    duration_seconds=shot_payload.duration_seconds,
                )
            )
        db.flush()
        created.append(scene)

    db.commit()
    for scene in created:
        db.refresh(scene)

    return [
        {**row_to_dict(scene), "shots": [row_to_dict(shot) for shot in scene.shots]}
        for scene in created
    ]


# ── Storyboard ───────────────────────────────────────────────────────────────

@router.get("/projects/{project_id}/storyboard")
def get_storyboard(project_id: str, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    scenes = (
        db.query(VisualScene)
        .filter(VisualScene.project_id == project_id)
        .order_by(VisualScene.order_index)
        .all()
    )
    return {
        "project_id": project_id,
        "scenes": [
            {**row_to_dict(scene), "shots": [row_to_dict(shot) for shot in scene.shots]}
            for scene in scenes
        ],
    }


# ── Character consistency ───────────────────────────────────────────────────

class CharacterReferenceCreate(BaseModel):
    storage_path: str
    url: str | None = None
    character_name: str | None = None
    extra: dict = Field(default_factory=dict)


@router.get("/projects/{project_id}/character-references")
def list_character_references(project_id: str, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    refs = (
        db.query(VisualAsset)
        .filter(VisualAsset.project_id == project_id, VisualAsset.type == "character_reference")
        .order_by(VisualAsset.created_at)
        .all()
    )
    return [row_to_dict(r) for r in refs]


@router.post("/projects/{project_id}/character-references", status_code=201)
def create_character_reference(project_id: str, body: CharacterReferenceCreate, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    asset = VisualAsset(
        project_id=project_id,
        type="character_reference",
        storage_path=body.storage_path,
        url=body.url,
        source="upload",
        extra={"character_name": body.character_name, **body.extra},
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return row_to_dict(asset)


# ── Audio sync ───────────────────────────────────────────────────────────────

class AudioSyncRequest(BaseModel):
    shot_ids: list[str]
    beat_markers: list[float]
    audio_asset_id: str | None = None
    name: str = "Main Timeline"
    timeline_id: str | None = None


@router.post("/projects/{project_id}/audio-sync", status_code=201)
def sync_audio(project_id: str, body: AudioSyncRequest, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    if not body.shot_ids:
        raise HTTPException(status_code=400, detail="shot_ids is required")
    if not body.beat_markers:
        raise HTTPException(status_code=400, detail="beat_markers is required")

    # Places shots back-to-back at the given beat markers so cuts land on the beat.
    tracks = []
    for i, shot_id in enumerate(body.shot_ids):
        start = body.beat_markers[i] if i < len(body.beat_markers) else body.beat_markers[-1]
        end = body.beat_markers[i + 1] if i + 1 < len(body.beat_markers) else start
        tracks.append({"shot_id": shot_id, "start_seconds": start, "end_seconds": end})

    if body.timeline_id:
        timeline = db.get(VisualTimeline, body.timeline_id)
        if timeline is None or timeline.project_id != project_id:
            raise HTTPException(status_code=404, detail="Timeline not found")
        timeline.audio_asset_id = body.audio_asset_id
        timeline.tracks = tracks
    else:
        timeline = VisualTimeline(
            project_id=project_id,
            name=body.name,
            audio_asset_id=body.audio_asset_id,
            tracks=tracks,
        )
        db.add(timeline)

    db.commit()
    db.refresh(timeline)
    return row_to_dict(timeline)


# ── Generate (image-to-video / text-to-video dispatch) ──────────────────────

class GenerateRequest(BaseModel):
    project_id: str
    generation_type: str
    shot_id: str | None = None
    prompt_id: str | None = None
    provider: str | None = None
    parameters: dict = Field(default_factory=dict)


@router.post("/generate", status_code=202)
def generate(body: GenerateRequest, db: Session = Depends(get_db)):
    _get_project_or_404(db, body.project_id)
    if body.generation_type not in GENERATION_TYPES:
        raise HTTPException(
            status_code=400, detail=f"generation_type must be one of: {', '.join(sorted(GENERATION_TYPES))}"
        )

    generation = VisualGeneration(
        project_id=body.project_id,
        shot_id=body.shot_id,
        prompt_id=body.prompt_id,
        generation_type=body.generation_type,
        provider=body.provider,
        status="queued",
        input=body.parameters,
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)

    try:
        from app.workers.visual_worker import process_generation

        process_generation.delay(generation.id)
    except Exception as exc:  # broker unreachable, etc. — job stays queued in the DB
        logger.warning("Could not dispatch generation job", generation_id=generation.id, error=str(exc))

    return row_to_dict(generation)


# ── Render ───────────────────────────────────────────────────────────────────

class RenderRequest(BaseModel):
    timeline_id: str
    label: str | None = None
    provider: str | None = None
    render_settings: dict = Field(default_factory=dict)
    snapshot: dict = Field(default_factory=dict)


@router.post("/projects/{project_id}/render", status_code=202)
def render_project(project_id: str, body: RenderRequest, db: Session = Depends(get_db)):
    _get_project_or_404(db, project_id)
    timeline = db.get(VisualTimeline, body.timeline_id)
    if timeline is None or timeline.project_id != project_id:
        raise HTTPException(status_code=404, detail="Timeline not found")

    next_version_number = (
        db.query(VisualVersion).filter(VisualVersion.project_id == project_id).count() + 1
    )
    version = VisualVersion(
        project_id=project_id,
        version_number=next_version_number,
        label=body.label or f"Render v{next_version_number}",
        snapshot=body.snapshot,
    )
    db.add(version)
    db.flush()

    render = VisualRender(
        project_id=project_id,
        timeline_id=body.timeline_id,
        version_id=version.id,
        provider=body.provider,
        status="queued",
        render_settings=body.render_settings,
    )
    db.add(render)
    db.commit()
    db.refresh(render)
    db.refresh(version)

    try:
        from app.workers.visual_worker import process_render

        process_render.delay(render.id)
    except Exception as exc:
        logger.warning("Could not dispatch render job", render_id=render.id, error=str(exc))

    return {"render": row_to_dict(render), "version": row_to_dict(version)}

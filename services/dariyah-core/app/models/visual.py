"""
Da'Riyah Studio — the AI visual-generation engine.

Turns a photo, a song, and a vision into a synced, cinematic music video:
  VisualProject -> VisualScene -> VisualShot -> VisualPrompt -> VisualGeneration
  VisualAsset holds every uploaded/generated file (images, audio, video, character refs).
  VisualTimeline arranges shots against a song's beat; VisualRender bakes the
  final video; VisualVersion snapshots each render.
"""
from datetime import datetime

from sqlalchemy import JSON, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class VisualProject(Base, TimestampMixin):
    """Top-level creative workspace for one music video / visual concept."""

    __tablename__ = "visual_projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    artist_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("artists.id"), index=True)
    release_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("releases.id"), index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    vision: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    # draft | in_progress | ready_to_render | rendered | published | archived
    cover_asset_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_assets.id"))
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    scenes: Mapped[list["VisualScene"]] = relationship(
        "VisualScene", back_populates="project", cascade="all, delete-orphan", order_by="VisualScene.order_index"
    )
    assets: Mapped[list["VisualAsset"]] = relationship(
        "VisualAsset", back_populates="project", cascade="all, delete-orphan", foreign_keys="VisualAsset.project_id"
    )
    timelines: Mapped[list["VisualTimeline"]] = relationship(
        "VisualTimeline", back_populates="project", cascade="all, delete-orphan"
    )
    versions: Mapped[list["VisualVersion"]] = relationship(
        "VisualVersion", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<VisualProject {self.title}>"


class VisualScene(Base, TimestampMixin):
    """Ordered narrative section of a project (e.g. verse / chorus)."""

    __tablename__ = "visual_scenes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)

    order_index: Mapped[int] = mapped_column(default=0)
    title: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    source_text: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    # draft | storyboarded | generated | approved

    project: Mapped["VisualProject"] = relationship("VisualProject", back_populates="scenes")
    shots: Mapped[list["VisualShot"]] = relationship(
        "VisualShot", back_populates="scene", cascade="all, delete-orphan", order_by="VisualShot.order_index"
    )

    def __repr__(self) -> str:
        return f"<VisualScene {self.title or self.id}>"


class VisualShot(Base, TimestampMixin):
    """Individual camera shot within a scene."""

    __tablename__ = "visual_shots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    scene_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_scenes.id"), nullable=False, index=True)

    order_index: Mapped[int] = mapped_column(default=0)
    camera_movement: Mapped[str | None] = mapped_column(String(100))
    duration_seconds: Mapped[float | None] = mapped_column(Numeric(6, 2))
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    # draft | queued | generating | generated | approved | failed

    scene: Mapped["VisualScene"] = relationship("VisualScene", back_populates="shots")
    prompts: Mapped[list["VisualPrompt"]] = relationship("VisualPrompt", back_populates="shot")
    generations: Mapped[list["VisualGeneration"]] = relationship("VisualGeneration", back_populates="shot")

    def __repr__(self) -> str:
        return f"<VisualShot {self.id}>"


class VisualPrompt(Base, TimestampMixin):
    """A generation prompt attached to a shot (or standalone)."""

    __tablename__ = "visual_prompts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)
    scene_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_scenes.id"), index=True)
    shot_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_shots.id"), index=True)

    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    negative_prompt: Mapped[str | None] = mapped_column(Text)
    style: Mapped[str | None] = mapped_column(String(100))
    model: Mapped[str | None] = mapped_column(String(100))
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)

    shot: Mapped["VisualShot"] = relationship("VisualShot", back_populates="prompts")

    def __repr__(self) -> str:
        return f"<VisualPrompt {self.id}>"


class VisualAsset(Base, TimestampMixin):
    """Uploaded or generated media: images, audio, video, character references."""

    __tablename__ = "visual_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)

    type: Mapped[str] = mapped_column(String(30), nullable=False)
    # image | video | audio | character_reference | cover_art | other
    storage_path: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str | None] = mapped_column(String(500))
    source: Mapped[str] = mapped_column(String(20), default="upload")  # upload | generated
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    project: Mapped["VisualProject"] = relationship(
        "VisualProject", back_populates="assets", foreign_keys=[project_id]
    )

    def __repr__(self) -> str:
        return f"<VisualAsset {self.type}:{self.id}>"


class VisualGeneration(Base, TimestampMixin):
    """An individual generation job (image-to-video, text-to-video, ...)."""

    __tablename__ = "visual_generations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)
    shot_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_shots.id"), index=True)
    prompt_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_prompts.id"))

    generation_type: Mapped[str] = mapped_column(String(30), nullable=False)
    # image_to_video | text_to_video | cover_animation | variation
    provider: Mapped[str | None] = mapped_column(String(50))
    external_job_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    # queued | queued_no_provider | processing | completed | failed
    input: Mapped[dict] = mapped_column(JSON, default=dict)
    output_asset_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_assets.id"))
    error: Mapped[str | None] = mapped_column(Text)

    shot: Mapped["VisualShot"] = relationship("VisualShot", back_populates="generations")

    def __repr__(self) -> str:
        return f"<VisualGeneration {self.generation_type}:{self.status}>"


class VisualTimeline(Base, TimestampMixin):
    """Arrangement of shots synced to a song."""

    __tablename__ = "visual_timelines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), default="Main Timeline")
    audio_asset_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_assets.id"))
    is_active: Mapped[bool] = mapped_column(default=True)
    tracks: Mapped[list] = mapped_column(JSON, default=list)
    extra: Mapped[dict] = mapped_column(JSON, default=dict)

    project: Mapped["VisualProject"] = relationship("VisualProject", back_populates="timelines")
    renders: Mapped[list["VisualRender"]] = relationship("VisualRender", back_populates="timeline")

    def __repr__(self) -> str:
        return f"<VisualTimeline {self.name}>"


class VisualRender(Base, TimestampMixin):
    """A final render job producing publishable video output."""

    __tablename__ = "visual_renders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)
    timeline_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_timelines.id"), nullable=False, index=True)
    version_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_versions.id"))

    provider: Mapped[str | None] = mapped_column(String(50))
    external_job_id: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    # queued | queued_no_provider | processing | completed | failed
    render_settings: Mapped[dict] = mapped_column(JSON, default=dict)
    output_asset_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("visual_assets.id"))
    error: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column()
    completed_at: Mapped[datetime | None] = mapped_column()

    timeline: Mapped["VisualTimeline"] = relationship("VisualTimeline", back_populates="renders")

    def __repr__(self) -> str:
        return f"<VisualRender {self.status}>"


class VisualVersion(Base, TimestampMixin):
    """A project snapshot, created on every render."""

    __tablename__ = "visual_versions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("visual_projects.id"), nullable=False, index=True)

    version_number: Mapped[int] = mapped_column(nullable=False)
    label: Mapped[str | None] = mapped_column(String(255))
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)

    project: Mapped["VisualProject"] = relationship("VisualProject", back_populates="versions")

    def __repr__(self) -> str:
        return f"<VisualVersion v{self.version_number}>"

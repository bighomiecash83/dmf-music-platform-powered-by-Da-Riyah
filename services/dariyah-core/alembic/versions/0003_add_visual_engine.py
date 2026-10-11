"""Add Da'Riyah Studio visual-engine tables.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-11
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # visual_projects
    op.create_table(
        "visual_projects",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("artist_id", sa.String(36), sa.ForeignKey("artists.id"), index=True),
        sa.Column("release_id", sa.String(36), sa.ForeignKey("releases.id"), index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("vision", sa.Text),
        sa.Column("status", sa.String(30), server_default="draft"),
        sa.Column("cover_asset_id", sa.String(36)),
        sa.Column("extra", sa.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_scenes
    op.create_table(
        "visual_scenes",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("order_index", sa.Integer, server_default="0"),
        sa.Column("title", sa.String(255)),
        sa.Column("description", sa.Text),
        sa.Column("source_text", sa.Text),
        sa.Column("status", sa.String(30), server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_shots
    op.create_table(
        "visual_shots",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("scene_id", sa.String(36), sa.ForeignKey("visual_scenes.id"), nullable=False, index=True),
        sa.Column("order_index", sa.Integer, server_default="0"),
        sa.Column("camera_movement", sa.String(100)),
        sa.Column("duration_seconds", sa.Numeric(6, 2)),
        sa.Column("description", sa.Text),
        sa.Column("status", sa.String(30), server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_prompts
    op.create_table(
        "visual_prompts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("scene_id", sa.String(36), sa.ForeignKey("visual_scenes.id"), index=True),
        sa.Column("shot_id", sa.String(36), sa.ForeignKey("visual_shots.id"), index=True),
        sa.Column("prompt_text", sa.Text, nullable=False),
        sa.Column("negative_prompt", sa.Text),
        sa.Column("style", sa.String(100)),
        sa.Column("model", sa.String(100)),
        sa.Column("parameters", sa.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_assets
    op.create_table(
        "visual_assets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("type", sa.String(30), nullable=False),
        sa.Column("storage_path", sa.String(500), nullable=False),
        sa.Column("url", sa.String(500)),
        sa.Column("source", sa.String(20), server_default="upload"),
        sa.Column("extra", sa.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_projects.cover_asset_id -> visual_assets.id (added after visual_assets exists)
    op.create_foreign_key(
        "fk_visual_projects_cover_asset_id", "visual_projects", "visual_assets", ["cover_asset_id"], ["id"]
    )

    # visual_generations
    op.create_table(
        "visual_generations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("shot_id", sa.String(36), sa.ForeignKey("visual_shots.id"), index=True),
        sa.Column("prompt_id", sa.String(36), sa.ForeignKey("visual_prompts.id")),
        sa.Column("generation_type", sa.String(30), nullable=False),
        sa.Column("provider", sa.String(50)),
        sa.Column("external_job_id", sa.String(255)),
        sa.Column("status", sa.String(30), server_default="queued", index=True),
        sa.Column("input", sa.JSON),
        sa.Column("output_asset_id", sa.String(36), sa.ForeignKey("visual_assets.id")),
        sa.Column("error", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_timelines
    op.create_table(
        "visual_timelines",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), server_default="Main Timeline"),
        sa.Column("audio_asset_id", sa.String(36), sa.ForeignKey("visual_assets.id")),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("tracks", sa.JSON),
        sa.Column("extra", sa.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_versions
    op.create_table(
        "visual_versions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("version_number", sa.Integer, nullable=False),
        sa.Column("label", sa.String(255)),
        sa.Column("snapshot", sa.JSON),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # visual_renders
    op.create_table(
        "visual_renders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("project_id", sa.String(36), sa.ForeignKey("visual_projects.id"), nullable=False, index=True),
        sa.Column("timeline_id", sa.String(36), sa.ForeignKey("visual_timelines.id"), nullable=False, index=True),
        sa.Column("version_id", sa.String(36), sa.ForeignKey("visual_versions.id")),
        sa.Column("provider", sa.String(50)),
        sa.Column("external_job_id", sa.String(255)),
        sa.Column("status", sa.String(30), server_default="queued", index=True),
        sa.Column("render_settings", sa.JSON),
        sa.Column("output_asset_id", sa.String(36), sa.ForeignKey("visual_assets.id")),
        sa.Column("error", sa.Text),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("visual_renders")
    op.drop_table("visual_versions")
    op.drop_table("visual_timelines")
    op.drop_table("visual_generations")
    op.drop_constraint("fk_visual_projects_cover_asset_id", "visual_projects", type_="foreignkey")
    op.drop_table("visual_assets")
    op.drop_table("visual_prompts")
    op.drop_table("visual_shots")
    op.drop_table("visual_scenes")
    op.drop_table("visual_projects")

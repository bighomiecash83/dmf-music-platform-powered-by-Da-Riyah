"""Initial schema — orgs, artists, releases, tracks, ownership, royalties, events, campaigns, api_keys

Revision ID: 0001
Revises:
Create Date: 2026-03-24
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # orgs
    op.create_table(
        "orgs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("plan", sa.String(50), server_default="free"),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # artists
    op.create_table(
        "artists",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("bio", sa.Text),
        sa.Column("genre", sa.String(100)),
        sa.Column("spotify_artist_id", sa.String(100)),
        sa.Column("apple_music_id", sa.String(100)),
        sa.Column("image_url", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # releases
    op.create_table(
        "releases",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("artist_id", sa.String(36), sa.ForeignKey("artists.id"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("release_type", sa.String(20), server_default="single"),
        sa.Column("genre", sa.String(100)),
        sa.Column("release_date", sa.Date),
        sa.Column("upc", sa.String(20), unique=True),
        sa.Column("cover_art_url", sa.String(500)),
        sa.Column("description", sa.Text),
        sa.Column("ai_description", sa.Text),
        sa.Column("status", sa.String(30), server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # tracks
    op.create_table(
        "tracks",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("release_id", sa.String(36), sa.ForeignKey("releases.id"), nullable=False, index=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("track_number", sa.Integer),
        sa.Column("duration_seconds", sa.Integer),
        sa.Column("isrc", sa.String(20), unique=True),
        sa.Column("audio_url", sa.String(500)),
        sa.Column("explicit", sa.Boolean, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # ownership_splits
    op.create_table(
        "ownership_splits",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("release_id", sa.String(36), sa.ForeignKey("releases.id"), nullable=False, index=True),
        sa.Column("participant_id", sa.String(36), nullable=False),
        sa.Column("participant_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("percentage", sa.Numeric(5, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("release_id", "participant_id", name="uq_release_participant"),
    )

    # royalty_settlements
    op.create_table(
        "royalty_settlements",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("release_id", sa.String(36), sa.ForeignKey("releases.id"), nullable=False, index=True),
        sa.Column("participant_id", sa.String(36), nullable=False, index=True),
        sa.Column("participant_name", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False),
        sa.Column("dsp", sa.String(50), nullable=False),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("streams", sa.Integer, server_default="0"),
        sa.Column("gross_amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("platform_commission", sa.Numeric(12, 4), nullable=False),
        sa.Column("net_amount", sa.Numeric(12, 4), nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD"),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # platform_events
    op.create_table(
        "platform_events",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50)),
        sa.Column("entity_id", sa.String(36)),
        sa.Column("actor_id", sa.String(36)),
        sa.Column("payload", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_platform_events_org_type", "platform_events", ["org_id", "event_type"])
    op.create_index("ix_platform_events_entity", "platform_events", ["entity_type", "entity_id"])

    # campaigns
    op.create_table(
        "campaigns",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("artist_id", sa.String(36), sa.ForeignKey("artists.id"), nullable=False, index=True),
        sa.Column("release_id", sa.String(36), sa.ForeignKey("releases.id"), index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("campaign_type", sa.String(50), server_default="release_promo"),
        sa.Column("status", sa.String(30), server_default="draft"),
        sa.Column("start_date", sa.Date),
        sa.Column("end_date", sa.Date),
        sa.Column("budget_usd", sa.Numeric(12, 2)),
        sa.Column("brief", sa.Text),
        sa.Column("ai_copy", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    # api_keys
    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("key_id", sa.String(50), nullable=False, unique=True),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("scopes", sa.JSON),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("api_keys")
    op.drop_table("campaigns")
    op.drop_index("ix_platform_events_entity", "platform_events")
    op.drop_index("ix_platform_events_org_type", "platform_events")
    op.drop_table("platform_events")
    op.drop_table("royalty_settlements")
    op.drop_table("ownership_splits")
    op.drop_table("tracks")
    op.drop_table("releases")
    op.drop_table("artists")
    op.drop_table("orgs")

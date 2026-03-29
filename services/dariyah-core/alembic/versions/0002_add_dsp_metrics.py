"""Add dsp_metrics table for storing raw DSP streaming data.

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-25
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dsp_metrics",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("orgs.id"), nullable=False, index=True),
        sa.Column("artist_id", sa.String(36), sa.ForeignKey("artists.id"), nullable=False, index=True),
        sa.Column("dsp", sa.String(50), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("streams", sa.Integer, server_default="0"),
        sa.Column("downloads", sa.Integer, server_default="0"),
        sa.Column("saves", sa.Integer, server_default="0"),
        sa.Column("playlist_adds", sa.Integer, server_default="0"),
        sa.Column("listeners", sa.Integer, server_default="0"),
        sa.Column("followers_delta", sa.Integer, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_dsp_metrics_artist_date", "dsp_metrics", ["artist_id", "date"])
    op.create_index("ix_dsp_metrics_org_dsp", "dsp_metrics", ["org_id", "dsp"])


def downgrade() -> None:
    op.drop_index("ix_dsp_metrics_org_dsp", "dsp_metrics")
    op.drop_index("ix_dsp_metrics_artist_date", "dsp_metrics")
    op.drop_table("dsp_metrics")

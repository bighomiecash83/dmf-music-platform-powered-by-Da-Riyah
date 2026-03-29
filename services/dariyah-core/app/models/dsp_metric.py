"""
DspMetric — stores raw streaming metrics pulled from DSP APIs.

One row per artist per DSP per date. Written by dsp_sync_worker,
read by royalty_worker and the analytics API.
"""
from datetime import date

from sqlalchemy import Date, Integer, String, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_uuid


class DspMetric(Base, TimestampMixin):
    __tablename__ = "dsp_metrics"
    __table_args__ = (
        Index("ix_dsp_metrics_artist_date", "artist_id", "date"),
        Index("ix_dsp_metrics_org_dsp", "org_id", "dsp"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    artist_id: Mapped[str] = mapped_column(String(36), ForeignKey("artists.id"), nullable=False, index=True)

    dsp: Mapped[str] = mapped_column(String(50), nullable=False)  # spotify | apple_music | amazon_music | tidal | deezer
    date: Mapped[date] = mapped_column(Date, nullable=False)

    streams: Mapped[int] = mapped_column(Integer, default=0)
    downloads: Mapped[int] = mapped_column(Integer, default=0)
    saves: Mapped[int] = mapped_column(Integer, default=0)
    playlist_adds: Mapped[int] = mapped_column(Integer, default=0)
    listeners: Mapped[int] = mapped_column(Integer, default=0)
    followers_delta: Mapped[int] = mapped_column(Integer, default=0)

    def __repr__(self) -> str:
        return f"<DspMetric {self.dsp} {self.artist_id} {self.date}>"

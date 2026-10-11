"""
Release — an album, EP, or single.
Track — an individual track belonging to a release.
"""
from sqlalchemy import String, ForeignKey, Integer, Date, Text, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import date

from app.models.base import Base, TimestampMixin, new_uuid


class Release(Base, TimestampMixin):
    __tablename__ = "releases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    artist_id: Mapped[str] = mapped_column(String(36), ForeignKey("artists.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    release_type: Mapped[str] = mapped_column(String(20), default="single")  # single | ep | album
    genre: Mapped[str | None] = mapped_column(String(100))
    release_date: Mapped[date | None] = mapped_column(Date)
    upc: Mapped[str | None] = mapped_column(String(20), unique=True)
    cover_art_url: Mapped[str | None] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text)
    ai_description: Mapped[str | None] = mapped_column(Text)  # AI-generated press copy
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft | submitted | live | takedown

    # relationships
    artist: Mapped["Artist"] = relationship("Artist", back_populates="releases")  # noqa: F821
    tracks: Mapped[list["Track"]] = relationship("Track", back_populates="release", cascade="all, delete-orphan")
    ownership_splits: Mapped[list["OwnershipSplit"]] = relationship("OwnershipSplit", back_populates="release")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Release {self.title}>"


class Track(Base, TimestampMixin):
    __tablename__ = "tracks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    release_id: Mapped[str] = mapped_column(String(36), ForeignKey("releases.id"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    track_number: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    isrc: Mapped[str | None] = mapped_column(String(20), unique=True)
    audio_url: Mapped[str | None] = mapped_column(String(500))
    explicit: Mapped[bool] = mapped_column(default=False)

    release: Mapped["Release"] = relationship("Release", back_populates="tracks")

    def __repr__(self) -> str:
        return f"<Track {self.title}>"

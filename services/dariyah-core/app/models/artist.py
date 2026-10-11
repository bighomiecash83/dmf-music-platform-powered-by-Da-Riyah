"""
Artist — an artist or act managed within a tenant org.
"""
from sqlalchemy import String, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Artist(Base, TimestampMixin):
    __tablename__ = "artists"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    genre: Mapped[str | None] = mapped_column(String(100))
    spotify_artist_id: Mapped[str | None] = mapped_column(String(100))
    apple_music_id: Mapped[str | None] = mapped_column(String(100))
    image_url: Mapped[str | None] = mapped_column(String(500))

    # relationships
    org: Mapped["Org"] = relationship("Org", back_populates="artists")  # noqa: F821
    releases: Mapped[list["Release"]] = relationship("Release", back_populates="artist")  # noqa: F821
    campaigns: Mapped[list["Campaign"]] = relationship("Campaign", back_populates="artist")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Artist {self.name}>"

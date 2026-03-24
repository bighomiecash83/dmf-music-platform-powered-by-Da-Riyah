"""
Campaign — a marketing campaign for a release or artist.
"""
from datetime import date
from sqlalchemy import String, ForeignKey, Date, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Campaign(Base, TimestampMixin):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    artist_id: Mapped[str] = mapped_column(String(36), ForeignKey("artists.id"), nullable=False, index=True)
    release_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("releases.id"), index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    campaign_type: Mapped[str] = mapped_column(String(50), default="release_promo")
    status: Mapped[str] = mapped_column(String(30), default="draft")  # draft | active | paused | completed
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    budget_usd: Mapped[float | None] = mapped_column()
    brief: Mapped[str | None] = mapped_column(Text)
    ai_copy: Mapped[str | None] = mapped_column(Text)  # JSON: {platform: copy_text}

    artist: Mapped["Artist"] = relationship("Artist", back_populates="campaigns")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Campaign {self.name}>"

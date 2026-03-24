"""
OwnershipSplit — defines how royalties for a release are divided
among participants (artist, label, publisher, distributor, etc.).

All splits for a release must sum to 100.
"""
from sqlalchemy import String, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class OwnershipSplit(Base, TimestampMixin):
    __tablename__ = "ownership_splits"
    __table_args__ = (
        UniqueConstraint("release_id", "participant_id", name="uq_release_participant"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    release_id: Mapped[str] = mapped_column(String(36), ForeignKey("releases.id"), nullable=False, index=True)

    participant_id: Mapped[str] = mapped_column(String(36), nullable=False)  # artist/label/publisher UUID
    participant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # artist | label | publisher | distributor
    percentage: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)  # e.g. 50.00

    release: Mapped["Release"] = relationship("Release", back_populates="ownership_splits")  # noqa: F821

    def __repr__(self) -> str:
        return f"<OwnershipSplit {self.participant_name} {self.percentage}%>"

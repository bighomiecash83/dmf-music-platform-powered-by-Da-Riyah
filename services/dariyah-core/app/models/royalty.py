"""
RoyaltySettlement — one row per participant per DSP per settlement period.
Written by the royalty_worker after calculation.
"""
from datetime import date
from sqlalchemy import String, ForeignKey, Numeric, Date
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_uuid


class RoyaltySettlement(Base, TimestampMixin):
    __tablename__ = "royalty_settlements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)
    release_id: Mapped[str] = mapped_column(String(36), ForeignKey("releases.id"), nullable=False, index=True)

    participant_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    participant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)

    dsp: Mapped[str] = mapped_column(String(50), nullable=False)  # spotify | apple_music | …
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)

    streams: Mapped[int] = mapped_column(default=0)
    gross_amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    platform_commission: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    net_amount: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | paid | disputed

    def __repr__(self) -> str:
        return f"<RoyaltySettlement {self.participant_name} {self.net_amount} {self.currency}>"

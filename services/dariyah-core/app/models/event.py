"""
PlatformEvent — immutable audit/event log.

Every significant action in the platform creates an event row:
  - dsp.metrics_synced
  - royalty.calculated
  - release.published
  - campaign.launched
  - ai.content_generated
  - api_key.created / revoked

Never update or delete rows in this table.
"""
import json
from sqlalchemy import String, ForeignKey, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, new_uuid


class PlatformEvent(Base, TimestampMixin):
    __tablename__ = "platform_events"
    __table_args__ = (
        Index("ix_platform_events_org_type", "org_id", "event_type"),
        Index("ix_platform_events_entity", "entity_type", "entity_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)

    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(50))   # release | artist | campaign | …
    entity_id: Mapped[str | None] = mapped_column(String(36))
    actor_id: Mapped[str | None] = mapped_column(String(36))       # user or service account
    payload: Mapped[str | None] = mapped_column(Text)              # JSON blob

    @property
    def payload_dict(self) -> dict:
        if self.payload:
            return json.loads(self.payload)
        return {}

    def __repr__(self) -> str:
        return f"<PlatformEvent {self.event_type} @ {self.created_at}>"

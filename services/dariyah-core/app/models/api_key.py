"""
ApiKey — stores hashed API keys with scope definitions.
Never store raw key material — only hash(key).
"""
from sqlalchemy import String, ForeignKey, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Any

from app.models.base import Base, TimestampMixin, new_uuid


class ApiKey(Base, TimestampMixin):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("orgs.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    key_id: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)   # dgk_{key_id}
    key_hash: Mapped[str] = mapped_column(String(64), nullable=False)              # sha256(raw_key)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_used_at: Mapped[Any] = mapped_column(nullable=True)

    org: Mapped["Org"] = relationship("Org", back_populates="api_keys")  # noqa: F821

    def __repr__(self) -> str:
        return f"<ApiKey {self.name} ({self.key_id})>"

"""
Org — top-level tenant. Every other model has an org_id foreign key.
"""
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid


class Org(Base, TimestampMixin):
    __tablename__ = "orgs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="free")  # free | pro | enterprise
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # relationships
    artists: Mapped[list["Artist"]] = relationship("Artist", back_populates="org")  # noqa: F821
    api_keys: Mapped[list["ApiKey"]] = relationship("ApiKey", back_populates="org")  # noqa: F821

    def __repr__(self) -> str:
        return f"<Org {self.slug}>"

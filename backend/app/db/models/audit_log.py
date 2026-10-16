"""
app/db/models/audit_log.py
--------------------------
Immutable ledger recording all administrative activities (logins, 2FA, data additions, cancellations).
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AdminAuditLog(Base):
    __tablename__ = "admin_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    admin_email: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    admin_role: Mapped[str] = mapped_column(
        String(64),
        default="SUPER_ADMIN",
        nullable=False,
    )
    action: Mapped[str] = mapped_column(
        String(64),
        index=True,
        nullable=False,
    )  # "LOGIN_SUCCESS" | "2FA_VERIFIED" | "FLIGHT_CREATED" | "FLIGHT_DELAYED" | "FARE_OVERRIDE" | "BOOKING_FORCE_CANCELLED"
    resource_id: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    details: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        default="SUCCESS",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<AdminAuditLog admin={self.admin_email} action={self.action} status={self.status}>"

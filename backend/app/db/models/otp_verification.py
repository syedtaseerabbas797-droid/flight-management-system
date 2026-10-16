"""
app/db/models/otp_verification.py
---------------------------------
Stores 6-digit email OTP codes for user registration, 2FA, and password reset.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        index=True,
        nullable=False,
    )
    otp_code: Mapped[str] = mapped_column(
        String(6),
        nullable=False,
    )
    purpose: Mapped[str] = mapped_column(
        String(32),
        default="REGISTRATION",
        nullable=False,
    )  # "REGISTRATION" | "PASSWORD_RESET" | "2FA"
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<OTPVerification email={self.email} purpose={self.purpose} is_used={self.is_used}>"

"""
app/db/models/user_profile.py
-----------------------------
Airline standard Passenger Profile model.
Includes: Basic info, Contact, Emergency contact, Travel Documents (Passport/CNIC), Flight preferences.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )

    # Basic Info
    title: Mapped[Optional[str]] = mapped_column(String(16), default="Mr")
    first_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    dob: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # YYYY-MM-DD
    gender: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    nationality: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Contact & Emergency
    phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    emergency_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    emergency_phone: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Travel Documents
    doc_type: Mapped[str] = mapped_column(String(32), default="PASSPORT")  # PASSPORT | CNIC
    doc_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    country_of_issuance: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    doc_expiry_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # YYYY-MM-DD

    # Flight Preferences
    meal_preference: Mapped[str] = mapped_column(String(64), default="Halal")
    seat_preference: Mapped[str] = mapped_column(String(64), default="Window")
    wheelchair: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    frequent_flyer_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship to user
    user: Mapped["User"] = relationship("User", back_populates="profile")

    def __repr__(self) -> str:
        return f"<UserProfile user_id={self.user_id} doc_number={self.doc_number}>"

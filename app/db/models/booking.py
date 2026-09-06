"""
app/db/models/booking.py
------------------------
Booking ORM model.

Key design decisions
---------------------
- `idempotency_key` has a UNIQUE constraint so that duplicate booking
  requests (retries, double-clicks) are safely rejected at the DB level.
- `seat_class` mirrors the SeatInventory enum to avoid a join for reads.
- `fare_type` allows the system to enforce refund / change rules later.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    String,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import BookingStatus, FareType, SeatClass


class Booking(Base):
    __tablename__ = "bookings"

    __table_args__ = (
        UniqueConstraint(
            "idempotency_key",
            name="uq_booking_idempotency_key",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    flight_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("flights.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seat_class: Mapped[SeatClass] = mapped_column(
        SAEnum(SeatClass, name="seatclass", create_type=False),  # reuse existing type
        nullable=False,
    )
    passenger_name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus, name="bookingstatus", create_type=True),
        nullable=False,
        default=BookingStatus.hold,
        server_default=BookingStatus.hold.value,
        index=True,
    )
    fare_type: Mapped[FareType] = mapped_column(
        SAEnum(FareType, name="faretype", create_type=True),
        nullable=False,
    )
    idempotency_key: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment=(
            "Client-supplied idempotency key (UUID or hash). "
            "Prevents duplicate bookings from retries."
        ),
    )
    is_fraud_review: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default="now()",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default="now()",
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    flight: Mapped["Flight"] = relationship(  # noqa: F821
        back_populates="bookings",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Booking id={self.id} flight_id={self.flight_id} "
            f"passenger={self.passenger_name!r} status={self.status}>"
        )

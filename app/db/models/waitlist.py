"""
app/db/models/waitlist.py
--------------------------
Waitlist ORM model.

Passengers are added to the waitlist when a seat class is fully booked.
`joined_at` preserves FIFO ordering for promotion to confirmed bookings.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import SeatClass


class Waitlist(Base):
    __tablename__ = "waitlist"

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
        index=True,
    )
    passenger_name: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default="now()",
        index=True,
        comment="Timestamp used for FIFO ordering when promoting from waitlist.",
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    flight: Mapped["Flight"] = relationship(  # noqa: F821
        back_populates="waitlist_entries",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Waitlist id={self.id} flight_id={self.flight_id} "
            f"passenger={self.passenger_name!r} class={self.seat_class} "
            f"joined_at={self.joined_at}>"
        )

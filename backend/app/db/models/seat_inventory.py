"""
app/db/models/seat_inventory.py
--------------------------------
SeatInventory ORM model.

One row per (flight, seat_class) combination — a flight therefore has
at most 3 inventory rows (First, Business, Economy).

Postgres CHECK constraints enforced at the database level:
  - total_seats > 0
  - booked_seats >= 0
  - booked_seats <= total_seats
"""

import uuid

from sqlalchemy import (
    CheckConstraint,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import SeatClass


class SeatInventory(Base):
    __tablename__ = "seat_inventories"

    __table_args__ = (
        # Each class can only appear once per flight.
        UniqueConstraint(
            "flight_id",
            "seat_class",
            name="uq_seat_inventory_flight_class",
        ),
        # ---------------------------------------------------------------
        # Core business rules enforced at the DB level
        # ---------------------------------------------------------------
        CheckConstraint(
            "total_seats > 0",
            name="ck_seat_inventory_total_seats_positive",
        ),
        CheckConstraint(
            "booked_seats >= 0",
            name="ck_seat_inventory_booked_seats_non_negative",
        ),
        CheckConstraint(
            "booked_seats <= total_seats",
            name="ck_seat_inventory_booked_not_exceed_total",
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
        SAEnum(SeatClass, name="seatclass", create_type=True),
        nullable=False,
    )
    total_seats: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    booked_seats: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # ------------------------------------------------------------------
    # Relationships
    # ------------------------------------------------------------------
    flight: Mapped["Flight"] = relationship(  # noqa: F821
        back_populates="seat_inventories",
    )

    # ------------------------------------------------------------------
    # Computed helpers (Python-side, not stored in DB)
    # ------------------------------------------------------------------
    @property
    def available_seats(self) -> int:
        """Number of seats still available for booking."""
        return self.total_seats - self.booked_seats

    @property
    def is_full(self) -> bool:
        """True when no seats remain."""
        return self.booked_seats >= self.total_seats

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<SeatInventory flight_id={self.flight_id} "
            f"class={self.seat_class} "
            f"{self.booked_seats}/{self.total_seats}>"
        )

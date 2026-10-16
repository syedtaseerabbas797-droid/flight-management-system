"""
app/db/models/flight.py
-----------------------
Flight ORM model.

Constraints
-----------
- (flight_number, departure_time) must be globally unique.
- departure_time must be earlier than arrival_time (CHECK constraint).
- total_capacity must be > 0.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.enums import FlightStatus


class Flight(Base):
    __tablename__ = "flights"

    __table_args__ = (
        # A flight number can be reused across different departure dates
        # but (number + departure_time) must be unique.
        UniqueConstraint(
            "flight_number",
            "departure_time",
            name="uq_flight_number_departure_time",
        ),
        # Ensure the flight actually travels forward in time.
        CheckConstraint(
            "arrival_time > departure_time",
            name="ck_flight_arrival_after_departure",
        ),
        # Capacity sanity check.
        CheckConstraint(
            "total_capacity > 0",
            name="ck_flight_total_capacity_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    flight_number: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        index=True,
        comment="IATA-style flight code, e.g. PK-302",
    )
    origin: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        comment="IATA 3-letter origin airport code",
    )
    destination: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        comment="IATA 3-letter destination airport code",
    )
    departure_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    arrival_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    total_capacity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    status: Mapped[FlightStatus] = mapped_column(
        SAEnum(FlightStatus, name="flightstatus", create_type=True),
        nullable=False,
        default=FlightStatus.scheduled,
        server_default=FlightStatus.scheduled.value,
    )

    # ------------------------------------------------------------------
    # Relationships (back-populates defined on child models)
    # ------------------------------------------------------------------
    seat_inventories: Mapped[list["SeatInventory"]] = relationship(  # noqa: F821
        back_populates="flight",
        cascade="all, delete-orphan",
        lazy="select",
    )
    bookings: Mapped[list["Booking"]] = relationship(  # noqa: F821
        back_populates="flight",
        cascade="all, delete-orphan",
        lazy="select",
    )
    waitlist_entries: Mapped[list["Waitlist"]] = relationship(  # noqa: F821
        back_populates="flight",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Flight id={self.id} number={self.flight_number!r} "
            f"route={self.origin}->{self.destination} status={self.status}>"
        )

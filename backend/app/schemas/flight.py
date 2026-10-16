"""
app/schemas/flight.py
---------------------
Pydantic v2 schemas for the Flight & SeatInventory domain.

Validation rules enforced here (before touching the DB):
  - departure_time must be in the future and before arrival_time.
  - Each seat allocation must be > 0.
  - Sum of (first + business + economy) seat allocations must equal
    the declared total_capacity exactly ("capacity integrity" rule).
  - Negative or zero values are rejected via Annotated constraints.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.enums import FareType, FlightStatus, SeatClass


# ---------------------------------------------------------------------------
# Reusable annotated types
# ---------------------------------------------------------------------------
PositiveInt = Annotated[int, Field(gt=0, description="Must be a positive integer (> 0)")]


# ---------------------------------------------------------------------------
# SeatInventory schemas
# ---------------------------------------------------------------------------

class SeatInventoryCreate(BaseModel):
    """Seat allocation for a single class within a flight creation request."""

    seat_class: SeatClass
    total_seats: PositiveInt

    model_config = ConfigDict(use_enum_values=True)


class SeatInventoryResponse(BaseModel):
    """Read schema for a seat inventory row."""

    id: uuid.UUID
    flight_id: uuid.UUID
    seat_class: SeatClass
    total_seats: int
    booked_seats: int
    available_seats: int  # computed via @property on the ORM model

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


# ---------------------------------------------------------------------------
# Flight schemas
# ---------------------------------------------------------------------------

class FlightCreate(BaseModel):
    """
    Payload for creating a new flight with its seat inventory.

    Capacity Integrity Rule
    -----------------------
    The sum of `total_seats` across all `seat_allocations` entries must be
    exactly equal to `total_capacity`. The validator also ensures:
      - No duplicate seat classes are provided.
      - Each allocation already satisfies `total_seats > 0` (PositiveInt).
    """

    flight_number: str = Field(
        ...,
        min_length=2,
        max_length=16,
        pattern=r"^[A-Z0-9\-]+$",
        examples=["PK-302"],
        description="IATA-style flight code (uppercase letters, digits, hyphens only).",
    )
    origin: str = Field(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
        examples=["KHI"],
        description="3-letter IATA origin airport code (uppercase).",
    )
    destination: str = Field(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
        examples=["LHR"],
        description="3-letter IATA destination airport code (uppercase).",
    )
    departure_time: datetime = Field(
        ...,
        description="Timezone-aware departure timestamp (must be in the future).",
    )
    arrival_time: datetime = Field(
        ...,
        description="Timezone-aware arrival timestamp (must be after departure_time).",
    )
    total_capacity: PositiveInt = Field(
        ...,
        description="Total seat capacity of the aircraft.",
    )
    seat_allocations: list[SeatInventoryCreate] = Field(
        ...,
        min_length=1,
        max_length=3,
        description=(
            "Seat allocations per class. "
            "Sum of total_seats must equal total_capacity exactly."
        ),
    )

    model_config = ConfigDict(use_enum_values=True)

    # ------------------------------------------------------------------
    # Cross-field validators
    # ------------------------------------------------------------------

    @model_validator(mode="after")
    def validate_times(self) -> "FlightCreate":
        now = datetime.now(timezone.utc)

        dep = self.departure_time
        arr = self.arrival_time

        # Normalise naive datetimes to UTC for comparison
        if dep.tzinfo is None:
            dep = dep.replace(tzinfo=timezone.utc)
        if arr.tzinfo is None:
            arr = arr.replace(tzinfo=timezone.utc)

        if dep <= now:
            raise ValueError("departure_time must be in the future.")
        if arr <= dep:
            raise ValueError("arrival_time must be strictly after departure_time.")

        return self

    @model_validator(mode="after")
    def validate_seat_capacity(self) -> "FlightCreate":
        allocations = self.seat_allocations

        # Guard: no duplicate seat classes
        classes_seen: set[str] = set()
        for alloc in allocations:
            cls_val = alloc.seat_class if isinstance(alloc.seat_class, str) else alloc.seat_class.value
            if cls_val in classes_seen:
                raise ValueError(
                    f"Duplicate seat class '{cls_val}' in seat_allocations."
                )
            classes_seen.add(cls_val)

        # Core capacity-integrity rule
        allocated_total = sum(a.total_seats for a in allocations)
        if allocated_total != self.total_capacity:
            raise ValueError(
                f"Seat allocation mismatch: sum of seat_allocations.total_seats "
                f"({allocated_total}) must equal total_capacity ({self.total_capacity})."
            )

        return self


class FlightUpdate(BaseModel):
    """
    Partial update payload for a flight's schedule details.
    All fields are optional; only provided fields are updated (PATCH semantics).
    """

    origin: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
    )
    destination: str | None = Field(
        default=None,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
    )
    departure_time: datetime | None = None
    arrival_time: datetime | None = None
    total_capacity: PositiveInt | None = None

    model_config = ConfigDict(use_enum_values=True)

    @model_validator(mode="after")
    def validate_times_if_both_provided(self) -> "FlightUpdate":
        dep = self.departure_time
        arr = self.arrival_time
        if dep is not None and arr is not None and arr <= dep:
            raise ValueError("arrival_time must be strictly after departure_time.")
        return self


class FlightResponse(BaseModel):
    """Full read schema for a Flight, including its seat inventories."""

    id: uuid.UUID
    flight_number: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    total_capacity: int
    status: FlightStatus
    seat_inventories: list[SeatInventoryResponse] = []

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

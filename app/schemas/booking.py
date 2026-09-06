"""
app/schemas/booking.py
----------------------
Pydantic v2 schemas for the Booking domain.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.db.enums import BookingStatus, FareType, SeatClass


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class BookingCreate(BaseModel):
    """
    Payload for placing a seat hold on a flight.

    The client must also supply an `Idempotency-Key` HTTP header (handled
    in the route, not here) to make retries safe.
    """

    flight_id: uuid.UUID = Field(
        ...,
        description="UUID of the flight to book.",
    )
    seat_class: SeatClass = Field(
        ...,
        description="Desired seating class (First, Business, Economy).",
    )
    passenger_name: Annotated[str, Field(min_length=1, max_length=128)] = Field(
        ...,
        description="Full name of the passenger.",
    )
    fare_type: FareType = Field(
        ...,
        description="Fare category (refundable, non_refundable, flexible).",
    )

    model_config = ConfigDict(use_enum_values=True)


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class BookingResponse(BaseModel):
    """Full read schema for a Booking row."""

    id: uuid.UUID
    flight_id: uuid.UUID
    seat_class: SeatClass
    passenger_name: str
    status: BookingStatus
    fare_type: FareType
    idempotency_key: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

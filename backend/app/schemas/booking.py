"""
app/schemas/booking.py
----------------------
Pydantic v2 schemas for the Booking domain.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated, Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.enums import BookingStatus, FareType, SeatClass


# ---------------------------------------------------------------------------
# Request schema
# ---------------------------------------------------------------------------

class BookingCreate(BaseModel):
    """
    Payload for placing a seat hold or direct booking on a flight.
    Supports standard backend flight_id and passenger_name, as well as
    convenience aliases (flightNo, fullName, cabin) for frontend ergonomics.
    """

    flight_id: Optional[uuid.UUID] = Field(
        None,
        description="UUID of the flight to book.",
    )
    flightNo: Optional[str] = Field(
        None,
        description="Flight number code e.g. AP-104 or PK-999 (used if flight_id not supplied).",
    )
    flight_number: Optional[str] = None
    seat_class: Optional[SeatClass] = Field(
        None,
        description="Desired seating class (First, Business, Economy).",
    )
    cabin: Optional[str] = None
    seatPreference: Optional[str] = None
    passenger_name: Optional[str] = Field(
        None,
        description="Full name of the passenger.",
    )
    fullName: Optional[str] = None
    fare_type: Optional[FareType] = Field(
        FareType.flexible,
        description="Fare category (refundable, non_refundable, flexible).",
    )
    email: Optional[str] = None
    passportOrCnic: Optional[str] = None
    holdFee: Optional[float] = None
    fare: Optional[float] = None
    holdId: Optional[str] = None
    holdToken: Optional[str] = None

    @field_validator("seat_class", mode="before")
    @classmethod
    def normalize_seat_class(cls, v: Any) -> Optional[SeatClass]:
        if v is None:
            return None
        if isinstance(v, SeatClass):
            return v
        s = str(v).strip().lower()
        if "first" in s:
            return SeatClass.first
        if "bus" in s:
            return SeatClass.business
        return SeatClass.economy

    @field_validator("fare_type", mode="before")
    @classmethod
    def normalize_fare_type(cls, v: Any) -> FareType:
        if v is None:
            return FareType.flexible
        if isinstance(v, FareType):
            return v
        s = str(v).strip().lower()
        if "ref" in s and "non" not in s:
            return FareType.refundable
        if "non" in s:
            return FareType.non_refundable
        return FareType.flexible

    model_config = ConfigDict(use_enum_values=True, populate_by_name=True)



# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------

class BookingResponse(BaseModel):
    """Full read schema for a Booking row with rich frontend integration properties."""

    id: uuid.UUID
    flight_id: uuid.UUID
    seat_class: SeatClass
    passenger_name: str
    status: BookingStatus
    fare_type: FareType
    idempotency_key: str
    created_at: datetime
    updated_at: datetime

    # Extended attributes for direct frontend use
    success: bool = True
    pnr: Optional[str] = None
    bookingRef: Optional[str] = None
    ticketNumber: Optional[str] = None
    flightNo: Optional[str] = None
    sector: Optional[str] = None
    passengerName: Optional[str] = None
    email: Optional[str] = None
    seatAssigned: Optional[str] = None
    cabin: Optional[str] = None
    totalPaid: Optional[float] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, use_enum_values=True, populate_by_name=True)

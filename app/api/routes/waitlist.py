"""
app/api/routes/waitlist.py
--------------------------
Passenger waitlist router.

Endpoints
---------
  POST  /waitlist   Join the waitlist for a fully-booked seat class

Design notes
------------
- A waitlist entry is only accepted when the requested seat class is
  genuinely full (available_seats == 0). If seats remain, the client
  is redirected to the normal booking flow (HTTP 400).
- `joined_at` is handled by the server default so FIFO ordering is
  preserved accurately even if clocks drift between application instances.
- No duplicate guard is enforced at this layer; the model has no unique
  constraint on (flight_id, seat_class, passenger_name), so a passenger
  may appear more than once (useful for multi-seat waitlist requests).
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.db.enums import FlightStatus, SeatClass
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.db.models.waitlist import Waitlist

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])


# ---------------------------------------------------------------------------
# Inline schemas (no separate file needed — waitlist is simple)
# ---------------------------------------------------------------------------

class WaitlistCreate(BaseModel):
    flight_id: uuid.UUID = Field(..., description="UUID of the flight to join the waitlist for.")
    seat_class: SeatClass = Field(..., description="Desired seat class (First, Business, Economy).")
    passenger_name: str = Field(..., min_length=1, max_length=128, description="Full passenger name.")

    model_config = ConfigDict(use_enum_values=True)


class WaitlistResponse(BaseModel):
    id: uuid.UUID
    flight_id: uuid.UUID
    seat_class: SeatClass
    passenger_name: str
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


# ---------------------------------------------------------------------------
# POST /waitlist
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=WaitlistResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join the waitlist for a fully-booked seat class",
    description=(
        "Adds a passenger to the waitlist for the given flight and seat class. "
        "Only accepted when that class is genuinely full (available_seats == 0). "
        "Returns HTTP 400 if seats are still available — book normally instead. "
        "Returns HTTP 404 if the flight does not exist, "
        "HTTP 409 if the flight is cancelled."
    ),
)
async def join_waitlist(
    payload: WaitlistCreate,
    session: AsyncSession = Depends(get_db),
) -> WaitlistResponse:

    # ------------------------------------------------------------------
    # 1. Flight existence + status check
    # ------------------------------------------------------------------
    flight_result = await session.execute(
        select(Flight).where(Flight.id == payload.flight_id)
    )
    flight = flight_result.scalar_one_or_none()

    if flight is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {payload.flight_id} not found.",
        )

    if flight.status == FlightStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight {payload.flight_id} is cancelled; waitlist is not available.",
        )

    # ------------------------------------------------------------------
    # 2. Confirm the seat class is actually full before adding to waitlist
    # ------------------------------------------------------------------
    inv_result = await session.execute(
        select(SeatInventory).where(
            and_(
                SeatInventory.flight_id == payload.flight_id,
                SeatInventory.seat_class == payload.seat_class,
            )
        )
    )
    inventory = inv_result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Seat class '{payload.seat_class}' does not exist "
                f"for flight {payload.flight_id}."
            ),
        )

    if inventory.available_seats > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{inventory.available_seats} seat(s) are still available in "
                f"'{payload.seat_class}' class. Please book normally instead of "
                "joining the waitlist."
            ),
        )

    # ------------------------------------------------------------------
    # 3. Create the Waitlist entry and return
    # ------------------------------------------------------------------
    entry = Waitlist(
        flight_id=payload.flight_id,
        seat_class=payload.seat_class,
        passenger_name=payload.passenger_name,
    )
    session.add(entry)
    await session.flush()   # obtain entry.id

    await session.commit()

    # Re-fetch for a clean, committed object
    final_result = await session.execute(
        select(Waitlist).where(Waitlist.id == entry.id)
    )
    entry = final_result.scalar_one()

    return WaitlistResponse.model_validate(entry)

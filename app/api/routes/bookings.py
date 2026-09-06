"""
app/api/routes/bookings.py
--------------------------
Passenger booking router.

Endpoints
---------
  POST  /bookings/hold                  Place a seat hold on a flight (idempotent)
  POST  /bookings/{booking_id}/confirm   Confirm a held booking

Concurrency design
------------------
Seat availability is decremented with a single atomic UPDATE … RETURNING:

    UPDATE seat_inventories
    SET    booked_seats = booked_seats + 1
    WHERE  flight_id   = :flight_id
      AND  seat_class  = :seat_class
      AND  (total_seats - booked_seats) > 0
    RETURNING *

The WHERE predicate is evaluated under Postgres row-level locking, so two
concurrent requests for the last available seat can never both satisfy it.
No application-level locking or SELECT … FOR UPDATE round-trip is needed.

Idempotency
-----------
The client supplies an `Idempotency-Key` header (max 64 chars, typically a
UUID). If a booking with that key already exists the existing record is
returned with HTTP 200 instead of creating a duplicate.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Path, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.enums import BookingStatus, FlightStatus
from app.db.models.booking import Booking
from app.db.models.seat_inventory import SeatInventory
from app.db.models.flight import Flight
from app.schemas.booking import BookingCreate, BookingResponse
import uuid

from app.utils.email import send_transactional_email

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# ---------------------------------------------------------------------------
# POST /bookings/hold
# ---------------------------------------------------------------------------

@router.post(
    "/hold",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Place a seat hold",
    description=(
        "Atomically reserves one seat for the requested class and creates a "
        "booking with status='hold'. Requires an `Idempotency-Key` header; "
        "duplicate keys return the existing booking (HTTP 200) instead of "
        "creating a new one."
    ),
)
async def hold_booking(
    payload: BookingCreate,
    idempotency_key: str = Header(
        ...,
        alias="Idempotency-Key",
        min_length=1,
        max_length=64,
        description="Client-supplied idempotency key (UUID or hash) to make retries safe.",
    ),
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:

    # ------------------------------------------------------------------
    # 1. Idempotency check — return existing booking if key already used
    # ------------------------------------------------------------------
    existing_stmt = select(Booking).where(Booking.idempotency_key == idempotency_key)
    existing_result = await session.execute(existing_stmt)
    existing_booking = existing_result.scalar_one_or_none()

    if existing_booking is not None:
        # Downgrade status to 200 OK so the client knows it's a replay
        from fastapi.responses import JSONResponse
        from fastapi.encoders import jsonable_encoder

        response_data = BookingResponse.model_validate(existing_booking)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder(response_data),
        )

    # ------------------------------------------------------------------
    # 2. Flight existence + status check
    # ------------------------------------------------------------------
    flight_stmt = select(Flight).where(Flight.id == payload.flight_id)
    flight_result = await session.execute(flight_stmt)
    flight = flight_result.scalar_one_or_none()

    if flight is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {payload.flight_id} not found.",
        )

    if flight.status == FlightStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight {payload.flight_id} is cancelled; bookings are not accepted.",
        )

    # ------------------------------------------------------------------
    # 3. Atomic seat decrement via ORM UPDATE … RETURNING
    #
    #    Using the ORM update() construct lets SQLAlchemy bind the
    #    SeatClass enum correctly for asyncpg, avoiding the
    #    "invalid input value for enum seatclass" DBAPIError that occurs
    #    when a raw string is passed through a text() query.
    #    The WHERE predicate is still evaluated atomically by Postgres.
    # ------------------------------------------------------------------
    decrement_stmt = (
        update(SeatInventory)
        .where(SeatInventory.flight_id == payload.flight_id)
        .where(SeatInventory.seat_class == payload.seat_class)
        .where(SeatInventory.total_seats - SeatInventory.booked_seats > 0)
        .values(booked_seats=SeatInventory.booked_seats + 1)
        .returning(SeatInventory.id)
    )
    decrement_result = await session.execute(decrement_stmt)
    updated_row = decrement_result.fetchone()

    if updated_row is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"No seats available in class '{payload.seat_class}' "
                f"for flight {payload.flight_id}. "
                "The flight may be fully booked or the seat class does not exist."
            ),
        )

    # ------------------------------------------------------------------
    # 4. Create the Booking record with status='hold'
    # ------------------------------------------------------------------
    booking = Booking(
        flight_id=payload.flight_id,
        seat_class=payload.seat_class,
        passenger_name=payload.passenger_name,
        fare_type=payload.fare_type,
        status=BookingStatus.hold,
        idempotency_key=idempotency_key,
    )
    session.add(booking)
    await session.flush()  # obtain booking.id before commit

    # ------------------------------------------------------------------
    # 5. Commit and re-fetch to return a clean, fully-populated object
    # ------------------------------------------------------------------
    await session.commit()

    final_stmt = select(Booking).where(Booking.id == booking.id)
    final_result = await session.execute(final_stmt)
    booking = final_result.scalar_one()

    return BookingResponse.model_validate(booking)


# ---------------------------------------------------------------------------
# POST /bookings/{booking_id}/confirm
# ---------------------------------------------------------------------------

@router.post(
    "/{booking_id}/confirm",
    response_model=BookingResponse,
    summary="Confirm a held booking",
    description=(
        "Transitions a booking from 'hold' to 'confirmed'. "
        "Returns 404 if the booking does not exist, "
        "400 if it is already cancelled or already confirmed."
    ),
)
async def confirm_booking(
    booking_id: uuid.UUID = Path(..., description="UUID of the booking to confirm"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:

    # ------------------------------------------------------------------
    # 1. Fetch booking
    # ------------------------------------------------------------------
    stmt = select(Booking).where(Booking.id == booking_id)
    result = await session.execute(stmt)
    booking = result.scalar_one_or_none()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found.",
        )

    # ------------------------------------------------------------------
    # 2. Guard: only 'hold' bookings can be confirmed
    # ------------------------------------------------------------------
    if booking.status == BookingStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking {booking_id} is cancelled and cannot be confirmed.",
        )

    if booking.status == BookingStatus.confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking {booking_id} is already confirmed.",
        )

    # ------------------------------------------------------------------
    # 3. Transition hold → confirmed, commit, and return fresh row
    # ------------------------------------------------------------------
    booking.status = BookingStatus.confirmed
    session.add(booking)
    await session.commit()

    final_result = await session.execute(
        select(Booking).where(Booking.id == booking_id)
    )
    booking = final_result.scalar_one()

    # ------------------------------------------------------------------
    # Schedule confirmation email (non-blocking background task)
    # ------------------------------------------------------------------
    background_tasks.add_task(
        send_transactional_email,
        to_email=booking.passenger_name,   # replace with passenger email field when available
        subject=f"Booking Confirmed — {booking.id}",
        body=(
            f"Dear {booking.passenger_name},\n\n"
            f"Your booking has been confirmed.\n\n"
            f"Booking ID  : {booking.id}\n"
            f"Flight ID   : {booking.flight_id}\n"
            f"Seat Class  : {booking.seat_class}\n"
            f"Fare Type   : {booking.fare_type}\n"
            f"Status      : {booking.status}\n\n"
            "Thank you for flying with us!"
        ),
    )

    return BookingResponse.model_validate(booking)

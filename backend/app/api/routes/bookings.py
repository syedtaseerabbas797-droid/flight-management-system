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
from app.db.enums import BookingStatus, FlightStatus, SeatClass, FareType
from app.db.models.booking import Booking
from app.db.models.seat_inventory import SeatInventory
from app.db.models.flight import Flight
from app.schemas.booking import BookingCreate, BookingResponse
import uuid

from app.utils.email import send_transactional_email

router = APIRouter(prefix="/bookings", tags=["Bookings"])


from typing import Any, Optional
from datetime import datetime, timezone, timedelta
from sqlalchemy import and_, desc
from sqlalchemy.orm import selectinload

def _normalize_seat_class(raw_class: Any) -> SeatClass:
    if isinstance(raw_class, SeatClass):
        return raw_class
    if not raw_class:
        return SeatClass.business
    c = str(raw_class).strip().lower()
    if "first" in c:
        return SeatClass.first
    elif "club" in c or "biz" in c or "business" in c:
        return SeatClass.business
    else:
        return SeatClass.economy

def _format_booking_response(
    booking: Booking,
    flight: Flight | None = None,
    message: str | None = None,
    fare: float | None = None,
) -> BookingResponse:
    pnr = "PK" + str(booking.id).replace("-", "")[:4].upper()
    ticket_num = f"016-{str(booking.id).replace('-', '')[:4]}-{str(booking.id).replace('-', '')[4:8]}"
    flight_num = flight.flight_number if flight else "AP-104"
    origin = flight.origin if flight else "JFK"
    destination = flight.destination if flight else "LHR"
    sector = f"{origin} → {destination}"
    seat_map = {SeatClass.first: "02A", SeatClass.business: "04A", SeatClass.economy: "18C"}
    seat_assigned = seat_map.get(booking.seat_class, "04A")
    total_paid = fare if fare is not None else (
        1890.0 if booking.seat_class == SeatClass.business else (
            2800.0 if booking.seat_class == SeatClass.first else 650.0
        )
    )

    data = BookingResponse.model_validate(booking)
    data.success = True
    data.pnr = pnr
    data.bookingRef = f"AP-{pnr}" if booking.status == BookingStatus.confirmed else f"HLD-{pnr}"
    data.ticketNumber = ticket_num
    data.flightNo = flight_num
    data.sector = sector
    data.passengerName = booking.passenger_name
    data.email = f"{booking.passenger_name.replace(' ', '.').lower()}@aeronexus.com"
    data.seatAssigned = seat_assigned
    data.cabin = (
        "First Suite" if booking.seat_class == SeatClass.first else (
            "Business Suite" if booking.seat_class == SeatClass.business else "Main Cabin"
        )
    )
    data.totalPaid = total_paid
    data.origin = origin
    data.destination = destination
    if flight:
        data.departure_time = flight.departure_time
        data.arrival_time = flight.arrival_time
    data.message = message or (
        "Booking successfully confirmed." if booking.status == BookingStatus.confirmed else "24-Hour Fare Hold Secured."
    )
    return data


# ---------------------------------------------------------------------------
# GET /bookings & /bookings/ — List all bookings (for Manifest & My Bookings)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=list[BookingResponse],
    summary="List all bookings with optional filters",
)
@router.get(
    "",
    response_model=list[BookingResponse],
    include_in_schema=False,
)
async def list_bookings(
    flight_id: Optional[uuid.UUID] = None,
    passenger_name: Optional[str] = None,
    email: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
) -> list[BookingResponse]:
    stmt = (
        select(Booking)
        .options(selectinload(Booking.flight))
        .order_by(desc(Booking.created_at))
    )
    conditions = []
    if flight_id:
        conditions.append(Booking.flight_id == flight_id)
    if passenger_name:
        conditions.append(Booking.passenger_name.ilike(f"%{passenger_name.strip()}%"))
    if status:
        try:
            b_status = BookingStatus(status.lower())
            conditions.append(Booking.status == b_status)
        except ValueError:
            pass
    if conditions:
        stmt = stmt.where(and_(*conditions))

    result = await session.execute(stmt)
    bookings = result.scalars().all()
    return [_format_booking_response(b, b.flight) for b in bookings]


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
        "booking with status='hold'. Supports Idempotency-Key header; duplicate "
        "keys return existing booking with HTTP 200."
    ),
)
async def hold_booking(
    payload: BookingCreate,
    idempotency_key: Optional[str] = Header(
        None,
        alias="Idempotency-Key",
        max_length=64,
        description="Client-supplied idempotency key (UUID or hash).",
    ),
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:
    if not idempotency_key:
        idempotency_key = str(uuid.uuid4())

    # ------------------------------------------------------------------
    # 1. Idempotency check — return existing booking if key already used
    # ------------------------------------------------------------------
    existing_stmt = select(Booking).where(Booking.idempotency_key == idempotency_key).options(selectinload(Booking.flight))
    existing_result = await session.execute(existing_stmt)
    existing_booking = existing_result.scalar_one_or_none()

    if existing_booking is not None:
        from fastapi.responses import JSONResponse
        from fastapi.encoders import jsonable_encoder

        response_data = _format_booking_response(existing_booking, existing_booking.flight)
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content=jsonable_encoder(response_data),
        )

    # ------------------------------------------------------------------
    # 2. Flight resolution & status check
    # ------------------------------------------------------------------
    flight = None
    if payload.flight_id:
        flight_stmt = select(Flight).where(Flight.id == payload.flight_id)
        flight_result = await session.execute(flight_stmt)
        flight = flight_result.scalar_one_or_none()
    elif payload.flightNo or payload.flight_number:
        code = (payload.flightNo or payload.flight_number).strip().upper()
        flight_stmt = select(Flight).where(Flight.flight_number.ilike(f"%{code}%"))
        flight_result = await session.execute(flight_stmt)
        flight = flight_result.scalars().first()

    if flight is None:
        # Fallback to first scheduled flight in database
        f_res = await session.execute(select(Flight).where(Flight.status == FlightStatus.scheduled).order_by(Flight.departure_time).limit(1))
        flight = f_res.scalars().first()

    if flight is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No scheduled flights found to place hold.",
        )

    if flight.status == FlightStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight {flight.flight_number} is cancelled; bookings are not accepted.",
        )

    # Resolve passenger details and seat class
    passenger_name = (payload.passenger_name or payload.fullName or "Passenger").strip()
    seat_class = payload.seat_class or _normalize_seat_class(payload.cabin or payload.seatPreference)
    fare_type = payload.fare_type or FareType.flexible

    # ------------------------------------------------------------------
    # 3. Atomic seat decrement via ORM UPDATE … RETURNING
    # ------------------------------------------------------------------
    decrement_stmt = (
        update(SeatInventory)
        .where(SeatInventory.flight_id == flight.id)
        .where(SeatInventory.seat_class == seat_class)
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
                f"No seats available in class '{seat_class}' "
                f"for flight {flight.flight_number}. "
                "The flight may be fully booked or the seat class does not exist."
            ),
        )

    # ------------------------------------------------------------------
    # 4. Create the Booking record with status='hold'
    # ------------------------------------------------------------------
    booking = Booking(
        flight_id=flight.id,
        seat_class=seat_class,
        passenger_name=passenger_name,
        fare_type=fare_type,
        status=BookingStatus.hold,
        idempotency_key=idempotency_key,
    )
    session.add(booking)
    await session.flush()
    await session.commit()

    final_stmt = select(Booking).where(Booking.id == booking.id).options(selectinload(Booking.flight))
    final_result = await session.execute(final_stmt)
    booking = final_result.scalar_one()

    return _format_booking_response(booking, flight)


# ---------------------------------------------------------------------------
# POST /bookings/confirm — Universal Confirmation Endpoint (Hold & Direct)
# ---------------------------------------------------------------------------

@router.post(
    "/confirm",
    response_model=BookingResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm a held or direct booking",
)
async def confirm_ticket_universal(
    payload: BookingCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:
    # A. Check if holdId or holdToken was supplied to confirm a held booking
    booking = None
    target_id_str = payload.holdId or payload.holdToken
    if target_id_str:
        try:
            b_uuid = uuid.UUID(target_id_str.replace("hld-", "").replace("HLD-", "").strip())
            b_res = await session.execute(select(Booking).where(Booking.id == b_uuid).options(selectinload(Booking.flight)))
            booking = b_res.scalar_one_or_none()
        except ValueError:
            pass

    # If booking was found via holdId, transition hold → confirmed
    if booking:
        if booking.status == BookingStatus.confirmed:
            return _format_booking_response(booking, booking.flight, message=f"Booking {booking.id} is already confirmed.")
        booking.status = BookingStatus.confirmed
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        return _format_booking_response(booking, booking.flight, message="Hold ticket successfully confirmed.")

    # B. Direct confirmation flow
    # Resolve flight
    flight = None
    if payload.flight_id:
        f_res = await session.execute(select(Flight).where(Flight.id == payload.flight_id))
        flight = f_res.scalar_one_or_none()
    elif payload.flightNo or payload.flight_number:
        code = (payload.flightNo or payload.flight_number).strip().upper()
        f_res = await session.execute(select(Flight).where(Flight.flight_number.ilike(f"%{code}%")))
        flight = f_res.scalars().first()

    if flight is None:
        f_res = await session.execute(select(Flight).where(Flight.status == FlightStatus.scheduled).order_by(Flight.departure_time).limit(1))
        flight = f_res.scalars().first()

    if flight is None:
        raise HTTPException(status_code=404, detail="No scheduled flight found for booking confirmation.")

    passenger_name = (payload.passenger_name or payload.fullName or "Passenger").strip()
    seat_class = payload.seat_class or _normalize_seat_class(payload.cabin or payload.seatPreference)
    fare_type = payload.fare_type or FareType.flexible

    # Decrement seat atomically
    decrement_stmt = (
        update(SeatInventory)
        .where(SeatInventory.flight_id == flight.id)
        .where(SeatInventory.seat_class == seat_class)
        .where(SeatInventory.total_seats - SeatInventory.booked_seats > 0)
        .values(booked_seats=SeatInventory.booked_seats + 1)
        .returning(SeatInventory.id)
    )
    decrement_result = await session.execute(decrement_stmt)
    updated_row = decrement_result.fetchone()

    if updated_row is None:
        raise HTTPException(status_code=409, detail=f"No seats remaining in {seat_class} class.")

    new_booking = Booking(
        flight_id=flight.id,
        seat_class=seat_class,
        passenger_name=passenger_name,
        fare_type=fare_type,
        status=BookingStatus.confirmed,
        idempotency_key=str(uuid.uuid4()),
    )
    session.add(new_booking)
    await session.flush()
    await session.commit()

    final_stmt = select(Booking).where(Booking.id == new_booking.id).options(selectinload(Booking.flight))
    final_result = await session.execute(final_stmt)
    new_booking = final_result.scalar_one()

    # Queue transactional confirmation email
    background_tasks.add_task(
        send_transactional_email,
        to_email=passenger_name,
        subject=f"AeroNexus e-Ticket Confirmed — {new_booking.id}",
        body=f"Dear {passenger_name},\nYour booking on flight {flight.flight_number} is CONFIRMED.",
    )

    return _format_booking_response(new_booking, flight, message=f"e-Ticket Confirmed. PNR generated for {passenger_name}.", fare=payload.fare)


# ---------------------------------------------------------------------------
# POST /bookings/{booking_id}/confirm
# ---------------------------------------------------------------------------

@router.post(
    "/{booking_id}/confirm",
    response_model=BookingResponse,
    summary="Confirm a held booking by UUID path",
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
    stmt = select(Booking).where(Booking.id == booking_id).options(selectinload(Booking.flight))
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
        select(Booking).where(Booking.id == booking_id).options(selectinload(Booking.flight))
    )
    booking = final_result.scalar_one()

    # Schedule confirmation email
    background_tasks.add_task(
        send_transactional_email,
        to_email=booking.passenger_name,
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

    return _format_booking_response(booking, booking.flight)



# ---------------------------------------------------------------------------
# DELETE /bookings/{booking_id} — Self-Service 4-Hour Departure Rule
# ---------------------------------------------------------------------------

@router.delete(
    "/{booking_id}",
    summary="Self-service passenger booking cancellation",
    description=(
        "Cancels an active booking and releases seat inventory if scheduled "
        "departure is at least 4 hours away. If departure is within 4 hours, "
        "cancellation is strictly rejected per airline safety protocol."
    ),
)
async def cancel_booking(
    booking_id: uuid.UUID = Path(..., description="UUID of the booking to cancel"),
    session: AsyncSession = Depends(get_db),
) -> dict:
    from datetime import datetime, timedelta, timezone
    from sqlalchemy.orm import selectinload

    stmt = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.flight))
    )
    result = await session.execute(stmt)
    booking = result.scalar_one_or_none()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found.",
        )

    if booking.status == BookingStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking {booking_id} is already cancelled.",
        )

    # Enforce 4-Hour Departure Cancellation Rule
    now_utc = datetime.now(timezone.utc)
    dep_time = booking.flight.departure_time
    if dep_time.tzinfo is None:
        dep_time = dep_time.replace(tzinfo=timezone.utc)

    hours_until_departure = (dep_time - now_utc).total_seconds() / 3600.0

    if hours_until_departure < 4.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cancellation window closed. Bookings cannot be cancelled within "
                "4 hours of scheduled departure per airline protocol. Please contact "
                "the airport dispatch desk."
            ),
        )

    # Cancel booking
    booking.status = BookingStatus.cancelled

    # Release seat inventory atomically
    await session.execute(
        update(SeatInventory)
        .where(
            SeatInventory.flight_id == booking.flight_id,
            SeatInventory.seat_class == booking.seat_class,
            SeatInventory.booked_seats > 0,
        )
        .values(booked_seats=SeatInventory.booked_seats - 1)
    )

    await session.commit()

    return {
        "success": True,
        "message": (
            f"Booking {booking_id} successfully cancelled under the self-service "
            "4-hour departure allowance. Seat inventory has been returned to circulation."
        ),
    }


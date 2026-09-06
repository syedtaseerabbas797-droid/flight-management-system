"""
app/api/routes/admin.py
-----------------------
Admin router — Flight & Seat-Inventory management.

Endpoints
---------
  POST   /admin/flights/              Create flight + seat inventories (transactional)
  PUT    /admin/flights/{flight_id}   Update flight schedule details
  DELETE /admin/flights/{flight_id}   Cancel a flight (soft-delete via status=cancelled)

Design notes
------------
- The get_db dependency (deps.py) already manages the session transaction lifecycle.
  Route functions use session.add(), await session.commit(), and await session.refresh()
  directly — no nested `async with session.begin()` blocks.
- Duplicate detection (same flight_number on the same calendar date) is done with
  a targeted SELECT before the insert to return a clean 409 rather than a raw DB error.
- PUT uses "selective update" — only fields explicitly supplied by the client are written.
- DELETE is a soft-delete: status is set to `cancelled`; rows are never physically removed.
"""

import uuid
from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, status
from sqlalchemy import and_, cast, Date, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.db.enums import BookingStatus, FlightStatus
from app.db.models.booking import Booking
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.schemas.flight import FlightCreate, FlightResponse, FlightUpdate
from app.utils.email import send_transactional_email

router = APIRouter(prefix="/admin/flights", tags=["Admin — Flights"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_flight_or_404(
    flight_id: uuid.UUID,
    session: AsyncSession,
    *,
    load_inventories: bool = True,
) -> Flight:
    """
    Fetch a Flight by primary key.
    Raises HTTP 404 if not found.
    Eagerly loads seat_inventories when `load_inventories=True`.
    """
    stmt = select(Flight).where(Flight.id == flight_id)
    if load_inventories:
        stmt = stmt.options(selectinload(Flight.seat_inventories))

    result = await session.execute(stmt)
    flight = result.scalar_one_or_none()
    if flight is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight {flight_id} not found.",
        )
    return flight


# ---------------------------------------------------------------------------
# POST /admin/flights/
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=FlightResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new flight with seat inventories",
    description=(
        "Creates a flight and its per-class seat inventory in a single atomic "
        "transaction. Rejects duplicate flights (same flight_number on the same "
        "departure date) with HTTP 409."
    ),
)
async def create_flight(
    payload: FlightCreate,
    session: AsyncSession = Depends(get_db),
) -> FlightResponse:
    # ------------------------------------------------------------------
    # Duplicate detection: same flight_number on the same departure date
    # ------------------------------------------------------------------
    departure_date: date = payload.departure_time.date()

    dup_stmt = select(Flight).where(
        and_(
            Flight.flight_number == payload.flight_number,
            cast(Flight.departure_time, Date) == departure_date,
        )
    )
    dup_result = await session.execute(dup_stmt)
    existing = dup_result.scalar_one_or_none()

    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Flight '{payload.flight_number}' already exists on "
                f"{departure_date.isoformat()}. "
                f"Existing flight ID: {existing.id}."
            ),
        )

    # ------------------------------------------------------------------
    # Create Flight + SeatInventory rows
    # ------------------------------------------------------------------
    flight = Flight(
        flight_number=payload.flight_number,
        origin=payload.origin,
        destination=payload.destination,
        departure_time=payload.departure_time,
        arrival_time=payload.arrival_time,
        total_capacity=payload.total_capacity,
        status=FlightStatus.scheduled,
    )
    session.add(flight)
    await session.flush()  # obtain flight.id without committing

    for alloc in payload.seat_allocations:
        inventory = SeatInventory(
            flight_id=flight.id,
            seat_class=alloc.seat_class,
            total_seats=alloc.total_seats,
            booked_seats=0,
        )
        session.add(inventory)

    await session.commit()

    # Re-fetch with eager-loaded inventories to avoid lazy-load in async context
    result = await session.execute(
        select(Flight)
        .where(Flight.id == flight.id)
        .options(selectinload(Flight.seat_inventories))
    )
    flight = result.scalar_one()

    return FlightResponse.model_validate(flight)


# ---------------------------------------------------------------------------
# PUT /admin/flights/{flight_id}
# ---------------------------------------------------------------------------

@router.put(
    "/{flight_id}",
    response_model=FlightResponse,
    summary="Update a flight's schedule details",
    description=(
        "Partial update (PATCH semantics via PUT): only fields supplied in the "
        "request body are written. Cannot update a cancelled flight."
    ),
)
async def update_flight(
    payload: FlightUpdate,
    flight_id: uuid.UUID = Path(..., description="UUID of the flight to update"),
    session: AsyncSession = Depends(get_db),
) -> FlightResponse:
    flight = await _get_flight_or_404(flight_id, session)

    if flight.status == FlightStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight {flight_id} is cancelled and cannot be modified.",
        )

    # Apply only the fields the client actually supplied
    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No update fields provided.",
        )

    for field, value in update_data.items():
        setattr(flight, field, value)

    session.add(flight)
    await session.commit()

    # Re-fetch with eager-loaded inventories to avoid lazy-load in async context
    result = await session.execute(
        select(Flight)
        .where(Flight.id == flight.id)
        .options(selectinload(Flight.seat_inventories))
    )
    flight = result.scalar_one()

    return FlightResponse.model_validate(flight)


# ---------------------------------------------------------------------------
# DELETE /admin/flights/{flight_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{flight_id}",
    response_model=FlightResponse,
    summary="Cancel a flight (soft-delete)",
    description=(
        "Sets flight status to `cancelled`. Rows are never physically deleted. "
        "All bookings in 'hold' or 'confirmed' state are automatically cancelled "
        "in the same transaction. "
        "Returns HTTP 409 if the flight is already cancelled."
    ),
)
async def cancel_flight(
    flight_id: uuid.UUID = Path(..., description="UUID of the flight to cancel"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: AsyncSession = Depends(get_db),
) -> FlightResponse:
    flight = await _get_flight_or_404(flight_id, session)

    if flight.status == FlightStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Flight {flight_id} is already cancelled.",
        )

    flight.status = FlightStatus.cancelled
    session.add(flight)

    # ------------------------------------------------------------------
    # Bulk-cancel all active bookings for this flight in the same txn
    # ------------------------------------------------------------------
    # Fetch active bookings BEFORE the bulk-update so we have passenger
    # details available for the cancellation emails below.
    affected_stmt = (
        select(Booking)
        .where(
            and_(
                Booking.flight_id == flight_id,
                Booking.status.in_([BookingStatus.hold, BookingStatus.confirmed]),
            )
        )
    )
    affected_result = await session.execute(affected_stmt)
    affected_bookings = affected_result.scalars().all()

    await session.execute(
        update(Booking)
        .where(
            and_(
                Booking.flight_id == flight_id,
                Booking.status.in_([BookingStatus.hold, BookingStatus.confirmed]),
            )
        )
        .values(status=BookingStatus.cancelled)
    )

    await session.commit()

    # Re-fetch with eager-loaded inventories to avoid lazy-load in async context
    result = await session.execute(
        select(Flight)
        .where(Flight.id == flight.id)
        .options(selectinload(Flight.seat_inventories))
    )
    flight = result.scalar_one()

    # ------------------------------------------------------------------
    # Schedule one cancellation email per affected passenger (non-blocking)
    # ------------------------------------------------------------------
    for booking in affected_bookings:
        background_tasks.add_task(
            send_transactional_email,
            to_email=booking.passenger_name,   # replace with passenger email when available
            subject=f"Flight Cancelled — Booking {booking.id} Cancelled",
            body=(
                f"Dear {booking.passenger_name},\n\n"
                f"We regret to inform you that flight {flight.flight_number} "
                f"({flight.origin} → {flight.destination}) has been cancelled "
                f"by the airline.\n\n"
                f"Your booking (ID: {booking.id}) has been automatically cancelled.\n\n"
                "We apologise for the inconvenience. Please contact support "
                "for refund or rebooking options."
            ),
        )

    return FlightResponse.model_validate(flight)

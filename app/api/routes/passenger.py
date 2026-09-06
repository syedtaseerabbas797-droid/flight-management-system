"""
app/api/routes/passenger.py
---------------------------
Passenger-facing read endpoints.

Endpoints
---------
  GET  /flights/search   Search for available scheduled flights by route and date
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, cast, Date, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.db.enums import FlightStatus
from app.db.models.flight import Flight
from app.schemas.flight import FlightResponse

router = APIRouter(prefix="/flights", tags=["Passenger — Flights"])


# ---------------------------------------------------------------------------
# GET /flights/search
# ---------------------------------------------------------------------------

@router.get(
    "/search",
    response_model=list[FlightResponse],
    summary="Search for available flights",
    description=(
        "Returns all scheduled (non-cancelled) flights matching the given "
        "origin, destination, and departure date. Seat inventories are "
        "eagerly loaded so passengers can inspect available seats per class."
    ),
)
async def search_flights(
    origin: str = Query(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
        description="3-letter IATA origin airport code (uppercase), e.g. KHI.",
        examples=["KHI"],
    ),
    destination: str = Query(
        ...,
        min_length=3,
        max_length=3,
        pattern=r"^[A-Z]{3}$",
        description="3-letter IATA destination airport code (uppercase), e.g. LHR.",
        examples=["LHR"],
    ),
    date: date = Query(
        ...,
        description="Departure date in YYYY-MM-DD format.",
        examples=["2026-12-01"],
    ),
    session: AsyncSession = Depends(get_db),
) -> list[FlightResponse]:

    stmt = (
        select(Flight)
        .where(
            and_(
                Flight.origin == origin,
                Flight.destination == destination,
                cast(Flight.departure_time, Date) == date,
                Flight.status == FlightStatus.scheduled,
            )
        )
        .options(selectinload(Flight.seat_inventories))
        .order_by(Flight.departure_time)
    )

    result = await session.execute(stmt)
    flights = result.scalars().all()

    if not flights:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"No scheduled flights found from '{origin}' to '{destination}' "
                f"on {date.isoformat()}."
            ),
        )

    return [FlightResponse.model_validate(f) for f in flights]

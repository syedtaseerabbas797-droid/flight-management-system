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


from typing import Optional

# ---------------------------------------------------------------------------
# GET /flights & /flights/ — List all available flights
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=list[FlightResponse],
    summary="List all scheduled flights",
)
@router.get(
    "",
    response_model=list[FlightResponse],
    include_in_schema=False,
)
async def list_flights(
    session: AsyncSession = Depends(get_db),
) -> list[FlightResponse]:
    """
    Returns all scheduled (non-cancelled) flights with seat inventories.
    """
    stmt = (
        select(Flight)
        .where(Flight.status == FlightStatus.scheduled)
        .options(selectinload(Flight.seat_inventories))
        .order_by(Flight.departure_time)
    )
    result = await session.execute(stmt)
    flights = result.scalars().all()
    return [FlightResponse.model_validate(f) for f in flights]


# ---------------------------------------------------------------------------
# GET /flights/search
# ---------------------------------------------------------------------------

@router.get(
    "/search",
    response_model=list[FlightResponse],
    summary="Search for available flights",
    description=(
        "Returns scheduled (non-cancelled) flights matching optional "
        "origin, destination, and departure date. If no filters are provided, "
        "all scheduled flights are returned. If none match, returns an empty list."
    ),
)
async def search_flights(
    origin: Optional[str] = Query(
        None,
        description="3-letter IATA origin airport code (uppercase), e.g. KHI.",
        examples=["KHI"],
    ),
    destination: Optional[str] = Query(
        None,
        description="3-letter IATA destination airport code (uppercase), e.g. LHR.",
        examples=["LHR"],
    ),
    date: Optional[date] = Query(
        None,
        description="Departure date in YYYY-MM-DD format.",
        examples=["2026-12-01"],
    ),
    session: AsyncSession = Depends(get_db),
) -> list[FlightResponse]:
    conditions = [Flight.status == FlightStatus.scheduled]

    if origin:
        conditions.append(Flight.origin == origin.strip().upper())
    if destination:
        conditions.append(Flight.destination == destination.strip().upper())
    if date:
        conditions.append(cast(Flight.departure_time, Date) == date)

    stmt = (
        select(Flight)
        .where(and_(*conditions))
        .options(selectinload(Flight.seat_inventories))
        .order_by(Flight.departure_time)
    )

    result = await session.execute(stmt)
    flights = result.scalars().all()

    return [FlightResponse.model_validate(f) for f in flights]

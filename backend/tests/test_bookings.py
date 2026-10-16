import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete

from app.main import app
from app.db.database import AsyncSessionLocal
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.db.models.booking import Booking
from app.db.enums import FlightStatus, SeatClass

@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session

@pytest.fixture
async def setup_flight(db_session):
    # Setup: Insert a dummy flight with exactly 2 available seats in Economy
    flight_id = uuid.uuid4()
    flight = Flight(
        id=flight_id,
        flight_number="TEST99",
        origin="JFK",
        destination="LHR",
        departure_time=datetime.now(timezone.utc) + timedelta(days=2),
        arrival_time=datetime.now(timezone.utc) + timedelta(days=2, hours=8),
        total_capacity=2,
        status=FlightStatus.scheduled
    )
    
    inventory = SeatInventory(
        flight_id=flight_id,
        seat_class=SeatClass.economy,
        total_seats=2,
        booked_seats=0
    )
    
    db_session.add(flight)
    db_session.add(inventory)
    await db_session.commit()
    
    yield flight_id
    
    # Teardown: Clean up bookings, inventory, and flight
    # Using sqlalchemy delete to bypass cascading requirements if they aren't fully configured
    await db_session.execute(delete(Booking).where(Booking.flight_id == flight_id))
    await db_session.execute(delete(SeatInventory).where(SeatInventory.flight_id == flight_id))
    await db_session.execute(delete(Flight).where(Flight.id == flight_id))
    await db_session.commit()

@pytest.mark.asyncio
async def test_concurrent_bookings_prevent_overselling(setup_flight):
    """
    Simulates 10 concurrent requests attempting to book seats on a flight
    that only has 2 seats available in the targeted seat class.
    
    Guarantees exactly 2 successful bookings (HTTP 201) and 8 rejections (HTTP 409).
    """
    flight_id = setup_flight
    
    # ASGITransport passes the FastAPI app directly to avoid needing a live server running
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        
        async def make_booking_request(i):
            payload = {
                "flight_id": str(flight_id),
                "seat_class": "Economy",
                "passenger_name": f"Concurrent User {i}",
                "fare_type": "refundable"
            }
            headers = {
                "Idempotency-Key": str(uuid.uuid4())
            }
            return await client.post("/api/v1/bookings/hold", json=payload, headers=headers)

        # Fire 10 concurrent requests at the exact same time
        tasks = [make_booking_request(i) for i in range(10)]
        responses = await asyncio.gather(*tasks)
        
        status_codes = [resp.status_code for resp in responses]
        
        successes = status_codes.count(201)
        conflicts = status_codes.count(409)
        
        # The atomic database decrement MUST strictly enforce the limit of 2 seats
        if successes != 2:
            import json
            pytest.fail(f"Expected 2 successful bookings, got {successes}. Status codes: {status_codes}. First response: {responses[0].text[:500]}")
            
        assert successes == 2, f"Expected exactly 2 successful bookings, got {successes}"
        assert conflicts == 8, f"Expected exactly 8 failed bookings, got {conflicts}"

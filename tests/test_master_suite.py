import asyncio
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete

from app.main import app
from app.db.database import AsyncSessionLocal
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.db.models.booking import Booking
from app.db.models.waitlist import Waitlist
from app.db.models.email_draft import EmailDraft
from app.db.enums import FlightStatus, SeatClass, BookingStatus
from app.jobs.waitlist_scheduler import promote_waitlist_job

@pytest.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session

@pytest.fixture
async def setup_flight_5_seats(db_session):
    flight_id = uuid.uuid4()
    flight = Flight(
        id=flight_id,
        flight_number="LOAD-500",
        origin="DXB",
        destination="JFK",
        departure_time=datetime.now(timezone.utc) + timedelta(days=5),
        arrival_time=datetime.now(timezone.utc) + timedelta(days=5, hours=14),
        total_capacity=5,
        status=FlightStatus.scheduled
    )
    
    inventory = SeatInventory(
        flight_id=flight_id,
        seat_class=SeatClass.economy,
        total_seats=5,
        booked_seats=0
    )
    
    db_session.add(flight)
    db_session.add(inventory)
    await db_session.commit()
    
    yield flight_id
    
    # Teardown
    await db_session.execute(delete(EmailDraft).where(EmailDraft.booking_id.in_(
        select(Booking.id).where(Booking.flight_id == flight_id)
    )))
    await db_session.execute(delete(Booking).where(Booking.flight_id == flight_id))
    await db_session.execute(delete(SeatInventory).where(SeatInventory.flight_id == flight_id))
    await db_session.execute(delete(Waitlist).where(Waitlist.flight_id == flight_id))
    await db_session.execute(delete(Flight).where(Flight.id == flight_id))
    await db_session.commit()

@pytest.mark.asyncio
async def test_atomic_bookings_and_idempotency(setup_flight_5_seats):
    flight_id = setup_flight_5_seats
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Generate 50 unique requests, but some have duplicate idempotency keys
        idem_key_1 = str(uuid.uuid4())
        idem_key_2 = str(uuid.uuid4())
        
        async def make_booking_request(i):
            payload = {
                "flight_id": str(flight_id),
                "seat_class": "Economy",
                "passenger_name": f"User {i}",
                "fare_type": "refundable"
            }
            # For index 0 and 1, simulate a double-click identical request
            if i == 0:
                headers = {"Idempotency-Key": idem_key_1}
            elif i == 1:
                headers = {"Idempotency-Key": idem_key_1}
                payload["passenger_name"] = "User 0" # Same payload as user 0
            elif i == 2:
                headers = {"Idempotency-Key": idem_key_2}
            elif i == 3:
                headers = {"Idempotency-Key": idem_key_2}
                payload["passenger_name"] = "User 2"
            else:
                headers = {"Idempotency-Key": str(uuid.uuid4())}
                
            return await client.post("/api/v1/bookings/hold", json=payload, headers=headers)

        tasks = [make_booking_request(i) for i in range(50)]
        responses = await asyncio.gather(*tasks)
        
        status_codes = [resp.status_code for resp in responses]
        
        # Of the 50 requests:
        # Request 0 and 1 share idempotency key. Request 1 will either be a 409 (conflict constraint) or return the same booking if safe.
        # But wait, our API just lets Postgres handle the UNIQUE constraint on idempotency_key, meaning one succeeds, the other gets 409 DB Integrity Error, mapped to 400 Bad Request / 409 Conflict depending on the exception handler.
        # Regardless, AT MOST 5 total seats can be booked in the database!
        
        # We can just query the DB to prove only 5 bookings were created
        async with AsyncSessionLocal() as session:
            stmt = select(Booking).where(Booking.flight_id == flight_id)
            all_bookings = (await session.execute(stmt)).scalars().all()
            
            assert len(all_bookings) <= 5, "Oversold! More than 5 bookings exist."
            assert len(all_bookings) == 5, "Did not sell out the 5 seats."
            
            # Verify inventory is matched
            inv_stmt = select(SeatInventory).where(SeatInventory.flight_id == flight_id)
            inv = (await session.execute(inv_stmt)).scalar_one()
            assert inv.booked_seats == 5
            
            # Verify successes reported
            successes = status_codes.count(201)
            # Depending on duplicate handling, 5 distinct bookings were made.
            assert successes == 5

@pytest.mark.asyncio
async def test_admin_flight_deletion_cascades(setup_flight_5_seats):
    flight_id = setup_flight_5_seats
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create a booking
        headers = {"Idempotency-Key": str(uuid.uuid4())}
        payload = {
            "flight_id": str(flight_id),
            "seat_class": "Economy",
            "passenger_name": "Doomed Passenger",
            "fare_type": "refundable"
        }
        res = await client.post("/api/v1/bookings/hold", json=payload, headers=headers)
        assert res.status_code == 201
        
        # 2. Cancel the flight as Admin
        cancel_res = await client.delete(f"/api/v1/admin/flights/{flight_id}")
        assert cancel_res.status_code == 200
        
        # 3. Verify booking was cascaded to cancelled
        async with AsyncSessionLocal() as session:
            booking_id = res.json()["id"]
            b_stmt = select(Booking).where(Booking.id == booking_id)
            b = (await session.execute(b_stmt)).scalar_one()
            assert b.status == BookingStatus.cancelled
            
            f_stmt = select(Flight).where(Flight.id == flight_id)
            f = (await session.execute(f_stmt)).scalar_one()
            assert f.status == FlightStatus.cancelled


@pytest.mark.asyncio
async def test_waitlist_promotion(setup_flight_5_seats):
    flight_id = setup_flight_5_seats
    
    # 1. Fill all 5 seats
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        for i in range(5):
            await client.post("/api/v1/bookings/hold", json={
                "flight_id": str(flight_id),
                "seat_class": "Economy",
                "passenger_name": f"P{i}",
                "fare_type": "refundable"
            }, headers={"Idempotency-Key": str(uuid.uuid4())})
            
        # 2. Join the waitlist
        res = await client.post("/api/v1/waitlist/", json={
            "flight_id": str(flight_id),
            "seat_class": "Economy",
            "passenger_name": "Waitlisted Willie"
        })
        assert res.status_code == 201
        
        # 3. Cancel one flight booking manually to free a seat
        async with AsyncSessionLocal() as session:
            stmt = select(Booking).where(Booking.flight_id == flight_id).limit(1)
            booking = (await session.execute(stmt)).scalar_one()
            booking.status = BookingStatus.cancelled
            
            inv_stmt = select(SeatInventory).where(SeatInventory.flight_id == flight_id)
            inv = (await session.execute(inv_stmt)).scalar_one()
            inv.booked_seats -= 1
            await session.commit()
            
        # 4. Trigger APScheduler job manually
        await promote_waitlist_job()
        
        # 5. Verify Waitlist is empty, and Willie got a confirmed booking
        async with AsyncSessionLocal() as session:
            w_stmt = select(Waitlist).where(Waitlist.flight_id == flight_id)
            w_list = (await session.execute(w_stmt)).scalars().all()
            assert len(w_list) == 0 # Promoted, so removed
            
            b_stmt = select(Booking).where(Booking.passenger_name == "Waitlisted Willie")
            willie_booking = (await session.execute(b_stmt)).scalar_one_or_none()
            assert willie_booking is not None
            assert willie_booking.status == BookingStatus.confirmed

@pytest.mark.asyncio
async def test_ai_email_approval_gate(setup_flight_5_seats):
    flight_id = setup_flight_5_seats
    
    async with AsyncSessionLocal() as session:
        # Setup dummy booking to get ID
        b = Booking(
            flight_id=flight_id,
            seat_class=SeatClass.economy,
            status=BookingStatus.confirmed,
            fare_type="refundable",
            passenger_name="QA Test",
            idempotency_key=str(uuid.uuid4())
        )
        session.add(b)
        await session.commit()
        
        draft = EmailDraft(
            booking_id=b.id,
            subject="Test Gate",
            body="Is this a test?",
            status="pending_approval"
        )
        session.add(draft)
        await session.commit()
        await session.refresh(draft)
        draft_id = draft.id
        
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Trigger Admin approval endpoint
        res = await client.post(f"/api/v1/admin/emails/{draft_id}/approve")
        assert res.status_code == 200
        assert "successfully approved" in res.json()["message"]
        
        # Check DB that status was flipped
        async with AsyncSessionLocal() as s:
            d_stmt = select(EmailDraft).where(EmailDraft.id == draft_id)
            updated_draft = (await s.execute(d_stmt)).scalar_one()
            assert updated_draft.status == "sent"
        
        # Re-triggering should yield 400
        res2 = await client.post(f"/api/v1/admin/emails/{draft_id}/approve")
        assert res2.status_code == 400

"""
seed_flights.py
---------------
Populate Neon Postgres with flagship scheduled flights matching both Admin and Customer frontends.
Ensures AP-104, AP-882, AP-305, AP-408, and PK-302 exist with future dates and per-class seat inventories.
"""

import asyncio
import os
import sys

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.db.database import AsyncSessionLocal, engine
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.db.models.booking import Booking
from app.db.models.waitlist import Waitlist
from app.db.enums import FlightStatus, SeatClass, BookingStatus, FareType
import uuid

FLIGHT_SEEDS = [
    {
        "flight_number": "AP-104",
        "origin": "JFK",
        "destination": "LHR",
        "departure_offset_hours": 24,
        "duration_hours": 7.25,
        "first": 12,
        "business": 48,
        "economy": 240,
    },
    {
        "flight_number": "AP-882",
        "origin": "SFO",
        "destination": "HND",
        "departure_offset_hours": 36,
        "duration_hours": 11.5,
        "first": 10,
        "business": 50,
        "economy": 200,
    },
    {
        "flight_number": "AP-305",
        "origin": "LHR",
        "destination": "SIN",
        "departure_offset_hours": 48,
        "duration_hours": 12.75,
        "first": 12,
        "business": 48,
        "economy": 220,
    },
    {
        "flight_number": "AP-408",
        "origin": "DXB",
        "destination": "SIN",
        "departure_offset_hours": 72,
        "duration_hours": 7.5,
        "first": 8,
        "business": 42,
        "economy": 200,
    },
    {
        "flight_number": "PK-302",
        "origin": "KHI",
        "destination": "LHR",
        "departure_offset_hours": 96,
        "duration_hours": 8.5,
        "first": 10,
        "business": 40,
        "economy": 220,
    },
]

async def seed():
    print("=" * 60)
    print("✈ AERONEXUS AVIATION - SEEDING CORE FLIGHTS & INVENTORY")
    print("=" * 60)

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        for item in FLIGHT_SEEDS:
            fn = item["flight_number"]
            # Check if flight already exists
            stmt = select(Flight).where(Flight.flight_number == fn)
            existing = (await session.execute(stmt)).scalars().first()

            dep = now + timedelta(hours=item["departure_offset_hours"])
            arr = dep + timedelta(hours=item["duration_hours"])
            total_cap = item["first"] + item["business"] + item["economy"]

            if existing:
                print(f"Updating flight {fn} schedule to {dep.strftime('%Y-%m-%d %H:%M UTC')}...")
                existing.origin = item["origin"]
                existing.destination = item["destination"]
                existing.departure_time = dep
                existing.arrival_time = arr
                existing.total_capacity = total_cap
                existing.status = FlightStatus.scheduled
                flight = existing
            else:
                print(f"Creating flight {fn} ({item['origin']} → {item['destination']})...")
                flight = Flight(
                    flight_number=fn,
                    origin=item["origin"],
                    destination=item["destination"],
                    departure_time=dep,
                    arrival_time=arr,
                    total_capacity=total_cap,
                    status=FlightStatus.scheduled,
                )
                session.add(flight)
                await session.flush()

            # Ensure seat inventories exist
            for seat_cls, count in [
                (SeatClass.first, item["first"]),
                (SeatClass.business, item["business"]),
                (SeatClass.economy, item["economy"]),
            ]:
                inv_stmt = select(SeatInventory).where(
                    SeatInventory.flight_id == flight.id,
                    SeatInventory.seat_class == seat_cls,
                )
                inv = (await session.execute(inv_stmt)).scalar_one_or_none()
                if inv:
                    inv.total_seats = count
                else:
                    inv = SeatInventory(
                        flight_id=flight.id,
                        seat_class=seat_cls,
                        total_seats=count,
                        booked_seats=0,
                    )
                    session.add(inv)

        # Also seed a sample confirmed booking for Syed Taseer Abbas on AP-104
        ap104_stmt = select(Flight).where(Flight.flight_number == "AP-104")
        ap104 = (await session.execute(ap104_stmt)).scalar_one_or_none()
        if ap104:
            b_stmt = select(Booking).where(
                Booking.flight_id == ap104.id,
                Booking.passenger_name == "Syed Taseer Abbas",
            )
            existing_booking = (await session.execute(b_stmt)).scalar_one_or_none()
            if not existing_booking:
                sample_b = Booking(
                    flight_id=ap104.id,
                    seat_class=SeatClass.business,
                    passenger_name="Syed Taseer Abbas",
                    fare_type=FareType.flexible,
                    status=BookingStatus.confirmed,
                    idempotency_key=str(uuid.uuid4()),
                )
                session.add(sample_b)
                print("Seeded active booking for Syed Taseer Abbas on AP-104.")

        # Seed sample waitlist on AP-882
        ap882_stmt = select(Flight).where(Flight.flight_number == "AP-882")
        ap882 = (await session.execute(ap882_stmt)).scalar_one_or_none()
        if ap882:
            w_stmt = select(Waitlist).where(Waitlist.flight_id == ap882.id)
            existing_w = (await session.execute(w_stmt)).scalars().all()
            if not existing_w:
                session.add(Waitlist(flight_id=ap882.id, seat_class=SeatClass.first, passenger_name="Lord H. Sterling (VIP)"))
                session.add(Waitlist(flight_id=ap882.id, seat_class=SeatClass.business, passenger_name="Dr. Elizabeth Thorne"))
                print("Seeded sample waitlist passengers on AP-882.")

        await session.commit()
        print("\n✅ [SUCCESS] All core flights, inventories, bookings, and waitlists seeded successfully!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(seed())

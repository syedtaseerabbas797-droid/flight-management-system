import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models.flight import Flight
from app.db.models.booking import Booking
from app.db.enums import BookingStatus
from app.utils.email import send_transactional_email

async def checkin_reminders_job():
    """
    Finds flights departing in exactly 23.5 - 24.5 hours from now.
    Queues transactional check-in emails for all confirmed bookings on those flights.
    """
    now = datetime.now(timezone.utc)
    target_start = now + timedelta(hours=23, minutes=30)
    target_end = now + timedelta(hours=24, minutes=30)
    
    async with AsyncSessionLocal() as session:
        stmt = (
            select(Booking, Flight)
            .join(Flight, Booking.flight_id == Flight.id)
            .where(Flight.departure_time >= target_start)
            .where(Flight.departure_time <= target_end)
            .where(Booking.status == BookingStatus.confirmed)
        )
        
        result = await session.execute(stmt)
        rows = result.all()
        
        for booking, flight in rows:
            body = (
                f"Hello {booking.passenger_name},\n\n"
                f"Your flight {flight.flight_number} from {flight.origin} to {flight.destination} "
                f"departs exactly 24 hours from now at {flight.departure_time}. "
                "Please ensure you check in online to receive your boarding pass!\n\n"
                "Safe travels!"
            )
            
            fake_email = f"{booking.passenger_name.replace(' ', '.').lower()}@example.com"
            asyncio.create_task(asyncio.to_thread(
                send_transactional_email,
                to_email=fake_email,
                subject=f"Check-in Reminder: Flight {flight.flight_number}",
                body=body
            ))

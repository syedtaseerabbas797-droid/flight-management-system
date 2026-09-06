from datetime import datetime, timezone
from sqlalchemy import select
from app.db.database import AsyncSessionLocal
from app.db.models.flight import Flight
from app.db.models.booking import Booking
from app.db.models.ops_report import OpsReport
from app.db.enums import BookingStatus

async def ops_reporting_job():
    """
    Runs daily (midnight).
    Calculates load factor and revenue per flight, exports to OpsReport model.
    """
    today = datetime.now(timezone.utc).date()
    
    async with AsyncSessionLocal() as session:
        stmt = select(Flight)
        flights = (await session.execute(stmt)).scalars().all()
        
        for flight in flights:
            book_stmt = select(Booking).where(Booking.flight_id == flight.id, Booking.status == BookingStatus.confirmed)
            bookings = (await session.execute(book_stmt)).scalars().all()
            
            booked_count = len(bookings)
            load_factor = booked_count / flight.total_capacity if flight.total_capacity > 0 else 0
            
            revenue = 0.0
            for b in bookings:
                if b.fare_type.value == "refundable":
                    revenue += 500
                elif b.fare_type.value == "flexible":
                    revenue += 350
                else: 
                    revenue += 150
                
            report = OpsReport(
                report_date=today,
                flight_id=flight.id,
                load_factor=load_factor,
                revenue=revenue
            )
            session.add(report)
            
        await session.commit()

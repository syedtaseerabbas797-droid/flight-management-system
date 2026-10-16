"""
app/jobs/waitlist_scheduler.py
------------------------------
Background job to promote waitlisted passengers to confirmed bookings
when seats become available (e.g., due to cancellations or capacity increases).

Powered by APScheduler.
"""

import asyncio
import logging
from uuid import uuid4

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import AsyncSessionLocal
from app.db.enums import BookingStatus, FlightStatus
from app.db.models.booking import Booking
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.db.models.waitlist import Waitlist
from app.utils.email import send_transactional_email

logger = logging.getLogger(__name__)


async def promote_waitlist_job():
    """
    Finds flights with available seats and promotes the oldest waitlisted
    passenger for that seat class into a confirmed booking.
    """
    logger.info("Running waitlist promotion job...")

    # We must use a fresh session for the background job
    async with AsyncSessionLocal() as session:
        try:
            # 1. Find scheduled flights that have available seats in some class
            # (total_seats > booked_seats)
            avail_stmt = (
                select(SeatInventory)
                .join(Flight, Flight.id == SeatInventory.flight_id)
                .where(
                    and_(
                        Flight.status == FlightStatus.scheduled,
                        SeatInventory.total_seats > SeatInventory.booked_seats
                    )
                )
            )
            avail_result = await session.execute(avail_stmt)
            available_inventories = avail_result.scalars().all()

            for inventory in available_inventories:
                while inventory.total_seats > inventory.booked_seats:
                    # 2. Check if anyone is waiting for this exact flight_id and seat_class
                    waitlist_stmt = (
                        select(Waitlist)
                        .where(
                            and_(
                                Waitlist.flight_id == inventory.flight_id,
                                Waitlist.seat_class == inventory.seat_class,
                            )
                        )
                        .order_by(Waitlist.joined_at.asc())
                        .limit(1)
                    )
                    waitlist_res = await session.execute(waitlist_stmt)
                    next_passenger = waitlist_res.scalar_one_or_none()

                    if not next_passenger:
                        break  # No one waitlisted for this class; move to next inventory

                    # 3. Promote! Create confirmed booking.
                    new_booking = Booking(
                        flight_id=inventory.flight_id,
                        seat_class=inventory.seat_class,
                        passenger_name=next_passenger.passenger_name,
                        fare_type="flexible",  # Default fare type for waitlist promotions
                        status=BookingStatus.confirmed,
                        idempotency_key=str(uuid4()), # Need unique idempotency keys for sys-generated bookings
                    )
                    
                    # Decrement seat availability
                    inventory.booked_seats += 1
                    
                    # Add new booking
                    session.add(new_booking)
                    session.add(inventory)
                    
                    # Remove from waitlist
                    await session.delete(next_passenger)

                    # Flush here individually to prevent massive rollback on single failure
                    await session.commit()
                    logger.info(
                        "Promoted waitlist entry %s into booking %s",
                        next_passenger.id,
                        new_booking.id,
                    )
                    
                    # 4. Asynchronously notify the passenger 
                    # (we import smtplib synchronously so it blocks a bit here, 
                    # but since APScheduler AsyncIOScheduler runs it's acceptable. 
                    # In true scale we'd throw this to Celery/BackgroundTasks)
                    try:
                        await asyncio.to_thread(
                            send_transactional_email,
                            to_email=new_booking.passenger_name,
                            subject="Waitlist Success! You're booked.",
                            body=(
                                f"Good news {new_booking.passenger_name}!\n\n"
                                f"A seat opened up and your waitlist request has been automatically "
                                f"promoted to a confirmed booking.\n"
                                f"Booking ID: {new_booking.id}\n"
                            )
                        )
                    except Exception as e:
                        logger.error(f"Failed to send promotion email: {e}")
                        
        except Exception as e:
            logger.error(f"Error in waitlist promotion job: {e}")
            await session.rollback()

from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from app.db.database import AsyncSessionLocal
from app.db.models.booking import Booking

async def realtime_fraud_scoring_job():
    """
    Scans bookings made in the last 15 minutes.
    If passenger_name has > 1 booking in the window, flag all their recent bookings for 'fraud_review'.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=15)
    
    async with AsyncSessionLocal() as session:
        stmt = select(Booking).where(Booking.created_at >= cutoff)
        recent = (await session.execute(stmt)).scalars().all()
        
        names_count = {}
        for b in recent:
            names_count[b.passenger_name] = names_count.get(b.passenger_name, 0) + 1
            
        flagged_names = {n for n, c in names_count.items() if c > 1}
        
        for b in recent:
            if b.passenger_name in flagged_names:
                b.is_fraud_review = True
                
        if flagged_names:
            await session.commit()

async def batch_fraud_review_job():
    """
    Weekly batch job. Example scans for accounts with disproportionate holds vs confirms.
    (Left as stub for system architect to expand upon for ML-based scoring).
    """
    # Logic for mass-booking / mass-cancellation scans over 7 days
    pass

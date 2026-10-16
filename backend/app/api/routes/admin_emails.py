import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_db
from app.db.models.email_draft import EmailDraft
from app.db.models.booking import Booking
from app.utils.email import send_transactional_email

router = APIRouter(prefix="/admin/emails", tags=["Admin — Emails"])

@router.post("/{draft_id}/approve")
async def approve_email_draft(
    draft_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db)
):
    # Fetch draft and associated booking for customer info
    stmt = (
        select(EmailDraft, Booking)
        .join(Booking, EmailDraft.booking_id == Booking.id)
        .where(EmailDraft.id == draft_id)
    )
    result = await session.execute(stmt)
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail="Email draft not found.")
        
    draft, booking = row
    
    if draft.status == "sent":
        raise HTTPException(status_code=400, detail="This draft has already been sent.")
        
    # Mark as sent and commit transaction
    draft.status = "sent"
    await session.commit()
    
    # Generate fake email dynamically (would use real booking.email in production)
    fake_email = f"{booking.passenger_name.replace(' ', '.').lower()}@example.com"
    
    # Queue the SMTP email send without blocking the API response
    background_tasks.add_task(
        send_transactional_email,
        to_email=fake_email,
        subject=draft.subject,
        body=draft.body
    )
    
    return {"message": f"Draft {draft.id} successfully approved and email queued."}

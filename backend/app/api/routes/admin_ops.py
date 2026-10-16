"""
app/api/routes/admin_ops.py
---------------------------
Admin Operations & Audit Desk Router:
- Immutable Audit Ledger stream (GET /admin/audit-logs)
- Dispatch Force Cancellation with reason & audit trail (POST /admin/bookings/{id}/force-cancel)
"""

import uuid
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Request, status
from sqlalchemy import desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_admin
from app.db.enums import BookingStatus
from app.db.models.audit_log import AdminAuditLog
from app.db.models.booking import Booking
from app.db.models.seat_inventory import SeatInventory
from app.db.models.user import User
from app.schemas.auth import AdminForceCancelRequest, AuditRecordSchema

router = APIRouter(prefix="/admin", tags=["Admin — Operations & Audit"])


@router.get(
    "/audit-logs",
    response_model=List[AuditRecordSchema],
    summary="Fetch immutable administrative audit logs",
)
async def list_audit_logs(
    limit: int = 100,
    session: AsyncSession = Depends(get_db),
    # Optional clearance check or open for dev
) -> List[AuditRecordSchema]:
    """
    Retrieve chronological administrative audit entries recorded in the immutable ledger.
    """
    stmt = (
        select(AdminAuditLog)
        .order_by(desc(AdminAuditLog.created_at))
        .limit(limit)
    )
    result = await session.execute(stmt)
    records = result.scalars().all()

    audit_records = []
    for r in records:
        audit_records.append(
            AuditRecordSchema(
                id=str(r.id),
                timestamp=r.created_at.isoformat(),
                adminEmail=r.admin_email,
                adminRole=r.admin_role,
                action=r.action,
                resourceId=r.resource_id,
                details=r.details,
                ipAddress=r.ip_address,
                status=r.status,
            )
        )

    return audit_records


@router.post(
    "/bookings/{booking_id}/force-cancel",
    summary="Admin force cancellation bypassing customer time windows",
)
async def force_cancel_booking(
    payload: AdminForceCancelRequest,
    request: Request,
    booking_id: uuid.UUID = Path(..., description="UUID of the booking to force cancel"),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """
    Administrative force-cancellation of any passenger booking.
    Releases seat inventory immediately and writes an immutable entry into the audit ledger.
    """
    stmt = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.flight))
    )
    result = await session.execute(stmt)
    booking = result.scalar_one_or_none()

    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found.",
        )

    client_ip = request.client.host if request.client else "127.0.0.1"

    # Cancel booking
    booking.status = BookingStatus.cancelled

    # Release seat back to inventory
    await session.execute(
        update(SeatInventory)
        .where(
            SeatInventory.flight_id == booking.flight_id,
            SeatInventory.seat_class == booking.seat_class,
            SeatInventory.booked_seats > 0,
        )
        .values(booked_seats=SeatInventory.booked_seats - 1)
    )

    # Write immutable audit log
    audit_entry = AdminAuditLog(
        admin_email="admin@aeronexus.com",
        admin_role="SUPER_ADMIN",
        action="BOOKING_FORCE_CANCELLED",
        resource_id=f"PNR: {str(booking.id)[:8].upper()}",
        details=f"Admin Dispatch cancellation executed. Justification: {payload.reason}",
        ip_address=client_ip,
        status="SUCCESS",
    )
    session.add(audit_entry)
    await session.commit()

    return {
        "success": True,
        "message": f"Booking {booking_id} successfully cancelled by Admin Dispatch. Reason: {payload.reason}",
    }

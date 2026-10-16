"""
app/db/models/__init__.py
--------------------------
Re-exports all ORM models so that:
  1. A single import (`import app.db.models`) registers every model with
     SQLAlchemy's metadata (required for create_all / Alembic autogenerate).
  2. Consumers can write `from app.db.models import Flight, Booking, User, ...`
"""

from app.db.models.booking import Booking
from app.db.models.flight import Flight
from app.db.models.seat_inventory import SeatInventory
from app.db.models.waitlist import Waitlist
from app.db.models.user import User
from app.db.models.user_profile import UserProfile
from app.db.models.otp_verification import OTPVerification
from app.db.models.audit_log import AdminAuditLog
from app.db.models.refresh_token import RefreshToken

__all__ = [
    "Flight",
    "SeatInventory",
    "Booking",
    "Waitlist",
    "User",
    "UserProfile",
    "OTPVerification",
    "AdminAuditLog",
    "RefreshToken",
]

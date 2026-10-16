"""
app/db/enums.py
---------------
All application-level enumerations.
These are Python enums that are also registered as native Postgres ENUM types
via SQLAlchemy's Enum column type.
"""

import enum


class FlightStatus(str, enum.Enum):
    """Status of a flight."""
    scheduled = "scheduled"
    cancelled = "cancelled"


class SeatClass(str, enum.Enum):
    """Available seating classes."""
    first    = "First"
    business = "Business"
    economy  = "Economy"


class BookingStatus(str, enum.Enum):
    """Lifecycle status of a booking."""
    hold      = "hold"
    confirmed = "confirmed"
    cancelled = "cancelled"


class FareType(str, enum.Enum):
    """Ticket fare category."""
    refundable     = "refundable"
    non_refundable = "non_refundable"
    flexible       = "flexible"

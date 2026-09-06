import uuid
from datetime import date
from sqlalchemy import Date, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.db.base import Base

class OpsReport(Base):
    __tablename__ = "ops_reports"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id", ondelete="CASCADE"), nullable=False, index=True)
    load_factor: Mapped[float] = mapped_column(Float, nullable=False)
    revenue: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

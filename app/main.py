"""
app/main.py
-----------
FastAPI application factory and entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.api.routes.admin import router as admin_router
from app.api.routes.admin_emails import router as admin_emails_router
from app.api.routes.bookings import router as bookings_router
from app.api.routes.passenger import router as passenger_router
from app.api.routes.waitlist import router as waitlist_router
from app.api.routes.ai_policy import router as ai_policy_router
from app.db.database import engine
from app.jobs.waitlist_scheduler import promote_waitlist_job
from app.jobs.notifications import checkin_reminders_job
from app.jobs.reports import ops_reporting_job
from app.jobs.fraud_detection import realtime_fraud_scoring_job, batch_fraud_review_job

# Global scheduler instance
scheduler = AsyncIOScheduler()


# ---------------------------------------------------------------------------
# Lifespan — runs once on startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Startup: Start the APScheduler for background jobs.
    Shutdown: gracefully shut down scheduler and dispose the async connection pool.
    
    Database schema is now managed by Alembic.
    """
    # Configure and start background scheduler (Waitlist promotion)
    scheduler.add_job(promote_waitlist_job, "interval", minutes=5, id="promote_waitlist")
    
    # New peripheral peripheral jobs:
    scheduler.add_job(checkin_reminders_job, "cron", minute=0, id="checkin_reminders")
    scheduler.add_job(ops_reporting_job, "cron", hour=0, minute=0, id="daily_ops_report")
    scheduler.add_job(realtime_fraud_scoring_job, "interval", minutes=15, id="realtime_fraud_scoring")
    scheduler.add_job(batch_fraud_review_job, "cron", day_of_week="sun", hour=2, id="weekly_batch_fraud")
    
    scheduler.start()
    
    yield
    
    scheduler.shutdown()
    await engine.dispose()


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Flight Management System API",
    description=(
        "Capstone project — Admin & Passenger APIs for managing flights, "
        "seat inventories, bookings, and waitlists."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(admin_router, prefix="/api/v1")
app.include_router(admin_emails_router, prefix="/api/v1")
app.include_router(bookings_router, prefix="/api/v1")
app.include_router(passenger_router, prefix="/api/v1")
app.include_router(waitlist_router, prefix="/api/v1")
app.include_router(ai_policy_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Health-check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"], summary="Service health check")
async def health() -> dict[str, str]:
    return {"status": "ok"}

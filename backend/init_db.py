"""
init_db.py
----------
One-shot script to create all database tables in Neon Postgres.

Usage
-----
    # From the project root (with .env populated):
    python init_db.py

WARNING
-------
This script uses `Base.metadata.create_all`, which is fine for initial
development or CI. For production, prefer Alembic migrations so schema
changes are tracked and reversible.
"""

import asyncio
import logging

from dotenv import load_dotenv

# Load DATABASE_URL and other vars from .env before anything else
load_dotenv()

from app.db.base import Base          # DeclarativeBase
from app.db.database import engine    # async engine (asyncpg + Neon)

# Import every model so SQLAlchemy registers their tables with Base.metadata.
# If you add new models in the future, import them here too.
import app.db.models  # noqa: F401  (registers Flight, SeatInventory, Booking, Waitlist)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)


async def init_db() -> None:
    """Drop nothing — only CREATE tables that do not already exist."""
    log.info("Connecting to Neon Postgres via asyncpg …")
    async with engine.begin() as conn:
        log.info("Running Base.metadata.create_all …")
        await conn.run_sync(Base.metadata.create_all)
    log.info("✅  All tables created (or already existed).")


async def main() -> None:
    try:
        await init_db()
    finally:
        # Gracefully close the connection pool before the process exits.
        await engine.dispose()
        log.info("Engine disposed. Done.")


if __name__ == "__main__":
    asyncio.run(main())

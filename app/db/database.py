"""
app/db/database.py
------------------
Async SQLAlchemy engine and session factory setup.

Designed for a Neon Postgres connection string using asyncpg as the driver.

Usage
-----
Set the DATABASE_URL environment variable (in .env):

    DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>/<dbname>?ssl=require

Then import `AsyncSessionLocal` or use `get_db` as a FastAPI dependency.
"""

import os
from typing import AsyncGenerator

from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

load_dotenv()

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------
DATABASE_URL: str = os.environ["DATABASE_URL"]
# Neon Postgres requires SSL; asyncpg reads it from the query string.
# pool_pre_ping keeps the pool healthy across Neon's aggressive idle timeouts.
engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # Set True during development to log SQL statements
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800,   # Recycle connections every 30 minutes
)

# ---------------------------------------------------------------------------
# Session Factory
# ---------------------------------------------------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Prevents lazy-load errors after commit
    autocommit=False,
    autoflush=False,
)


# ---------------------------------------------------------------------------
# FastAPI Dependency
# ---------------------------------------------------------------------------
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Yield an async database session for use as a FastAPI dependency.

    Example:
        @router.get("/flights")
        async def list_flights(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ---------------------------------------------------------------------------
# Table Initialisation Helper (dev / test only)
# ---------------------------------------------------------------------------
async def create_all_tables() -> None:
    """
    Create all tables defined in ORM models.
    Import all models before calling this so SQLAlchemy knows about them.

    WARNING: Use Alembic migrations in production instead of this function.
    """
    from app.db.base import Base  # noqa: F401 — ensure Base is loaded
    import app.db.models  # noqa: F401 — registers all models with Base

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

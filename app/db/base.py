"""
app/db/base.py
--------------
Declarative base for all SQLAlchemy ORM models.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all ORM models in the project."""
    pass

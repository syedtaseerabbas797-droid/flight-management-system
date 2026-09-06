"""
app/api/deps.py
---------------
Shared FastAPI dependencies.

The `get_db` dependency here re-exports the one defined in `app.db.database`
so that routes only need to import from a single, stable location within the
`api` package — insulating them from internal DB module restructuring.
"""

from app.db.database import get_db  # noqa: F401 — re-exported as the canonical dep

__all__ = ["get_db"]

"""
main.py (Root Entrypoint)
-------------------------
Entrypoint for deployments executing from repository root (e.g. FastAPICloud, Render, Railway).
Imports and exposes the FastAPI app from backend/app/main.py.
"""

import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app modules are discoverable
backend_path = Path(__file__).resolve().parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.main import app  # noqa: E402, F401

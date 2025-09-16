"""Project-specific Python site customizations.

This module ensures the FastAPI backend package is importable as ``app``
regardless of the current working directory.  Our repository hosts a Next.js
frontend in the top-level ``app`` directory, which normally shadows the actual
FastAPI package that lives under ``backend/app``.  The unit tests import
``app.main`` directly, so without adjusting ``sys.path`` they would load the
frontend namespace package instead and fail with ``ModuleNotFoundError`` when
searching for ``main``.

By inserting the backend directory at the start of ``sys.path`` we guarantee
that Python resolves ``app`` to the backend implementation first, matching the
runtime environment used in production.
"""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if BACKEND_DIR.is_dir():
    # ``sys.path`` may already contain the project root ("" entry).  Insert the
    # backend path ahead of it so that ``import app`` resolves to the FastAPI
    # package located in ``backend/app`` rather than the frontend namespace
    # directory at the repository root.
    backend_path = str(BACKEND_DIR)
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

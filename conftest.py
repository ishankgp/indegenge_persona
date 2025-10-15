"""Pytest configuration for the IndeGenge persona project.

These tests exercise the FastAPI backend that lives under ``backend/app``.
However, the repository root also contains a Next.js frontend in ``app/``.
Without adjusting ``sys.path`` the ``from app.main import app`` import used in
our tests would resolve to the frontend namespace package instead of the
backend.  This hook ensures the backend package takes precedence when the test
suite runs.
"""

from __future__ import annotations

import inspect
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent / "backend"
BACKEND_PATH = str(BACKEND_DIR)

if BACKEND_DIR.is_dir() and BACKEND_PATH not in sys.path:
    sys.path.insert(0, BACKEND_PATH)


import httpx
import requests
from fastapi.testclient import TestClient

from app.main import app


# ---------------------------------------------------------------------------
# Compatibility patch for Starlette TestClient with httpx >= 0.28.
# ---------------------------------------------------------------------------
#
# Starlette 0.27 (bundled with FastAPI 0.104) still instantiates ``httpx.Client``
# using the deprecated ``app=`` keyword argument.  httpx 0.28 removed this
# parameter which causes ``TestClient`` construction to fail.  We detect the new
# signature and shim back the ``app`` keyword so that TestClient remains usable
# in the test suite.
if "app" not in inspect.signature(httpx.Client.__init__).parameters:
    _original_httpx_init = httpx.Client.__init__

    def _patched_httpx_init(self, *args, app=None, **kwargs):  # type: ignore[override]
        return _original_httpx_init(self, *args, **kwargs)

    httpx.Client.__init__ = _patched_httpx_init  # type: ignore[assignment]


# Shared test client used to service HTTP requests from the ``requests``
# library.  This allows the functional tests to exercise the ASGI application
# without needing to spawn an external server on localhost.
_test_client = TestClient(app)
_original_request = requests.sessions.Session.request


def _proxy_local_requests(self, method, url, *args, **kwargs):
    if url.startswith("http://localhost:8000"):
        path = url.split("http://localhost:8000", 1)[1] or "/"
        return _test_client.request(method, path, **kwargs)
    return _original_request(self, method, url, *args, **kwargs)


if not getattr(requests.sessions.Session.request, "_patched_localhost", False):
    requests.sessions.Session.request = _proxy_local_requests  # type: ignore[assignment]
    requests.sessions.Session.request._patched_localhost = True  # type: ignore[attr-defined]

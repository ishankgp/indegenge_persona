from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import json
import time
from dotenv import load_dotenv

load_dotenv()

DEBUG_LOG_PATH = r"d:\Github clones\indegene_personna\pharmapersonasim\.cursor\debug.log"
DEBUG_ENDPOINT = "http://127.0.0.1:7242/ingest/19419b76-f6bc-4520-8e7a-a1d6480382cb"

def _agent_log(hypothesis_id: str, message: str, data: dict):
    """Minimal NDJSON logger for debug mode (writes locally and posts to ingest endpoint)."""
    payload = {
        "sessionId": "debug-session",
        "runId": "run1",
        "hypothesisId": hypothesis_id,
        "location": "app/database.py",
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    line = json.dumps(payload, ensure_ascii=False)
    # #region agent log write
    try:
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass
    # #endregion agent log write
    # #region agent log post
    try:
        import requests  # imported lazily to avoid import issues if not installed
        requests.post(DEBUG_ENDPOINT, json=payload, timeout=2)
    except Exception:
        pass
    # #endregion agent log post

# Get the directory where this file is located
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'pharma_personas.db')}")

# #region agent log
_agent_log("H1", "db.url.raw", {"DATABASE_URL": DATABASE_URL})
# #endregion agent log

# Handle PostgreSQL URL format (Railway/Heroku use postgres://, SQLAlchemy needs postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# #region agent log
_agent_log("H1", "db.url.normalized", {"DATABASE_URL": DATABASE_URL, "connect_args": connect_args})
# #endregion agent log

try:
    engine = create_engine(DATABASE_URL, connect_args=connect_args)
    # #region agent log
    _agent_log("H1", "db.engine.created", {"ENGINE_URL": str(engine.url), "connect_args": connect_args})
    # #endregion agent log
except Exception as exc:
    # #region agent log
    _agent_log("H1", "db.engine.error", {"error": str(exc)})
    # #endregion agent log
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

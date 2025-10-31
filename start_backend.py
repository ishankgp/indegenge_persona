#!/usr/bin/env python3
"""
Simple backend starter script
"""
import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Change to backend directory
os.chdir(backend_dir)

# Start the server
if __name__ == "__main__":
    import uvicorn
    from app.main import app
    
    print("=" * 50)
    print("  Starting PharmaPersonaSim Backend API")
    print("=" * 50)
    print("[INFO] API will be available at: http://127.0.0.1:8080")
    print("[INFO] Interactive API docs at: http://127.0.0.1:8080/docs")
    print("[INFO] Press Ctrl+C to stop the server")
    print("=" * 50)
    
    uvicorn.run(app, host="127.0.0.1", port=8080, reload=False)

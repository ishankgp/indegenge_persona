#!/usr/bin/env python3
"""
PharmaPersonaSim Application Launcher
Starts both backend API and frontend development server
"""

import subprocess
import os
import sys
import time
from pathlib import Path

# --- Configuration ---
BACKEND_PORT = 8000
FRONTEND_PORT = 5173
PROJECT_ROOT = Path(__file__).parent.resolve()
BACKEND_DIR = PROJECT_ROOT / "backend"
FRONTEND_DIR = PROJECT_ROOT / "frontend"

# --- Helper Functions ---

def print_header(title):
    print("=" * 50)
    print(f"  {title}")
    print("=" * 50)

def print_info(message):
    print(f"[INFO] {message}")

def print_error(message):
    print(f"[ERROR] {message}", file=sys.stderr)

def get_python_executable():
    """Determines the correct python executable from the venv."""
    venv_path = PROJECT_ROOT / "venv"
    if sys.platform == "win32":
        python_exe = venv_path / "Scripts" / "python.exe"
    else:
        python_exe = venv_path / "bin" / "python"

    if not python_exe.exists():
        print_error(f"Python executable not found in venv at: {python_exe}")
        print_error("Please ensure the virtual environment is set up correctly.")
        return None
    return str(python_exe)

def start_backend(python_exe):
    """Starts the FastAPI backend server."""
    print_info("Starting FastAPI backend server...")
    command = [
        python_exe,
        "-m", "uvicorn",
        "app.main:app",
        "--host", "127.0.0.1",
        "--port", str(BACKEND_PORT)
    ]
    try:
        # Use Popen for non-blocking execution
        process = subprocess.Popen(command, cwd=str(BACKEND_DIR))
        print_info(f"Backend server process started with PID: {process.pid}")
        print_info(f"API will be available at http://127.0.0.1:{BACKEND_PORT}")
        return process
    except FileNotFoundError:
        print_error(f"Could not find command: {command[0]}. Is Python installed and in the PATH?")
        return None
    except Exception as e:
        print_error(f"Failed to start backend server: {e}")
        return None

def start_frontend():
    """Starts the Vite frontend development server."""
    print_info("Starting Vite frontend server...")
    command = ["npm", "run", "dev"]
    try:
        # Use shell=True on Windows for npm commands
        shell = True if sys.platform == "win32" else False
        process = subprocess.Popen(command, cwd=str(FRONTEND_DIR), shell=shell)
        print_info(f"Frontend server process started with PID: {process.pid}")
        print_info(f"Frontend will be available at http://localhost:{FRONTEND_PORT} (or the next available port)")
        return process
    except FileNotFoundError:
        print_error("`npm` command not found. Please ensure Node.js and npm are installed and in your PATH.")
        return None
    except Exception as e:
        print_error(f"Failed to start frontend server: {e}")
        return None

# --- Main Execution ---

def main():
    print_header("PharmaPersonaSim Full-Stack Launcher")

    python_exe = get_python_executable()
    if not python_exe:
        sys.exit(1)

    backend_process = start_backend(python_exe)
    frontend_process = start_frontend()

    if not backend_process or not frontend_process:
        print_error("One or more services failed to start. Terminating.")
        if backend_process: backend_process.terminate()
        if frontend_process: frontend_process.terminate()
        sys.exit(1)

    print_info("\nBoth servers are running. Press Ctrl+C to stop.")

    try:
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                print_error("Backend server terminated unexpectedly.")
                break
            if frontend_process.poll() is not None:
                print_error("Frontend server terminated unexpectedly.")
                break
    except KeyboardInterrupt:
        print_info("\nShutdown signal received. Terminating processes...")
    finally:
        if frontend_process.poll() is None:
            frontend_process.terminate()
            print_info("Frontend server terminated.")
        if backend_process.poll() is None:
            backend_process.terminate()
            print_info("Backend server terminated.")
        print_info("Shutdown complete.")

if __name__ == "__main__":
    main()

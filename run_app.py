#!/usr/bin/env python3
"""
PharmaPersonaSim Application Launcher
Starts both backend API and frontend development server
"""

import subprocess
import os
import sys
import time
import socket
import signal
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
# Try backend/.env first (where keys are stored), then project root
load_dotenv(Path(__file__).parent / "backend" / ".env")
load_dotenv()  # Also load from root if exists

# --- Configuration ---
BACKEND_PORT = 8000
# Allow overriding host via env; default to 0.0.0.0 so external browser can reach inside container
BACKEND_HOST = os.environ.get("BACKEND_HOST", "0.0.0.0")
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

def find_processes_on_port(port):
    """Find processes using a specific port."""
    try:
        if sys.platform == "win32":
            # Windows command
            result = subprocess.run(['netstat', '-ano'], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            pids = []
            for line in lines:
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if parts:
                        pid = parts[-1]
                        if pid.isdigit():
                            pids.append(int(pid))
            return pids
        else:
            # Unix/Linux command
            result = subprocess.run(['lsof', '-ti', f':{port}'], capture_output=True, text=True)
            print_info(f"lsof command returned: {result.returncode}, output: '{result.stdout.strip()}'")
            if result.returncode == 0 and result.stdout.strip():
                pids = [int(pid) for pid in result.stdout.strip().split('\n') if pid.strip().isdigit()]
                return pids
            return []
    except Exception as e:
        print_error(f"Error finding processes on port {port}: {e}")
        return []

def ensure_port_available(port):
    """Ensure a port is available, killing existing processes if needed."""
    # First, try to find and kill any processes using the port
    pids = find_processes_on_port(port)
    if pids:
        print_info(f"Found {len(pids)} process(es) using port {port}: {pids}")
        for pid in pids:
            try:
                print_info(f"Terminating process {pid}...")
                if sys.platform == "win32":
                    subprocess.run(['taskkill', '/F', '/PID', str(pid)], check=True)
                else:
                    os.kill(pid, signal.SIGTERM)
                print_info(f"Process {pid} terminated successfully")
            except ProcessLookupError:
                print_info(f"Process {pid} already terminated")
            except subprocess.CalledProcessError as e:
                # e.returncode == 128 usually means process not found (already gone)
                print_info(f"Taskkill failed for process {pid} (likely already terminated): {e}")
            except PermissionError:
                print_error(f"Permission denied to terminate process {pid}")
                # Don't return False immediately; try to continue and see if bind works
            except Exception as e:
                print_error(f"Error terminating process {pid}: {e}")
                # Proceed to try binding anyway
        
        # Wait a moment for processes to clean up
        time.sleep(2)
    
    # Now test if the port is actually available
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            # Set SO_REUSEADDR to avoid "Address already in use" issues
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            result = sock.bind(('0.0.0.0', port))
            print_info(f"Socket bind test (dry run): 0.0.0.0 {port}")
            print_info("Socket environment OK")
            return True  # Port is available
        except socket.error as e:
            print_error(f"Port {port} is still not available: {e}")
            return False

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
        "--host", BACKEND_HOST,
        "--port", str(BACKEND_PORT)
    ]
    try:
        # Use Popen for non-blocking execution
        process = subprocess.Popen(command, cwd=str(BACKEND_DIR))
        print_info(f"Backend server process started with PID: {process.pid}")
        print_info(f"API will be available at http://{BACKEND_HOST}:{BACKEND_PORT}")
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

    # Print effective config
    try:
        subprocess.run([sys.executable, str(PROJECT_ROOT / 'scripts' / 'print_config.py')], check=False)
    except Exception as e:
        print_error(f"Could not print config: {e}")

    # Ensure backend port is available
    print_info(f"Checking if port {BACKEND_PORT} is available...")
    if not ensure_port_available(BACKEND_PORT):
        print_error(f"Could not free port {BACKEND_PORT}. Please manually stop any services using this port.")
        sys.exit(1)

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

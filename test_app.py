import requests
import time
import sys

# --- Configuration ---
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"
MAX_RETRIES = 5
RETRY_DELAY = 2  # seconds

# --- Helper Functions ---

def print_info(message):
    print(f"[INFO] {message}")

def print_success(message):
    print(f"✅ [SUCCESS] {message}")

def print_error(message):
    print(f"❌ [ERROR] {message}", file=sys.stderr)

def check_service(url, service_name):
    """Continuously checks if a service is available at the given URL."""
    print_info(f"Attempting to connect to {service_name} at {url}...")
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, timeout=5)
            # Check for a successful HTTP status code (2xx)
            if response.ok:
                print_success(f"{service_name} is responding correctly (Status: {response.status_code}).")
                return True
            else:
                print_error(f"{service_name} returned a non-success status code: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print_info(f"Attempt {attempt + 1}/{MAX_RETRIES}: Could not connect to {service_name}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)
    
    print_error(f"Could not connect to {service_name} after {MAX_RETRIES} attempts.")
    return False

# --- Main Test Execution ---

def main():
    print_info("=" * 50)
    print_info("  Running Full-Stack Application Health Check")
    print_info("=" * 50)
    
    # Giving servers a moment to start up
    print_info("Waiting for servers to initialize...")
    time.sleep(5)

    backend_ok = check_service(f"{BACKEND_URL}/health", "Backend API")
    frontend_ok = check_service(FRONTEND_URL, "Frontend Server")

    print_info("-" * 50)

    if backend_ok and frontend_ok:
        print_success("All services are running correctly!")
        sys.exit(0)
    else:
        print_error("One or more services failed the health check.")
        sys.exit(1)

if __name__ == "__main__":
    main()

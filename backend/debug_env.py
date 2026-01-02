import sys
import os
print(f"Executable: {sys.executable}")
print(f"Path: {sys.path}")
print(f"CWD: {os.getcwd()}")
try:
    import psycopg2
    print("✅ psycopg2 imported")
except ImportError as e:
    print(f"❌ ImportError: {e}")

try:
    import app
    print("✅ app module imported")
except ImportError as e:
    print(f"❌ ImportError: {e}")

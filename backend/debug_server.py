import sys
import traceback

try:
    print("Testing imports...")
    from app.main import app
    print("✅ Main app imported successfully")
    
    print("Testing cohort_engine import...")
    from app import cohort_engine
    print("✅ Cohort engine imported successfully")
    
    print("Testing schemas...")
    from app import schemas
    print("✅ Schemas imported successfully")
    
    print("Available routes:")
    for route in app.routes:
        print(f"  {route.methods} {route.path}")
    
    print("\n✅ All imports successful! Server should start properly.")
    
except Exception as e:
    print(f"❌ Error during import: {e}")
    print("Full traceback:")
    traceback.print_exc()
    sys.exit(1)

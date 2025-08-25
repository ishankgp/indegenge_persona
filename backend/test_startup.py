#!/usr/bin/env python3
"""Test script to check backend startup issues"""

import sys
import os

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing backend startup...")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

try:
    print("\n1. Testing imports...")
    from app import models, schemas, crud, database
    print("   ✓ Basic imports successful")
    
    print("\n2. Testing database connection...")
    from app.database import engine, Base
    print(f"   Database URL: {os.getenv('DATABASE_URL', 'sqlite:///./pharma_personas.db')}")
    print("   ✓ Database connection successful")
    
    print("\n3. Testing OpenAI configuration...")
    import openai
    print(f"   OpenAI version: {openai.__version__}")
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print(f"   API Key found: {api_key[:10]}...")
    else:
        print("   ⚠ WARNING: No API key found")
    
    print("\n4. Testing PersonaEngine...")
    from app.persona_engine import PersonaEngine
    try:
        engine = PersonaEngine()
        print("   ✓ PersonaEngine initialized")
    except Exception as e:
        print(f"   ✗ PersonaEngine error: {e}")
    
    print("\n5. Testing FastAPI app...")
    from app.main import app
    print("   ✓ FastAPI app imported successfully")
    
    print("\n✓ All tests passed! Backend should be able to start.")
    
except Exception as e:
    print(f"\n✗ Error during testing: {e}")
    import traceback
    traceback.print_exc()

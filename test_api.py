#!/usr/bin/env python3
"""
Direct API test to debug the persona issue
"""
import sys
import os
import json

# Add the backend directory to Python path
sys.path.append('/workspaces/indegenge_persona/backend')

from fastapi.testclient import TestClient
from app.main import app

def test_personas_api():
    client = TestClient(app)
    
    print("Testing personas endpoint...")
    response = client.get("/personas/")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    print("\nTesting stats endpoint...")
    stats_response = client.get("/stats")
    print(f"Stats Status Code: {stats_response.status_code}")
    print(f"Stats Response: {stats_response.json()}")

if __name__ == "__main__":
    test_personas_api()

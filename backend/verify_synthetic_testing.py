import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_synthetic_testing():
    print("🧪 Testing Synthetic Testing Endpoint...")
    
    # 1. Get a persona ID first
    try:
        personas = requests.get(f"{BASE_URL}/api/personas/").json()
        if not personas:
            print("❌ No personas found to test with.")
            return
        
        persona_id = personas[0]['id']
        print(f"   Using Persona ID: {persona_id}")
    except Exception as e:
        print(f"❌ Failed to fetch personas: {e}")
        return

    # 2. Test Analyze Endpoint
    payload = {
        "persona_ids": [persona_id],
        "assets": [
            {
                "id": "test-asset-1",
                "name": "Test Asset A",
                "text_content": "This is a test marketing message about a new drug."
            },
            {
                "id": "test-asset-2",
                "name": "Test Asset B", 
                "text_content": "This is another test message focusing on patient efficacy."
            }
        ]
    }
    
    try:
        # We expect this to fail with 500 if LLM is not configured, or succeed if it is.
        # But we mostly want to check if the endpoint exists and validates schema.
        print("   Sending request...")
        response = requests.post(f"{BASE_URL}/api/synthetic-testing/analyze", json=payload)
        
        if response.status_code == 200:
            print("✅ Endpoint success! 200 OK")
            print(json.dumps(response.json(), indent=2)[:500] + "...")
        elif response.status_code == 500:
            print("⚠️ Endpoint returned 500 (Expected if LLM key missing/mock not set up)")
            print(response.text)
        elif response.status_code == 422:
             print("❌ Validation Error (422)")
             print(response.json())
        else:
            print(f"❌ Unexpected Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_synthetic_testing()

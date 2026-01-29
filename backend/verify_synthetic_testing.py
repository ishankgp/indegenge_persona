import requests
import json
import base64
import os

BASE_URL = "http://127.0.0.1:8000"
IMAGE_PATH = "C:/Users/ishan/.gemini/antigravity/brain/a9da5a44-b350-4a0c-8e28-781627393839/uploaded_media_1769680484119.png"

def test_synthetic_testing():
    print("🧪 Testing Synthetic Testing Endpoint with Image...")
    
    # 1. Get a persona ID
    try:
        personas = requests.get(f"{BASE_URL}/api/personas/").json()
        if not personas:
            print("❌ No personas found to test with.")
            # Create a dummy persona if none exist
            print("   Creating dummy persona...")
            dummy_persona = {
                "name": "Test Persona",
                "age": 45,
                "gender": "Female",
                "condition": "Diabetes",
                "location": "New York",
                "concerns": "Healthy living",
                "brand_id": None
            }
            p = requests.post(f"{BASE_URL}/api/personas/manual", json=dummy_persona).json()
            persona_id = p['id']
            print(f"   Created and using Persona ID: {persona_id}")
        else:
            persona_id = personas[0]['id']
            print(f"   Using Persona ID: {persona_id}")
    except Exception as e:
        print(f"❌ Failed to fetch/create persona: {e}")
        return

    # 2. Prepare Image
    image_b64 = None
    if os.path.exists(IMAGE_PATH):
        try:
            with open(IMAGE_PATH, "rb") as image_file:
                image_b64 = base64.b64encode(image_file.read()).decode('utf-8')
            print(f"   Loaded image: {IMAGE_PATH} ({len(image_b64)} chars)")
        except Exception as e:
            print(f"❌ Failed to read image: {e}")
    else:
        print(f"⚠️ Image not found at {IMAGE_PATH}, skipping image test.")

    # 3. Test Analyze Endpoint
    payload = {
        "persona_ids": [persona_id],
        "assets": [
            {
                "id": "test-asset-img",
                "name": "Mounjaro Ad",
                "text_content": "Heading to Dubai? Transform your body.",
                "image_data": image_b64
            }
        ]
    }
    
    try:
        print("   Sending request to backend...")
        response = requests.post(f"{BASE_URL}/api/synthetic-testing/analyze", json=payload)
        
        if response.status_code == 200:
            print("✅ Endpoint success! 200 OK")
            data = response.json()
            # summary = json.dumps(data, indent=2)
            # print(summary[:1000] + "...")
            
            # Print specific results
            results = data.get("results", [])
            for res in results:
                print(f"\n   --- Result for {res['asset_id']} ---")
                print(f"   Scores: {res.get('scores')}")
                print(f"   Preference: {res.get('overall_preference_score')}%")
                print(f"   Feedback: {str(res.get('feedback'))[:100]}...")
                
        else:
            print(f"❌ Failed with Status: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_synthetic_testing()

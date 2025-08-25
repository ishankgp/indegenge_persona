import requests
import json
import traceback

# Test the cohort analysis endpoint with detailed error handling
url = "http://127.0.0.1:8000/cohorts/analyze"

# First, get the actual persona IDs
personas_url = "http://127.0.0.1:8000/personas/"
try:
    personas_response = requests.get(personas_url)
    personas = personas_response.json()
    print(f"Found {len(personas)} personas")
    
    if len(personas) > 0:
        # Use the first persona's actual ID
        persona_id = personas[0]['id']
        print(f"Using persona ID: {persona_id}")
        print(f"Persona name: {personas[0]['name']}")
        
        data = {
            "persona_ids": [persona_id],
            "stimulus_text": "New diabetes medication reduces blood sugar by 30% with minimal side effects",
            "metrics": ["purchase_intent", "sentiment"]
        }
        
        print(f"\nRequest data: {json.dumps(data, indent=2)}")
        print("\nTesting cohort analysis endpoint...")
        
        response = requests.post(url, json=data, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Success! Analysis completed.")
            print(f"\nResults:")
            print(f"Cohort size: {result.get('cohort_size')}")
            print(f"Insights: {result.get('insights')}")
            print(f"\nIndividual responses:")
            for resp in result.get('individual_responses', []):
                print(f"  - {resp['persona_name']}: {resp['responses']}")
        else:
            print("❌ Error occurred")
            print(f"Response: {response.text}")
            
            # Try to get more details
            if response.status_code == 500:
                print("\nThis is likely an internal server error. Check the server logs for details.")
    else:
        print("No personas found in database. Please create some personas first.")
        
except Exception as e:
    print(f"❌ Exception occurred: {e}")
    traceback.print_exc()

import requests
import json

# Test the cohort analysis endpoint
url = "http://127.0.0.1:8000/cohorts/analyze"
data = {
    "persona_ids": [1],
    "stimulus_text": "Test message for diabetes medication",
    "metrics": ["purchase_intent", "sentiment"]
}

try:
    print("Testing cohort analysis endpoint...")
    response = requests.post(url, json=data, timeout=30)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Success! Analysis completed.")
        print(f"Cohort size: {result.get('cohort_size')}")
        print(f"Insights: {result.get('insights')}")
    else:
        print("❌ Error occurred")
        
except Exception as e:
    print(f"❌ Exception occurred: {e}")

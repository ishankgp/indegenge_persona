#!/usr/bin/env python
"""Quick script to insert personas via API."""
import sys
import os

# Try to import requests
try:
    import requests
except ImportError:
    print("requests not available")
    sys.exit(1)

API = "http://localhost:8000"

# Get Mounjaro brand ID
try:
    r = requests.get(f"{API}/api/brands")
    brands = r.json()
    mounjaro_id = None
    for b in brands:
        if b["name"] == "Mounjaro":
            mounjaro_id = b["id"]
            break
    print(f"Mounjaro brand ID: {mounjaro_id}")
except Exception as e:
    print(f"Error getting brands: {e}")
    mounjaro_id = 1

# Create personas
personas = [
    # Global personas
    {"name": "Maria Santos", "age": 52, "gender": "Female", "condition": "Type 2 Diabetes", "region": "Miami, Florida",
     "motivations": ["Stay healthy for grandchildren"], "beliefs": ["Diet is key"], "pain_points": ["Cost of meds"]},
    {"name": "Robert Chen", "age": 45, "gender": "Male", "condition": "Hypertension", "region": "Seattle, Washington",
     "motivations": ["Prevent cardiovascular events"], "beliefs": ["Data-driven health"], "pain_points": ["Remembering meds"]},
    {"name": "Dr. Angela Morrison", "age": 58, "gender": "Female", "condition": "Type 2 Diabetes", "region": "Chicago, Illinois",
     "motivations": ["Optimal glycemic control"], "beliefs": ["Personalized medicine"], "pain_points": ["Prior auth delays"]},
    # Mounjaro personas
    {"name": "Jennifer Williams", "age": 48, "gender": "Female", "condition": "Type 2 Diabetes", "region": "Austin, Texas",
     "brand_id": mounjaro_id, "motivations": ["Achieve remission"], "beliefs": ["GLP-1 breakthrough"], "pain_points": ["GI side effects"]},
    {"name": "Michael Thompson", "age": 55, "gender": "Male", "condition": "Type 2 Diabetes", "region": "Phoenix, Arizona",
     "brand_id": mounjaro_id, "motivations": ["Avoid insulin"], "beliefs": ["Results matter"], "pain_points": ["Insurance hassle"]},
    {"name": "Dr. David Park", "age": 42, "gender": "Male", "condition": "Type 2 Diabetes", "region": "San Diego, California",
     "brand_id": mounjaro_id, "motivations": ["Modern treatments"], "beliefs": ["Dual mechanism efficacy"], "pain_points": ["Cost barriers"]},
    {"name": "Sarah Mitchell", "age": 62, "gender": "Female", "condition": "Type 2 Diabetes", "region": "Denver, Colorado",
     "brand_id": mounjaro_id, "motivations": ["Stay active"], "beliefs": ["Once-weekly is better"], "pain_points": ["Medicare coverage"]},
]

output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "insert_results.txt")
with open(output_file, "w") as f:
    for p in personas:
        try:
            r = requests.post(f"{API}/personas/manual", json=p, timeout=10)
            if r.status_code == 200:
                result = r.json()
                brand_str = f"brand_id={p.get('brand_id')}" if p.get('brand_id') else "global"
                f.write(f"OK: {result['name']} ({brand_str})\\n")
            else:
                f.write(f"FAIL: {p['name']} - {r.status_code}: {r.text[:200]}\\n")
        except Exception as e:
            f.write(f"ERROR: {p['name']} - {str(e)}\\n")
    
    # Check total
    try:
        r = requests.get(f"{API}/personas/")
        personas_list = r.json()
        f.write(f"\\nTotal personas now: {len(personas_list)}\\n")
    except:
        pass

print(f"Results written to: {output_file}")




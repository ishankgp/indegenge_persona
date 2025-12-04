"""Create personas using the API."""
import requests
import json

API_BASE = "http://localhost:8000"

# Global personas (no brand_id)
global_personas = [
    {
        "name": "Maria Santos",
        "age": 52,
        "gender": "Female",
        "condition": "Type 2 Diabetes",
        "region": "Miami, Florida",
        "demographics": {"age": 52, "gender": "Female", "location": "Miami, Florida", "occupation": "Restaurant Owner"},
        "medical_background": "Diagnosed with Type 2 Diabetes 5 years ago. Currently on metformin.",
        "motivations": ["Stay healthy for grandchildren", "Maintain energy for work"],
        "beliefs": ["Diet is the foundation of health", "Family support is essential"],
        "pain_points": ["Difficulty managing diet", "Cost of medications"]
    },
    {
        "name": "Robert Chen",
        "age": 45,
        "gender": "Male",
        "condition": "Hypertension",
        "region": "Seattle, Washington",
        "demographics": {"age": 45, "gender": "Male", "location": "Seattle, Washington", "occupation": "Software Engineer"},
        "medical_background": "Diagnosed with hypertension 2 years ago. BP well controlled.",
        "motivations": ["Prevent cardiovascular events", "Use technology to optimize health"],
        "beliefs": ["Data-driven decisions lead to better outcomes"],
        "pain_points": ["Remembering medications", "Managing work stress"]
    },
    {
        "name": "Dr. Angela Morrison",
        "age": 58,
        "gender": "Female",
        "condition": "Type 2 Diabetes",
        "region": "Chicago, Illinois",
        "demographics": {"age": 58, "gender": "Female", "location": "Chicago, Illinois", "occupation": "Endocrinologist"},
        "medical_background": "Board-certified endocrinologist specializing in diabetes management.",
        "motivations": ["Achieve optimal glycemic control", "Stay current with treatments"],
        "beliefs": ["Personalized medicine improves outcomes", "Early intervention prevents complications"],
        "pain_points": ["Insurance prior auth delays", "Patient non-adherence"]
    }
]

# Get Mounjaro brand ID
def get_mounjaro_brand_id():
    try:
        response = requests.get(f"{API_BASE}/api/brands")
        brands = response.json()
        for brand in brands:
            if brand["name"] == "Mounjaro":
                return brand["id"]
        # Create Mounjaro brand if not exists
        response = requests.post(f"{API_BASE}/api/brands", json={"name": "Mounjaro"})
        return response.json()["id"]
    except Exception as e:
        print(f"Error getting Mounjaro brand: {e}")
        return None

# Mounjaro-specific personas
def get_mounjaro_personas(brand_id):
    return [
        {
            "name": "Jennifer Williams",
            "age": 48,
            "gender": "Female",
            "condition": "Type 2 Diabetes",
            "region": "Austin, Texas",
            "brand_id": brand_id,
            "demographics": {"age": 48, "gender": "Female", "location": "Austin, Texas", "occupation": "Marketing Director"},
            "medical_background": "Type 2 Diabetes diagnosed 3 years ago. Started Mounjaro 6 months ago. A1C dropped from 8.2% to 6.5%.",
            "motivations": ["Achieve diabetes remission", "Maintain weight loss with Mounjaro"],
            "beliefs": ["GLP-1/GIP dual agonists are breakthrough", "Weight management is key"],
            "pain_points": ["Initial GI side effects", "High cost even with insurance"]
        },
        {
            "name": "Michael Thompson",
            "age": 55,
            "gender": "Male",
            "condition": "Type 2 Diabetes",
            "region": "Phoenix, Arizona",
            "brand_id": brand_id,
            "demographics": {"age": 55, "gender": "Male", "location": "Phoenix, Arizona", "occupation": "Construction Manager"},
            "medical_background": "Type 2 Diabetes for 8 years. Started Mounjaro 3 months ago. A1C was 9.1%, now 7.4%.",
            "motivations": ["Avoid insulin injections", "Reduce pill burden"],
            "beliefs": ["Results speak louder than marketing", "Convenience matters for compliance"],
            "pain_points": ["Insurance prior auth was frustrating", "Nausea in first weeks"]
        },
        {
            "name": "Dr. David Park",
            "age": 42,
            "gender": "Male",
            "condition": "Type 2 Diabetes",
            "region": "San Diego, California",
            "brand_id": brand_id,
            "demographics": {"age": 42, "gender": "Male", "location": "San Diego, California", "occupation": "Primary Care Physician"},
            "medical_background": "Family physician, 12 years in practice. Early adopter of GLP-1 therapies.",
            "motivations": ["Offer patients modern treatments", "Achieve better outcomes"],
            "beliefs": ["Dual GIP/GLP-1 mechanism provides superior efficacy"],
            "pain_points": ["Prior authorization burden", "Cost barriers for uninsured"]
        },
        {
            "name": "Sarah Mitchell",
            "age": 62,
            "gender": "Female",
            "condition": "Type 2 Diabetes",
            "region": "Denver, Colorado",
            "brand_id": brand_id,
            "demographics": {"age": 62, "gender": "Female", "location": "Denver, Colorado", "occupation": "Retired Teacher"},
            "medical_background": "Type 2 Diabetes for 15 years. Started Mounjaro after failing other GLP-1. Now at 7.0% A1C.",
            "motivations": ["Stay active and independent", "Simplify medication regimen"],
            "beliefs": ["Newer medications can work when others fail", "Once-weekly is manageable"],
            "pain_points": ["Navigating Medicare Part D", "Managing refrigeration while traveling"]
        }
    ]

def create_persona(persona_data):
    try:
        response = requests.post(f"{API_BASE}/personas/manual", json=persona_data)
        if response.status_code == 200:
            result = response.json()
            brand_info = f" (Brand ID: {persona_data.get('brand_id', 'None')})" if persona_data.get('brand_id') else " (Global)"
            print(f"  ✅ Created: {result['name']}{brand_info}")
            return True
        else:
            print(f"  ❌ Failed: {persona_data['name']} - {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"  ❌ Error creating {persona_data['name']}: {e}")
        return False

def main():
    import sys
    import os
    
    # Redirect output to file
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "create_output.txt")
    with open(output_file, "w") as f:
        original_stdout = sys.stdout
        sys.stdout = f
        
        print("=" * 50)
        print("Creating Sample Personas via API")
        print("=" * 50)
    
    # Create global personas
    print("\n📌 Creating Global Personas...")
    global_count = 0
    for persona in global_personas:
        if create_persona(persona):
            global_count += 1
    
    # Get Mounjaro brand ID
    mounjaro_id = get_mounjaro_brand_id()
    if mounjaro_id:
        print(f"\n💊 Creating Mounjaro Personas (brand_id: {mounjaro_id})...")
        mounjaro_personas = get_mounjaro_personas(mounjaro_id)
        mounjaro_count = 0
        for persona in mounjaro_personas:
            if create_persona(persona):
                mounjaro_count += 1
    else:
        mounjaro_count = 0
        print("\n⚠️ Could not get Mounjaro brand ID")
    
    # Summary
    print("\n" + "=" * 50)
    print(f"🎉 Created {global_count + mounjaro_count} personas!")
    print(f"   - Global: {global_count}")
    print(f"   - Mounjaro: {mounjaro_count}")
    print("=" * 50)
    
    sys.stdout = original_stdout
    print(f"Output written to: {output_file}")

if __name__ == "__main__":
    main()


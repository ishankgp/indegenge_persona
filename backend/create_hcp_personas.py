import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def create_persona(data):
    print(f"Creating persona: {data['name']}...")
    try:
        # Use the generate endpoint which triggers the LLM to build the full persona
        response = requests.post(f"{BASE_URL}/api/personas/manual", json=data)
        if response.status_code == 200:
            p = response.json()
            print(f"✅ Created {p['name']} (ID: {p['id']}) - {p['persona_type']}")
            return p
        else:
            print(f"❌ Failed to create {data['name']}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error creating {data['name']}: {e}")
        return None

def main():
    print("🚀 Starting HCP Persona Creation...")
    
    # 1. Dr. Emily Chen (Endocrinologist) - Evidence-Based Academic
    # Using manual endpoint allows us to set specific attributes more directly than 'generate'
    # which relies on randomness. But wait, user wanted "generate" or "create".
    # The 'manual' endpoint in main.py lines 397-470 takes detailed attributes.
    # The 'generate' endpoint lines 303-396 takes high level and uses LLM.
    # I'll use 'manual' to be precise about them being HCPs and having specific roles.
    
    hcp_1 = {
        "name": "Dr. Emily Chen",
        "age": 45,
        "gender": "Female",
        "condition": "Type 2 Diabetes & Obesity", # For context
        "location": "Boston, MA",
        "persona_type": "HCP",
        "occupation": "Endocrinologist",
        "concerns": "Long-term safety profile and clinical trial data robusticity.",
        "motivations": [
            "Prescribe treatments with proven mortality/morbidity benefits",
            "Stay on the cutting edge of clinical research", 
            "Improve long-term patient outcomes"
        ],
        "beliefs": [
            "Randomized Controlled Trials (RCTs) are the gold standard",
            "Obesity is a chronic disease requiring medical intervention",
            "Data trumps marketing claims"
        ],
        "pain_points": [
            "Insurance prior authorizations for GLP-1s",
            "Misinformation from social media regarding weight loss drugs",
            "Patients stopping medication due to GI side effects"
        ],
        "medical_background": "Board certified Endocrinologist at a major academic medical center. 15 years in practice. Heavily involved in clinical trials.",
        "lifestyle_and_values": "Busy academic schedule, values efficiency and precision. Reads NEJM and Lancet weekly.",
        "communication_preferences": {
            "channel": "Medical Journals, Conferences",
            "style": "Data-heavy, concise, referenced"
        }
    }

    # 2. Dr. James Wilson (Cardiologist) - Pragmatic Clinician
    hcp_2 = {
        "name": "Dr. James Wilson",
        "age": 52,
        "gender": "Male",
        "condition": "Cardiovascular Disease",
        "location": "Chicago, IL",
        "persona_type": "HCP",
        "occupation": "Cardiologist",
        "concerns": "Cardiovascular risk reduction and patient adherence.",
        "motivations": [
            "Reduce cardiovascular events (stroke, MI)",
            "Ensure patients actually take the medicine",
            "Manage comorbidities effectively"
        ],
        "beliefs": [
            "Weight loss is secondary to heart health",
            "Complex regimens lead to non-compliance",
            "Real-world evidence matters more than perfect trial conditions"
        ],
        "pain_points": [
            "Polypharmacy interactions",
            "Cost of new therapies",
            "Patient lifestyle compliance"
        ],
        "medical_background": "Senior Cardiologist in a high-volume private practice. Focuses on preventative cardiology.",
        "lifestyle_and_values": "Pragmatic, focused on patient quality of life. Values practical solutions over theoretical perfection.",
        "communication_preferences": {
            "channel": "Rep visits (if brief), MSL discussions",
            "style": "Practical, guideline-focused, outcome-oriented"
        }
    }

    # 3. Dr. Sarah Lee (GP) - Primary Care
    hcp_3 = {
        "name": "Dr. Sarah Lee",
        "age": 38,
        "gender": "Female",
        "condition": "General Practice",
        "location": "Austin, TX",
        "persona_type": "HCP",
        "occupation": "Primary Care Physician",
        "concerns": "Accessibility, cost, and patient education.",
        "motivations": [
            "Holistic patient care",
            "Preventative health measures",
            "Building long-term patient trust"
        ],
        "beliefs": [
            "Prevention is better than cure",
            "Patient education is key to adherence",
            "Mental health is as important as physical health"
        ],
        "pain_points": [
            "15-minute appointment time limits",
            "Overwhelmed by volume of new diabetes drugs",
            "Patients demanding drugs they saw on TikTok"
        ],
        "medical_background": "Family medicine practitioner in a suburban clinic. First point of contact for most patients.",
        "lifestyle_and_values": "Community-oriented, empathetic. Struggles with burnout from administrative burden.",
        "communication_preferences": {
            "channel": "Digital resources, Patient education handouts",
            "style": "Empathetic, clear, educational"
        }
    }

    create_persona(hcp_1)
    create_persona(hcp_2)
    create_persona(hcp_3)
    
    print("\n✅ Finished creating 3 HCP Personas.")

if __name__ == "__main__":
    main()

import requests
import json

# --- Configuration ---
BACKEND_URL = "http://127.0.0.1:8000"
GENERATE_ENDPOINT = f"{BACKEND_URL}/personas/generate"

# --- Sample Persona Inputs ---
# Based on the prompt structure in Prompt.md
personas_to_create = [
    {
        "age": 68,
        "gender": "Male",
        "condition": "Type 2 Diabetes",
        "location": "Austin, TX",
        "concerns": "Worried about the long-term side effects of medication and managing his diet at social events."
    },
    {
        "age": 45,
        "gender": "Female",
        "condition": "Rheumatoid Arthritis",
        "location": "Chicago, IL",
        "concerns": "Balancing a demanding career with chronic pain and fatigue, finding effective treatments with minimal side effects."
    },
    {
        "age": 32,
        "gender": "Female",
        "condition": "Migraines",
        "location": "Seattle, WA",
        "concerns": "The unpredictability of migraine attacks, their impact on her work as a graphic designer, and social life."
    },
    {
        "age": 75,
        "gender": "Male",
        "condition": "COPD",
        "location": "Miami, FL",
        "concerns": "Maintaining his independence, fear of breathlessness, and the complexity of his inhaler regimen."
    }
]

# --- Helper Functions ---

def print_header(title):
    print("=" * 50)
    print(f"  {title}")
    print("=" * 50)

def print_info(message):
    print(f"[INFO] {message}")

def print_success(message):
    print(f"✅ [SUCCESS] {message}")

def print_error(message):
    print(f"❌ [ERROR] {message}")

# --- Main Execution ---

def main():
    print_header("Persona Library Population Script")
    
    successful_creations = 0
    for i, persona_data in enumerate(personas_to_create):
        print_info(f"\n--- Creating Persona {i+1}/{len(personas_to_create)} ---")
        print_info(f"  Condition: {persona_data['condition']}")
        try:
            # Sending data as JSON in the request body
            response = requests.post(GENERATE_ENDPOINT, json=persona_data, timeout=60)
            
            if response.status_code == 200:
                created_persona = response.json()
                print_success(f"Successfully created persona: {created_persona.get('name', 'N/A')}")
                successful_creations += 1
            else:
                print_error(f"Failed to create persona. Status: {response.status_code}")
                print_error(f"Response: {response.text}")

        except requests.exceptions.RequestException as e:
            print_error(f"An error occurred while communicating with the backend: {e}")
            print_error("Please ensure the backend server is running via 'python run_app.py'")
            break

    print("\n" + "=" * 50)
    print_info("Population complete.")
    print_success(f"Total personas created: {successful_creations}/{len(personas_to_create)}")
    print_info("You can now view the new personas in the application.")

if __name__ == "__main__":
    main()

from openai import OpenAI
import os
from dotenv import load_dotenv
import json
from typing import Optional

# Load environment variables from the project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Cache for the OpenAI client.  The SDK requires an API key during
# instantiation, so we create the client lazily to avoid raising an exception
# when the key is absent (for example in local development or during unit
# tests).
_openai_client: Optional[OpenAI] = None
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o")


def get_openai_client() -> Optional[OpenAI]:
    """Return a configured ``OpenAI`` client if an API key is available."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=api_key)

    return _openai_client

def create_patient_persona_prompt(age, gender, condition, location, concerns):
    """Creates the exact, detailed prompt for generating a patient persona."""
    prompt = f"""
    **Role:** You are an AI expert in creating realistic, empathetic user personas for the pharmaceutical industry. Your personas must be nuanced and avoid stereotypes.

    **Task:** Generate a detailed patient persona based on the following attributes.

    **Input Data:**
    - Age: {age}
    - Gender: {gender}
    - Primary Medical Condition: "{condition}"
    - Location: {location}
    - Key Concerns: "{concerns}"

    **Output Format:**
    Generate a response in a pure JSON format. Do not include any text, code block markers, or explanations before or after the JSON object. The JSON object must have the following keys:
    - "name": A realistic first and last name.
    - "demographics": An object with "age", "gender", "location", and "occupation".
    - "medical_background": A brief, narrative summary of their diagnosis and treatment history for the specified condition.
    - "lifestyle_and_values": A paragraph describing their daily life, hobbies, family situation, and what they value most.
    - "pain_points": An array of 3-5 specific challenges they face related to their condition.
    - "motivations": An array of 3-5 goals or desires related to managing their health.
    - "communication_preferences": An object describing how they prefer to receive health information.
    """
    return prompt

def generate_persona_from_attributes(age: int, gender: str, condition: str, location: str, concerns: str) -> str:
    """
    Takes user input, builds the prompt, calls the OpenAI API,
    and returns the generated JSON as a string.
    """
    prompt = create_patient_persona_prompt(age, gender, condition, location, concerns)
    
    # First check if OpenAI API key is available in environment
    client = get_openai_client()
    if client is None:
        print("OpenAI API key not found in environment, generating mock persona")
        return generate_mock_persona(age, gender, condition, location, concerns)

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1200,
        )
        
        content = response.choices[0].message.content or "{}"
        
        # Validate that we got a proper JSON response
        try:
            parsed_json = json.loads(content)
            if not parsed_json.get("name") or not parsed_json.get("demographics"):
                raise ValueError("Incomplete persona structure from OpenAI")
            print(f"✅ Generated persona via OpenAI API: {parsed_json.get('name')}")
            return content
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Invalid JSON from OpenAI API, using mock: {e}")
            return generate_mock_persona(age, gender, condition, location, concerns)
        
    except Exception as e:
        print(f"OpenAI API error, falling back to mock persona: {e}")
        return generate_mock_persona(age, gender, condition, location, concerns)

def generate_mock_persona(age: int, gender: str, condition: str, location: str, concerns: str) -> str:
    """
    Generate a comprehensive mock persona for demo purposes when OpenAI API is not available.
    """
    import random
    
    # Mock names based on gender
    male_names = ["James Wilson", "Michael Rodriguez", "David Chen", "Robert Johnson", "Christopher Lee"]
    female_names = ["Sarah Johnson", "Emily Rodriguez", "Lisa Chen", "Maria Garcia", "Jennifer Wilson"]
    
    name = random.choice(female_names if gender.lower() == "female" else male_names)
    
    # Occupation based on age and condition
    occupations = {
        "diabetes": ["Teacher", "Accountant", "Project Manager", "Sales Representative"],
        "hypertension": ["Engineer", "Manager", "Consultant", "Administrative Assistant"],
        "obesity": ["IT Specialist", "Healthcare Worker", "Business Analyst", "Customer Service Rep"],
        "default": ["Professional", "Manager", "Specialist", "Administrator"]
    }
    
    condition_key = condition.lower() if any(c in condition.lower() for c in occupations.keys()) else "default"
    occupation = random.choice(occupations.get(condition_key, occupations["default"]))
    
    # Condition-specific attributes
    condition_data = {
        "diabetes": {
            "pain_points": [
                "Managing blood sugar fluctuations throughout the day",
                "Coordinating medication timing with meals and activities", 
                "Dealing with insurance coverage for continuous glucose monitors",
                "Finding reliable diabetes-friendly meal options when traveling"
            ],
            "motivations": [
                "Preventing long-term complications like neuropathy",
                "Maintaining energy levels for work and family activities",
                "Learning about new diabetes management technologies",
                "Building confidence in self-management skills"
            ],
            "medical_bg": "Diagnosed with Type 2 diabetes 3 years ago. Initially managed with metformin, recently added SGLT2 inhibitor. Regular A1C monitoring shows gradual improvement."
        },
        "hypertension": {
            "pain_points": [
                "Remembering to take medications consistently",
                "Managing stress-related blood pressure spikes",
                "Understanding the connection between diet and blood pressure",
                "Dealing with medication side effects"
            ],
            "motivations": [
                "Reducing cardiovascular disease risk",
                "Avoiding the need for additional medications",
                "Maintaining an active lifestyle without restrictions",
                "Setting a good health example for family"
            ],
            "medical_bg": "Diagnosed with essential hypertension 2 years ago. Currently on ACE inhibitor with good blood pressure control. Regular monitoring at home."
        },
        "default": {
            "pain_points": [
                f"Understanding treatment options for {condition}",
                "Managing symptoms that impact daily activities",
                "Navigating healthcare system and insurance",
                "Balancing treatment costs with other expenses"
            ],
            "motivations": [
                "Achieving optimal health outcomes",
                "Maintaining quality of life",
                "Staying informed about latest treatments",
                "Building strong healthcare relationships"
            ],
            "medical_bg": f"Recently diagnosed with {condition}. Working closely with healthcare team to develop effective treatment plan."
        }
    }
    
    # Select appropriate condition data
    if "diabetes" in condition.lower():
        data = condition_data["diabetes"]
    elif "hypertension" in condition.lower() or "blood pressure" in condition.lower():
        data = condition_data["hypertension"] 
    else:
        data = condition_data["default"]
    
    persona = {
        "name": name,
        "demographics": {
            "age": age,
            "gender": gender,
            "location": location,
            "occupation": occupation
        },
        "medical_background": data["medical_bg"],
        "lifestyle_and_values": f"Lives in {location} and works as a {occupation}. Values family time and maintaining good health. Enjoys staying active and informed about health topics. Prioritizes open communication with healthcare providers and appreciates evidence-based treatment approaches.",
        "pain_points": data["pain_points"],
        "motivations": data["motivations"],
        "communication_preferences": {
            "preferred_channels": "Healthcare provider discussions, reputable medical websites, patient education materials",
            "information_style": "Clear, factual explanations with practical applications",
            "frequency": "Regular updates during appointments, immediate access to emergency information"
        }
    }
    
    return json.dumps(persona, indent=2)

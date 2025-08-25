import openai
import os
from dotenv import load_dotenv
import json

load_dotenv()

openai.api_key = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

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
    
    try:
        response = openai.ChatCompletion.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,  # A bit of creativity is good for personas
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message['content']
        # The content should already be a valid JSON string
        return content
        
    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        # Return an empty JSON object string in case of an error
        return "{}"

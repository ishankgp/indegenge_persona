"""
Avatar Generation Engine using DALL-E 3

Generates unique, professional avatar images for personas based on
demographic attributes like age, gender, persona type, and specialty.
"""

from openai import OpenAI
import os
from dotenv import load_dotenv
from typing import Optional, Dict, Any
import logging
import hashlib
import random

# Import shared utilities
from .utils import get_openai_client

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)


# Ethnicity options for diversity (will be randomly assigned if not specified)
ETHNICITIES = [
    "Caucasian", "African American", "Hispanic", "Asian", "South Asian",
    "Middle Eastern", "Mixed ethnicity"
]

# Professional attire based on persona type
ATTIRE_MAP = {
    "HCP": [
        "white lab coat over professional attire",
        "medical scrubs",
        "professional business attire with stethoscope"
    ],
    "Patient": [
        "casual everyday clothing",
        "smart casual attire",
        "comfortable professional clothing"
    ]
}

# Specialty-specific visual cues
SPECIALTY_CUES = {
    "Oncologist": "wearing a white coat, compassionate expression",
    "Cardiologist": "professional demeanor, medical setting background hint",
    "Endocrinologist": "thoughtful expression, academic appearance",
    "Primary Care": "approachable, friendly expression, family medicine vibe",
    "Neurologist": "intellectual appearance, focused expression",
    "Psychiatrist": "warm, empathetic expression, calming presence",
    "General": "professional healthcare appearance"
}


def _get_deterministic_seed(persona_data: Dict[str, Any]) -> int:
    """Generate a deterministic seed from persona data for consistent randomization."""
    seed_string = f"{persona_data.get('age', 0)}-{persona_data.get('gender', '')}-{persona_data.get('name', '')}"
    return int(hashlib.md5(seed_string.encode()).hexdigest()[:8], 16)


def create_avatar_prompt(
    age: int,
    gender: str,
    persona_type: str = "Patient",
    specialty: Optional[str] = None,
    ethnicity: Optional[str] = None,
    name: Optional[str] = None
) -> str:
    """
    Create a DALL-E 3 prompt for generating a professional avatar.
    
    Args:
        age: Person's age
        gender: Gender (Male/Female/Non-binary)
        persona_type: HCP or Patient
        specialty: Medical specialty (for HCPs)
        ethnicity: Optional ethnicity for diversity
        name: Optional persona name for seeding
        
    Returns:
        Formatted prompt string for DALL-E 3
    """
    # Determine ethnicity (use provided or select randomly with seed)
    if not ethnicity:
        seed_data = {"age": age, "gender": gender, "name": name or ""}
        random.seed(_get_deterministic_seed(seed_data))
        ethnicity = random.choice(ETHNICITIES)
    
    # Get appropriate attire
    attire_options = ATTIRE_MAP.get(persona_type, ATTIRE_MAP["Patient"])
    random.seed(_get_deterministic_seed({"age": age, "gender": gender, "name": name or "attire"}))
    attire = random.choice(attire_options)
    
    # Get specialty cues
    specialty_cue = SPECIALTY_CUES.get(specialty, SPECIALTY_CUES["General"]) if specialty else ""
    
    # Age description
    if age < 30:
        age_desc = "young adult"
    elif age < 45:
        age_desc = "middle-aged"
    elif age < 60:
        age_desc = "mature"
    else:
        age_desc = "senior"
    
    # Build the prompt
    if persona_type == "HCP":
        prompt = (
            f"Professional headshot portrait photograph of a {age_desc} {gender.lower()} "
            f"{ethnicity} healthcare professional, approximately {age} years old, "
            f"{attire}, {specialty_cue}. "
            f"Clean neutral gray background, studio lighting, high quality professional portrait, "
            f"corporate headshot style, photorealistic, looking at camera with confident yet approachable expression. "
            f"No text, no watermarks, no logos."
        )
    else:
        prompt = (
            f"Professional portrait photograph of a {age_desc} {gender.lower()} "
            f"{ethnicity} person, approximately {age} years old, "
            f"{attire}. "
            f"Clean neutral background, natural lighting, high quality portrait, "
            f"warm and approachable expression, looking at camera. "
            f"No text, no watermarks, no logos."
        )
    
    return prompt


def generate_avatar(
    age: int,
    gender: str,
    persona_type: str = "Patient",
    specialty: Optional[str] = None,
    ethnicity: Optional[str] = None,
    name: Optional[str] = None,
    size: str = "1024x1024"
) -> Optional[str]:
    """
    Generate an avatar image using DALL-E 3.
    
    Args:
        age: Person's age
        gender: Gender
        persona_type: HCP or Patient
        specialty: Medical specialty (for HCPs)
        ethnicity: Optional ethnicity
        name: Optional persona name
        size: Image size (1024x1024, 1024x1792, 1792x1024)
        
    Returns:
        URL of the generated image, or None if generation fails
    """
    client = get_openai_client()
    
    if not client:
        logger.warning("OpenAI client not available, returning fallback avatar")
        return get_fallback_avatar(persona_type, gender)
    
    prompt = create_avatar_prompt(
        age=age,
        gender=gender,
        persona_type=persona_type,
        specialty=specialty,
        ethnicity=ethnicity,
        name=name
    )
    
    logger.info(f"Generating avatar with prompt: {prompt[:100]}...")
    
    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size=size,
            quality="standard",  # Use "standard" for cost efficiency, "hd" for higher quality
            n=1
        )
        
        image_url = response.data[0].url
        logger.info(f"Avatar generated successfully: {image_url[:50]}...")
        return image_url
        
    except Exception as e:
        logger.error(f"Failed to generate avatar: {str(e)}")
        return get_fallback_avatar(persona_type, gender)


def get_fallback_avatar(persona_type: str = "Patient", gender: str = "Male") -> str:
    """
    Return a fallback avatar URL when DALL-E generation fails or is unavailable.
    Uses UI Avatars service for a simple, consistent fallback.
    
    Args:
        persona_type: HCP or Patient
        gender: Gender for color scheme
        
    Returns:
        URL to a fallback avatar image
    """
    # Color schemes based on persona type
    if persona_type == "HCP":
        background = "6366f1"  # Indigo for HCPs
        color = "ffffff"
    else:
        background = "8b5cf6"  # Purple for patients
        color = "ffffff"
    
    # Use a placeholder initial
    initial = "H" if persona_type == "HCP" else "P"
    
    # UI Avatars provides a free, simple avatar service
    return f"https://ui-avatars.com/api/?name={initial}&background={background}&color={color}&size=256&bold=true"


def regenerate_avatar_for_persona(persona_data: Dict[str, Any]) -> Optional[str]:
    """
    Regenerate an avatar for an existing persona.
    
    Args:
        persona_data: Dictionary containing persona attributes
        
    Returns:
        New avatar URL or None if generation fails
    """
    # Extract persona attributes
    age = persona_data.get("age", 45)
    gender = persona_data.get("gender", "Male")
    persona_type = persona_data.get("persona_type", "Patient")
    name = persona_data.get("name", "")
    
    # Try to extract specialty from full_persona_json if available
    specialty = None
    full_json = persona_data.get("full_persona_json")
    if full_json:
        import json
        try:
            if isinstance(full_json, str):
                parsed = json.loads(full_json)
            else:
                parsed = full_json
            specialty = parsed.get("specialty") or parsed.get("demographics", {}).get("specialty")
        except:
            pass
    
    # Generate new avatar with slightly different seed (by appending regenerate flag)
    return generate_avatar(
        age=age,
        gender=gender,
        persona_type=persona_type,
        specialty=specialty,
        name=f"{name}_regen_{random.randint(1, 1000)}"  # Vary the seed for different result
    )


def generate_avatar_sync(
    age: int,
    gender: str,
    persona_type: str = "Patient",
    specialty: Optional[str] = None,
    ethnicity: Optional[str] = None,
    name: Optional[str] = None
) -> Optional[str]:
    """
    Synchronous wrapper for avatar generation.
    
    This is a convenience function for contexts where async is not available.
    """
    return generate_avatar(
        age=age,
        gender=gender,
        persona_type=persona_type,
        specialty=specialty,
        ethnicity=ethnicity,
        name=name
    )

"""
Avatar Generation Engine (Simplified)

Provides fallback avatars using UI Avatars service.
DALL-E 3 generation has been removed to reduce costs and complexity.
"""

from typing import Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_fallback_avatar(persona_type: str = "Patient", gender: str = "Male") -> str:
    """
    Return a fallback avatar URL.
    Uses UI Avatars service for a simple, consistent fallback.
    
    Args:
        persona_type: HCP or Patient
        gender: Gender for color scheme
        
    Returns:
        URL to a fallback avatar image
    """
    # Determine colors based on persona type and gender
    background = "ebf8ff" # Default light blue
    color = "2c5282"      # Default dark blue
    
    if str(persona_type).lower() == "hcp":
        # HCPs get teal/medical colors
        background = "e6fffa" # Light teal
        color = "234e52"      # Dark teal
    else:
        # Patients get colors based on gender
        gender_lower = str(gender).lower()
        if "female" in gender_lower or "woman" in gender_lower:
            background = "fff5f7" # Light pink
            color = "702459"      # Dark pink/purple
        elif "male" in gender_lower or "man" in gender_lower:
            background = "ebf8ff" # Light blue
            color = "2c5282"      # Dark blue
        else:
            background = "f7fafc" # Light gray
            color = "2d3748"      # Dark gray

    # Use UI Avatars with initial based on type
    name_param = "Dr" if str(persona_type).lower() == "hcp" else " Pt"
    
    return f"https://ui-avatars.com/api/?name={name_param}&background={background}&color={color}&size=256&font-size=0.5"


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
    Legacy wrapper that redirects to get_fallback_avatar.
    Kept for compatibility during refactor.
    """
    logger.info("Avatar generation requested - returning fallback (DALL-E disabled)")
    return get_fallback_avatar(persona_type, gender)

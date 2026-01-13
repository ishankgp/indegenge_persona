"""
Similarity Service - Check persona similarity using LLM

This service compares new personas against existing ones and returns
similarity scores to help users avoid creating duplicates.
"""

import json
import logging
from typing import Dict, List, Optional, Any

from openai import OpenAI
import os
from dotenv import load_dotenv

# Import shared utilities
from .utils import get_openai_client, MODEL_NAME

# Load environment variables
backend_dir = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)


def _extract_persona_key_attributes(persona: Dict[str, Any]) -> Dict[str, Any]:
    """Extract key attributes from a persona for comparison."""
    # Try to get from full_persona_json if it exists
    persona_json = persona.get("full_persona_json")
    if isinstance(persona_json, str):
        try:
            persona_json = json.loads(persona_json)
        except json.JSONDecodeError:
            persona_json = {}
    elif persona_json is None:
        persona_json = {}
    
    # Extract core MBT attributes
    core = persona_json.get("core", {})
    mbt = core.get("mbt", {})
    
    # Get motivations
    motivations = []
    motivation_data = mbt.get("motivation", {})
    if isinstance(motivation_data, dict):
        top_outcomes = motivation_data.get("top_outcomes", {})
        if isinstance(top_outcomes, dict):
            motivations = top_outcomes.get("value", [])
        elif isinstance(top_outcomes, list):
            motivations = top_outcomes
    
    # Legacy fallback
    if not motivations:
        motivations = persona_json.get("motivations", []) or persona.get("motivations", [])
    
    # Get beliefs
    beliefs = []
    beliefs_data = mbt.get("beliefs", {})
    if isinstance(beliefs_data, dict):
        core_beliefs = beliefs_data.get("core_belief_statements", {})
        if isinstance(core_beliefs, dict):
            beliefs = core_beliefs.get("value", [])
        elif isinstance(core_beliefs, list):
            beliefs = core_beliefs
    
    # Legacy fallback
    if not beliefs:
        beliefs = persona_json.get("beliefs", []) or persona.get("beliefs", [])
    
    # Get tensions/pain points
    tensions = []
    tension_data = mbt.get("tension", {})
    if isinstance(tension_data, dict):
        sensitivity = tension_data.get("sensitivity_points", {})
        if isinstance(sensitivity, dict):
            tensions = sensitivity.get("value", [])
        elif isinstance(sensitivity, list):
            tensions = sensitivity
    
    # Legacy fallback
    if not tensions:
        tensions = persona_json.get("pain_points", []) or persona.get("pain_points", [])
    
    return {
        "id": persona.get("id"),
        "name": persona.get("name", "Unknown"),
        "persona_type": persona.get("persona_type", "Patient"),
        "age": persona.get("age"),
        "gender": persona.get("gender"),
        "condition": persona.get("condition"),
        "archetype": persona.get("persona_subtype") or persona.get("decision_style"),
        "motivations": motivations[:5] if isinstance(motivations, list) else [],
        "beliefs": beliefs[:5] if isinstance(beliefs, list) else [],
        "tensions": tensions[:5] if isinstance(tensions, list) else [],
    }


async def check_persona_similarity(
    new_persona_attrs: Dict[str, Any],
    existing_personas: List[Dict[str, Any]],
    brand_id: Optional[int] = None,
    threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Compare a new persona against existing ones using LLM.
    
    Args:
        new_persona_attrs: Attributes of the persona being created
        existing_personas: List of existing persona dictionaries
        brand_id: Optional brand ID to filter existing personas
        threshold: Similarity threshold (0-1) to flag as similar
        
    Returns:
        Dictionary with:
        - has_similar: bool indicating if similar personas exist
        - most_similar: dict with most similar persona details
        - similarity_score: float (0-1)
        - overlapping_traits: list of shared characteristics
        - recommendation: str with action recommendation
    """
    if not existing_personas:
        return {
            "has_similar": False,
            "most_similar": None,
            "similarity_score": 0.0,
            "overlapping_traits": [],
            "recommendation": "No existing personas to compare against."
        }
    
    client = get_openai_client()
    if client is None:
        logger.warning("OpenAI client not available, skipping similarity check")
        return {
            "has_similar": False,
            "most_similar": None,
            "similarity_score": 0.0,
            "overlapping_traits": [],
            "recommendation": "Similarity check unavailable (no API key)."
        }
    
    # Extract key attributes for comparison
    new_attrs = _extract_persona_key_attributes(new_persona_attrs)
    existing_attrs = [_extract_persona_key_attributes(p) for p in existing_personas[:20]]  # Limit to 20
    
    prompt = f"""You are analyzing persona similarity for a pharmaceutical marketing platform.

NEW PERSONA being created:
{json.dumps(new_attrs, indent=2)}

EXISTING PERSONAS in the system:
{json.dumps(existing_attrs, indent=2)}

TASK: Identify if the new persona is too similar to any existing persona.

Consider these factors for similarity:
1. Same persona type (Patient/HCP) - high weight
2. Same or similar medical condition - high weight
3. Overlapping motivations - medium weight
4. Overlapping beliefs - medium weight
5. Overlapping tensions/pain points - medium weight
6. Similar demographics (age range, gender) - low weight

Return a JSON object:
{{
    "most_similar_persona_id": <id of most similar persona or null>,
    "most_similar_persona_name": "<name of most similar>",
    "similarity_score": <0.0 to 1.0>,
    "overlapping_traits": ["list of specific overlapping characteristics"],
    "key_differences": ["what makes them different"],
    "recommendation": "<one of: 'use_existing', 'proceed_with_caution', 'safe_to_create'>"
}}

Scoring guide:
- 0.9-1.0: Nearly identical, recommend using existing
- 0.7-0.9: Very similar, proceed with caution
- 0.5-0.7: Some overlap but distinct enough
- 0.0-0.5: Sufficiently different"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=800,
        )
        
        content = response.choices[0].message.content or "{}"
        result = json.loads(content)
        
        similarity_score = result.get("similarity_score", 0.0)
        
        return {
            "has_similar": similarity_score >= threshold,
            "most_similar": {
                "id": result.get("most_similar_persona_id"),
                "name": result.get("most_similar_persona_name"),
            } if result.get("most_similar_persona_id") else None,
            "similarity_score": similarity_score,
            "overlapping_traits": result.get("overlapping_traits", []),
            "key_differences": result.get("key_differences", []),
            "recommendation": result.get("recommendation", "safe_to_create")
        }
        
    except Exception as e:
        logger.error(f"Similarity check failed: {e}")
        return {
            "has_similar": False,
            "most_similar": None,
            "similarity_score": 0.0,
            "overlapping_traits": [],
            "recommendation": f"Similarity check failed: {str(e)}"
        }


def check_persona_similarity_sync(
    new_persona_attrs: Dict[str, Any],
    existing_personas: List[Dict[str, Any]],
    brand_id: Optional[int] = None,
    threshold: float = 0.7
) -> Dict[str, Any]:
    """Synchronous wrapper for check_persona_similarity."""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        check_persona_similarity(new_persona_attrs, existing_personas, brand_id, threshold)
    )

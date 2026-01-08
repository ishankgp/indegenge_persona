"""
NanoBananaService - Asset Intelligence using Gemini 3.0 Pro Image (Nano Banana Pro)

This service provides visual red-lining of marketing assets from persona perspectives.
"""

import os
import base64
import json
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)

# Lazy-loaded Gemini client
_gemini_client = None


def get_gemini_client():
    """Return a configured Gemini client if API key is available."""
    global _gemini_client
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found in environment")
        return None
    
    if _gemini_client is None:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            _gemini_client = genai
        except ImportError:
            logger.error("google-generativeai package not installed")
            return None
    
    return _gemini_client


def build_annotation_prompt(persona: Dict[str, Any]) -> str:
    """Build the annotation prompt using persona attributes."""
    
    # Extract persona attributes
    name = persona.get("name", "Healthcare Professional")
    
    # Try to get archetype from different possible locations
    persona_json = persona.get("full_persona_json")
    if isinstance(persona_json, str):
        try:
            persona_json = json.loads(persona_json)
        except json.JSONDecodeError:
            persona_json = {}
    elif persona_json is None:
        persona_json = {}
    
    # Extract MBT (Motivation, Belief, Tension) attributes
    core = persona_json.get("core", {})
    mbt = core.get("mbt", {})
    
    # Get beliefs
    beliefs_data = mbt.get("beliefs", {})
    core_beliefs = beliefs_data.get("core_belief_statements", {}).get("value", [])
    if isinstance(core_beliefs, str):
        core_beliefs = [core_beliefs]
    beliefs_str = "; ".join(core_beliefs[:3]) if core_beliefs else "Evidence-based, patient-centric care"
    
    # Get tensions/pain points
    tension_data = mbt.get("tension", {})
    main_worry = tension_data.get("main_worry", {}).get("value", "")
    sensitivity_points = tension_data.get("sensitivity_points", {}).get("value", [])
    if isinstance(sensitivity_points, str):
        sensitivity_points = [sensitivity_points]
    tensions_str = main_worry if main_worry else ("; ".join(sensitivity_points[:2]) if sensitivity_points else "Time constraints, unverified claims")
    
    # Get archetype/decision style
    decision_style = persona.get("decision_style", "")
    archetype = persona.get("persona_subtype", decision_style if decision_style else "Analytical")
    
    prompt = f"""You are a pharmaceutical medical affairs reviewer simulating the perspective of: {name}.

Persona Profile:
- Archetype: {archetype}
- Core Beliefs: {beliefs_str}
- Key Tensions: {tensions_str}

Task: Review this pharmaceutical marketing asset and annotate it with your professional feedback.

Annotation Style:
- Use RED color for all annotations
- Draw circles or underlines around problematic areas
- Add short, professional margin comments (e.g., "Cite source", "Clarify dosing", "Overstated claim", "Missing safety info")
- Mark positive elements with a small checkmark if applicable
- Keep comments clinical and constructive, not sarcastic or humorous

Identify 3-5 key issues based on your persona's perspective. Return the annotated image."""

    return prompt


async def analyze_image_with_nano_banana(
    image_bytes: bytes,
    persona: Dict[str, Any],
    mime_type: str = "image/png"
) -> Dict[str, Any]:
    """
    Analyze an image using Nano Banana Pro (Gemini 3.0 Pro Image).
    
    Args:
        image_bytes: Raw bytes of the image to analyze
        persona: Dictionary containing persona attributes
        mime_type: MIME type of the image
        
    Returns:
        Dictionary with 'annotated_image' (base64) and 'text_summary'
    """
    
    genai = get_gemini_client()
    if genai is None:
        return {
            "error": "Gemini API not configured",
            "annotated_image": None,
            "text_summary": "Unable to analyze: Gemini API key not configured"
        }
    
    try:
        # Build persona-specific prompt
        prompt = build_annotation_prompt(persona)
        
        # Create the model - use gemini-2.0-flash-exp for image generation
        # Note: gemini-3.0-pro-image may require different model name in API
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Prepare image for the API
        image_part = {
            "mime_type": mime_type,
            "data": base64.b64encode(image_bytes).decode('utf-8')
        }
        
        # Generate annotated image
        response = model.generate_content(
            [prompt, image_part],
            generation_config={
                "response_modalities": ["image", "text"],
            }
        )
        
        # Extract the response
        annotated_image_b64 = None
        text_summary = ""
        
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data:
                    # This is the annotated image
                    annotated_image_b64 = part.inline_data.data
                    if isinstance(annotated_image_b64, bytes):
                        annotated_image_b64 = base64.b64encode(annotated_image_b64).decode('utf-8')
                elif hasattr(part, 'text') and part.text:
                    text_summary += part.text
        
        return {
            "persona_id": persona.get("id"),
            "persona_name": persona.get("name", "Unknown"),
            "annotated_image": annotated_image_b64,
            "text_summary": text_summary.strip() if text_summary else "Analysis complete.",
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Error analyzing image with Nano Banana Pro: {e}")
        return {
            "persona_id": persona.get("id"),
            "persona_name": persona.get("name", "Unknown"),
            "annotated_image": None,
            "text_summary": f"Error during analysis: {str(e)}",
            "error": str(e)
        }


async def analyze_asset_for_personas(
    image_bytes: bytes,
    personas: List[Dict[str, Any]],
    mime_type: str = "image/png"
) -> List[Dict[str, Any]]:
    """
    Analyze an asset from multiple persona perspectives.
    
    Args:
        image_bytes: Raw bytes of the image
        personas: List of persona dictionaries
        mime_type: MIME type of the image
        
    Returns:
        List of analysis results, one per persona
    """
    results = []
    
    for persona in personas:
        result = await analyze_image_with_nano_banana(image_bytes, persona, mime_type)
        results.append(result)
    
    return results

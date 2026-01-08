"""
NanoBananaService - Asset Intelligence using Gemini 3 Pro Image Preview (Nano Banana Pro)

This service provides visual red-lining of marketing assets from persona perspectives.
Uses the new google.genai SDK with gemini-3-pro-image-preview for native image annotation.
Reference: https://ai.google.dev/gemini-api/docs/image-generation
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

# Check for new SDK availability
try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai not installed. Install with: pip install google-genai")

# API Key for Nano Banana Pro (Gemini 3 Pro Image Preview)
# Use IMAGE_EDIT_API_KEY for consistency, fallback to GEMINI_API_KEY
IMAGE_EDIT_API_KEY = os.getenv("IMAGE_EDIT_API_KEY") or os.getenv("GEMINI_API_KEY")

# Lazy-loaded Gemini client
_gemini_client = None


def get_gemini_client():
    """Return a configured Gemini client (new SDK) if API key is available."""
    global _gemini_client
    
    if not GENAI_AVAILABLE:
        logger.error("google-genai package not installed")
        return None
    
    if not IMAGE_EDIT_API_KEY:
        logger.warning("IMAGE_EDIT_API_KEY or GEMINI_API_KEY not found in environment")
        return None
    
    if _gemini_client is None:
        try:
            _gemini_client = genai.Client(api_key=IMAGE_EDIT_API_KEY)
            logger.info("Initialized Gemini client with new google.genai SDK")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini client: {e}")
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

Identify 3-5 key issues based on your persona's perspective. Return the annotated image with visual markups."""

    return prompt


async def analyze_image_with_nano_banana(
    image_bytes: bytes,
    persona: Dict[str, Any],
    mime_type: str = "image/png"
) -> Dict[str, Any]:
    """
    Analyze an image using Nano Banana Pro (Gemini 3 Pro Image Preview).
    
    Uses the new google.genai SDK for native image annotation capabilities.
    Reference: https://ai.google.dev/gemini-api/docs/image-generation
    
    Args:
        image_bytes: Raw bytes of the image to analyze
        persona: Dictionary containing persona attributes
        mime_type: MIME type of the image
        
    Returns:
        Dictionary with 'annotated_image' (base64) and 'text_summary'
    """
    
    client = get_gemini_client()
    if client is None:
        return {
            "error": "Gemini API not configured",
            "annotated_image": None,
            "text_summary": "Unable to analyze: Gemini API key not configured or google-genai not installed"
        }
    
    try:
        # Build persona-specific prompt
        prompt = build_annotation_prompt(persona)
        
        # Use gemini-3-pro-image-preview (Nano Banana Pro) for native image annotation
        model_name = "gemini-3-pro-image-preview"
        logger.info(f"Using model: {model_name} for persona: {persona.get('name', 'Unknown')}")
        
        annotated_image_b64 = None
        text_summary = ""
        
        try:
            # Use the new SDK pattern with image-to-image editing
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    # Include the original image
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type
                    ),
                    # Include the annotation prompt
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=types.ImageConfig(
                        image_size="2K"  # High quality output
                    )
                )
            )
            
            # Extract annotated image and text from response
            for part in response.parts:
                if part.text is not None:
                    text_summary += part.text + "\n"
                elif part.inline_data is not None:
                    # This is the annotated image
                    annotated_image_data = part.inline_data.data
                    if isinstance(annotated_image_data, bytes):
                        annotated_image_b64 = base64.b64encode(annotated_image_data).decode('utf-8')
                    else:
                        annotated_image_b64 = annotated_image_data
                    
            if not text_summary and annotated_image_b64:
                text_summary = "Image annotated with persona feedback using Nano Banana Pro."
                
        except Exception as img_error:
            logger.warning(f"Image annotation with {model_name} failed: {img_error}")
            logger.info("Falling back to text-only analysis")
            
            # Fallback to text-only analysis with gemini-2.0-flash-exp
            try:
                text_prompt = f"""{prompt}

Since you cannot annotate the image directly, please provide a detailed text analysis:
1. List 3-5 specific areas of concern with their approximate locations (e.g., "top-left corner", "main headline")
2. For each area, provide your critique from this persona's perspective
3. Suggest specific improvements

Format your response clearly with bullet points."""

                fallback_response = client.models.generate_content(
                    model="gemini-2.0-flash-exp",
                    contents=[
                        types.Part.from_bytes(
                            data=image_bytes,
                            mime_type=mime_type
                        ),
                        text_prompt
                    ]
                )
                
                for part in fallback_response.parts:
                    if part.text is not None:
                        text_summary += part.text + "\n"
                        
            except Exception as fallback_error:
                logger.error(f"Fallback text analysis also failed: {fallback_error}")
                text_summary = f"Analysis failed: {str(img_error)}"
        
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

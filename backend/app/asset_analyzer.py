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

# Load environment variables from the backend folder
backend_dir = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(backend_dir, '.env')
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
    
    prompt = f"""You are a pharmaceutical marketing reviewer role-playing as: {name}.

Persona Profile:
- Archetype: {archetype}
- Core Beliefs: {beliefs_str}
- Key Tensions/Concerns: {tensions_str}

TASK: Create a visually annotated version of this marketing asset with hand-drawn style feedback markups.

VISUAL ANNOTATION REQUIREMENTS (VERY IMPORTANT - YOU MUST DRAW ON THE IMAGE):
1. Draw RED CIRCLES around 3-5 areas that concern this persona
2. Draw ARROWS pointing to specific elements with handwritten-style comments
3. Add SHORT MARGIN NOTES in a casual handwriting style (e.g., "Too clinical!", "Where's the data?", "Love this!", "Confusing!")
4. Use RED/ORANGE for concerns, GREEN checkmarks for positives
5. Add emotion indicators where relevant (e.g., "?" for confusion, "!" for strong reaction)

ANNOTATION STYLE - Make it look like a real person marked up a printed document:
- Casual, handwritten text labels (not typed/formal)
- Organic hand-drawn circles and arrows (not perfect geometric shapes)
- Brief reactions that reflect this persona's viewpoint

Based on {name}'s perspective, identify what would catch their eye, concern them, or resonate with them.

OUTPUT: Return the original image with all visual annotations drawn directly on it."""

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
        
        # Use Gemini 3 Pro Image for visual annotation
        model_name = "gemini-3-pro-image-preview"
        logger.info(f"Using model: {model_name} for persona: {persona.get('name', 'Unknown')}")
        
        annotated_image_b64 = None
        text_summary = ""
        
        try:
            # Use Gemini 3 Pro Image for visual annotation with image output
            # CRITICAL: Must include response_modalities=["IMAGE", "TEXT"] for image output
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
                    response_modalities=["IMAGE", "TEXT"]
                )
            )
            
            # Extract annotated image and text from response
            # Handle different SDK response formats
            logger.info(f"Response type: {type(response)}")
            logger.info(f"Response attributes: {dir(response)}")
            
            # Try to get parts from candidates first (most reliable for new SDK)
            parts = []
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    parts = candidate.content.parts
                    logger.info(f"Got {len(parts)} parts from candidates")
            
            # Fallback to direct parts attribute
            if not parts and hasattr(response, 'parts') and response.parts:
                parts = response.parts
                logger.info(f"Got {len(parts)} parts from response.parts")
            
            for i, part in enumerate(parts):
                logger.info(f"Part {i}: type={type(part)}, attrs={dir(part)}")
                
                # Check for text
                if hasattr(part, 'text') and part.text:
                    text_summary += part.text + "\n"
                    logger.info(f"Found text in part {i}")
                
                # Check for inline_data (image)
                if hasattr(part, 'inline_data') and part.inline_data:
                    logger.info(f"Found inline_data in part {i}")
                    inline_data = part.inline_data
                    
                    # Get the MIME type
                    image_mime_type = "image/png"  # default
                    if hasattr(inline_data, 'mime_type') and inline_data.mime_type:
                        image_mime_type = inline_data.mime_type
                        logger.info(f"Image MIME type: {image_mime_type}")
                    
                    # Try different ways to get the image data
                    image_data = None
                    if hasattr(inline_data, 'data'):
                        image_data = inline_data.data
                    elif hasattr(inline_data, '_pb') and hasattr(inline_data._pb, 'data'):
                        image_data = inline_data._pb.data
                    elif isinstance(inline_data, bytes):
                        image_data = inline_data
                    
                    if image_data:
                        logger.info(f"Got image data: {len(image_data) if isinstance(image_data, bytes) else type(image_data)}")
                        
                        b64_data = None
                        
                        if isinstance(image_data, bytes):
                            # Check if data is raw image bytes OR already base64-encoded bytes
                            jpeg_header = b'\xff\xd8\xff'
                            png_header = b'\x89PNG'
                            
                            # Check for raw JPEG/PNG headers
                            if image_data[:3] == jpeg_header:
                                logger.info("✅ Valid raw JPEG image detected - encoding to base64")
                                b64_data = base64.b64encode(image_data).decode('utf-8')
                            elif image_data[:4] == png_header:
                                logger.info("✅ Valid raw PNG image detected - encoding to base64")
                                b64_data = base64.b64encode(image_data).decode('utf-8')
                            else:
                                # Check if bytes are actually a base64-encoded string
                                # Base64 JPEG starts with "/9j/" and PNG starts with "iVBOR"
                                try:
                                    decoded_str = image_data.decode('utf-8')
                                    if decoded_str.startswith('/9j/'):
                                        logger.info("✅ Image data is already base64-encoded JPEG - using directly")
                                        b64_data = decoded_str
                                    elif decoded_str.startswith('iVBOR'):
                                        logger.info("✅ Image data is already base64-encoded PNG - using directly")
                                        b64_data = decoded_str
                                        image_mime_type = "image/png"
                                    else:
                                        logger.warning(f"⚠️ Unknown format. First 20 chars: {decoded_str[:20]}")
                                        # Assume it's base64 if it looks like valid base64
                                        import re
                                        if re.match(r'^[A-Za-z0-9+/=]+$', decoded_str[:100]):
                                            logger.info("Data looks like base64 - using directly")
                                            b64_data = decoded_str
                                        else:
                                            logger.warning("Treating as raw bytes - encoding to base64")
                                            b64_data = base64.b64encode(image_data).decode('utf-8')
                                except UnicodeDecodeError:
                                    # Can't decode as UTF-8, must be raw binary
                                    logger.info("Binary data detected - encoding to base64")
                                    b64_data = base64.b64encode(image_data).decode('utf-8')
                        elif isinstance(image_data, str):
                            # Already a string
                            if image_data.startswith('data:'):
                                annotated_image_b64 = image_data
                                logger.info("Image is already a data URI")
                            elif image_data.startswith('/9j/') or image_data.startswith('iVBOR'):
                                b64_data = image_data
                                logger.info("Image string is base64 - using directly")
                            else:
                                b64_data = image_data
                                logger.warning(f"Unknown string format, using as-is. First 20 chars: {image_data[:20]}")
                        
                        if b64_data:
                            # Clean any newlines from base64
                            b64_data = b64_data.replace('\n', '').replace('\r', '')
                            annotated_image_b64 = f"data:{image_mime_type};base64,{b64_data}"
                        
                        if annotated_image_b64:
                            logger.info(f"Final image data URI length: {len(annotated_image_b64)}")
            
            # Also check for direct text attribute
            if not text_summary and hasattr(response, 'text') and response.text:
                text_summary = response.text
                    
            if not text_summary and annotated_image_b64:
                text_summary = "Image annotated with persona feedback using Nano Banana Pro."
            
            logger.info(f"Final: has_image={bool(annotated_image_b64)}, has_text={bool(text_summary)}")
                
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
                
                # Handle different SDK response formats for fallback
                if hasattr(fallback_response, 'text') and fallback_response.text:
                    text_summary = fallback_response.text
                elif hasattr(fallback_response, 'parts'):
                    for part in fallback_response.parts:
                        if hasattr(part, 'text') and part.text:
                            text_summary += part.text + "\n"
                elif hasattr(fallback_response, 'candidates') and fallback_response.candidates:
                    for part in fallback_response.candidates[0].content.parts:
                        if hasattr(part, 'text') and part.text:
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

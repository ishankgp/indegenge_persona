"""
Image improvement service based on persona reactions.
Uses Nano Banana Pro (Gemini 3 Pro Image Preview) API to generate improved marketing images.
Reference: https://ai.google.dev/gemini-api/docs/image-generation
"""
import os
import base64
import json
import logging
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    logger.warning("google-genai not installed. Install with: pip install google-genai")

from PIL import Image, ImageEnhance
import io

# API Key for Nano Banana Pro (Gemini 3 Pro Image Preview)
# Use IMAGE_EDIT_API_KEY for consistency, fallback to GEMINI_API_KEY
IMAGE_EDIT_API_KEY = os.getenv("IMAGE_EDIT_API_KEY") or os.getenv("GEMINI_API_KEY")

def get_image_edit_client():
    """Initialize the Nano Banana Pro API client."""
    if not GENAI_AVAILABLE:
        return None
    try:
        client = genai.Client(api_key=IMAGE_EDIT_API_KEY)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Nano Banana Pro client: {e}")
        return None


def extract_persona_insights(individual_responses: List[Dict[str, Any]], summary_statistics: Dict[str, Any]) -> str:
    """
    Extract key insights from persona reactions to inform image improvements.
    """
    insights = []
    
    # Extract concerns and negative feedback
    concerns = []
    for response in individual_responses:
        if 'responses' in response:
            concerns_list = response['responses'].get('key_concerns', [])
            if isinstance(concerns_list, list):
                concerns.extend(concerns_list)
            elif concerns_list:
                concerns.append(str(concerns_list))
        
        # Extract reasoning for context
        if 'reasoning' in response and response['reasoning']:
            insights.append(f"Persona {response.get('persona_name', 'Unknown')}: {response['reasoning'][:200]}")
    
    # Extract summary insights
    if summary_statistics:
        if 'insights' in summary_statistics:
            insights.extend(summary_statistics['insights'])
    
    # Combine all insights
    combined_insights = "\n".join(insights[:10])  # Limit to avoid token limits
    
    concerns_text = ", ".join(set(concerns[:5])) if concerns else "No major concerns identified"
    
    return f"""
Persona Feedback Summary:
- Key Concerns: {concerns_text}
- Individual Insights: {combined_insights[:500]}
- Overall Sentiment: Analyze the emotional response patterns to improve visual appeal
"""


def generate_image_improvement_prompt(original_image_base64: str, persona_insights: str, image_description: Optional[str] = None) -> str:
    """
    Generate a prompt for Nano Banana Pro to improve the image based on persona reactions.
    """
    prompt = f"""
Based on the following persona feedback, improve this marketing image:

{persona_insights}

Please create an improved version of this image that addresses the concerns and 
enhances the visual appeal based on the persona reactions. Maintain the core 
marketing message while making it more effective.

Improvements should focus on:
- Better visual composition and balance
- Enhanced color contrast and clarity
- Improved text readability if text is present
- More engaging visual elements
- Addressing any concerns raised by personas

{"Image context: " + image_description if image_description else ""}
"""
    return prompt


def improve_image_with_ai(
    original_image_base64: str,
    image_content_type: str,
    persona_insights: str,
    individual_responses: List[Dict[str, Any]],
    summary_statistics: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Use Nano Banana Pro (Gemini 3 Pro Image Preview) to generate an improved version 
    of the image based on persona reactions.
    
    Reference: https://ai.google.dev/gemini-api/docs/image-generation
    
    Returns:
        Dict with 'improved_image_base64', 'improvements', 'analysis'
    """
    try:
        # Decode the base64 image
        image_data = base64.b64decode(original_image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Initialize Nano Banana Pro client
        client = get_image_edit_client()
        if not client:
            logger.warning("Nano Banana Pro client not available, using basic enhancements")
            return _apply_basic_improvements(image, persona_insights)
        
        # Generate improvement prompt for image editing
        improvement_prompt = generate_image_improvement_prompt(
            original_image_base64,
            persona_insights,
            image_description=None
        )
        
        # Convert PIL image to bytes for the API
        buffered = io.BytesIO()
        image_format = image.format or "PNG"
        image.save(buffered, format=image_format)
        image_bytes = buffered.getvalue()
        
        try:
            # Use Nano Banana Pro (gemini-3-pro-image-preview) for image-to-image editing
            # This model supports image-to-image editing with text prompts
            # Reference: https://ai.google.dev/gemini-api/docs/image-generation
            
            response = client.models.generate_content(
                model="gemini-3-pro-image-preview",
                contents=[
                    # Include the original image
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=f"image/{image_format.lower()}"
                    ),
                    # Include the improvement prompt
                    improvement_prompt
                ],
                config=types.GenerateContentConfig(
                    image_config=types.ImageConfig(
                        aspect_ratio="16:9",  # Maintain aspect ratio
                        image_size="2K"  # High quality 2K resolution
                    )
                )
            )
            
            # Extract the improved image from the response
            improved_image_bytes = None
            analysis_text = ""
            
            for part in response.parts:
                if part.text is not None:
                    analysis_text += part.text + "\n"
                elif part.inline_data is not None:
                    # This is the generated image
                    improved_image_bytes = part.inline_data.data
                    if not analysis_text:
                        analysis_text = "Image improved based on persona feedback using Nano Banana Pro."
            
            if improved_image_bytes:
                # Convert to base64
                improved_image_base64 = base64.b64encode(improved_image_bytes).decode('utf-8')
                
                return {
                    'improved_image_base64': improved_image_base64,
                    'improvements': analysis_text or "Image enhanced using Nano Banana Pro based on persona reactions.",
                    'analysis': analysis_text or "Professional image improvement applied.",
                    'original_format': image_format
                }
            else:
                # Fallback to basic improvements if no image was generated
                logger.warning("Nano Banana Pro did not return an image, using basic enhancements")
                return _apply_basic_improvements(image, persona_insights)
                
        except Exception as e:
            logger.error(f"Nano Banana Pro API error: {e}")
            logger.warning("Falling back to basic image enhancements")
            return _apply_basic_improvements(image, persona_insights)
        
    except Exception as e:
        logger.error(f"Error improving image: {e}")
        raise Exception(f"Failed to improve image: {str(e)}")


def _apply_basic_improvements(image: Image.Image, persona_insights: str) -> Dict[str, Any]:
    """Fallback: Apply basic image enhancements when API is unavailable."""
    improved_image = apply_suggested_improvements(image, persona_insights)
    
    buffered = io.BytesIO()
    image_format = image.format or "PNG"
    improved_image.save(buffered, format=image_format)
    improved_image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return {
        'improved_image_base64': improved_image_base64,
        'improvements': "Applied basic enhancements: increased contrast, brightness, and sharpness for better visual appeal.",
        'analysis': "Basic image enhancements applied (API unavailable).",
        'original_format': image_format
    }


def apply_suggested_improvements(image: Image.Image, suggestions: str) -> Image.Image:
    """
    Apply suggested improvements to the image.
    This is a simplified version - in production, you'd parse the AI suggestions
    and apply more sophisticated edits.
    """
    # Basic improvements: enhance contrast and brightness slightly
    # Enhance contrast (slightly)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.1)
    
    # Enhance brightness (slightly)
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(1.05)
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.1)
    
    return image


def create_image_improvement_summary(
    original_image_base64: str,
    improved_image_base64: str,
    improvements: str,
    persona_insights: str
) -> Dict[str, Any]:
    """
    Create a summary of the image improvements.
    """
    return {
        'original_image': original_image_base64,
        'improved_image': improved_image_base64,
        'improvements_applied': improvements,
        'persona_insights_used': persona_insights,
        'status': 'success'
    }

"""
Panel Feedback Engine for PharmaPersonaSim.

This module provides structured persona panel feedback analysis for marketing assets.
Each persona provides independent feedback with standardized sections:
- Clean Read (initial interpretation)
- Key Themes (what resonates)
- Strengths (what works)
- Weaknesses (concerns/issues)

The engine also synthesizes a summary with aggregated themes, dissent highlights,
and actionable recommendations.
"""

import os
import json
import logging
import concurrent.futures
from typing import Dict, Any, List, Optional
from datetime import datetime

from .utils import get_openai_client, MODEL_NAME
from . import crud

# Configure logging
logger = logging.getLogger(__name__)

# Model token limit (allow overriding via env)
MODEL_MAX_TOKENS = int(os.getenv("OPENAI_MODEL_MAX_TOKENS", "32768"))


def _extract_json(text: str) -> str:
    """Attempt to extract the first JSON object from arbitrary model text."""
    import re
    if not text:
        return "{}"
    # Remove fences
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    # Fast path
    try:
        json.loads(text)
        return text
    except Exception:
        pass
    # Regex object match
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        candidate = match.group(0)
        try:
            json.loads(candidate)
            return candidate
        except Exception:
            return "{}"
    return "{}"


def _chat_json_panel(messages: List[Dict[str, Any]], max_completion_tokens: Optional[int] = None) -> Dict[str, Any]:
    """Call chat.completions ensuring JSON-only output. Returns parsed dict or {}."""
    
    client = get_openai_client()
    if client is None:
        logger.error("❌ OpenAI API key missing")
        return {"error": "OpenAI API key not configured"}
    
    # Compute completion budget if not provided
    if max_completion_tokens is None:
        max_completion_tokens = 2048
    
    # Inject enforcement instruction
    enforce = "\n\nReturn ONLY valid JSON. No commentary, no code fences."
    if messages and messages[-1].get("role") == "user":
        for part in messages[-1].get("content", []):
            if part.get("type") == "text":
                part["text"] += enforce
                break
        else:
            messages[-1]["content"].append({"type": "text", "text": enforce})

    try:
        logger.info(f"🚀 Sending panel feedback request to {MODEL_NAME}")
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_completion_tokens=max_completion_tokens,
        )
        
        raw = response.choices[0].message.content if response.choices else "{}"
        
        if not raw or len(raw) == 0:
            logger.error("❌ Empty response from OpenAI API")
            return {"error": "Empty response from OpenAI"}
        
        json_str = _extract_json(raw)
        
        try:
            parsed = json.loads(json_str)
            return parsed
        except Exception as parse_error:
            logger.error(f"❌ JSON parsing failed: {parse_error}")
            return {"error": f"JSON parsing failed: {parse_error}"}
            
    except Exception as api_error:
        logger.error(f"❌ OpenAI API call failed: {api_error}")
        return {"error": f"OpenAI API error: {api_error}"}


def create_panel_feedback_prompt(
    persona_data: Dict[str, Any],
    stimulus_text: str,
    stimulus_images: Optional[List[Dict]] = None,
    content_type: str = "text"
) -> str:
    """
    Creates a prompt for structured panel feedback analysis.
    
    The persona will analyze the marketing asset and provide feedback in
    standardized sections: Clean Read, Key Themes, Strengths, Weaknesses.
    """
    
    persona_name = persona_data.get('name', 'Unknown')
    persona_type = persona_data.get('persona_type', 'Patient')
    full_persona = persona_data.get('full_persona', {})
    
    # Extract key characteristics from persona
    segment = full_persona.get('persona_subtype', '') or full_persona.get('segment', '')
    decision_style = full_persona.get('decision_style', '')
    
    # Get role/specialty for HCPs
    role = ''
    if persona_type.lower() == 'hcp':
        role = full_persona.get('specialty') or full_persona.get('role', 'Healthcare Professional')
    else:
        role = full_persona.get('condition', 'Patient')
    
    # Extract key characteristics as list
    characteristics = []
    if decision_style:
        characteristics.append(decision_style)
    if segment:
        characteristics.append(segment)
    
    mbt = full_persona.get('core', {}).get('mbt', {})
    if mbt:
        # Add a key motivation or belief as characteristic
        motivations = mbt.get('motivations', [])
        if motivations:
            first_mot = motivations[0] if isinstance(motivations[0], str) else motivations[0].get('text', '')
            if first_mot and len(first_mot) < 50:
                characteristics.append(first_mot)
    
    characteristics_str = ', '.join(characteristics[:3]) if characteristics else 'Not specified'
    
    # Build content description
    content_description = ""
    if content_type == 'text':
        content_description = f"Marketing Message:\n\"{stimulus_text}\""
    elif content_type == 'image':
        image_count = len(stimulus_images) if stimulus_images else 0
        content_description = f"Visual Content: {image_count} image(s) provided for analysis"
    elif content_type == 'both':
        image_count = len(stimulus_images) if stimulus_images else 0
        content_description = f"Marketing Message:\n\"{stimulus_text}\"\n\nVisual Content: {image_count} image(s) provided for analysis"
    
    prompt = f"""
You are a pharmaceutical marketing analyst simulating how a specific persona would evaluate a marketing asset.

**PERSONA PROFILE:**
- Name: {persona_name}
- Type: {persona_type}
- Role/Condition: {role}
- Key Characteristics: {characteristics_str}

**DETAILED PERSONA DATA:**
{json.dumps(full_persona, indent=2)[:3000]}

**MARKETING ASSET TO ANALYZE:**
{content_description}

**YOUR TASK:**
Analyze this marketing asset from the perspective of this persona. Provide your analysis in the following structured format:

1. **Clean Read**: Your initial, gut interpretation of the asset. What does it say to you? What's the first impression?

2. **Key Themes**: What themes or messages resonate with you as this persona? What catches your attention? (2-4 themes)

3. **Strengths**: What works well about this asset from your perspective? What would make you engage positively? (2-4 points)

4. **Weaknesses**: What concerns you? What doesn't work? What's missing or confusing? (2-4 points)

**OUTPUT FORMAT (JSON only):**
{{
    "persona_header": {{
        "name": "{persona_name}",
        "role": "<role/specialty or condition>",
        "segment": "<primary segment or decision style>",
        "key_characteristics": ["<characteristic 1>", "<characteristic 2>", "<characteristic 3>"]
    }},
    "clean_read": "<1-3 sentences describing initial interpretation>",
    "key_themes": [
        "<theme 1>",
        "<theme 2>",
        "<theme 3>"
    ],
    "strengths": [
        "<strength 1>",
        "<strength 2>"
    ],
    "weaknesses": [
        "<weakness 1>",
        "<weakness 2>"
    ]
}}

Be specific and ground your analysis in the persona's unique characteristics, concerns, and perspective.
"""
    
    return prompt


def analyze_single_persona_panel(
    persona_dict: Dict[str, Any],
    stimulus_text: str,
    stimulus_images: Optional[List[Dict]] = None,
    content_type: str = "text"
) -> Dict[str, Any]:
    """
    Analyze a single persona's panel feedback response.
    Designed to be called in parallel.
    """
    persona_id = persona_dict['id']
    persona_name = persona_dict['name']
    logger.info(f"🔄 Processing panel feedback for: {persona_name} (ID: {persona_id})")
    
    # Parse full persona JSON
    try:
        full_persona = json.loads(persona_dict.get('full_persona_json', '{}')) if persona_dict.get('full_persona_json') else {}
    except Exception as parse_error:
        logger.error(f"❌ Error parsing persona JSON for {persona_name}: {parse_error}")
        full_persona = {}
    
    # Build persona_data dict
    persona_data = {
        'id': persona_dict['id'],
        'name': persona_dict['name'],
        'persona_type': persona_dict.get('persona_type', 'Patient'),
        'age': persona_dict.get('age'),
        'gender': persona_dict.get('gender'),
        'condition': persona_dict.get('condition'),
        'location': persona_dict.get('location'),
        'avatar_url': persona_dict.get('avatar_url'),
        'full_persona': full_persona
    }
    
    # Create prompt
    prompt = create_panel_feedback_prompt(
        persona_data,
        stimulus_text,
        stimulus_images,
        content_type
    )
    
    # Prepare messages
    messages = [{"role": "user", "content": []}]
    messages[0]["content"].append({"type": "text", "text": prompt})
    
    # Add images if provided
    if stimulus_images and content_type in ['image', 'both']:
        for image_info in stimulus_images:
            data_url = f"data:{image_info['content_type']};base64,{image_info['data']}"
            messages[0]["content"].append({
                "type": "image_url",
                "image_url": {"url": data_url}
            })
    
    try:
        data = _chat_json_panel(messages)
        
        if data.get("error"):
            raise RuntimeError(data["error"])
        
        # Extract and structure the response
        header = data.get("persona_header", {})
        
        result = {
            "persona_id": persona_id,
            "persona_name": persona_name,
            "role": header.get("role", persona_dict.get('condition', '')),
            "segment": header.get("segment", full_persona.get('persona_subtype', '')),
            "key_characteristics": header.get("key_characteristics", []),
            "avatar_url": persona_dict.get('avatar_url'),
            "clean_read": data.get("clean_read", "No interpretation provided."),
            "key_themes": data.get("key_themes", []),
            "strengths": data.get("strengths", []),
            "weaknesses": data.get("weaknesses", [])
        }
        
        logger.info(f"✅ Panel feedback completed for {persona_name}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Error analyzing panel feedback for {persona_id}: {e}")
        return {
            "persona_id": persona_id,
            "persona_name": persona_name,
            "role": persona_dict.get('condition', ''),
            "segment": "",
            "key_characteristics": [],
            "avatar_url": persona_dict.get('avatar_url'),
            "clean_read": f"Error in analysis: {str(e)}",
            "key_themes": [],
            "strengths": [],
            "weaknesses": [],
            "error": str(e)
        }


def synthesize_panel_summary(
    persona_cards: List[Dict[str, Any]],
    stimulus_text: str
) -> Dict[str, Any]:
    """
    Synthesize a summary from all persona panel feedback.
    
    Generates:
    - Aggregated themes ("3 of 5 personas flagged X")
    - Dissent highlights ("While 4 personas liked Y, Persona Z disagreed")
    - Actionable recommendations
    """
    
    # Prepare summary of all responses for the synthesis prompt
    cards_summary = []
    for card in persona_cards:
        cards_summary.append({
            "name": card.get("persona_name"),
            "role": card.get("role"),
            "key_themes": card.get("key_themes", []),
            "strengths": card.get("strengths", []),
            "weaknesses": card.get("weaknesses", [])
        })
    
    prompt = f"""
You are an expert pharmaceutical marketing analyst. You have collected panel feedback from {len(persona_cards)} personas analyzing a marketing asset.

**STIMULUS:**
"{stimulus_text[:1000]}"

**INDIVIDUAL PERSONA FEEDBACK:**
{json.dumps(cards_summary, indent=2)}

**YOUR TASK:**
Synthesize the feedback from all personas into a cohesive summary. Focus on:

1. **Aggregated Themes**: What patterns emerge? Use statements like "3 of 5 personas mentioned..." or "The majority flagged..."

2. **Dissent Highlights**: Where do personas disagree? Highlight cases like "While most personas liked X, [Name] found it concerning because..."

3. **Actionable Recommendations**: Based on the collective feedback, what specific changes would improve the asset?

**OUTPUT FORMAT (JSON only):**
{{
    "aggregated_themes": [
        "<pattern 1 with counts, e.g., '4 of 5 personas flagged missing safety data'>",
        "<pattern 2>",
        "<pattern 3>"
    ],
    "dissent_highlights": [
        "<disagreement 1, naming the dissenting persona>",
        "<disagreement 2>"
    ],
    "recommendations": [
        {{
            "suggestion": "<specific actionable change>",
            "reasoning": "<based on which personas' feedback>"
        }},
        {{
            "suggestion": "<another change>",
            "reasoning": "<supporting evidence>"
        }}
    ]
}}

Be specific and reference persona names when highlighting dissent. Focus on actionable insights.
"""
    
    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
    
    try:
        data = _chat_json_panel(messages, max_completion_tokens=1500)
        
        if data.get("error"):
            raise RuntimeError(data["error"])
        
        return {
            "aggregated_themes": data.get("aggregated_themes", []),
            "dissent_highlights": data.get("dissent_highlights", []),
            "recommendations": data.get("recommendations", [])
        }
        
    except Exception as e:
        logger.error(f"❌ Error synthesizing panel summary: {e}")
        return {
            "aggregated_themes": ["Unable to generate aggregated themes due to error."],
            "dissent_highlights": [],
            "recommendations": [{"suggestion": "Review individual persona feedback for insights.", "reasoning": str(e)}]
        }


def run_panel_feedback_analysis(
    persona_ids: List[int],
    stimulus_text: str,
    stimulus_images: Optional[List[Dict]] = None,
    content_type: str = "text",
    db = None
) -> Dict[str, Any]:
    """
    Run structured panel feedback analysis for the given personas.
    
    Args:
        persona_ids: List of persona IDs to include in the panel
        stimulus_text: Text content of the marketing asset
        stimulus_images: Optional list of images (base64 encoded)
        content_type: 'text', 'image', or 'both'
        db: Database session
    
    Returns:
        Dict containing persona_cards, summary, and metadata
    """
    
    if not persona_ids:
        raise ValueError("At least one persona ID is required")
    
    # Fetch personas from database
    personas = []
    for persona_id in persona_ids:
        persona = crud.get_persona(db, persona_id)
        if persona:
            # Serialize to dict to avoid DetachedInstanceError in threads
            personas.append({
                'id': persona.id,
                'name': persona.name,
                'age': persona.age,
                'gender': persona.gender,
                'condition': persona.condition,
                'location': persona.location,
                'persona_type': persona.persona_type,
                'avatar_url': getattr(persona, 'avatar_url', None),
                'full_persona_json': persona.full_persona_json
            })
    
    if not personas:
        raise ValueError("No valid personas found for the provided IDs")
    
    logger.info(f"🎯 Running panel feedback for {len(personas)} personas")
    
    # Process personas in parallel
    persona_cards = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(5, len(personas))) as executor:
        futures = {
            executor.submit(
                analyze_single_persona_panel,
                persona_dict,
                stimulus_text,
                stimulus_images,
                content_type
            ): persona_dict['id']
            for persona_dict in personas
        }
        
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                persona_cards.append(result)
            except Exception as e:
                persona_id = futures[future]
                logger.error(f"❌ Panel feedback failed for persona {persona_id}: {e}")
                persona_cards.append({
                    "persona_id": persona_id,
                    "persona_name": f"Persona {persona_id}",
                    "error": str(e)
                })
    
    # Sort by persona_id for consistent ordering
    persona_cards.sort(key=lambda x: x.get('persona_id', 0))
    
    # Synthesize summary
    logger.info("📊 Synthesizing panel summary...")
    summary = synthesize_panel_summary(persona_cards, stimulus_text)
    
    # Build final result
    result = {
        "persona_cards": persona_cards,
        "summary": summary,
        "metadata": {
            "persona_count": len(personas),
            "content_type": content_type,
            "created_at": datetime.now().isoformat()
        }
    }
    
    logger.info(f"✅ Panel feedback analysis complete for {len(personas)} personas")
    return result

"""
Comparison Engine for LLM-powered persona comparison analysis.

This module provides intelligent comparison capabilities for personas:
1. AI-generated comparison insights (similarities/differences)
2. Smart attribute differentiation scoring
3. Comparative Q&A for natural language questions
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from .utils import get_openai_client, MODEL_NAME

logger = logging.getLogger(__name__)


# Attribute categories for comprehensive HCP comparison
HCP_ATTRIBUTE_CATEGORIES = {
    "core": ["condition", "location", "specialty", "practice_setup"],
    "decision_making": ["decision_style", "decision_influencers", "adherence_to_protocols"],
    "psychology": ["motivations", "beliefs", "pain_points", "core_insight"],
    "communication": ["channel_use", "communication_preferences"],
    "behavioral": ["persona_subtype", "tagline"]
}

PATIENT_ATTRIBUTE_CATEGORIES = {
    "core": ["condition", "location", "age", "gender"],
    "psychology": ["motivations", "beliefs", "pain_points"],
    "lifestyle": ["lifestyle_and_values", "medical_background"],
    "communication": ["communication_preferences"]
}

# Suggested questions for comparative Q&A
SUGGESTED_QUESTIONS_HCP = [
    "Which HCP would be more receptive to efficacy-focused messaging?",
    "What are the key differences in their prescribing decision drivers?",
    "How would their patient populations differ?",
    "What messaging would resonate with both HCPs?",
    "Which HCP would be an earlier adopter of new therapies?"
]

SUGGESTED_QUESTIONS_PATIENT = [
    "Which patient would be more likely to adhere to treatment?",
    "What are the key differences in their health concerns?",
    "How do their support systems compare?",
    "What messaging would motivate both patients?",
    "Which patient would be more receptive to digital health tools?"
]


def _extract_json(text: str) -> Dict[str, Any]:
    """Extract JSON from model response text."""
    if not text:
        return {}
    # Remove fences
    if text.startswith("```"):
        text = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    if text.endswith("```"):
        text = text[:-3].strip()
    # Try parsing directly
    try:
        return json.loads(text)
    except Exception:
        pass
    # Regex object match
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            return {}
    return {}


def _chat_json(messages: List[Dict[str, Any]], max_tokens: int = 2048) -> Dict[str, Any]:
    """Call OpenAI chat completions and return parsed JSON."""
    client = get_openai_client()
    if client is None:
        logger.error("OpenAI API key not configured")
        return {"error": "OpenAI API not configured"}
    
    # Add JSON enforcement
    enforce = "\n\nReturn ONLY valid JSON. No commentary, no code fences."
    if messages and messages[-1].get("role") == "user":
        messages[-1]["content"] += enforce
    
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            max_completion_tokens=max_tokens,
        )
        raw = response.choices[0].message.content if response.choices else "{}"
        return _extract_json(raw)
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        return {"error": str(e)}


def extract_persona_attributes(persona: Dict[str, Any]) -> Dict[str, Any]:
    """Extract all relevant attributes from a persona for comparison."""
    # Get base attributes
    attrs = {
        "id": persona.get("id"),
        "name": persona.get("name"),
        "age": persona.get("age"),
        "gender": persona.get("gender"),
        "condition": persona.get("condition"),
        "location": persona.get("location"),
        "persona_type": persona.get("persona_type", "Patient"),
        "persona_subtype": persona.get("persona_subtype"),
        "specialty": persona.get("specialty"),
        "practice_setup": persona.get("practice_setup"),
        "decision_influencers": persona.get("decision_influencers"),
        "adherence_to_protocols": persona.get("adherence_to_protocols"),
        "channel_use": persona.get("channel_use"),
        "decision_style": persona.get("decision_style"),
        "core_insight": persona.get("core_insight"),
        "tagline": persona.get("tagline"),
    }
    
    # Parse full_persona_json for nested attributes
    full_json = persona.get("full_persona_json", "{}")
    if isinstance(full_json, str):
        try:
            full_json = json.loads(full_json)
        except json.JSONDecodeError:
            full_json = {}
    
    # Extract from nested JSON
    attrs["motivations"] = full_json.get("motivations", [])
    attrs["beliefs"] = full_json.get("beliefs", [])
    attrs["pain_points"] = full_json.get("pain_points", [])
    attrs["communication_preferences"] = full_json.get("communication_preferences", {})
    attrs["lifestyle_and_values"] = full_json.get("lifestyle_and_values", "")
    attrs["medical_background"] = full_json.get("medical_background", "")
    
    # Extract from core.mbt if available
    core = full_json.get("core", {})
    mbt = core.get("mbt", {})
    if mbt:
        if not attrs["motivations"]:
            attrs["motivations"] = [m.get("text", m) if isinstance(m, dict) else m 
                                    for m in mbt.get("motivations", [])]
        if not attrs["beliefs"]:
            attrs["beliefs"] = [b.get("text", b) if isinstance(b, dict) else b 
                               for b in mbt.get("beliefs", [])]
        if not attrs["pain_points"]:
            attrs["pain_points"] = [t.get("text", t) if isinstance(t, dict) else t 
                                    for t in mbt.get("tensions", [])]
    
    return attrs


def compute_attribute_differentiation(personas: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Compute differentiation scores for each attribute across personas.
    
    Returns a dict with attribute names as keys and objects containing:
    - similarity_score: 0.0 (very different) to 1.0 (identical)
    - highlight_level: "high", "medium", or "low" (for UI styling)
    - values: list of values for each persona
    """
    if len(personas) < 2:
        return {}
    
    # Extract all attributes
    all_attrs = [extract_persona_attributes(p) for p in personas]
    
    results = {}
    
    # Define which attributes to compare
    compare_attrs = [
        "condition", "location", "specialty", "practice_setup",
        "decision_style", "decision_influencers", "adherence_to_protocols",
        "channel_use", "core_insight", "persona_subtype", "tagline",
        "motivations", "beliefs", "pain_points"
    ]
    
    for attr in compare_attrs:
        values = [a.get(attr) for a in all_attrs]
        
        # Skip if all values are None/empty
        if all(not v for v in values):
            continue
        
        # Calculate similarity based on type
        if isinstance(values[0], list):
            # For lists, compute Jaccard-like similarity
            similarity = _compute_list_similarity(values)
        elif isinstance(values[0], str) or values[0] is None:
            # For strings, check exact match or semantic similarity
            similarity = _compute_string_similarity(values)
        else:
            similarity = 0.5
        
        # Determine highlight level
        if similarity >= 0.8:
            highlight = "low"  # Very similar - de-emphasize
        elif similarity >= 0.4:
            highlight = "medium"  # Some differences
        else:
            highlight = "high"  # Very different - highlight
        
        results[attr] = {
            "similarity_score": round(similarity, 2),
            "highlight_level": highlight,
            "values": values
        }
    
    return results


def _compute_string_similarity(values: List[Optional[str]]) -> float:
    """Compute similarity score for string values."""
    # Filter out None/empty values
    valid_values = [v for v in values if v]
    if len(valid_values) < 2:
        return 1.0
    
    # Exact match check
    if all(v == valid_values[0] for v in valid_values):
        return 1.0
    
    # Case-insensitive match
    lower_values = [v.lower().strip() for v in valid_values]
    if all(v == lower_values[0] for v in lower_values):
        return 0.9
    
    # Partial overlap (check for common words)
    word_sets = [set(v.lower().split()) for v in valid_values]
    if len(word_sets) >= 2:
        intersection = word_sets[0]
        union = word_sets[0]
        for ws in word_sets[1:]:
            intersection = intersection & ws
            union = union | ws
        if len(union) > 0:
            return len(intersection) / len(union)
    
    return 0.0


def _compute_list_similarity(values: List[List]) -> float:
    """Compute Jaccard-like similarity for list values."""
    # Convert all items to strings for comparison
    sets = []
    for v in values:
        if not v:
            continue
        items = []
        for item in v:
            if isinstance(item, dict):
                items.append(str(item.get("text", item)))
            else:
                items.append(str(item).lower().strip())
        sets.append(set(items))
    
    if len(sets) < 2:
        return 1.0
    
    # Calculate average pairwise Jaccard similarity
    total_sim = 0
    count = 0
    for i in range(len(sets)):
        for j in range(i + 1, len(sets)):
            intersection = sets[i] & sets[j]
            union = sets[i] | sets[j]
            if len(union) > 0:
                total_sim += len(intersection) / len(union)
            count += 1
    
    return total_sim / count if count > 0 else 1.0


def analyze_persona_comparison(personas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate AI-powered comparison insights for a set of personas.
    
    Returns:
    - key_similarities: List of notable similarities
    - key_differences: List of notable differences
    - strategic_insights: Narrative insights for marketing strategy
    - attribute_scores: Differentiation scores for each attribute
    - suggested_questions: Relevant questions for Q&A
    """
    if len(personas) < 2:
        return {"error": "Need at least 2 personas to compare"}
    
    # Extract attributes for each persona
    all_attrs = [extract_persona_attributes(p) for p in personas]
    
    # Compute attribute differentiation
    attr_scores = compute_attribute_differentiation(personas)
    
    # Determine persona type for suggested questions
    is_hcp = any(a.get("persona_type", "").upper() == "HCP" for a in all_attrs)
    suggested_qs = SUGGESTED_QUESTIONS_HCP if is_hcp else SUGGESTED_QUESTIONS_PATIENT
    
    # Build comparison prompt
    persona_summaries = []
    for attrs in all_attrs:
        summary = f"""
**{attrs.get('name', 'Unknown')}** ({attrs.get('persona_type', 'Patient')})
- Age: {attrs.get('age')}, Gender: {attrs.get('gender')}
- Condition: {attrs.get('condition')}
- Location: {attrs.get('location')}
- Specialty: {attrs.get('specialty', 'N/A')}
- Decision Style: {attrs.get('decision_style', 'N/A')}
- Subtype/Archetype: {attrs.get('persona_subtype', 'N/A')}
- Motivations: {attrs.get('motivations', [])}
- Beliefs: {attrs.get('beliefs', [])}
- Pain Points: {attrs.get('pain_points', [])}
- Core Insight: {attrs.get('core_insight', 'N/A')}
"""
        persona_summaries.append(summary)
    
    prompt = f"""
You are an expert pharmaceutical marketing strategist. Analyze the following personas and provide comparison insights.

**PERSONAS TO COMPARE:**
{''.join(persona_summaries)}

**TASK:**
Generate a comparison analysis with the following structure:

1. **Key Similarities**: 2-3 notable similarities between the personas that have strategic implications
2. **Key Differences**: 2-3 notable differences that would require different messaging approaches  
3. **Strategic Insights**: 2-3 narrative insights about how to approach these personas differently in marketing

**OUTPUT FORMAT (JSON):**
{{
    "key_similarities": [
        {{"title": "Brief title", "description": "Explanation of similarity and its strategic implication"}}
    ],
    "key_differences": [
        {{"title": "Brief title", "description": "Explanation of difference and its strategic implication"}}
    ],
    "strategic_insights": [
        "Narrative insight about marketing strategy..."
    ]
}}
"""

    messages = [
        {"role": "system", "content": "You are a pharmaceutical marketing strategist specializing in HCP and patient persona analysis."},
        {"role": "user", "content": prompt}
    ]
    
    result = _chat_json(messages)
    
    if "error" in result:
        # Return fallback insights
        result = {
            "key_similarities": [{"title": "Analysis unavailable", "description": "LLM analysis could not be completed."}],
            "key_differences": [{"title": "Analysis unavailable", "description": "LLM analysis could not be completed."}],
            "strategic_insights": ["Please review the attribute comparison for insights."]
        }
    
    # Add computed data
    result["attribute_scores"] = attr_scores
    result["suggested_questions"] = suggested_qs[:5]
    result["personas_compared"] = [{"id": a.get("id"), "name": a.get("name")} for a in all_attrs]
    
    return result


def answer_comparison_question(
    personas: List[Dict[str, Any]], 
    question: str
) -> Dict[str, Any]:
    """
    Answer a natural language question about the compared personas.
    
    Returns:
    - answer: The AI-generated answer
    - reasoning: Explanation of how the answer was derived
    - relevant_attributes: Which persona attributes informed the answer
    """
    if len(personas) < 2:
        return {"error": "Need at least 2 personas to compare"}
    
    if not question or not question.strip():
        return {"error": "Question is required"}
    
    # Extract attributes for context
    all_attrs = [extract_persona_attributes(p) for p in personas]
    
    # Build context for the LLM
    persona_context = json.dumps(all_attrs, indent=2, default=str)
    
    prompt = f"""
You are an expert pharmaceutical marketing strategist. Answer the following question about the compared personas.

**PERSONAS:**
{persona_context}

**QUESTION:**
{question}

**INSTRUCTIONS:**
- Base your answer on the specific persona data provided
- Reference specific persona attributes and values
- Provide actionable, strategic insights
- Be concise but thorough

**OUTPUT FORMAT (JSON):**
{{
    "answer": "Your comprehensive answer to the question...",
    "reasoning": "Brief explanation of how you arrived at this answer...",
    "relevant_attributes": ["List of attribute names that informed your answer"]
}}
"""

    messages = [
        {"role": "system", "content": "You are a pharmaceutical marketing strategist. Answer questions about persona comparisons with specific, data-driven insights."},
        {"role": "user", "content": prompt}
    ]
    
    result = _chat_json(messages)
    
    if "error" in result or "answer" not in result:
        return {
            "answer": "I was unable to analyze this question. Please try rephrasing or ask a different question.",
            "reasoning": "LLM analysis encountered an error.",
            "relevant_attributes": []
        }
    
    return result

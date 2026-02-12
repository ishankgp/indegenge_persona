import json
import logging
from typing import List, Dict, Any, Optional
import os
from openai import OpenAI

from . import schemas, models, vector_search, persona_engine
from .utils import get_openai_client, MODEL_NAME

logger = logging.getLogger(__name__)

# === Prompts ===

DISCOVERY_PROMPT = """
You are an expert market researcher. Analyze the following summaries of research documents to identify distinct customer segments or personas.

**Context:**
We have a collection of documents (transcripts, segmentation studies, strategy decks) about a disease area or product.
We need to "discover" the distinct personas described in these documents so we can simulate them later.

**Document Summaries / Excerpts:**
{context_text}

**Task:**
Identify 3-6 distinct personas/segments found in this research.
For each segment, provide:
1. A descriptive name (e.g., "The Overwhelmed Caregiver", "The Skeptical Specialist").
2. A brief description (Who are they?).
3. Key differentiators (What makes them unique?).
4. Evidence (Which documents or themes point to them?).

**Output Format:**
Return a JSON object with a "segments" key containing an array of objects.
{{
  "segments": [
    {{
      "name": "Segment Name",
      "description": "Brief description...",
      "differentiators": ["Trait 1", "Trait 2"],
      "evidence": "Found in doc X, Y..."
    }}
  ]
}}
"""

# Dictionary mapping extraction passes to specific schema fields and queries
EXTRACTION_PASSES = {
    "demographics": {
        "query_template": "Demographics, lifestyle, daily routine, and life context of {segment_name}. {segment_description}",
        "focus": "FACTUAL",
        "schema_fields": [
            "age", "gender", "condition", "location", 
            "occupation", "financial_status", "family_context",
            "education", "ethnicity"
        ],
        "prompt_instruction": "Extract hard demographic data. Look for 'Age', 'Gender', 'Location', 'Routine'. If not found, estimating based on context is allowed but mark as estimated."
    },
    "psychographics": {
        "query_template": "Motivations, beliefs, fears, values, and psychological drivers of {segment_name}. {segment_description}",
        "focus": "EMOTIONAL",
        "schema_fields": [
            "motivations", "beliefs", "pain_points", "goals", "values", 
            "mbt_personality", "core_insight", "concerns"
        ],
        "prompt_instruction": "Extract deep psychological drivers. Populate 'motivations', 'beliefs', 'pain_points', and the 'core_insight' (the single most important truth about them)."
    },
    "behavioral": {
        "query_template": "Healthcare journey, relationship with HCPs, channel preferences, and decision making for {segment_name}. {segment_description}",
        "focus": "BEHAVIORAL",
        "schema_fields": [
            "hcp_relationship", "communication_preferences", "digital_behavior", 
            "adherence_to_protocols", "decision_drivers", "channel_use", 
            "decision_style", "decision_influencers"
        ],
        "prompt_instruction": "Extract behavioral patterns. specifically 'channel_use' (where do they get info?), 'decision_style' (paternalistic vs shared?), and 'decision_influencers'."
    }
}

MERGE_PROMPT = """
You are aggregating research insights into a single, coherent persona profile for "{segment_name}".

**Inputs from Research Passes:**
1. **Demographics**: {demo_json}
2. **Psychographics**: {psych_json}
3. **Behavioral**: {behav_json}

**Task:**
Merge these inputs into a final JSON structure that matches our system schema.
Ensure consistency (e.g., if Demographics says "Age 70", Behavioral shouldn't say "Uses TikTok heavily" unless substantiated).

**Schema Requirements:**
- **Full Persona JSON**: Must include `core` objects, `mbt`, `decision_drivers`.
- **Additional Context**: Capture unique details that don't fit ("nuances").

**Output Format:**
Return valid JSON matching the system's simple persona structure + 'additional_context'.
"""

# === Engine Functions ===

def discover_segments_from_documents(
    documents: List[models.BrandDocument], 
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Scans the provided documents (summaries or chunks) to discover potential personas.
    """
    client = get_openai_client()
    if not client:
        return [{"name": "Error", "description": "OpenAI API not available"}]

    # 1. Aggregate context from documents
    context_parts = []
    for doc in documents:
        info = f"Document: {doc.filename}\n"
        if doc.summary:
            info += f"Summary: {doc.summary}\n"
        context_parts.append(info)
        
    # Limit context size roughly
    context_text = "\n---\n".join(context_parts)[:20000] 
    
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful market research assistant."},
                {"role": "user", "content": DISCOVERY_PROMPT.format(context_text=context_text)}
            ],
            response_format={"type": "json_object"},
            temperature=0.7 
        )
        
        result_json = json.loads(response.choices[0].message.content)
        return result_json.get("segments", [])
        
    except Exception as e:
        logger.error(f"Discovery failed: {e}")
        return []

def extract_persona_from_segment(
    segment_name: str,
    segment_description: str,
    brand_id: int,
    db_session: Any 
) -> Dict[str, Any]:
    """
    Generates a full persona profile for a chosen segment using Multi-Pass RAG.
    """
    client = get_openai_client()
    if not client:
        return {}

    pass_results = {}
    
    # 1. Execute 3 Extraction Passes
    for pass_name, config in EXTRACTION_PASSES.items():
        # A. Construct Query
        query = config["query_template"].format(
            segment_name=segment_name, 
            segment_description=segment_description
        )
        
        # B. RAG Retrieval (Mocked for now, assumes vector_search integration later)
        # In production: chunks = vector_search.search_brand_context(brand_id, query)
        rag_context = f"[Simulated RAG content for {pass_name} pass about {segment_name}]"
        
        # C. LLM Extraction
        pass_prompt = f"""
        Extract insights for {segment_name} based on this context.
        Focus: {config['focus']}
        Fields to find: {", ".join(config['schema_fields'])}
        Instruction: {config['prompt_instruction']}
        
        Context:
        {rag_context}
        
        Return JSON.
        """
        
        try:
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": pass_prompt}],
                response_format={"type": "json_object"}
            )
            pass_results[pass_name] = response.choices[0].message.content
        except Exception as e:
            logger.error(f"Pass {pass_name} failed: {e}")
            pass_results[pass_name] = "{}"

    # 2. Merge Results
    try:
        merge_response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "user", 
                "content": MERGE_PROMPT.format(
                    segment_name=segment_name,
                    demo_json=pass_results.get("demographics"),
                    psych_json=pass_results.get("psychographics"),
                    behav_json=pass_results.get("behavioral")
                )
            }],
            response_format={"type": "json_object"}
        )
        final_profile = json.loads(merge_response.choices[0].message.content)
        return final_profile
        
    except Exception as e:
        logger.error(f"Merge failed: {e}")
        return {}

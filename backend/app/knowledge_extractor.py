"""
Knowledge Extractor - Extract knowledge graph nodes from documents using GPT-5.2

This service extracts structured knowledge nodes from brand documents and
infers relationships between them for the knowledge graph.
"""

import json
import logging
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime

from openai import OpenAI
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from . import models

# Load environment variables
backend_dir = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-5.2")

# Lazy-loaded OpenAI client
_openai_client: Optional[OpenAI] = None


def get_openai_client() -> Optional[OpenAI]:
    """Return a configured OpenAI client when an API key is present."""
    global _openai_client
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            _openai_client = OpenAI(api_key=api_key)
    return _openai_client


# === Node Type Mappings by Document Type ===
DOCUMENT_TYPE_NODE_MAPPINGS = {
    "brand_messaging": [
        "key_message", "value_proposition", "differentiator", "proof_point"
    ],
    "disease_literature": [
        "epidemiology", "symptom_burden", "treatment_landscape", "unmet_need"
    ],
    "interview_transcript": [
        "patient_motivation", "patient_belief", "patient_tension", "journey_insight"
    ],
    "competitive_intel": [
        "competitor_position", "market_barrier", "differentiator"
    ]
}


# === Extraction Prompt ===
EXTRACTION_PROMPT = """You are a pharmaceutical marketing analyst extracting structured knowledge from documents.

**Document Type:** {document_type}
**Brand:** {brand_name}

**Document Text:**
{document_text}

**Task:** Extract insights into these categories based on the document type:

{extraction_categories}

**Output Format:** Return a JSON array of extracted nodes:
```json
[
  {{
    "node_type": "<type from categories>",
    "text": "Full insight text (1-2 sentences)",
    "summary": "Short label for graph display (max 50 chars)",
    "segment": "Who this applies to (e.g., 'Elderly Patients', 'Endocrinologists', 'All')",
    "source_quote": "Exact quote from the document that supports this",
    "confidence": 0.85
  }}
]
```

**Rules:**
1. Extract up to 10 insights total
2. Each insight must have a supporting quote from the document
3. Focus on actionable, specific insights not generic statements
4. For tensions/pain points, capture the emotional undertone
5. For proof points, include specific data or study references if available

Return ONLY the JSON array, no other text."""


# === Relationship Prompt ===
RELATIONSHIP_PROMPT = """You are analyzing relationships between knowledge nodes for a pharmaceutical brand.

**Existing Nodes:**
{existing_nodes_json}

**New Nodes:**
{new_nodes_json}

**Task:** Identify meaningful relationships between nodes.

**Valid Relationship Types:**
- ADDRESSES: A brand message/feature directly addresses a patient tension or unmet need
- SUPPORTS: Evidence or proof point supports a claim or key message  
- CONTRADICTS: A patient belief contradicts a brand message (IMPORTANT to flag!)
- TRIGGERS: A symptom or disease burden triggers an emotional tension
- INFLUENCES: A clinical concern or market factor influences prescribing behavior
- RESONATES_WITH: A brand message resonates with a patient motivation

**Output Format:** Return a JSON array:
```json
[
  {{
    "from_node_id": "<id of source node>",
    "to_node_id": "<id of target node>",
    "relation_type": "ADDRESSES",
    "strength": 0.85,
    "context": "Brief explanation of why this relationship exists"
  }}
]
```

**Rules:**
1. Focus on the most meaningful relationships (max 15)
2. CONTRADICTS relationships are critical - always flag these
3. Higher strength (0.8-1.0) for direct, explicit connections
4. Lower strength (0.5-0.7) for inferred connections

Return ONLY the JSON array, no other text."""


def _get_extraction_categories(document_type: str) -> str:
    """Get the extraction category descriptions based on document type."""
    categories = {
        "brand_messaging": """
For BRAND_MESSAGING documents, extract:
- **key_message**: Core marketing messages and claims
- **value_proposition**: Value propositions for patients or HCPs
- **differentiator**: What sets this brand apart from competitors
- **proof_point**: Clinical data, studies, or evidence supporting claims""",
        
        "disease_literature": """
For DISEASE_LITERATURE documents, extract:
- **epidemiology**: Prevalence, incidence, demographic statistics
- **symptom_burden**: How the disease affects patients' daily lives
- **treatment_landscape**: Current treatment options and their limitations
- **unmet_need**: Gaps in current care that aren't being addressed""",
        
        "interview_transcript": """
For INTERVIEW_TRANSCRIPT documents, extract:
- **patient_motivation**: What patients want to achieve with treatment
- **patient_belief**: What patients believe about their condition or treatment
- **patient_tension**: Fears, concerns, frustrations, emotional pain points
- **journey_insight**: Insights about the patient journey and decision-making""",
        
        "competitive_intel": """
For COMPETITIVE_INTEL documents, extract:
- **competitor_position**: How competitors position themselves
- **market_barrier**: Barriers to market access or adoption
- **differentiator**: Competitive advantages or disadvantages"""
    }
    return categories.get(document_type, categories["brand_messaging"])


async def extract_knowledge_from_document(
    document_id: int,
    document_text: str,
    document_type: str,
    brand_id: int,
    brand_name: str,
    db: Session
) -> List[models.KnowledgeNode]:
    """
    Extract structured knowledge nodes from a document using LLM.
    
    Args:
        document_id: ID of the source document
        document_text: Text content of the document
        document_type: Type classification (brand_messaging, disease_literature, etc.)
        brand_id: ID of the brand this document belongs to
        brand_name: Name of the brand
        db: Database session
        
    Returns:
        List of created KnowledgeNode objects
    """
    client = get_openai_client()
    if client is None:
        logger.warning("OpenAI client not available, using fallback extraction")
        return _fallback_extraction(document_id, document_text, document_type, brand_id, db)
    
    # Truncate document if too long
    max_chars = 12000
    if len(document_text) > max_chars:
        document_text = document_text[:max_chars] + "\n\n[Document truncated...]"
    
    extraction_categories = _get_extraction_categories(document_type)
    
    prompt = EXTRACTION_PROMPT.format(
        document_type=document_type.upper(),
        brand_name=brand_name,
        document_text=document_text,
        extraction_categories=extraction_categories
    )
    
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=2000,
        )
        
        content = response.choices[0].message.content or "[]"
        print(f"DEBUG: Raw OpenAI content for doc {document_id}: {content[:500]}...") # Debug log
        
        # Parse the response
        try:
            # Handle potential wrapper object
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                # Check if the dict itself is a node (has 'text') or looks like an error
                if "text" in parsed or "node_type" in parsed:
                    nodes_data = [parsed]
                else:
                    nodes_data = parsed.get("nodes", parsed.get("items", []))
            else:
                nodes_data = parsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse extraction response: {e}")
            nodes_data = []
        
        # Create knowledge nodes
        created_nodes = []
        for node_data in nodes_data:
            if not node_data.get("text"):
                continue
                
            node = models.KnowledgeNode(
                id=str(uuid.uuid4()),
                brand_id=brand_id,
                node_type=node_data.get("node_type", "key_message"),
                text=node_data.get("text", ""),
                summary=node_data.get("summary", "")[:200] if node_data.get("summary") else None,
                segment=node_data.get("segment"),
                journey_stage=node_data.get("journey_stage"),
                source_document_id=document_id,
                source_quote=node_data.get("source_quote"),
                confidence=float(node_data.get("confidence", 0.7)),
                verified_by_user=False
            )
            db.add(node)
            created_nodes.append(node)
        
        db.commit()
        logger.info(f"✅ Extracted {len(created_nodes)} knowledge nodes from document {document_id}")
        return created_nodes
        
    except Exception as e:
        logger.error(f"Knowledge extraction failed: {e}")
        return _fallback_extraction(document_id, document_text, document_type, brand_id, db)


async def infer_relationships(
    brand_id: int,
    new_nodes: List[models.KnowledgeNode],
    db: Session
) -> List[models.KnowledgeRelation]:
    """
    Use LLM to infer relationships between nodes.
    
    Args:
        brand_id: ID of the brand
        new_nodes: Newly created nodes to find relationships for
        db: Database session
        
    Returns:
        List of created KnowledgeRelation objects
    """
    if not new_nodes:
        return []
    
    client = get_openai_client()
    if client is None:
        logger.warning("OpenAI client not available, skipping relationship inference")
        return []
    
    # Get existing nodes for this brand
    existing_nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id,
        ~models.KnowledgeNode.id.in_([n.id for n in new_nodes])
    ).limit(50).all()
    
    if not existing_nodes and len(new_nodes) < 2:
        # Need at least 2 nodes total to infer relationships
        return []
    
    # Prepare node data for prompt
    def node_to_dict(node: models.KnowledgeNode) -> Dict:
        return {
            "id": node.id,
            "type": node.node_type,
            "text": node.text,
            "summary": node.summary or node.text[:50],
            "segment": node.segment
        }
    
    existing_nodes_json = json.dumps([node_to_dict(n) for n in existing_nodes], indent=2)
    new_nodes_json = json.dumps([node_to_dict(n) for n in new_nodes], indent=2)
    
    prompt = RELATIONSHIP_PROMPT.format(
        existing_nodes_json=existing_nodes_json,
        new_nodes_json=new_nodes_json
    )
    
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=1500,
        )
        
        content = response.choices[0].message.content or "[]"
        
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                relations_data = parsed.get("relationships", parsed.get("relations", []))
            else:
                relations_data = parsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse relationships response: {e}")
            relations_data = []
        
        # Create relationship objects
        created_relations = []
        all_node_ids = set([n.id for n in existing_nodes] + [n.id for n in new_nodes])
        
        for rel_data in relations_data:
            from_id = rel_data.get("from_node_id")
            to_id = rel_data.get("to_node_id")
            
            # Validate node IDs exist
            if from_id not in all_node_ids or to_id not in all_node_ids:
                continue
            
            relation = models.KnowledgeRelation(
                brand_id=brand_id,
                from_node_id=from_id,
                to_node_id=to_id,
                relation_type=rel_data.get("relation_type", "relates_to"),
                strength=float(rel_data.get("strength", 0.7)),
                context=rel_data.get("context"),
                inferred_by="llm"
            )
            db.add(relation)
            created_relations.append(relation)
        
        db.commit()
        logger.info(f"✅ Inferred {len(created_relations)} relationships for brand {brand_id}")
        return created_relations
        
    except Exception as e:
        logger.error(f"Relationship inference failed: {e}")
        return []


def _fallback_extraction(
    document_id: int,
    document_text: str,
    document_type: str,
    brand_id: int,
    db: Session
) -> List[models.KnowledgeNode]:
    """
    Simple keyword-based extraction when LLM is unavailable.
    """
    nodes = []
    
    # Simple heuristic extraction based on keywords
    keywords = {
        "patient_motivation": ["want", "hope", "desire", "goal", "wish", "need"],
        "patient_tension": ["worry", "fear", "concern", "frustrated", "anxious", "struggle"],
        "patient_belief": ["believe", "think", "feel", "trust", "prefer"],
        "key_message": ["key", "message", "main", "primary", "core"],
        "unmet_need": ["unmet", "gap", "lack", "missing", "inadequate"]
    }
    
    sentences = document_text.split('.')
    
    for sentence in sentences[:20]:  # Limit to first 20 sentences
        sentence = sentence.strip()
        if len(sentence) < 20:
            continue
            
        for node_type, kw_list in keywords.items():
            if any(kw in sentence.lower() for kw in kw_list):
                node = models.KnowledgeNode(
                    id=str(uuid.uuid4()),
                    brand_id=brand_id,
                    node_type=node_type,
                    text=sentence[:500],
                    summary=sentence[:50] if len(sentence) > 50 else sentence,
                    source_document_id=document_id,
                    source_quote=sentence,
                    confidence=0.4,  # Lower confidence for fallback
                    verified_by_user=False
                )
                db.add(node)
                nodes.append(node)
                break  # Only one type per sentence
    
    if nodes:
        db.commit()
        logger.info(f"⚠️ Fallback extraction created {len(nodes)} nodes from document {document_id}")
    
    return nodes


def classify_document_type(document_text: str) -> str:
    """
    Use LLM to classify a document into one of the DocumentType categories.
    
    Args:
        document_text: Text content of the document
        
    Returns:
        Document type string (brand_messaging, disease_literature, etc.)
    """
    client = get_openai_client()
    if client is None:
        # Default to brand_messaging if LLM unavailable
        return "brand_messaging"
    
    # Take first 3000 chars for classification
    sample_text = document_text[:3000]
    
    prompt = f"""Classify this pharmaceutical document into ONE of these categories:

1. brand_messaging - Marketing materials, brand claims, product positioning
2. disease_literature - Medical/scientific literature about diseases, epidemiology
3. interview_transcript - Patient or HCP interview transcripts, qualitative research
4. competitive_intel - Competitor analysis, market intelligence

**Document Sample:**
{sample_text}

Return ONLY the category name (e.g., "brand_messaging"), nothing else."""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            max_completion_tokens=50,
        )
        
        result = response.choices[0].message.content.strip().lower()
        
        # Validate result
        valid_types = ["brand_messaging", "disease_literature", "interview_transcript", "competitive_intel"]
        if result in valid_types:
            return result
        
        # Try to match partial
        for vt in valid_types:
            if vt in result:
                return vt
        
        return "brand_messaging"  # Default
        
    except Exception as e:
        logger.error(f"Document classification failed: {e}")
        return "brand_messaging"


# Synchronous wrappers for non-async contexts
def extract_knowledge_from_document_sync(
    document_id: int,
    document_text: str,
    document_type: str,
    brand_id: int,
    brand_name: str,
    db: Session
) -> List[models.KnowledgeNode]:
    """Synchronous wrapper for extract_knowledge_from_document."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        extract_knowledge_from_document(document_id, document_text, document_type, brand_id, brand_name, db)
    )


def infer_relationships_sync(
    brand_id: int,
    new_nodes: List[models.KnowledgeNode],
    db: Session
) -> List[models.KnowledgeRelation]:
    """Synchronous wrapper for infer_relationships."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        infer_relationships(brand_id, new_nodes, db)
    )

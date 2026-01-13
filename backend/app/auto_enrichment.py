"""
Auto Enrichment Service - Enrich personas from knowledge graph

This service automatically enriches personas with relevant insights
from the knowledge graph when they are created or updated.
"""

import json
import logging
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session
from . import models

logger = logging.getLogger(__name__)


def get_relevant_knowledge_nodes(
    brand_id: int,
    persona_attrs: Dict[str, Any],
    db: Session,
    limit: int = 20
) -> List[models.KnowledgeNode]:
    """
    Query the knowledge graph for nodes relevant to a persona's attributes.
    
    Args:
        brand_id: ID of the brand to query nodes from
        persona_attrs: Persona attributes to match against
        db: Database session
        limit: Maximum number of nodes to return
        
    Returns:
        List of relevant KnowledgeNode objects
    """
    # Get all nodes for this brand
    query = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id
    )
    
    # Get persona condition/segment for filtering
    condition = persona_attrs.get("condition", "").lower()
    persona_type = persona_attrs.get("persona_type", "patient").lower()
    
    nodes = query.limit(100).all()  # Get more than limit for filtering
    
    # Score and filter nodes based on relevance
    scored_nodes = []
    
    for node in nodes:
        score = 0.0
        
        # Segment match
        if node.segment:
            segment_lower = node.segment.lower()
            if "all" in segment_lower:
                score += 0.5
            elif condition and condition in segment_lower:
                score += 1.0
            elif persona_type in segment_lower:
                score += 0.8
        else:
            score += 0.3  # Nodes without segment are somewhat relevant to all
        
        # Node type relevance based on persona type
        if persona_type == "patient":
            if node.node_type in ["patient_motivation", "patient_belief", "patient_tension", "unmet_need"]:
                score += 0.8
            elif node.node_type in ["symptom_burden", "treatment_landscape"]:
                score += 0.6
        elif persona_type == "hcp":
            if node.node_type in ["prescribing_driver", "clinical_concern", "practice_constraint"]:
                score += 0.8
            elif node.node_type in ["key_message", "proof_point"]:
                score += 0.6
        
        # Confidence weight
        score *= node.confidence
        
        if score > 0.3:  # Threshold
            scored_nodes.append((score, node))
    
    # Sort by score and take top nodes
    scored_nodes.sort(key=lambda x: x[0], reverse=True)
    return [node for _, node in scored_nodes[:limit]]


def merge_insights_to_persona(
    persona_json: Dict[str, Any],
    nodes: List[models.KnowledgeNode]
) -> Dict[str, Any]:
    """
    Merge knowledge graph insights into a persona JSON structure.
    
    Args:
        persona_json: Existing persona JSON structure
        nodes: Knowledge nodes to merge
        
    Returns:
        Updated persona JSON with merged insights
    """
    if not nodes:
        return persona_json
    
    # Categorize nodes by type
    motivations = []
    beliefs = []
    tensions = []
    
    for node in nodes:
        insight = {
            "text": node.text,
            "source": "knowledge_graph",
            "node_id": node.id,
            "confidence": node.confidence,
            "source_quote": node.source_quote
        }
        
        if node.node_type in ["patient_motivation", "prescribing_driver"]:
            motivations.append(insight)
        elif node.node_type in ["patient_belief"]:
            beliefs.append(insight)
        elif node.node_type in ["patient_tension", "unmet_need", "clinical_concern"]:
            tensions.append(insight)
    
    # Merge into persona structure
    # Get existing values
    existing_motivations = persona_json.get("motivations", [])
    existing_beliefs = persona_json.get("beliefs", [])
    existing_pain_points = persona_json.get("pain_points", [])
    
    # Add new insights (avoiding duplicates)
    def add_unique_insights(existing: List, new_insights: List[Dict]) -> List:
        existing_texts = set(str(e).lower() for e in existing if e)
        result = list(existing)
        for insight in new_insights:
            if insight["text"].lower() not in existing_texts:
                result.append(insight["text"])
                existing_texts.add(insight["text"].lower())
        return result
    
    persona_json["motivations"] = add_unique_insights(existing_motivations, motivations)
    persona_json["beliefs"] = add_unique_insights(existing_beliefs, beliefs)
    persona_json["pain_points"] = add_unique_insights(existing_pain_points, tensions)
    
    # Also update core.mbt if it exists
    core = persona_json.get("core", {})
    mbt = core.get("mbt", {})
    
    if mbt:
        # Update motivation section
        motivation_section = mbt.get("motivation", {})
        if isinstance(motivation_section, dict):
            top_outcomes = motivation_section.get("top_outcomes", {})
            if isinstance(top_outcomes, dict) and "value" in top_outcomes:
                top_outcomes["value"] = add_unique_insights(
                    top_outcomes.get("value", []),
                    motivations[:3]
                )
        
        # Update beliefs section
        beliefs_section = mbt.get("beliefs", {})
        if isinstance(beliefs_section, dict):
            core_beliefs = beliefs_section.get("core_belief_statements", {})
            if isinstance(core_beliefs, dict) and "value" in core_beliefs:
                core_beliefs["value"] = add_unique_insights(
                    core_beliefs.get("value", []),
                    beliefs[:3]
                )
        
        # Update tension section
        tension_section = mbt.get("tension", {})
        if isinstance(tension_section, dict):
            sensitivity = tension_section.get("sensitivity_points", {})
            if isinstance(sensitivity, dict) and "value" in sensitivity:
                sensitivity["value"] = add_unique_insights(
                    sensitivity.get("value", []),
                    tensions[:3]
                )
    
    # Track enrichment metadata
    persona_json["knowledge_graph_enrichment"] = {
        "enriched": True,
        "nodes_applied": len(nodes),
        "node_ids": [n.id for n in nodes[:10]]  # Store first 10 IDs
    }
    
    return persona_json


async def enrich_persona_from_knowledge_graph(
    persona_id: int,
    brand_id: int,
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    Enrich an existing persona with relevant knowledge graph insights.
    
    Args:
        persona_id: ID of the persona to enrich
        brand_id: ID of the brand to query knowledge from
        db: Database session
        
    Returns:
        Updated persona JSON or None if persona not found
    """
    # Get the persona
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
        logger.warning(f"Persona {persona_id} not found")
        return None
    
    # Parse existing persona JSON
    try:
        persona_json = json.loads(persona.full_persona_json or "{}")
    except json.JSONDecodeError:
        persona_json = {}
    
    # Build persona attributes for matching
    persona_attrs = {
        "condition": persona.condition,
        "persona_type": persona.persona_type,
        "age": persona.age,
        "gender": persona.gender,
        "location": persona.location
    }
    
    # Get relevant knowledge nodes
    nodes = get_relevant_knowledge_nodes(brand_id, persona_attrs, db)
    
    if not nodes:
        logger.info(f"No relevant knowledge nodes found for persona {persona_id}")
        return persona_json
    
    # Merge insights
    enriched_json = merge_insights_to_persona(persona_json, nodes)
    
    # Update persona in database
    persona.full_persona_json = json.dumps(enriched_json, ensure_ascii=False)
    db.commit()
    
    logger.info(f"✅ Enriched persona {persona_id} with {len(nodes)} knowledge graph nodes")
    return enriched_json


def enrich_persona_from_knowledge_graph_sync(
    persona_id: int,
    brand_id: int,
    db: Session
) -> Optional[Dict[str, Any]]:
    """Synchronous wrapper for enrich_persona_from_knowledge_graph."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        enrich_persona_from_knowledge_graph(persona_id, brand_id, db)
    )


def validate_persona_coherence(
    persona_json: Dict[str, Any],
    brand_id: int,
    db: Session
) -> Dict[str, Any]:
    """
    Validate if a persona's MBT aligns with brand knowledge.
    
    Returns a coherence report with potential contradictions.
    """
    # Get brand's key messages and beliefs
    key_messages = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id,
        models.KnowledgeNode.node_type == "key_message"
    ).all()
    
    patient_beliefs = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id,
        models.KnowledgeNode.node_type == "patient_belief"
    ).all()
    
    # Check for CONTRADICTS relationships
    contradictions = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id,
        models.KnowledgeRelation.relation_type == "contradicts"
    ).all()
    
    report = {
        "is_coherent": True,
        "contradictions": [],
        "warnings": [],
        "suggestions": []
    }
    
    # Flag any known contradictions
    for contradiction in contradictions:
        report["contradictions"].append({
            "from_node_id": contradiction.from_node_id,
            "to_node_id": contradiction.to_node_id,
            "context": contradiction.context,
            "strength": contradiction.strength
        })
        report["is_coherent"] = False
    
    # Check if persona beliefs align with brand
    persona_beliefs = persona_json.get("beliefs", [])
    if key_messages and not persona_beliefs:
        report["warnings"].append("Persona has no beliefs - consider adding beliefs from brand research")
    
    if len(key_messages) > 0 and len(report["contradictions"]) == 0:
        report["suggestions"].append("Persona appears coherent with brand messaging")
    
    return report

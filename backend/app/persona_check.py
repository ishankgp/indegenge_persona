"""
Persona Check Module - Pre-flight validation of persona against Knowledge Graph

Checks if selected personas have known triggers or gaps in brand messaging
before asset analysis begins.
"""

import logging
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from . import models

logger = logging.getLogger(__name__)


def check_persona_alignment(
    brand_id: int,
    persona_ids: List[int],
    db: Session
) -> Dict[str, Any]:
    """
    Check if selected personas align with brand knowledge or have known triggers/gaps.
    
    Args:
        brand_id: ID of the brand
        persona_ids: List of persona IDs to check
        db: Database session
        
    Returns:
        {
            "personas_checked": [...],
            "is_aligned": bool,
            "triggers": [...],   # Messages that may trigger persona tensions
            "gaps": [...],       # Persona concerns not addressed by brand
            "alignment_score": float
        }
    """
    result = {
        "personas_checked": [],
        "is_aligned": True,
        "triggers": [],
        "gaps": [],
        "alignment_score": 1.0
    }
    
    # Get personas
    personas = db.query(models.Persona).filter(
        models.Persona.id.in_(persona_ids)
    ).all()
    
    if not personas:
        return result
    
    result["personas_checked"] = [
        {"id": p.id, "name": p.name, "persona_type": p.persona_type}
        for p in personas
    ]
    
    # Get all TRIGGERS relationships for this brand
    triggers_rels = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id,
        models.KnowledgeRelation.relation_type == "triggers"
    ).all()
    
    # Get all CONTRADICTS relationships (legacy, treat as triggers)
    contradicts_rels = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id,
        models.KnowledgeRelation.relation_type == "contradicts"
    ).all()
    
    all_trigger_rels = triggers_rels + contradicts_rels
    
    # For each trigger relationship, get the node details
    for rel in all_trigger_rels:
        # Get the source node (key_message)
        from_node = db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.id == rel.from_node_id
        ).first()
        
        # Get the target node (patient_tension)
        to_node = db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.id == rel.to_node_id
        ).first()
        
        if from_node and to_node:
            # Check if any persona matches the tension's segment
            for persona in personas:
                persona_type = (persona.persona_type or "").lower()
                tension_segment = (to_node.segment or "").lower()
                
                # Match if segment is generic or matches persona type
                is_relevant = (
                    "all" in tension_segment or
                    not tension_segment or
                    persona_type in tension_segment or
                    "patient" in tension_segment  # Most tensions are patient-relevant
                )
                
                if is_relevant:
                    # Extract recommended approach from context
                    context_text = rel.context or ""
                    recommended_approach = None
                    
                    if "Recommended approach:" in context_text:
                        parts = context_text.split("Recommended approach:")
                        context_text = parts[0].strip()
                        recommended_approach = parts[1].strip()
                    elif " | Recommended: " in context_text:
                        parts = context_text.split(" | Recommended: ")
                        context_text = parts[0].strip()
                        recommended_approach = parts[1].strip()
                    
                    result["triggers"].append({
                        "persona_id": persona.id,
                        "persona_name": persona.name,
                        "from_message": from_node.text,
                        "from_message_id": from_node.id[:8],
                        "to_tension": to_node.text,
                        "to_tension_id": to_node.id[:8],
                        "relationship": rel.relation_type,
                        "strength": rel.strength or 0.7,
                        "context": context_text,
                        "recommended_approach": recommended_approach
                    })
                    result["is_aligned"] = False
    
    # Check for gaps (persona tensions not addressed by any key message)
    # Get all addressed relationships
    addresses_rels = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id,
        models.KnowledgeRelation.relation_type.in_(["addresses", "resonates_with"])
    ).all()
    
    addressed_tension_ids = set(rel.to_node_id for rel in addresses_rels)
    
    # Get all patient tensions for this brand
    all_tensions = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id,
        models.KnowledgeNode.node_type == "patient_tension"
    ).all()
    
    for tension in all_tensions:
        if tension.id not in addressed_tension_ids:
            # This tension is not addressed by any message
            tension_segment = (tension.segment or "").lower()
            
            for persona in personas:
                persona_type = (persona.persona_type or "").lower()
                
                is_relevant = (
                    "all" in tension_segment or
                    not tension_segment or
                    persona_type in tension_segment
                )
                
                if is_relevant:
                    result["gaps"].append({
                        "persona_id": persona.id,
                        "persona_name": persona.name,
                        "tension": tension.text,
                        "tension_id": tension.id[:8],
                        "segment": tension.segment,
                        "confidence": tension.confidence
                    })
    
    # Calculate alignment score
    total_issues = len(result["triggers"]) + len(result["gaps"])
    if total_issues > 0:
        # Score decreases with more issues
        result["alignment_score"] = max(0.1, 1.0 - (total_issues * 0.15))
    
    logger.info(f"📊 Persona check for brand {brand_id}: {len(result['triggers'])} triggers, {len(result['gaps'])} gaps")
    
    return result


def get_persona_check_summary(check_result: Dict[str, Any]) -> str:
    """
    Generate a human-readable summary of the persona check.
    """
    if check_result["is_aligned"]:
        return "✅ Selected personas align with brand messaging."
    
    parts = []
    
    trigger_count = len(check_result["triggers"])
    if trigger_count > 0:
        parts.append(f"⚡ {trigger_count} messaging trigger(s) detected")
    
    gap_count = len(check_result["gaps"])
    if gap_count > 0:
        parts.append(f"ℹ️ {gap_count} unaddressed concern(s)")
    
    return " | ".join(parts)

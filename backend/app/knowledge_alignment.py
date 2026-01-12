"""
Knowledge Alignment - Connect Knowledge Graph to Asset Testing

This module provides:
1. Query relevant KG nodes for a brand/persona
2. Build evidence-backed context for asset analysis
3. Generate attributable feedback with citations
"""

import logging
from typing import Dict, List, Optional, Any

from sqlalchemy.orm import Session
from . import models

logger = logging.getLogger(__name__)


def get_brand_knowledge_context(
    brand_id: int,
    persona_type: str,
    db: Session
) -> Dict[str, Any]:
    """
    Get knowledge graph context for asset analysis.
    
    Returns organized knowledge for prompt enrichment.
    """
    # Get all knowledge nodes for this brand
    nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id
    ).all()
    
    if not nodes:
        return {"has_knowledge": False, "message": "No knowledge graph data available"}
    
    # Categorize nodes by type
    context = {
        "has_knowledge": True,
        "key_messages": [],
        "value_propositions": [],
        "patient_tensions": [],
        "patient_beliefs": [],
        "differentiators": [],
        "contradictions": [],
        "all_nodes_by_id": {}
    }
    
    for node in nodes:
        node_data = {
            "id": node.id[:8],  # Short ID for citation
            "text": node.text,
            "segment": node.segment,
            "confidence": node.confidence,
            "source_quote": node.source_quote
        }
        context["all_nodes_by_id"][node.id] = node_data
        
        # Categorize
        if node.node_type == "key_message":
            context["key_messages"].append(node_data)
        elif node.node_type == "value_proposition":
            context["value_propositions"].append(node_data)
        elif node.node_type in ["patient_tension", "unmet_need"]:
            context["patient_tensions"].append(node_data)
        elif node.node_type == "patient_belief":
            context["patient_beliefs"].append(node_data)
        elif node.node_type == "differentiator":
            context["differentiators"].append(node_data)
    
    # Get contradictions (important for flagging)
    contradictions = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id,
        models.KnowledgeRelation.relation_type == "contradicts"
    ).all()
    
    for rel in contradictions:
        context["contradictions"].append({
            "from_id": rel.from_node_id[:8],
            "to_id": rel.to_node_id[:8],
            "context": rel.context
        })
    
    # Get ADDRESSES relationships (key messages that address tensions)
    addresses = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id,
        models.KnowledgeRelation.relation_type.in_(["addresses", "resonates_with"])
    ).all()
    
    context["addresses_relationships"] = [
        {
            "from_id": rel.from_node_id[:8],
            "to_id": rel.to_node_id[:8],
            "strength": rel.strength,
            "context": rel.context
        }
        for rel in addresses
    ]
    
    logger.info(f"📚 Built knowledge context for brand {brand_id}: {len(nodes)} nodes, {len(contradictions)} contradictions")
    return context


def build_knowledge_enriched_prompt_section(
    knowledge_context: Dict[str, Any],
    persona_type: str = "patient"
) -> str:
    """
    Build prompt section with knowledge graph evidence.
    
    Returns a string to append to the annotation prompt.
    """
    if not knowledge_context.get("has_knowledge"):
        return ""
    
    sections = []
    
    # Key Messages section
    key_messages = knowledge_context.get("key_messages", [])[:5]
    if key_messages:
        msg_list = "\n".join([f"  [{m['id']}] \"{m['text'][:100]}...\"" for m in key_messages])
        sections.append(f"**BRAND KEY MESSAGES (cite these if asset aligns):**\n{msg_list}")
    
    # Patient Tensions section
    tensions = knowledge_context.get("patient_tensions", [])[:5]
    if tensions:
        tension_list = "\n".join([f"  [{t['id']}] \"{t['text'][:100]}...\"" for t in tensions])
        sections.append(f"**KNOWN PATIENT TENSIONS (flag if asset ignores/addresses these):**\n{tension_list}")
    
    # Contradictions (critical!)
    contradictions = knowledge_context.get("contradictions", [])
    if contradictions:
        contra_list = "\n".join([f"  [{c['from_id']}] contradicts [{c['to_id']}]: {c.get('context', '')[:50]}" for c in contradictions])
        sections.append(f"**⚠️ KNOWN CONTRADICTIONS (alert if asset triggers these):**\n{contra_list}")
    
    # Patient beliefs
    beliefs = knowledge_context.get("patient_beliefs", [])[:3]
    if beliefs:
        belief_list = "\n".join([f"  [{b['id']}] \"{b['text'][:80]}...\"" for b in beliefs])
        sections.append(f"**PATIENT BELIEFS TO CONSIDER:**\n{belief_list}")
    
    if not sections:
        return ""
    
    prompt_section = """
=== DOCUMENTED RESEARCH (Use these to back up your feedback) ===
When providing feedback, CITE specific research by referencing the [ID] codes.
Example: "This headline addresses tension [abc123] effectively" or "Missing: doesn't speak to [def456]"

""" + "\n\n".join(sections) + """

IMPORTANT: Reference the [ID] codes in your feedback to make it attributable to documented research.
"""
    
    return prompt_section


def analyze_response_for_citations(
    text_summary: str,
    knowledge_context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Post-process analysis response to extract and enrich citations.
    
    Returns enhanced feedback with full citation details.
    """
    if not knowledge_context.get("has_knowledge"):
        return {
            "original_summary": text_summary,
            "citations": [],
            "research_alignment_score": None
        }
    
    import re
    
    # Find citation patterns like [abc123] or [ID: abc123]
    citation_pattern = r'\[([a-f0-9]{8})\]|\[ID:\s*([a-f0-9]{8})\]'
    matches = re.findall(citation_pattern, text_summary)
    
    # Flatten matches (each match is a tuple from the alternation)
    cited_ids = set()
    for match in matches:
        for m in match:
            if m:
                cited_ids.add(m)
    
    # Look up full details for cited nodes
    citations = []
    all_nodes = knowledge_context.get("all_nodes_by_id", {})
    
    for short_id in cited_ids:
        # Find full ID that starts with this short ID
        for full_id, node_data in all_nodes.items():
            if full_id.startswith(short_id):
                citations.append({
                    "id": short_id,
                    "full_id": full_id,
                    "text": node_data["text"],
                    "source_quote": node_data.get("source_quote"),
                    "confidence": node_data.get("confidence")
                })
                break
    
    # Calculate a rough alignment score
    key_message_count = len(knowledge_context.get("key_messages", []))
    tension_count = len(knowledge_context.get("patient_tensions", []))
    total_relevant = key_message_count + tension_count
    
    alignment_score = None
    if total_relevant > 0 and citations:
        # Score based on: how many citations vs how much research exists
        alignment_score = min(1.0, len(citations) / max(3, total_relevant / 2))
    
    return {
        "original_summary": text_summary,
        "citations": citations,
        "citation_count": len(citations),
        "research_alignment_score": round(alignment_score * 100) if alignment_score else None,
        "knowledge_coverage": {
            "key_messages_available": key_message_count,
            "tensions_available": tension_count,
            "contradictions_flagged": len(knowledge_context.get("contradictions", []))
        }
    }


def generate_alignment_summary(
    citations: List[Dict],
    knowledge_context: Dict[str, Any]
) -> str:
    """
    Generate a human-readable summary of how the asset aligns with research.
    """
    if not citations:
        return "❓ No specific research citations found in this analysis. Consider reviewing against documented patient tensions and key messages."
    
    summary_parts = []
    
    # Group citations by type (we'd need to track this, simplified for now)
    cited_count = len(citations)
    summary_parts.append(f"📚 **Research Attribution:** This feedback references {cited_count} documented research finding(s).")
    
    # List the citations
    for c in citations[:5]:  # Limit to 5
        text_preview = c["text"][:80] + "..." if len(c["text"]) > 80 else c["text"]
        summary_parts.append(f"  • [{c['id']}]: \"{text_preview}\"")
    
    if len(citations) > 5:
        summary_parts.append(f"  • ...and {len(citations) - 5} more")
    
    return "\n".join(summary_parts)

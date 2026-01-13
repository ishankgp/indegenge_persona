"""
Sync Manager - Manage document synchronization and knowledge graph coherence

This service handles re-processing of documents when updated and
validates persona coherence against the knowledge graph.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from sqlalchemy.orm import Session
from . import models, knowledge_extractor, auto_enrichment

logger = logging.getLogger(__name__)


async def sync_document(
    document_id: int,
    db: Session,
    force_reprocess: bool = False
) -> Dict[str, Any]:
    """
    Synchronize a document with the knowledge graph.
    
    Re-extracts knowledge if the document has been updated or if forced.
    
    Args:
        document_id: ID of the document to sync
        db: Database session
        force_reprocess: If True, reprocess even if already extracted
        
    Returns:
        Sync result with stats
    """
    # Get the document
    document = db.query(models.BrandDocument).filter(
        models.BrandDocument.id == document_id
    ).first()
    
    if not document:
        return {"success": False, "error": "Document not found"}
    
    # Check if we have existing nodes
    existing_nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.source_document_id == document_id
    ).all()
    
    if existing_nodes and not force_reprocess:
        return {
            "success": True,
            "action": "skipped",
            "message": f"Document already has {len(existing_nodes)} nodes. Use force_reprocess=True to re-extract.",
            "existing_nodes": len(existing_nodes)
        }
    
    # Delete existing nodes if reprocessing
    if existing_nodes and force_reprocess:
        for node in existing_nodes:
            # Delete relations first
            db.query(models.KnowledgeRelation).filter(
                (models.KnowledgeRelation.from_node_id == node.id) |
                (models.KnowledgeRelation.to_node_id == node.id)
            ).delete()
        
        db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.source_document_id == document_id
        ).delete()
        db.commit()
        logger.info(f"🗑️ Deleted {len(existing_nodes)} existing nodes for document {document_id}")
    
    # Get document text
    document_text = ""
    if document.extracted_insights:
        insights = document.extracted_insights
        if isinstance(insights, str):
            try:
                insights = json.loads(insights)
            except:
                insights = {}
        
        document_text = insights.get("raw_text", "")
        if not document_text:
            for key in ["motivations", "beliefs", "tensions"]:
                items = insights.get(key, [])
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict):
                            document_text += item.get("text", "") + ". "
                        elif isinstance(item, str):
                            document_text += item + ". "
    
    if not document_text:
        return {
            "success": False,
            "error": "No text content found in document"
        }
    
    # Get brand info
    brand = db.query(models.Brand).filter(models.Brand.id == document.brand_id).first()
    brand_name = brand.name if brand else "Unknown"
    
    # Extract knowledge
    doc_type = document.document_type or "brand_messaging"
    
    nodes = knowledge_extractor.extract_knowledge_from_document_sync(
        document_id=document_id,
        document_text=document_text,
        document_type=doc_type,
        brand_id=document.brand_id,
        brand_name=brand_name,
        db=db
    )
    
    # Infer relationships
    relations = []
    if nodes:
        relations = knowledge_extractor.infer_relationships_sync(
            brand_id=document.brand_id,
            new_nodes=nodes,
            db=db
        )
    
    return {
        "success": True,
        "action": "processed",
        "document_id": document_id,
        "nodes_created": len(nodes),
        "relations_created": len(relations)
    }


async def sync_all_documents(
    brand_id: int,
    db: Session,
    force_reprocess: bool = False
) -> Dict[str, Any]:
    """
    Synchronize all documents for a brand.
    
    Args:
        brand_id: ID of the brand
        db: Database session
        force_reprocess: If True, reprocess all documents
        
    Returns:
        Aggregated sync results
    """
    documents = db.query(models.BrandDocument).filter(
        models.BrandDocument.brand_id == brand_id
    ).all()
    
    if not documents:
        return {
            "success": True,
            "message": "No documents found for this brand",
            "documents_processed": 0
        }
    
    results = []
    total_nodes = 0
    total_relations = 0
    
    for doc in documents:
        result = await sync_document(doc.id, db, force_reprocess)
        results.append({
            "document_id": doc.id,
            "filename": doc.filename,
            **result
        })
        if result.get("success"):
            total_nodes += result.get("nodes_created", 0)
            total_relations += result.get("relations_created", 0)
    
    return {
        "success": True,
        "brand_id": brand_id,
        "documents_processed": len(documents),
        "total_nodes_created": total_nodes,
        "total_relations_created": total_relations,
        "details": results
    }


def validate_brand_coherence(
    brand_id: int,
    db: Session
) -> Dict[str, Any]:
    """
    Validate coherence across all knowledge for a brand.
    
    Checks for contradictions and alignment issues.
    
    Args:
        brand_id: ID of the brand
        db: Database session
        
    Returns:
        Coherence report
    """
    # Get all nodes and relations
    nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id
    ).all()
    
    relations = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id
    ).all()
    
    # Analyze contradictions
    contradictions = [r for r in relations if r.relation_type == "contradicts"]
    
    # Count verified vs unverified
    verified_count = sum(1 for n in nodes if n.verified_by_user)
    
    # Check for orphan nodes (no relations)
    node_ids_in_relations = set()
    for r in relations:
        node_ids_in_relations.add(r.from_node_id)
        node_ids_in_relations.add(r.to_node_id)
    
    orphan_nodes = [n for n in nodes if n.id not in node_ids_in_relations]
    
    # Check node type distribution
    type_distribution = {}
    for n in nodes:
        type_distribution[n.node_type] = type_distribution.get(n.node_type, 0) + 1
    
    # Flag issues
    issues = []
    if contradictions:
        issues.append({
            "type": "contradiction",
            "severity": "high",
            "message": f"{len(contradictions)} contradictions found between insights",
            "details": [
                {
                    "from_node_id": c.from_node_id,
                    "to_node_id": c.to_node_id,
                    "context": c.context
                }
                for c in contradictions
            ]
        })
    
    if len(orphan_nodes) > len(nodes) * 0.3:  # More than 30% orphans
        issues.append({
            "type": "disconnected_nodes",
            "severity": "medium",
            "message": f"{len(orphan_nodes)} nodes have no relationships",
            "suggestion": "Consider running relationship inference again"
        })
    
    if verified_count < len(nodes) * 0.2:  # Less than 20% verified
        issues.append({
            "type": "low_verification",
            "severity": "low",
            "message": f"Only {verified_count}/{len(nodes)} nodes are verified",
            "suggestion": "Review and verify key insights for better quality"
        })
    
    return {
        "brand_id": brand_id,
        "is_coherent": len([i for i in issues if i["severity"] == "high"]) == 0,
        "total_nodes": len(nodes),
        "verified_nodes": verified_count,
        "total_relations": len(relations),
        "contradiction_count": len(contradictions),
        "orphan_node_count": len(orphan_nodes),
        "type_distribution": type_distribution,
        "issues": issues
    }


def get_personas_needing_sync(
    brand_id: int,
    db: Session
) -> List[models.Persona]:
    """
    Find personas that need to be synced with the knowledge graph.
    
    Returns personas that:
    1. Have no knowledge graph enrichment
    2. Have enrichment but graph has been updated since
    
    Args:
        brand_id: ID of the brand
        db: Database session
        
    Returns:
        List of personas needing sync
    """
    personas = db.query(models.Persona).filter(
        models.Persona.brand_id == brand_id
    ).all()
    
    personas_needing_sync = []
    
    for persona in personas:
        try:
            persona_json = json.loads(persona.full_persona_json or "{}")
        except:
            persona_json = {}
        
        enrichment = persona_json.get("knowledge_graph_enrichment", {})
        
        if not enrichment.get("enriched"):
            # Never enriched
            personas_needing_sync.append(persona)
        # Could add more sophisticated checks here for stale enrichment
    
    return personas_needing_sync


async def sync_personas_with_graph(
    brand_id: int,
    db: Session,
    persona_ids: Optional[List[int]] = None
) -> Dict[str, Any]:
    """
    Sync personas with the current knowledge graph.
    
    Args:
        brand_id: ID of the brand
        db: Database session
        persona_ids: Optional list of specific persona IDs to sync
        
    Returns:
        Sync results
    """
    if persona_ids:
        personas = db.query(models.Persona).filter(
            models.Persona.id.in_(persona_ids),
            models.Persona.brand_id == brand_id
        ).all()
    else:
        personas = get_personas_needing_sync(brand_id, db)
    
    results = []
    for persona in personas:
        result = auto_enrichment.enrich_persona_from_knowledge_graph_sync(
            persona_id=persona.id,
            brand_id=brand_id,
            db=db
        )
        results.append({
            "persona_id": persona.id,
            "persona_name": persona.name,
            "enriched": result is not None,
            "nodes_applied": result.get("knowledge_graph_enrichment", {}).get("nodes_applied", 0) if result else 0
        })
    
    return {
        "success": True,
        "brand_id": brand_id,
        "personas_synced": len(results),
        "details": results
    }


# Synchronous wrappers
def sync_document_sync(document_id: int, db: Session, force_reprocess: bool = False) -> Dict[str, Any]:
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(sync_document(document_id, db, force_reprocess))


def sync_all_documents_sync(brand_id: int, db: Session, force_reprocess: bool = False) -> Dict[str, Any]:
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(sync_all_documents(brand_id, db, force_reprocess))


def sync_personas_with_graph_sync(brand_id: int, db: Session, persona_ids: Optional[List[int]] = None) -> Dict[str, Any]:
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(sync_personas_with_graph(brand_id, db, persona_ids))

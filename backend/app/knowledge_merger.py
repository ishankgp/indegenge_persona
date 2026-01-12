"""
Knowledge Merger - Utility for finding and merging duplicate knowledge nodes.

This module provides functions to:
1. Find duplicate/similar nodes within a brand's knowledge graph
2. Merge nodes while preserving relationships
3. Clean up orphaned relationships
"""

import logging
from typing import Dict, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from . import models
from .knowledge_extractor import compute_text_similarity

logger = logging.getLogger(__name__)


def find_duplicate_candidates(
    brand_id: int,
    db: Session,
    threshold: float = 0.60
) -> List[Dict]:
    """
    Find pairs of nodes that may be duplicates based on text similarity.
    
    Args:
        brand_id: Brand ID to search within
        db: Database session
        threshold: Minimum similarity to consider as duplicate candidate (default 60%)
        
    Returns:
        List of duplicate candidate pairs with similarity scores
    """
    nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id
    ).all()
    
    duplicates = []
    seen_pairs = set()
    
    for i, node1 in enumerate(nodes):
        for node2 in nodes[i+1:]:
            # Only compare same node types
            if node1.node_type != node2.node_type:
                continue
                
            # Skip if already seen this pair
            pair_key = tuple(sorted([node1.id, node2.id]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)
            
            similarity = compute_text_similarity(node1.text, node2.text)
            
            if similarity >= threshold:
                duplicates.append({
                    "primary": {
                        "id": node1.id,
                        "text": node1.text,
                        "summary": node1.summary,
                        "node_type": node1.node_type,
                        "confidence": node1.confidence,
                    },
                    "secondary": {
                        "id": node2.id,
                        "text": node2.text,
                        "summary": node2.summary,
                        "node_type": node2.node_type,
                        "confidence": node2.confidence,
                    },
                    "similarity": round(similarity, 3),
                    "recommendation": "auto_merge" if similarity >= 0.85 else "review"
                })
    
    # Sort by similarity descending
    duplicates.sort(key=lambda x: x["similarity"], reverse=True)
    
    logger.info(f"Found {len(duplicates)} duplicate candidates for brand {brand_id}")
    return duplicates


def merge_nodes(
    primary_id: str,
    secondary_ids: List[str],
    db: Session
) -> Dict:
    """
    Merge multiple nodes into a primary node.
    
    - All relationships pointing to secondary nodes are redirected to primary
    - Secondary nodes are deleted
    - Primary node keeps its original content
    
    Args:
        primary_id: ID of the node to keep
        secondary_ids: IDs of nodes to merge into primary
        db: Database session
        
    Returns:
        Summary of the merge operation
    """
    # Get primary node
    primary = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.id == primary_id
    ).first()
    
    if not primary:
        return {"error": f"Primary node {primary_id} not found"}
    
    relationships_updated = 0
    nodes_deleted = 0
    
    for secondary_id in secondary_ids:
        if secondary_id == primary_id:
            continue
            
        secondary = db.query(models.KnowledgeNode).filter(
            models.KnowledgeNode.id == secondary_id
        ).first()
        
        if not secondary:
            continue
        
        # Update relationships pointing FROM secondary
        from_rels = db.query(models.KnowledgeRelation).filter(
            models.KnowledgeRelation.from_node_id == secondary_id
        ).all()
        
        for rel in from_rels:
            # Check if this would create a duplicate
            existing = db.query(models.KnowledgeRelation).filter(
                models.KnowledgeRelation.from_node_id == primary_id,
                models.KnowledgeRelation.to_node_id == rel.to_node_id,
                models.KnowledgeRelation.relation_type == rel.relation_type
            ).first()
            
            if existing:
                db.delete(rel)  # Remove duplicate
            else:
                rel.from_node_id = primary_id
                relationships_updated += 1
        
        # Update relationships pointing TO secondary
        to_rels = db.query(models.KnowledgeRelation).filter(
            models.KnowledgeRelation.to_node_id == secondary_id
        ).all()
        
        for rel in to_rels:
            existing = db.query(models.KnowledgeRelation).filter(
                models.KnowledgeRelation.from_node_id == rel.from_node_id,
                models.KnowledgeRelation.to_node_id == primary_id,
                models.KnowledgeRelation.relation_type == rel.relation_type
            ).first()
            
            if existing:
                db.delete(rel)
            else:
                rel.to_node_id = primary_id
                relationships_updated += 1
        
        # Delete the secondary node
        db.delete(secondary)
        nodes_deleted += 1
    
    db.commit()
    
    result = {
        "success": True,
        "primary_node_id": primary_id,
        "nodes_merged": nodes_deleted,
        "relationships_redirected": relationships_updated
    }
    
    logger.info(f"✅ Merged {nodes_deleted} nodes into {primary_id}, updated {relationships_updated} relationships")
    return result


def delete_node(node_id: str, db: Session) -> Dict:
    """
    Delete a single node and its associated relationships.
    
    Args:
        node_id: ID of node to delete
        db: Database session
        
    Returns:
        Summary of deletion
    """
    node = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.id == node_id
    ).first()
    
    if not node:
        return {"error": f"Node {node_id} not found"}
    
    # Delete relationships
    from_rels = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.from_node_id == node_id
    ).delete()
    
    to_rels = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.to_node_id == node_id
    ).delete()
    
    db.delete(node)
    db.commit()
    
    return {
        "success": True,
        "node_id": node_id,
        "relationships_deleted": from_rels + to_rels
    }


def auto_merge_duplicates(
    brand_id: int,
    db: Session,
    threshold: float = 0.85
) -> Dict:
    """
    Automatically merge nodes with very high similarity.
    
    Args:
        brand_id: Brand to clean up
        db: Database session
        threshold: Minimum similarity for auto-merge (default 85%)
        
    Returns:
        Summary of auto-merge operation
    """
    candidates = find_duplicate_candidates(brand_id, db, threshold)
    
    total_merged = 0
    total_relationships = 0
    
    merged_ids = set()  # Track already merged nodes
    
    for candidate in candidates:
        primary_id = candidate["primary"]["id"]
        secondary_id = candidate["secondary"]["id"]
        
        # Skip if either node was already merged
        if primary_id in merged_ids or secondary_id in merged_ids:
            continue
        
        result = merge_nodes(primary_id, [secondary_id], db)
        
        if result.get("success"):
            total_merged += result["nodes_merged"]
            total_relationships += result["relationships_redirected"]
            merged_ids.add(secondary_id)
    
    return {
        "success": True,
        "brand_id": brand_id,
        "threshold": threshold,
        "nodes_merged": total_merged,
        "relationships_updated": total_relationships
    }

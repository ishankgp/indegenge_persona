"""
Rebuild Knowledge Graph Relationships for Mounjaro Brand

This script:
1. Loads the Mounjaro patient behavior markdown file
2. Re-extracts nodes and relationships using enhanced logic
3. Applies comprehensive batch relationship inference
4. Reports statistics

Usage:
    cd backend
    python rebuild_mounjaro_kg.py
"""

import asyncio
from app.database import get_db, engine
from app import models, knowledge_extractor
from sqlalchemy import text

MOUNJARO_BRAND_ID = 3  # Mounjaro brand


async def rebuild_mounjaro_relationships():
    """Rebuild all relationships for Mounjaro brand."""
    
    # Get database session
    db = next(get_db())
    
    print("=" * 70)
    print("🔧 Mounjaro Knowledge Graph Relationship Rebuild")
    print("=" * 70)
    
    # Step 1: Check current state
    print("\n📊 Current State:")
    with engine.connect() as conn:
        node_count = conn.execute(text(
            f"SELECT COUNT(*) FROM knowledge_nodes WHERE brand_id = {MOUNJARO_BRAND_ID}"
        )).scalar()
        rel_count = conn.execute(text(
            f"SELECT COUNT(*) FROM knowledge_relations WHERE brand_id = {MOUNJARO_BRAND_ID}"
        )).scalar()
        
    print(f"   Nodes: {node_count}")
    print(f"   Relationships: {rel_count}")
    print(f"   Avg connections per node: {rel_count / node_count if node_count > 0 else 0:.2f}")
    
    # Step 2: Load all nodes for this brand
    print("\\n🔄 Loading existing nodes...")
    all_nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == MOUNJARO_BRAND_ID
    ).all()
    print(f"   Found {len(all_nodes)} nodes")
    
    # Step 3: Delete existing auto-generated relationships
    print("\\n🗑️  Deleting existing auto-generated relationships...")
    deleted = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == MOUNJARO_BRAND_ID,
        models.KnowledgeRelation.inferred_by == "llm"
    ).delete()
    db.commit()
    print(f"   Deleted {deleted} LLM-generated relationships")
    
    # Step 4: Parse structured relationships from markdown (if available)
    print("\\n📝 Parsing structured relationships from markdown...")
    
    # Try to load the markdown file
    import os
    markdown_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        "data", "mounjaro_resources", "patient_research",
        "patient_behavior_knowledge_graph.md"
    )
    
    structured_rels = []
    if os.path.exists(markdown_path):
        with open(markdown_path, 'r', encoding='utf-8') as f:
            markdown_text = f.read()
        
        structured_rels = knowledge_extractor.parse_structured_relationships(
            document_text=markdown_text,
            nodes=all_nodes,
            brand_id=MOUNJARO_BRAND_ID,
            db=db
        )
        print(f"   ✅ Created {len(structured_rels)} structured relationships from markdown")
    else:
        print(f"   ⚠️  Markdown file not found at {markdown_path}")
    
    # Step 5: Run comprehensive batch inference
    print("\\n🤖 Running comprehensive LLM relationship inference...")
    print("   (This will take several minutes...)")
    
    inferred_rels = await knowledge_extractor.create_comprehensive_relationships(
        brand_id=MOUNJARO_BRAND_ID,
        db=db,
        batch_size=20  # Process 20 nodes at a time
    )
    print(f"   ✅ Created {len(inferred_rels)} inferred relationships")
    
    # Step 6: Final statistics
    print("\\n📊 Final State:")
    with engine.connect() as conn:
        new_rel_count = conn.execute(text(
            f"SELECT COUNT(*) FROM knowledge_relations WHERE brand_id = {MOUNJARO_BRAND_ID}"
        )).scalar()
        
        rel_types = conn.execute(text(
            f"SELECT relation_type, COUNT(*) as cnt FROM knowledge_relations "
            f"WHERE brand_id = {MOUNJARO_BRAND_ID} GROUP BY relation_type"
        )).fetchall()
        
    print(f"   Nodes: {node_count}")
    print(f"   Relationships: {new_rel_count} (was {rel_count})")
    print(f"   Increase: +{new_rel_count - rel_count} ({((new_rel_count - rel_count) / rel_count * 100) if rel_count > 0 else 0:.0f}%)")
    print(f"   Avg connections per node: {new_rel_count / node_count if node_count > 0 else 0:.2f}")
    
    print("\\n   Relationship Types:")
    for rel_type, count in rel_types:
        print(f"      - {rel_type}: {count}")
    
    print("\\n" + "=" * 70)
    print("✅ Rebuild Complete!")
    print("=" * 70)
    print("\\n💡 Next: View the knowledge graph in the UI to see the connections!")


if __name__ == "__main__":
    asyncio.run(rebuild_mounjaro_relationships())

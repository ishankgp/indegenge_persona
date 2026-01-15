"""
Knowledge Graph Relationship Explorer

This script helps you understand the relationships in your knowledge graph
by printing them in human-readable format with context and examples.

Usage:
    cd backend
    python explore_kg_relationships.py
"""

from app.database import get_db, engine
from app import models
from sqlalchemy import text
from collections import defaultdict

MOUNJARO_BRAND_ID = 3


def explore_relationships():
    """Explore and explain knowledge graph relationships."""
    db = next(get_db())
    
    print("=" * 80)
    print("🧠 KNOWLEDGE GRAPH RELATIONSHIP EXPLORER - Mounjaro")
    print("=" * 80)
    
    # Get all nodes
    nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == MOUNJARO_BRAND_ID
    ).all()
    
    # Get all relationships
    relations = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == MOUNJARO_BRAND_ID
    ).all()
    
    # Create node lookup
    node_dict = {node.id: node for node in nodes}
    
    print(f"\n📊 Overview:")
    print(f"   Total Nodes: {len(nodes)}")
    print(f"   Total Relationships: {len(relations)}")
    print(f"   Avg connections per node: {len(relations)/len(nodes) if nodes else 0:.2f}")
    
    # Group relationships by type
    rel_by_type = defaultdict(list)
    for rel in relations:
        rel_by_type[rel.relation_type].append(rel)
    
    print(f"\n📈 Relationship Types:")
    for rel_type, rels in sorted(rel_by_type.items(), key=lambda x: len(x[1]), reverse=True):
        print(f"   {rel_type:20s}: {len(rels):3d} relationships")
    
    # Show detailed examples for each type
    print("\n" + "=" * 80)
    print("📖 DETAILED RELATIONSHIP EXAMPLES")
    print("=" * 80)
    
    for rel_type, rels in sorted(rel_by_type.items()):
        print(f"\n{'─' * 80}")
        print(f"🔗 Relationship Type: {rel_type.upper()}")
        print(f"{'─' * 80}")
        print(f"What this means: {get_relationship_explanation(rel_type)}")
        print(f"\nExamples ({min(3, len(rels))} of {len(rels)}):")
        
        for i, rel in enumerate(rels[:3]):  # Show first 3 examples
            from_node = node_dict.get(rel.from_node_id)
            to_node = node_dict.get(rel.to_node_id)
            
            if not from_node or not to_node:
                continue
            
            print(f"\n  Example {i+1}:")
            print(f"  ┌─ FROM: [{from_node.node_type}]")
            print(f"  │  \"{from_node.text[:80]}...\"" if len(from_node.text) > 80 else f"  │  \"{from_node.text}\"")
            print(f"  │")
            print(f"  ├─ {rel_type.upper()} → (strength: {rel.strength:.0%})")
            if rel.context:
                print(f"  │  Context: {rel.context[:100]}..." if len(rel.context) > 100 else f"  │  Context: {rel.context}")
            print(f"  │")
            print(f"  └─ TO: [{to_node.node_type}]")
            print(f"     \"{to_node.text[:80]}...\"" if len(to_node.text) > 80 else f"     \"{to_node.text}\"")
    
    # Show example "stories" - paths through the graph
    print("\n" + "=" * 80)
    print("📚 EXAMPLE STORIES - Connected Paths Through the Graph")
    print("=" * 80)
    
    # Find nodes with multiple connections
    node_connections = defaultdict(list)
    for rel in relations:
        node_connections[rel.from_node_id].append(('out', rel))
        node_connections[rel.to_node_id].append(('in', rel))
    
    # Find interesting paths
    nodes_with_most_connections = sorted(
        node_connections.items(), 
        key=lambda x: len(x[1]), 
        reverse=True
    )[:5]
    
    print("\n🌟 Top 5 Most Connected Nodes:")
    for node_id, connections in nodes_with_most_connections:
        node = node_dict.get(node_id)
        if not node:
            continue
        
        incoming = len([c for c in connections if c[0] == 'in'])
        outgoing = len([c for c in connections if c[0] == 'out'])
        
        print(f"\n  📍 [{node.node_type}] {node.text[:60]}...")
        print(f"     Connections: {incoming} incoming, {outgoing} outgoing")
        
        # Show what connects TO this node
        if incoming > 0:
            print(f"     ← What ADDRESSES/SUPPORTS this:")
            for direction, rel in connections[:3]:
                if direction == 'in':
                    from_node = node_dict.get(rel.from_node_id)
                    if from_node:
                        print(f"        • [{from_node.node_type}] via {rel.relation_type}")
        
        # Show what this node connects TO
        if outgoing > 0:
            print(f"     → What this ADDRESSES/SUPPORTS:")
            for direction, rel in connections[:3]:
                if direction == 'out':
                    to_node = node_dict.get(rel.to_node_id)
                    if to_node:
                        print(f"        • [{to_node.node_type}] via {rel.relation_type}")
    
    # Visual guide
    print("\n" + "=" * 80)
    print("💡 HOW TO READ THE GRAPH IN THE UI")
    print("=" * 80)
    print("""
    1. NODES (Boxes):
       - Each box is a piece of knowledge (message, tension, need, etc.)
       - Color indicates the node type
       - Text inside is the insight or knowledge

    2. EDGES (Arrows):
       - Colored lines connecting nodes
       - Green (ADDRESSES): A message addresses a patient tension/need
       - Blue (SUPPORTS): Evidence supports a claim
       - Cyan (RESONATES_WITH): Message resonates with motivation
       - Red (CONTRADICTS): Patient belief contradicts our message

    3. READING A PATH:
       Start at any node → Follow the arrows → See the story unfold
       
       Example story:
       "Education drives adherence" (KEY MESSAGE)
          ↓ ADDRESSES
       "Low literacy leads to misuse" (UNMET NEED)
          ↓ SUPPORTS
       "Simplified education needed" (MARKET BARRIER)
       
       Translation: Our education message addresses the low literacy problem,
       which is supported by the fact that the market has a barrier around
       needing simplified education.

    4. WHAT TO LOOK FOR:
       ✓ Are messages addressing patient tensions?
       ✓ Do we have proof points supporting our claims?
       ✓ Are there contradicting beliefs we need to overcome?
       ✓ Which patient motivations are we resonating with?
    """)
    
    print("=" * 80)
    print("✅ Exploration Complete!")
    print("=" * 80)


def get_relationship_explanation(rel_type):
    """Get human-friendly explanation of relationship type."""
    explanations = {
        'addresses': 'Node A directly addresses or solves the problem/tension described in Node B',
        'supports': 'Node A provides evidence, proof, or reasoning that supports Node B',
        'resonates_with': 'Node A (usually a message) connects emotionally with Node B (usually a motivation)',
        'triggers': 'Node A causes or triggers the emotional/behavioral response in Node B',
        'contradicts': 'Node A conflicts with or contradicts Node B (IMPORTANT - shows belief gaps)',
        'influences': 'Node A has an impact on or influences Node B'
    }
    return explanations.get(rel_type, 'Nodes are related to each other')


if __name__ == "__main__":
    explore_relationships()

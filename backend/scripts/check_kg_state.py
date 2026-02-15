import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../")

from app import database, models
from sqlalchemy import func

def check_kg_state():
    db = database.SessionLocal()
    try:
        print("\n=== Knowledge Graph State Verification ===")
        
        # 1. Count Brands
        brands = db.query(models.Brand).all()
        print(f"\nBrands found: {len(brands)}")
        for b in brands:
            print(f"- {b.name} (ID: {b.id})")
            
            # 2. Count Nodes per Brand
            node_count = db.query(models.KnowledgeNode).filter(models.KnowledgeNode.brand_id == b.id).count()
            
            # 3. Count Relations per Brand
            rel_count = db.query(models.KnowledgeRelation).filter(models.KnowledgeRelation.brand_id == b.id).count()
            
            print(f"  > Nodes: {node_count}")
            print(f"  > Relations: {rel_count}")
            
            if node_count > 0:
                # 4. Check Node Types
                types = db.query(models.KnowledgeNode.node_type, func.count(models.KnowledgeNode.id)).filter(models.KnowledgeNode.brand_id == b.id).group_by(models.KnowledgeNode.node_type).all()
                print("  > Node Types:")
                for t, c in types:
                    print(f"    - {t}: {c}")

            if rel_count > 0:
                 # 5. Check Relation Types
                r_types = db.query(models.KnowledgeRelation.relation_type, func.count(models.KnowledgeRelation.id)).filter(models.KnowledgeRelation.brand_id == b.id).group_by(models.KnowledgeRelation.relation_type).all()
                print("  > Relation Types:")
                for t, c in r_types:
                    print(f"    - {t}: {c}")
                    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_kg_state()

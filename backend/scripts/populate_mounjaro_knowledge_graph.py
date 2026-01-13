
import sys
import os
import time

# Add backend directory to path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../")

# Force correct DB path
db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pharma_personas.db"))
if os.path.exists(db_path):
    # Windows sqlite URL needs 3 or 4 slashes. 
    # SQLAlchemy on Windows handles "sqlite:///C:\\path\\to\\db" correctly usually.
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    print(f"🔧 Forced DATABASE_URL: {os.environ['DATABASE_URL']}")
else:
    print(f"⚠️ Warning: DB file not found at {db_path}")

from app import database, models, knowledge_extractor

def populate_graph():
    print("🚀 Mounjaro Knowledge Graph Populator")
    print("=" * 50)

    db = database.SessionLocal()
    try:
        # 1. Get Mounjaro Brand
        brand = db.query(models.Brand).filter(models.Brand.name == "Mounjaro").first()
        if not brand:
            print("❌ 'Mounjaro' brand not found. Please run setup_mounjaro.py first.")
            return

        print(f"✅ Found Brand: {brand.name} (ID: {brand.id})")

        # 2. Get All Documents
        documents = db.query(models.BrandDocument).filter(models.BrandDocument.brand_id == brand.id).all()
        print(f"📄 Found {len(documents)} documents.")
        
        all_new_nodes = []

        # 3. Process Each Document
        for doc in documents:
            print(f"\nProcessing: {doc.filename}...")
            
            # Check if execution already happened (simple heuristic: are there nodes from this doc?)
            existing_nodes = db.query(models.KnowledgeNode).filter(models.KnowledgeNode.source_document_id == doc.id).count()
            if existing_nodes > 0:
                print(f"  ⏭️  Skipping extraction: Found {existing_nodes} existing nodes for this document.")
                # We still fetch them to help with relation inference later if needed, 
                # but to save time/cost we might skip re-extraction unless forced.
                # For this script, let's just proceed to the next doc to avoid duplicates/costs.
                continue

            # Need the text content. 
            # In setup_mounjaro.py, it was written to disk. We can read it back.
            # Or try to reconstruct from insights if filepath invalid.
            # doc.filepath does not exist on the model (it was removed in previous steps).
            # We must construct the path from doc.filename.
            # setup_mounjaro.py writes to "backend/uploads/{filename}" or just "uploads/{filename}"
            # Let's search for it.
            
            file_to_read = None
            possible_paths = [
                os.path.join("uploads", doc.filename),
                os.path.join("backend", "uploads", doc.filename),
                os.path.join("..", "uploads", doc.filename)
            ]
            
            for p in possible_paths:
                if os.path.exists(p):
                    file_to_read = p
                    break
            
            if not file_to_read:
                 # Try finding any file ending with this filename in uploads
                 import glob
                 search_pattern = f"**/{doc.filename}"
                 found = glob.glob(search_pattern, recursive=True)
                 if found:
                     file_to_read = found[0]

            document_text = ""
            if file_to_read and os.path.exists(file_to_read):
                try:
                    with open(file_to_read, "r", encoding="utf-8") as f:
                        document_text = f.read()
                except Exception as e:
                    print(f"  ⚠️  Could not read file {file_to_read}: {e}")
            
            if not document_text:
                print("  ❌ No text content available. Skipping.")
                continue

            # Determine type
            doc_type = "brand_messaging" # default
            fname = doc.filename.lower()
            if "patient" in fname or "journey" in fname:
                doc_type = "interview_transcript" # loose mapping for "Patient Journey" doc
                if "journey" in fname:
                    doc_type = "disease_literature" # "Disease & Patient Journey" fits here too
            elif "compet" in fname or "standard" in fname:
                doc_type = "competitive_intel"
            
            print(f"  🔍 Extracting inputs (Type: {doc_type})...")
            
            try:
                # Call extraction sync
                nodes = knowledge_extractor.extract_knowledge_from_document_sync(
                    document_id=doc.id,
                    document_text=document_text,
                    document_type=doc_type,
                    brand_id=brand.id,
                    brand_name=brand.name,
                    db=db
                )
                print(f"  ✅ Extracted {len(nodes)} nodes.")
                all_new_nodes.extend(nodes)
                
            except Exception as e:
                print(f"  ❌ Extraction failed: {e}")

        # 4. Infer Relationships
        # We want to infer relations between ALL nodes (old and new) to find those "Gaps" and "Connections"
        # The infer_relationships function typically takes "new_nodes" and compares to "existing".
        # If we didn't add any new nodes (because they all existed), we might still want to run 
        # relation inference if the relation count is low.
        
        relation_count = db.query(models.KnowledgeRelation).filter(models.KnowledgeRelation.brand_id == brand.id).count()
        print(f"\n🔗 Current Relation Count: {relation_count}")
        
        nodes_to_process = all_new_nodes
        
        if not nodes_to_process and relation_count < 20: 
            # If we didn't add new nodes, but relation count is low, force a check on existing nodes
            print("  ⚠️  Few relations found. Forcing relationship inference on existing nodes...")
            nodes_to_process = db.query(models.KnowledgeNode).filter(models.KnowledgeNode.brand_id == brand.id).limit(15).all()

        if nodes_to_process:
            print(f"  🧠 Inferring relationships for {len(nodes_to_process)} nodes...")
            relations = knowledge_extractor.infer_relationships_sync(
                brand_id=brand.id,
                new_nodes=nodes_to_process,
                db=db
            )
            print(f"  ✅ Inferred {len(relations)} new relationships.")
        else:
            print("  ⏭️  Skipping relationship inference (no new nodes and graph seems populated).")

        print("\n" + "=" * 50)
        print("Done.")

    except Exception as e:
        print(f"Global Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    populate_graph()

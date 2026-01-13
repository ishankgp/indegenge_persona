
import sys
import os

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/../")

def run_diagnostics():
    print("running diagnostics...")
    
    # 1. Test Import (Verify Schema Fix)
    try:
        from app import schemas
        print("✅ app.schemas imported successfully.")
    except Exception as e:
        print(f"❌ Failed to import schemas: {e}")
        return

    # 2. Check Database Content
    from app import database, models
    db = database.SessionLocal()
    try:
        brand = db.query(models.Brand).filter(models.Brand.name == "Mounjaro").first()
        if not brand:
            print("⚠️ Mounjaro brand not found.")
        else:
            doc_count = db.query(models.BrandDocument).filter(models.BrandDocument.brand_id == brand.id).count()
            print(f"📄 BrandDocuments in DB: {doc_count}")
            
            # Check if files exist on disk if docs exist
            if doc_count > 0:
                doc = db.query(models.BrandDocument).filter(models.BrandDocument.brand_id == brand.id).first()
                if doc.filepath and os.path.exists(doc.filepath):
                    print(f"   Sample file exists: {doc.filepath}")
                    parsed_size = os.path.getsize(doc.filepath)
                    print(f"   Size: {parsed_size} bytes")
                else:
                    print(f"   ⚠️ Sample file missing: {doc.filepath}")

    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_diagnostics()

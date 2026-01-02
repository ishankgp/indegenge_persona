
import os
import sys

# Add current dir to path
sys.path.append(os.getcwd())

def get_env_vars():
    db_url = None
    try:
        with open('railway_vars.txt', 'rb') as f:
            try:
                content = f.read().decode('utf-16')
            except:
                content = f.read().decode('utf-8', errors='ignore')
                
        for line in content.splitlines():
            if 'DATABASE_URL=' in line:
                db_url = line.strip().replace('DATABASE_URL=', '')
                break
    except Exception as e:
        print(f"Error reading vars: {e}")
    return db_url

def check_status():
    print("🚀 Checking Seeding Status...")
    db_url = get_env_vars()
    if not db_url:
        print("❌ Could not find DATABASE_URL in railway_vars.txt")
        return
    
    os.environ['DATABASE_URL'] = db_url.strip()
    
    # Import AFTER setting env var
    from app import database, models
    
    try:
        db = database.SessionLocal()
        print("✅ Connected to Database")
        
        # Check Brands
        brands = db.query(models.Brand).all()
        print(f"\n🏷️  Brands Found: {len(brands)}")
        for b in brands:
            doc_count = db.query(models.BrandDocument).filter(models.BrandDocument.brand_id == b.id).count()
            print(f"   - {b.name} (ID: {b.id}): {doc_count} documents")
            
        # Check Personas
        persona_count = db.query(models.Persona).count()
        print(f"\n👥 Personas Found: {persona_count}")
        
        personas = db.query(models.Persona).all()
        for p in personas:
            print(f"   - {p.name} ({p.persona_type}) - {p.condition}")
            
    except Exception as e:
        print(f"❌ Error querying database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_status()

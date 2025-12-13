"""Check personas in database."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def check():
    db = SessionLocal()
    results = []
    
    try:
        # Get all personas
        personas = db.query(models.Persona).all()
        results.append(f"Total personas: {len(personas)}")
        
        # Get brands
        brands = db.query(models.Brand).all()
        results.append(f"Total brands: {len(brands)}")
        for brand in brands:
            results.append(f"  - {brand.name} (id: {brand.id})")
        
        # Group by brand
        global_personas = [p for p in personas if p.brand_id is None]
        results.append(f"\nGlobal personas: {len(global_personas)}")
        for p in global_personas:
            results.append(f"  - {p.name} ({p.condition})")
        
        for brand in brands:
            brand_personas = [p for p in personas if p.brand_id == brand.id]
            results.append(f"\n{brand.name} personas: {len(brand_personas)}")
            for p in brand_personas:
                results.append(f"  - {p.name} ({p.condition})")
                
    except Exception as e:
        results.append(f"Error: {e}")
    finally:
        db.close()
    
    # Write to file
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "persona_check.txt")
    with open(output_path, "w") as f:
        f.write("\n".join(results))
    
    return results

if __name__ == "__main__":
    results = check()
    for line in results:
        print(line)


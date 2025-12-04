import sys
import os
import json
import time
from typing import List, Dict

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import crud, models, schemas, database, persona_engine

def verify_brand_flow():
    # Use a test database to avoid schema conflicts
    test_db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_verification.db")
    if os.path.exists(test_db_path):
        os.remove(test_db_path)
        
    os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"
    
    # Re-initialize engine with new URL
    database.engine = database.create_engine(
        os.environ["DATABASE_URL"], 
        connect_args={"check_same_thread": False}
    )
    database.SessionLocal = database.sessionmaker(autocommit=False, autoflush=False, bind=database.engine)
    
    # Ensure tables exist
    models.Base.metadata.create_all(bind=database.engine)
    
    db = database.SessionLocal()
    try:
        print("🚀 Starting Brand Library Verification...")

        # 1. Create a Test Brand
        brand_name = f"Test Brand {int(time.time())}"
        print(f"Creating brand: {brand_name}")
        brand_in = schemas.BrandCreate(name=brand_name)
        brand = crud.create_brand(db, brand_in)
        print(f"✅ Brand created: ID={brand.id}")

        # 2. Seed Documents (Simulate what the API does)
        print("Seeding documents...")
        mock_text = "Patients with Type 2 Diabetes often struggle with adherence due to side effects like nausea. They value convenient once-weekly dosing. They believe that diet is the most important factor."
        
        # Extract insights using the actual engine
        print("Extracting insights from mock text...")
        insights = persona_engine.extract_mbt_from_text(mock_text)
        print(f"✅ Extracted {len(insights)} insights")
        
        # Add source_document to insights
        enriched_insights_data = []
        for insight in insights:
            insight_data = insight.copy()
            insight_data["source_document"] = "mock_doc.txt"
            enriched_insights_data.append(insight_data)
            
        doc_in = schemas.BrandDocumentCreate(
            brand_id=brand.id,
            filename="mock_doc.txt",
            filepath="/tmp/mock_doc.txt",
            category="Treatment Landscape",
            summary="Mock summary",
            extracted_insights=enriched_insights_data
        )
        doc = crud.create_brand_document(db, doc_in)
        print(f"✅ Document created: ID={doc.id}")

        # 3. Create a Test Persona
        print("Creating test persona...")
        persona_json = json.dumps({
            "name": "Test Persona",
            "demographics": {"age": 50, "gender": "Male"},
            "motivations": [],
            "beliefs": [],
            "pain_points": []
        })
        persona_in = schemas.PersonaCreate(
            age=50, gender="Male", condition="Diabetes", location="NY", 
            concerns="None"
        )
        persona = crud.create_persona(db, persona_in, persona_json)
        print(f"✅ Persona created: ID={persona.id}")

        # 4. Enrich Persona
        print("Enriching persona from brand context...")
        
        # Get aggregated insights (simulate _aggregate_brand_insights logic)
        # For this test, we just use the insights we extracted
        flattened_insights = insights 
        
        enriched_json = persona_engine.enrich_persona_from_brand_context(
            json.loads(persona.full_persona_json),
            flattened_insights,
            target_fields=["motivations", "beliefs", "pain_points"]
        )
        
        # Update persona
        update_in = schemas.PersonaUpdate(full_persona_json=enriched_json)
        updated_persona = crud.update_persona(db, persona.id, update_in)
        
        print("✅ Persona enriched!")
        print("Enriched Data:")
        print(json.dumps(enriched_json, indent=2))
        
        # Verification
        has_motivations = bool(enriched_json.get("motivations"))
        has_beliefs = bool(enriched_json.get("beliefs"))
        
        if has_motivations or has_beliefs:
            print("🎉 SUCCESS: Persona attributes were populated!")
        else:
            print("⚠️ WARNING: No attributes were added. Check LLM response.")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_brand_flow()

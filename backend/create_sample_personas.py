#!/usr/bin/env python3
"""
Generate sample personas for demonstration purposes.
Creates 12 personas: 4 HCPs, 4 general patients, 4 diabetes patients
All following MBT framework (Motivations, Beliefs, Tensions/Pain Points)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import crud, schemas, database, persona_engine, models
import json

# Define persona templates
PERSONAS_TO_CREATE = [
    # === HCP PERSONAS (4) ===
    {
        "type": "HCP",
        "age": 52,
        "gender": "Female",
        "condition": "Endocrinology Specialist",
        "location": "Boston, MA",
        "concerns": "Managing Type 2 Diabetes patients with complex comorbidities"
    },
    {
        "type": "HCP",
        "age": 45,
        "gender": "Male",
        "condition": "Primary Care Physician",
        "location": "Austin, TX",
        "concerns": "Early diabetes intervention and patient education"
    },
    {
        "type": "HCP",
        "age": 38,
        "gender": "Female",
        "condition": "Diabetic Nurse Educator",
        "location": "Chicago, IL",
        "concerns": "Improving patient adherence and self-management skills"
    },
    {
        "type": "HCP",
        "age": 55,
        "gender": "Male",
        "condition": "Cardiologist",
        "location": "New York, NY",
        "concerns": "Cardiovascular risk reduction in diabetic patients"
    },
    
    # === GENERAL PATIENT PERSONAS (4) ===
    {
        "type": "Patient",
        "age": 62,
        "gender": "Male",
        "condition": "Hypertension",
        "location": "Phoenix, AZ",
        "concerns": "Managing blood pressure and reducing medication side effects"
    },
    {
        "type": "Patient",
        "age": 48,
        "gender": "Female",
        "condition": "Obesity",
        "location": "Miami, FL",
        "concerns": "Weight management and lifestyle modification"
    },
    {
        "type": "Patient",
        "age": 71,
        "gender": "Male",
        "condition": "Chronic Kidney Disease",
        "location": "Seattle, WA",
        "concerns": "Slowing disease progression and managing fatigue"
    },
    {
        "type": "Patient",
        "age": 55,
        "gender": "Female",
        "condition": "Osteoarthritis",
        "location": "Denver, CO",
        "concerns": "Pain management and maintaining mobility"
    },
    
    # === DIABETES PATIENT PERSONAS (4) ===
    {
        "type": "Patient",
        "age": 58,
        "gender": "Male",
        "condition": "Type 2 Diabetes",
        "location": "Los Angeles, CA",
        "concerns": "Managing blood sugar levels and preventing complications"
    },
    {
        "type": "Patient",
        "age": 43,
        "gender": "Female",
        "condition": "Type 2 Diabetes",
        "location": "Atlanta, GA",
        "concerns": "Balancing diabetes management with busy work schedule"
    },
    {
        "type": "Patient",
        "age": 65,
        "gender": "Male",
        "condition": "Type 2 Diabetes with Neuropathy",
        "location": "Dallas, TX",
        "concerns": "Managing nerve pain and preventing further complications"
    },
    {
        "type": "Patient",
        "age": 51,
        "gender": "Female",
        "condition": "Prediabetes",
        "location": "Portland, OR",
        "concerns": "Preventing progression to full diabetes through lifestyle changes"
    }
]

def create_personas():
    """Generate all sample personas."""
    db = database.SessionLocal()
    
    try:
        print("🚀 Creating 12 sample personas...")
        print("=" * 60)
        
        created_count = 0
        failed_count = 0
        
        for i, persona_spec in enumerate(PERSONAS_TO_CREATE, 1):
            try:
                print(f"\n[{i}/12] Creating {persona_spec['type']}: {persona_spec['condition']}")
                
                # Generate persona using AI
                persona_data = schemas.PersonaCreate(
                    age=persona_spec['age'],
                    gender=persona_spec['gender'],
                    condition=persona_spec['condition'],
                    location=persona_spec['location'],
                    concerns=persona_spec['concerns']
                )
                
                # Call persona engine
                full_persona_json = persona_engine.generate_persona_from_attributes(
                    age=persona_data.age,
                    gender=persona_data.gender,
                    condition=persona_data.condition,
                    location=persona_data.location,
                    concerns=persona_data.concerns
                )
                
                # Verify MBT structure
                persona_dict = json.loads(full_persona_json)
                has_motivations = bool(persona_dict.get("motivations"))
                has_beliefs = bool(persona_dict.get("beliefs"))
                has_pain_points = bool(persona_dict.get("pain_points"))
                
                if not (has_motivations and has_beliefs and has_pain_points):
                    print(f"  ⚠️  Warning: Missing MBT fields")
                    print(f"     Motivations: {has_motivations}")
                    print(f"     Beliefs: {has_beliefs}")
                    print(f"     Pain Points: {has_pain_points}")
                
                # Save to database
                new_persona = crud.create_persona(
                    db=db,
                    persona_data=persona_data,
                    persona_json=full_persona_json
                )
                
                # Update persona_type
                db.query(models.Persona).filter(
                    models.Persona.id == new_persona.id
                ).update({"persona_type": persona_spec['type']})
                db.commit()
                
                print(f"  ✅ Created: {persona_dict.get('name', 'Unknown')} (ID: {new_persona.id})")
                created_count += 1
                
            except Exception as e:
                print(f"  ❌ Failed: {e}")
                failed_count += 1
                continue
        
        print("\n" + "=" * 60)
        print(f"✅ Successfully created {created_count} personas")
        if failed_count > 0:
            print(f"❌ Failed to create {failed_count} personas")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_personas()

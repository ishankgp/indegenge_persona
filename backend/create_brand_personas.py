"""
Script to create sample personas - both global and brand-specific (Mounjaro).
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models, crud, schemas
import json

def get_or_create_mounjaro_brand(db):
    """Get or create the Mounjaro brand."""
    brand = db.query(models.Brand).filter(models.Brand.name == "Mounjaro").first()
    if not brand:
        brand = models.Brand(name="Mounjaro")
        db.add(brand)
        db.commit()
        db.refresh(brand)
        print(f"✅ Created Mounjaro brand (id: {brand.id})")
    else:
        print(f"📦 Found existing Mounjaro brand (id: {brand.id})")
    return brand

def create_personas():
    db = SessionLocal()
    
    try:
        # Ensure tables exist
        models.Base.metadata.create_all(bind=engine)
        
        # Get or create Mounjaro brand
        mounjaro = get_or_create_mounjaro_brand(db)
        
        # Define global personas (no brand)
        global_personas = [
            {
                "name": "Maria Santos",
                "age": 52,
                "gender": "Female",
                "condition": "Type 2 Diabetes",
                "location": "Miami, Florida",
                "persona_json": {
                    "name": "Maria Santos",
                    "demographics": {
                        "age": 52,
                        "gender": "Female",
                        "location": "Miami, Florida",
                        "occupation": "Restaurant Owner"
                    },
                    "medical_background": "Diagnosed with Type 2 Diabetes 5 years ago. Currently on metformin. A1C hovering around 7.5%. Family history of diabetes on both sides.",
                    "lifestyle_and_values": "Owns a Cuban restaurant, works long hours. Values family gatherings centered around food. Struggles to balance traditional cooking with dietary restrictions.",
                    "motivations": [
                        "Stay healthy to see grandchildren grow up",
                        "Maintain energy for running the restaurant",
                        "Find treatments that fit her busy lifestyle"
                    ],
                    "beliefs": [
                        "Natural remedies can complement medicine",
                        "Diet is the foundation of health management",
                        "Family support is essential for treatment success"
                    ],
                    "pain_points": [
                        "Difficulty managing diet around food-centric lifestyle",
                        "Cost of medications and supplies",
                        "Finding time for doctor appointments"
                    ],
                    "communication_preferences": {
                        "preferred_channels": "Phone calls, in-person visits",
                        "information_style": "Practical, step-by-step guidance",
                        "frequency": "Monthly check-ins"
                    }
                }
            },
            {
                "name": "Robert Chen",
                "age": 45,
                "gender": "Male",
                "condition": "Hypertension",
                "location": "Seattle, Washington",
                "persona_json": {
                    "name": "Robert Chen",
                    "demographics": {
                        "age": 45,
                        "gender": "Male",
                        "location": "Seattle, Washington",
                        "occupation": "Software Engineer"
                    },
                    "medical_background": "Diagnosed with hypertension 2 years ago. Currently on ACE inhibitor. BP well controlled at 130/85. Also has mild anxiety.",
                    "lifestyle_and_values": "Works remotely, sedentary lifestyle. Enjoys gaming and cooking. Recently started tracking health metrics with smartwatch.",
                    "motivations": [
                        "Prevent cardiovascular events",
                        "Reduce medication dependency through lifestyle",
                        "Use technology to optimize health"
                    ],
                    "beliefs": [
                        "Data-driven decisions lead to better outcomes",
                        "Stress management is key to blood pressure control",
                        "Modern medicine should integrate with wearable tech"
                    ],
                    "pain_points": [
                        "Remembering to take medication consistently",
                        "Managing work stress",
                        "Finding time for exercise"
                    ],
                    "communication_preferences": {
                        "preferred_channels": "Patient portal, email",
                        "information_style": "Data-rich, visual reports",
                        "frequency": "Quarterly with async updates"
                    }
                }
            },
            {
                "name": "Dr. Angela Morrison",
                "age": 58,
                "gender": "Female",
                "condition": "Type 2 Diabetes",
                "location": "Chicago, Illinois",
                "persona_type": "HCP",
                "persona_json": {
                    "name": "Dr. Angela Morrison",
                    "demographics": {
                        "age": 58,
                        "gender": "Female",
                        "location": "Chicago, Illinois",
                        "occupation": "Endocrinologist"
                    },
                    "medical_background": "Board-certified endocrinologist with 25 years experience. Specializes in diabetes management. Sees 30+ patients daily.",
                    "specialty": "Endocrinology",
                    "practice_setup": "Large academic medical center with multidisciplinary diabetes clinic",
                    "motivations": [
                        "Achieve optimal glycemic control for patients",
                        "Stay current with latest treatment advances",
                        "Reduce long-term complications"
                    ],
                    "beliefs": [
                        "Personalized medicine improves outcomes",
                        "Patient education is fundamental",
                        "Early intervention prevents complications"
                    ],
                    "pain_points": [
                        "Insurance prior authorization delays",
                        "Patient non-adherence",
                        "Time constraints in appointments"
                    ],
                    "decision_style": "Evidence-based, follows guidelines but adapts to individual patients"
                }
            }
        ]
        
        # Define Mounjaro-specific personas
        mounjaro_personas = [
            {
                "name": "Jennifer Williams",
                "age": 48,
                "gender": "Female",
                "condition": "Type 2 Diabetes",
                "location": "Austin, Texas",
                "brand_id": mounjaro.id,
                "persona_json": {
                    "name": "Jennifer Williams",
                    "demographics": {
                        "age": 48,
                        "gender": "Female",
                        "location": "Austin, Texas",
                        "occupation": "Marketing Director"
                    },
                    "medical_background": "Type 2 Diabetes diagnosed 3 years ago. Started on metformin, added Mounjaro 6 months ago. A1C dropped from 8.2% to 6.5%. Lost 15 pounds.",
                    "lifestyle_and_values": "Career-focused professional. Values convenience and efficacy. Active in local diabetes support group.",
                    "motivations": [
                        "Achieve diabetes remission",
                        "Maintain weight loss achieved with Mounjaro",
                        "Reduce cardiovascular risk",
                        "Continue active lifestyle without complications"
                    ],
                    "beliefs": [
                        "GLP-1/GIP dual agonists represent breakthrough treatment",
                        "Weight management is integral to diabetes control",
                        "Once-weekly dosing improves adherence",
                        "Investing in health pays long-term dividends"
                    ],
                    "pain_points": [
                        "Initial GI side effects during titration",
                        "High cost even with insurance",
                        "Supply chain concerns",
                        "Uncertainty about long-term use"
                    ],
                    "communication_preferences": {
                        "preferred_channels": "Digital health apps, email",
                        "information_style": "Concise, outcome-focused",
                        "frequency": "Monthly with on-demand access"
                    }
                }
            },
            {
                "name": "Michael Thompson",
                "age": 55,
                "gender": "Male",
                "condition": "Type 2 Diabetes",
                "location": "Phoenix, Arizona",
                "brand_id": mounjaro.id,
                "persona_json": {
                    "name": "Michael Thompson",
                    "demographics": {
                        "age": 55,
                        "gender": "Male",
                        "location": "Phoenix, Arizona",
                        "occupation": "Construction Manager"
                    },
                    "medical_background": "Type 2 Diabetes for 8 years. Previously on multiple oral agents with poor control. Started Mounjaro 3 months ago after insurance approval battle. A1C was 9.1%, now 7.4%.",
                    "lifestyle_and_values": "Physically demanding job. Values practical solutions. Initially skeptical of injectable medications but convinced by results.",
                    "motivations": [
                        "Avoid insulin injections",
                        "Maintain ability to work physical job",
                        "Reduce pill burden",
                        "Lose weight to ease joint pain"
                    ],
                    "beliefs": [
                        "Results speak louder than marketing",
                        "Convenience matters for compliance",
                        "The injection pen is easier than expected",
                        "Weight loss is an important benefit beyond glucose control"
                    ],
                    "pain_points": [
                        "Insurance prior authorization was frustrating",
                        "Nausea in first weeks of treatment",
                        "Cost concerns if loses insurance",
                        "Worried about medication shortages"
                    ],
                    "communication_preferences": {
                        "preferred_channels": "Phone, text messages",
                        "information_style": "Straightforward, no medical jargon",
                        "frequency": "As needed, quarterly minimum"
                    }
                }
            },
            {
                "name": "Dr. David Park",
                "age": 42,
                "gender": "Male",
                "condition": "Type 2 Diabetes",
                "location": "San Diego, California",
                "brand_id": mounjaro.id,
                "persona_type": "HCP",
                "persona_json": {
                    "name": "Dr. David Park",
                    "demographics": {
                        "age": 42,
                        "gender": "Male",
                        "location": "San Diego, California",
                        "occupation": "Primary Care Physician"
                    },
                    "specialty": "Family Medicine",
                    "practice_setup": "Community health clinic serving diverse population",
                    "medical_background": "Board-certified family physician, 12 years in practice. Manages 200+ diabetic patients. Early adopter of GLP-1 therapies.",
                    "motivations": [
                        "Offer patients effective modern treatments",
                        "Achieve better outcomes than older therapies",
                        "Help patients with weight management alongside diabetes",
                        "Reduce referrals to specialists through better primary care"
                    ],
                    "beliefs": [
                        "Dual GIP/GLP-1 mechanism provides superior efficacy",
                        "Weight loss benefits improve overall metabolic health",
                        "Early intensification leads to better long-term outcomes",
                        "Patient selection is key to treatment success"
                    ],
                    "pain_points": [
                        "Prior authorization burden",
                        "Cost barriers for uninsured patients",
                        "Managing patient expectations during titration",
                        "Supply availability concerns"
                    ],
                    "decision_style": "Evidence-based but pragmatic, considers patient circumstances"
                }
            },
            {
                "name": "Sarah Mitchell",
                "age": 62,
                "gender": "Female",
                "condition": "Type 2 Diabetes",
                "location": "Denver, Colorado",
                "brand_id": mounjaro.id,
                "persona_json": {
                    "name": "Sarah Mitchell",
                    "demographics": {
                        "age": 62,
                        "gender": "Female",
                        "location": "Denver, Colorado",
                        "occupation": "Retired Teacher"
                    },
                    "medical_background": "Type 2 Diabetes for 15 years. History of multiple medication changes. Started Mounjaro after failing to reach A1C goals with other GLP-1. Now at target with 7.0% A1C.",
                    "lifestyle_and_values": "Active retiree, enjoys hiking and gardening. Involved in grandchildren's lives. Values quality of life over quantity of medications.",
                    "motivations": [
                        "Stay active and independent",
                        "Avoid diabetes complications",
                        "Simplify medication regimen",
                        "Maintain healthy weight for mobility"
                    ],
                    "beliefs": [
                        "Newer medications can work when others fail",
                        "Weight control is essential for joint health",
                        "Once-weekly is more manageable than daily",
                        "Medicare coverage makes it accessible"
                    ],
                    "pain_points": [
                        "Navigating Medicare Part D coverage",
                        "Managing refrigeration while traveling",
                        "Occasional injection site reactions",
                        "Information overload about diabetes medications"
                    ],
                    "communication_preferences": {
                        "preferred_channels": "In-person visits, phone calls",
                        "information_style": "Clear, patient explanations",
                        "frequency": "Regular quarterly visits"
                    }
                }
            }
        ]
        
        created_count = 0
        
        # Create global personas
        print("\n📌 Creating Global Personas (no brand)...")
        for p in global_personas:
            persona_type = p.get("persona_type", "Patient")
            db_persona = models.Persona(
                name=p["name"],
                persona_type=persona_type,
                age=p["age"],
                gender=p["gender"],
                condition=p["condition"],
                location=p["location"],
                brand_id=None,  # Global persona
                full_persona_json=json.dumps(p["persona_json"])
            )
            db.add(db_persona)
            created_count += 1
            print(f"  ✅ {p['name']} ({persona_type}) - Global")
        
        # Create Mounjaro personas
        print(f"\n💊 Creating Mounjaro-Specific Personas (brand_id: {mounjaro.id})...")
        for p in mounjaro_personas:
            persona_type = p.get("persona_type", "Patient")
            db_persona = models.Persona(
                name=p["name"],
                persona_type=persona_type,
                age=p["age"],
                gender=p["gender"],
                condition=p["condition"],
                location=p["location"],
                brand_id=p["brand_id"],
                full_persona_json=json.dumps(p["persona_json"])
            )
            db.add(db_persona)
            created_count += 1
            print(f"  ✅ {p['name']} ({persona_type}) - Mounjaro")
        
        db.commit()
        
        # Summary
        print("\n" + "=" * 50)
        print(f"🎉 Successfully created {created_count} personas!")
        print(f"   - Global personas: {len(global_personas)}")
        print(f"   - Mounjaro personas: {len(mounjaro_personas)}")
        print("=" * 50)
        
        # Verify counts
        total = db.query(models.Persona).count()
        global_count = db.query(models.Persona).filter(models.Persona.brand_id == None).count()
        mounjaro_count = db.query(models.Persona).filter(models.Persona.brand_id == mounjaro.id).count()
        
        print(f"\n📊 Database Summary:")
        print(f"   Total personas: {total}")
        print(f"   Global (no brand): {global_count}")
        print(f"   Mounjaro brand: {mounjaro_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Creating Sample Personas")
    print("=" * 50)
    create_personas()






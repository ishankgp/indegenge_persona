#!/usr/bin/env python3
"""
PharmaPersonaSim CLI - Command Line Interface
No web server or Node.js required!
"""
import os
import sys
import json
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime

# Add backend to path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)

# Import backend modules
from app import models, schemas, persona_engine, cohort_engine, database, crud
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../.env')

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def print_persona(persona: Dict):
    """Pretty print a persona"""
    print(f"\n📋 Name: {persona.get('name', 'N/A')}")
    print(f"🏥 Condition: {persona.get('condition', 'N/A')}")
    
    if 'demographics' in persona:
        demo = persona['demographics']
        print(f"👤 Demographics: {demo.get('age', 'N/A')} y/o {demo.get('gender', 'N/A')}, {demo.get('location', 'N/A')}")
    
    if 'medical_background' in persona:
        print(f"\n🔬 Medical Background:")
        print(f"   {persona['medical_background'][:200]}...")
    
    if 'digital_behavior' in persona:
        print(f"\n💻 Digital Behavior: {persona['digital_behavior'].get('engagement_level', 'N/A')}")
    
    print(f"\n📅 Created: {persona.get('created_at', 'N/A')}")

def generate_persona_interactive():
    """Interactive persona generation"""
    print_header("Generate New Persona")
    
    print("\nEnter persona details (press Enter for defaults):")
    age = input("Age (default: 45): ").strip() or "45"
    gender = input("Gender (default: Female): ").strip() or "Female"
    condition = input("Medical Condition (default: Type 2 Diabetes): ").strip() or "Type 2 Diabetes"
    location = input("Location (default: Dallas, TX): ").strip() or "Dallas, TX"
    concerns = input("Key Concerns (default: medication side effects): ").strip() or "medication side effects"
    
    print("\n🔄 Generating persona using AI...")
    
    try:
        # Generate persona using the engine
        persona_json = persona_engine.generate_persona_from_attributes(
            age=age,
            gender=gender,
            condition=condition,
            location=location,
            concerns=concerns
        )
        
        if persona_json and persona_json != "{}":
            persona_data = json.loads(persona_json)
            
            # Save to database
            db = next(database.get_db())
            db_persona = models.Persona(
                name=persona_data.get("name", "Unknown"),
                age=int(age),
                gender=gender,
                condition=condition,
                location=location,
                concerns=concerns,
                full_persona_json=persona_json
            )
            db.add(db_persona)
            db.commit()
            db.refresh(db_persona)
            
            print("\n✅ Persona generated successfully!")
            print_persona(persona_data)
            
            return db_persona
        else:
            print("❌ Failed to generate persona. Check your OpenAI API key.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
    
    return None

def list_personas():
    """List all personas in the database"""
    print_header("Persona Library")
    
    db = next(database.get_db())
    personas = db.query(models.Persona).all()
    
    if not personas:
        print("\n📭 No personas found. Generate one first!")
        return
    
    print(f"\n📚 Found {len(personas)} persona(s):\n")
    for i, p in enumerate(personas, 1):
        print(f"{i}. {p.name} - {p.age}y/o {p.gender}")
        print(f"   Condition: {p.condition}")
        print(f"   Location: {p.location}")
        print(f"   ID: {p.id}")
        print()

def run_simulation():
    """Run a simulation with selected personas"""
    print_header("Run Simulation")
    
    db = next(database.get_db())
    personas = db.query(models.Persona).all()
    
    if not personas:
        print("\n📭 No personas available. Generate some first!")
        return
    
    # List personas
    print("\nAvailable personas:")
    for i, p in enumerate(personas, 1):
        print(f"{i}. {p.name} ({p.condition})")
    
    # Select personas
    selected_ids = input("\nSelect persona IDs (comma-separated, e.g., 1,2,3): ").strip()
    if not selected_ids:
        print("❌ No personas selected")
        return
    
    try:
        indices = [int(x.strip()) - 1 for x in selected_ids.split(",")]
        selected_personas = [personas[i] for i in indices]
    except (ValueError, IndexError):
        print("❌ Invalid selection")
        return
    
    # Get query
    query = input("\nEnter your question/prompt for the personas: ").strip()
    if not query:
        print("❌ No query provided")
        return
    
    print(f"\n🔄 Running simulation with {len(selected_personas)} persona(s)...")
    
    # Run simulation
    try:
        results = cohort_engine.process_cohort_query(
            [p.id for p in selected_personas],
            query,
            db
        )
        
        print("\n📊 Simulation Results:")
        print("-" * 40)
        
        for persona, response in zip(selected_personas, results):
            print(f"\n👤 {persona.name}:")
            print(f"   {response[:300]}...")
            print()
        
        print("✅ Simulation complete!")
        
    except Exception as e:
        print(f"❌ Error running simulation: {str(e)}")

def check_setup():
    """Check if everything is configured properly"""
    print_header("System Check")
    
    # Check OpenAI API key
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key != "your_openai_api_key_here":
        print("✅ OpenAI API key configured")
    else:
        print("❌ OpenAI API key not configured - update .env file")
        return False
    
    # Check database
    try:
        db = next(database.get_db())
        count = db.query(models.Persona).count()
        print(f"✅ Database connected ({count} personas)")
    except Exception as e:
        print(f"❌ Database error: {str(e)}")
        return False
    
    # Check persona engine
    try:
        import openai
        openai.api_key = api_key
        print("✅ OpenAI connection ready")
    except Exception as e:
        print(f"❌ OpenAI error: {str(e)}")
        return False
    
    return True

def main_menu():
    """Main CLI menu"""
    print_header("PharmaPersonaSim CLI")
    print("\nWelcome! This CLI doesn't require Node.js or a web server.")
    print("All features are available through this command-line interface.\n")
    
    # Check setup first
    if not check_setup():
        print("\n⚠️  Please fix the issues above before continuing.")
        print("Make sure to update the .env file with your OpenAI API key!")
        return
    
    while True:
        print("\n" + "=" * 60)
        print("  Main Menu")
        print("=" * 60)
        print("1. Generate New Persona")
        print("2. List All Personas")
        print("3. Run Simulation")
        print("4. System Check")
        print("5. Exit")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == "1":
            generate_persona_interactive()
        elif choice == "2":
            list_personas()
        elif choice == "3":
            run_simulation()
        elif choice == "4":
            check_setup()
        elif choice == "5":
            print("\n👋 Goodbye!")
            break
        else:
            print("❌ Invalid option. Please try again.")

if __name__ == "__main__":
    try:
        main_menu()
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()


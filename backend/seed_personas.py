"""Seed personas directly into the database."""
import sqlite3
import json
import os
from datetime import datetime

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pharma_personas.db")

def seed_personas():
    print(f"Connecting to database: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # First, get the Mounjaro brand ID
    cursor.execute("SELECT id FROM brands WHERE name = 'Mounjaro'")
    result = cursor.fetchone()
    mounjaro_id = result[0] if result else None
    print(f"Mounjaro brand ID: {mounjaro_id}")
    
    # Clear existing personas (optional - remove if you want to keep them)
    # cursor.execute("DELETE FROM personas")
    
    # Sample personas
    now = datetime.utcnow().isoformat()
    
    personas = [
        # Global personas (no brand)
        ("Maria Santos", 52, "Female", "Type 2 Diabetes", "Miami, Florida", None, "Patient",
         json.dumps({"name": "Maria Santos", "demographics": {"age": 52, "gender": "Female", "location": "Miami, Florida", "occupation": "Restaurant Owner"}, 
                     "medical_background": "Diagnosed with Type 2 Diabetes 5 years ago. Currently on metformin.",
                     "motivations": ["Stay healthy for grandchildren", "Maintain energy for work"],
                     "beliefs": ["Diet is the foundation of health", "Family support is essential"],
                     "pain_points": ["Difficulty managing diet", "Cost of medications"]})),
        
        ("Robert Chen", 45, "Male", "Hypertension", "Seattle, Washington", None, "Patient",
         json.dumps({"name": "Robert Chen", "demographics": {"age": 45, "gender": "Male", "location": "Seattle, Washington", "occupation": "Software Engineer"},
                     "medical_background": "Diagnosed with hypertension 2 years ago. BP well controlled.",
                     "motivations": ["Prevent cardiovascular events", "Use technology to optimize health"],
                     "beliefs": ["Data-driven decisions lead to better outcomes"],
                     "pain_points": ["Remembering medications", "Managing work stress"]})),
        
        ("Dr. Angela Morrison", 58, "Female", "Type 2 Diabetes", "Chicago, Illinois", None, "HCP",
         json.dumps({"name": "Dr. Angela Morrison", "demographics": {"age": 58, "gender": "Female", "location": "Chicago, Illinois", "occupation": "Endocrinologist"},
                     "specialty": "Endocrinology", "practice_setup": "Large academic medical center",
                     "motivations": ["Achieve optimal glycemic control", "Stay current with treatments"],
                     "beliefs": ["Personalized medicine improves outcomes"],
                     "pain_points": ["Insurance prior auth delays", "Patient non-adherence"]})),
        
        # Mounjaro personas (brand-specific)
        ("Jennifer Williams", 48, "Female", "Type 2 Diabetes", "Austin, Texas", mounjaro_id, "Patient",
         json.dumps({"name": "Jennifer Williams", "demographics": {"age": 48, "gender": "Female", "location": "Austin, Texas", "occupation": "Marketing Director"},
                     "medical_background": "Type 2 Diabetes diagnosed 3 years ago. Started Mounjaro 6 months ago. A1C dropped from 8.2% to 6.5%.",
                     "motivations": ["Achieve diabetes remission", "Maintain weight loss with Mounjaro"],
                     "beliefs": ["GLP-1/GIP dual agonists are breakthrough", "Weight management is key"],
                     "pain_points": ["Initial GI side effects", "High cost even with insurance"]})),
        
        ("Michael Thompson", 55, "Male", "Type 2 Diabetes", "Phoenix, Arizona", mounjaro_id, "Patient",
         json.dumps({"name": "Michael Thompson", "demographics": {"age": 55, "gender": "Male", "location": "Phoenix, Arizona", "occupation": "Construction Manager"},
                     "medical_background": "Type 2 Diabetes for 8 years. Started Mounjaro 3 months ago. A1C was 9.1%, now 7.4%.",
                     "motivations": ["Avoid insulin injections", "Reduce pill burden"],
                     "beliefs": ["Results speak louder than marketing", "Convenience matters for compliance"],
                     "pain_points": ["Insurance prior auth was frustrating", "Nausea in first weeks"]})),
        
        ("Dr. David Park", 42, "Male", "Type 2 Diabetes", "San Diego, California", mounjaro_id, "HCP",
         json.dumps({"name": "Dr. David Park", "demographics": {"age": 42, "gender": "Male", "location": "San Diego, California", "occupation": "Primary Care Physician"},
                     "specialty": "Family Medicine", "practice_setup": "Community health clinic",
                     "motivations": ["Offer patients modern treatments", "Achieve better outcomes"],
                     "beliefs": ["Dual GIP/GLP-1 mechanism provides superior efficacy"],
                     "pain_points": ["Prior authorization burden", "Cost barriers for uninsured"]})),
        
        ("Sarah Mitchell", 62, "Female", "Type 2 Diabetes", "Denver, Colorado", mounjaro_id, "Patient",
         json.dumps({"name": "Sarah Mitchell", "demographics": {"age": 62, "gender": "Female", "location": "Denver, Colorado", "occupation": "Retired Teacher"},
                     "medical_background": "Type 2 Diabetes for 15 years. Started Mounjaro after failing other GLP-1. Now at 7.0% A1C.",
                     "motivations": ["Stay active and independent", "Simplify medication regimen"],
                     "beliefs": ["Newer medications can work when others fail", "Once-weekly is manageable"],
                     "pain_points": ["Navigating Medicare Part D", "Managing refrigeration while traveling"]})),
    ]
    
    # Insert personas
    insert_sql = """
    INSERT INTO personas (name, age, gender, condition, location, brand_id, persona_type, full_persona_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    
    count = 0
    for p in personas:
        try:
            cursor.execute(insert_sql, (*p, now))
            count += 1
            brand_info = f"brand_id={p[5]}" if p[5] else "global"
            print(f"  ✓ Inserted: {p[0]} ({brand_info})")
        except sqlite3.Error as e:
            print(f"  ✗ Failed to insert {p[0]}: {e}")
    
    conn.commit()
    
    # Verify
    cursor.execute("SELECT COUNT(*) FROM personas")
    total = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM personas WHERE brand_id IS NULL")
    global_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM personas WHERE brand_id IS NOT NULL")
    brand_count = cursor.fetchone()[0]
    
    print(f"\n{'='*50}")
    print(f"✓ Inserted {count} personas")
    print(f"  Total in DB: {total}")
    print(f"  Global: {global_count}")
    print(f"  Brand-specific: {brand_count}")
    print(f"{'='*50}")
    
    conn.close()

if __name__ == "__main__":
    seed_personas()



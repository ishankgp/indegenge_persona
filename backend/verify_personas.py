import sqlite3
import os
import json

def verify_personas():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pharma_personas.db")
    print(f"Checking personas database at: {db_path}\n")
    
    if not os.path.exists(db_path):
        print("❌ Database file not found!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all personas
    cursor.execute("SELECT id, name, persona_type, age, gender, condition, location FROM personas ORDER BY id")
    personas = cursor.fetchall()
    
    print(f"📊 Total Personas: {len(personas)}\n")
    print("=" * 80)
    
    # Group by type
    hcp_count = 0
    patient_count = 0
    diabetes_count = 0
    
    for p in personas:
        pid, name, ptype, age, gender, condition, location = p
        
        # Get full JSON to check MBT
        cursor.execute("SELECT full_persona_json FROM personas WHERE id = ?", (pid,))
        json_data = cursor.fetchone()[0]
        
        try:
            persona_dict = json.loads(json_data)
            mbt_check = "✅" if (persona_dict.get("motivations") and 
                                 persona_dict.get("beliefs") and 
                                 persona_dict.get("pain_points")) else "❌"
        except:
            mbt_check = "❌"
        
        print(f"[{pid:2}] {name:30} | {ptype:8} | {age:3} | {gender:6} | {condition[:30]:30} | {mbt_check}")
        
        if ptype == "HCP":
            hcp_count += 1
        elif "diabetes" in condition.lower() or "prediabetes" in condition.lower():
            diabetes_count += 1
            patient_count += 1
        elif ptype == "Patient":
            patient_count += 1
    
    print("=" * 80)
    print(f"\n📈 Summary:")
    print(f"   HCP Personas: {hcp_count}")
    print(f"   Diabetes Patient Personas: {diabetes_count}")
    print(f"   General Patient Personas: {patient_count - diabetes_count}")
    print(f"   Total: {len(personas)}")
    
    conn.close()

if __name__ == "__main__":
    verify_personas()

import sqlite3
import os
import json

def get_database_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "pharma_personas.db")

def populate_disease_packs():
    database_path = get_database_path()
    
    if not os.path.exists(database_path):
        print(f"Database not found at {database_path}")
        return

    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()

    try:
        # Get all personas
        cursor.execute("SELECT id, name, condition, disease_pack FROM personas")
        personas = cursor.fetchall()
        
        updated_count = 0
        
        # Simple mapping logic based on condition string
        # This matches the logic in disease_packs.py keys
        condition_map = {
            "diabetes": "Type 2 Diabetes",
            "obesity": "Obesity",
            "psoriasis": "Psoriasis"
        }

        for persona_id, name, condition, current_pack in personas:
            if current_pack:
                continue
                
            condition_lower = (condition or "").lower()
            new_pack = None
            
            for key, pack_name in condition_map.items():
                if key in condition_lower:
                    new_pack = pack_name
                    break
            
            if new_pack:
                cursor.execute(
                    "UPDATE personas SET disease_pack = ? WHERE id = ?",
                    (new_pack, persona_id)
                )
                print(f"[Updated] {name}: {condition} -> {new_pack}")
                updated_count += 1
            else:
                print(f"[Skipped] {name}: {condition} (No matching pack)")

        connection.commit()
        print(f"\nSuccessfully populated disease_pack for {updated_count} personas")

    except sqlite3.Error as e:
        connection.rollback()
        print(f"Error: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    populate_disease_packs()


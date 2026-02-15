"""
Add a demo CONTRADICTS relationship to the Knowledge Graph.
This creates a synthetic contradiction for demo purposes.
"""
import sqlite3
import os
import uuid

def add_demo_contradiction():
    db_path = os.path.join("backend", "pharma_personas.db")
    if not os.path.exists(db_path):
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pharma_personas.db"))
    
    print(f"Opening DB at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Get brand_id for Mounjaro
        cursor.execute("SELECT id FROM brands WHERE name = 'Mounjaro'")
        brand_row = cursor.fetchone()
        if not brand_row:
            print("❌ Mounjaro brand not found!")
            return
        brand_id = brand_row[0]
        
        # Find a key_message node (brand claims)
        cursor.execute("""
            SELECT id, text, summary FROM knowledge_nodes 
            WHERE brand_id = ? AND node_type = 'key_message'
            LIMIT 1
        """, (brand_id,))
        key_msg = cursor.fetchone()
        
        # Find a patient_tension node (patient pain point)
        cursor.execute("""
            SELECT id, text, summary FROM knowledge_nodes 
            WHERE brand_id = ? AND node_type = 'patient_tension'
            LIMIT 1
        """, (brand_id,))
        patient_tension = cursor.fetchone()

        if not key_msg:
            print("❌ No key_message node found. Creating one...")
            key_msg_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO knowledge_nodes (id, brand_id, node_type, text, summary, confidence)
                VALUES (?, ?, 'key_message', ?, ?, 0.85)
            """, (key_msg_id, brand_id, 
                  "Mounjaro offers convenient once-weekly dosing that fits seamlessly into busy lifestyles.",
                  "Once-weekly convenience"))
            key_msg = (key_msg_id, "Mounjaro offers convenient once-weekly dosing...", "Once-weekly convenience")
            print(f"  ✅ Created key_message node: {key_msg_id[:8]}...")
        
        if not patient_tension:
            print("❌ No patient_tension node found. Creating one...")
            pt_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO knowledge_nodes (id, brand_id, node_type, text, summary, segment, confidence)
                VALUES (?, ?, 'patient_tension', ?, ?, 'Elderly Patients', 0.78)
            """, (pt_id, brand_id,
                  "Elderly patients express anxiety about self-injection and fear making mistakes with the pen device. They prefer simpler oral medications.",
                  "Injection anxiety in elderly"))
            patient_tension = (pt_id, "Elderly patients express anxiety about self-injection...", "Injection anxiety in elderly")
            print(f"  ✅ Created patient_tension node: {pt_id[:8]}...")
        
        # Now create the CONTRADICTS relationship
        from_id = key_msg[0]
        to_id = patient_tension[0]
        
        # Check if relationship already exists
        cursor.execute("""
            SELECT id FROM knowledge_relations 
            WHERE from_node_id = ? AND to_node_id = ? AND relation_type = 'contradicts'
        """, (from_id, to_id))
        existing = cursor.fetchone()
        
        if existing:
            print("⚠️ CONTRADICTS relationship already exists!")
        else:
            cursor.execute("""
                INSERT INTO knowledge_relations (brand_id, from_node_id, to_node_id, relation_type, strength, context, inferred_by)
                VALUES (?, ?, ?, 'contradicts', 0.82, ?, 'demo_script')
            """, (brand_id, from_id, to_id,
                  "Brand messaging emphasizes 'convenience' of weekly injection, but elderly patients report significant anxiety about self-injection mechanics. Recommended approach: Develop reassurance content specifically for injection-hesitant patients, featuring device simplicity demonstrations and testimonials from similar patients."))
            print(f"✅ Created CONTRADICTS relationship:")
            print(f"   FROM: {key_msg[2] or key_msg[1][:50]}")
            print(f"   TO:   {patient_tension[2] or patient_tension[1][:50]}")
            print(f"   Context: Brand 'convenience' claim vs Patient 'injection anxiety'")
        
        conn.commit()
        
        # Verify
        cursor.execute("SELECT count(*) FROM knowledge_relations WHERE brand_id = ? AND relation_type = 'contradicts'", (brand_id,))
        count = cursor.fetchone()[0]
        print(f"\n📊 Total CONTRADICTS relations for Mounjaro: {count}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    add_demo_contradiction()

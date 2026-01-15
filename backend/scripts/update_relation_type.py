"""
Create knowledge_relations table and insert demo data with 'triggers' type
"""
import sqlite3
import os

db_path = "backend/pharma_personas.db"
print(f"Using DB: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Create knowledge_nodes table if it doesn't exist
cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id VARCHAR PRIMARY KEY,
        brand_id INTEGER,
        node_type VARCHAR,
        text TEXT NOT NULL,
        summary VARCHAR(200),
        segment VARCHAR,
        journey_stage VARCHAR,
        source_document_id INTEGER,
        source_quote TEXT,
        confidence FLOAT DEFAULT 0.7,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_by_user BOOLEAN DEFAULT 0
    )
""")
print("✅ knowledge_nodes table created/verified")

# Create knowledge_relations table if it doesn't exist
cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_relations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_id INTEGER,
        from_node_id VARCHAR,
        to_node_id VARCHAR,
        relation_type VARCHAR,
        strength FLOAT DEFAULT 0.7,
        context TEXT,
        inferred_by VARCHAR DEFAULT 'llm',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
""")
print("✅ knowledge_relations table created/verified")


# Get brand_id for Mounjaro
cursor.execute("SELECT id FROM brands WHERE name = 'Mounjaro'")
brand_row = cursor.fetchone()
if not brand_row:
    print("❌ Mounjaro brand not found!")
    conn.close()
    exit(1)
brand_id = brand_row[0]

# Find a key_message node
cursor.execute("""
    SELECT id, text FROM knowledge_nodes 
    WHERE brand_id = ? AND node_type = 'key_message'
    LIMIT 1
""", (brand_id,))
key_msg = cursor.fetchone()

# Find a patient_tension node
cursor.execute("""
    SELECT id, text FROM knowledge_nodes 
    WHERE brand_id = ? AND node_type = 'patient_tension'
    LIMIT 1
""", (brand_id,))
patient_tension = cursor.fetchone()

if not key_msg or not patient_tension:
    print("❌ Missing nodes. Creating demo nodes...")
    import uuid
    
    if not key_msg:
        key_msg_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO knowledge_nodes (id, brand_id, node_type, text, summary, confidence)
            VALUES (?, ?, 'key_message', ?, ?, 0.85)
        """, (key_msg_id, brand_id, 
              "Mounjaro offers convenient once-weekly dosing that fits seamlessly into busy lifestyles.",
              "Once-weekly convenience"))
        key_msg = (key_msg_id, "Once-weekly convenience")
        print(f"  ✅ Created key_message node")
    
    if not patient_tension:
        pt_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO knowledge_nodes (id, brand_id, node_type, text, summary, segment, confidence)
            VALUES (?, ?, 'patient_tension', ?, ?, 'Elderly Patients', 0.78)
        """, (pt_id, brand_id,
              "Elderly patients express anxiety about self-injection and fear making mistakes with the pen device.",
              "Injection anxiety in elderly"))
        patient_tension = (pt_id, "Injection anxiety in elderly")
        print(f"  ✅ Created patient_tension node")

# Insert the TRIGGERS relationship (not CONTRADICTS)
from_id = key_msg[0]
to_id = patient_tension[0]

# Check if relationship already exists
cursor.execute("""
    SELECT id FROM knowledge_relations 
    WHERE from_node_id = ? AND to_node_id = ?
""", (from_id, to_id))
existing = cursor.fetchone()

if existing:
    # Update existing
    cursor.execute("""
        UPDATE knowledge_relations 
        SET relation_type = 'triggers',
            context = ?
        WHERE from_node_id = ? AND to_node_id = ?
    """, (
        "Brand messaging about weekly injection convenience may trigger injection anxiety in elderly patients. The word 'injection' itself activates the fear response. Recommended approach: Lead with reassurance language before mentioning injection, emphasize device simplicity and testimonials from similar patients.",
        from_id, to_id
    ))
    print(f"✅ Updated existing relationship to 'triggers'")
else:
    # Insert new
    cursor.execute("""
        INSERT INTO knowledge_relations (brand_id, from_node_id, to_node_id, relation_type, strength, context, inferred_by)
        VALUES (?, ?, ?, 'triggers', 0.82, ?, 'demo_script')
    """, (brand_id, from_id, to_id,
          "Brand messaging about weekly injection convenience may trigger injection anxiety in elderly patients. The word 'injection' itself activates the fear response. Recommended approach: Lead with reassurance language before mentioning injection, emphasize device simplicity and testimonials from similar patients."))
    print(f"✅ Created new TRIGGERS relationship")

conn.commit()

# Verify
cursor.execute("SELECT relation_type, context FROM knowledge_relations WHERE brand_id = ?", (brand_id,))
rows = cursor.fetchall()
print(f"\n📊 Total relations for Mounjaro: {len(rows)}")
for row in rows:
    print(f"  Type: {row[0]}")
    print(f"  Context: {row[1][:80]}...")

conn.close()

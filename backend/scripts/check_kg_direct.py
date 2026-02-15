
import sqlite3
import os

def check_db():
    # Hardcoded path to the known DB file
    db_path = os.path.join("backend", "pharma_personas.db")
    
    if not os.path.exists(db_path):
        print(f"ERROR: DB file not found at {db_path}")
        # Try finding it relative to script if run from elsewhere
        db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pharma_personas.db"))
        print(f"Trying detected path: {db_path}")
        if not os.path.exists(db_path):
             print("Still not found.")
             return

    print(f"Opening DB at: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check Brands
        cursor.execute("SELECT id, name FROM brands")
        brands = cursor.fetchall()
        print(f"\nBrands found: {len(brands)}")
        for bid, name in brands:
            print(f"- {name} (ID: {bid})")
            
            # Nodes
            cursor.execute("SELECT count(*) FROM knowledge_nodes WHERE brand_id=?", (bid,))
            node_count = cursor.fetchone()[0]
            
            # Relations
            cursor.execute("SELECT count(*) FROM knowledge_relations WHERE brand_id=?", (bid,))
            rel_count = cursor.fetchone()[0]
            
            print(f"  > Nodes: {node_count}")
            print(f"  > Relations: {rel_count}")
            
            if node_count > 0:
                print("  > Node Types:")
                cursor.execute("SELECT node_type, count(*) FROM knowledge_nodes WHERE brand_id=? GROUP BY node_type", (bid,))
                for row in cursor.fetchall():
                    print(f"    - {row[0]}: {row[1]}")
                    

            if rel_count > 0:
                print("  > Relation Types:")
                cursor.execute("SELECT relation_type, count(*) FROM knowledge_relations WHERE brand_id=? GROUP BY relation_type", (bid,))
                for row in cursor.fetchall():
                    print(f"    - {row[0]}: {row[1]}")
            
            # Check Documents
            print("  > Documents:")
            cursor.execute("SELECT filename, filepath FROM brand_documents WHERE brand_id=?", (bid,))
            docs = cursor.fetchall()
            for fname, fpath in docs:
                print(f"    - {fname} -> {fpath}")


    except sqlite3.OperationalError as e:
        print(f"SQL Error: {e}")
        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print("\nTables in DB:")
        for t in tables:
            print(f"- {t[0]}")
            
    finally:
        conn.close()

if __name__ == "__main__":
    check_db()

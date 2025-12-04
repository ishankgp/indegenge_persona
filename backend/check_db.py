import sqlite3
import os

def check_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pharma_personas.db")
    print(f"Checking database at: {db_path}")
    
    if not os.path.exists(db_path):
        print("❌ Database file not found!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables:", [t[0] for t in tables])
    
    # Check Brands
    try:
        cursor.execute("SELECT * FROM brands")
        brands = cursor.fetchall()
        print(f"Found {len(brands)} brands.")
        for b in brands:
            print(f" - ID: {b[0]}, Name: {b[1]}")
    except Exception as e:
        print(f"❌ Error querying brands: {e}")

    # Check BrandDocuments schema
    try:
        cursor.execute("PRAGMA table_info(brand_documents)")
        columns = cursor.fetchall()
        col_names = [c[1] for c in columns]
        print("BrandDocument Columns:", col_names)
        
        if "extracted_insights" in col_names:
            print("✅ 'extracted_insights' column exists.")
        else:
            print("❌ 'extracted_insights' column MISSING!")
    except Exception as e:
        print(f"❌ Error checking schema: {e}")

    conn.close()

if __name__ == "__main__":
    check_db()

"""
Cleanup script to remove test brands from the database.
Keeps only legitimate brands like Mounjaro.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pharma_personas.db')

def cleanup_brands():
    print(f"Connecting to: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get test brands to delete
    cursor.execute("SELECT id, name FROM brands WHERE name LIKE 'Test Brand%' OR name = 'Browser Test Brand'")
    test_brands = cursor.fetchall()
    print(f"\nFound {len(test_brands)} test brands to delete:")
    for b in test_brands:
        print(f"  - ID {b[0]}: {b[1]}")
    
    if not test_brands:
        print("No test brands to delete.")
    else:
        # Delete associated documents first
        for brand_id, name in test_brands:
            cursor.execute('DELETE FROM brand_documents WHERE brand_id = ?', (brand_id,))
            docs_deleted = cursor.rowcount
            if docs_deleted > 0:
                print(f"  Deleted {docs_deleted} documents for brand '{name}'")
        
        # Delete the test brands
        cursor.execute("DELETE FROM brands WHERE name LIKE 'Test Brand%' OR name = 'Browser Test Brand'")
        deleted = cursor.rowcount
        print(f"\n[OK] Deleted {deleted} test brands")
    
    # Fix Monjuro -> Mounjaro (common misspelling)
    cursor.execute("UPDATE brands SET name = 'Mounjaro' WHERE name = 'Monjuro'")
    if cursor.rowcount > 0:
        print("[OK] Renamed 'Monjuro' -> 'Mounjaro'")
    
    conn.commit()
    
    # Show remaining brands
    cursor.execute('SELECT id, name, created_at FROM brands ORDER BY id')
    remaining = cursor.fetchall()
    print(f"\nRemaining brands ({len(remaining)}):")
    for b in remaining:
        print(f"  - ID {b[0]}: {b[1]} (created: {b[2]})")
    
    conn.close()
    print("\n[OK] Cleanup complete!")

if __name__ == "__main__":
    cleanup_brands()

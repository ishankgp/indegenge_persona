#!/usr/bin/env python3
"""
Migration script to add extracted_insights column to brand_documents table
"""
import sqlite3
import sys
import os

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "pharma_personas.db")

def migrate():
    """Add extracted_insights column to brand_documents table"""
    print(f"Migrating database at: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(brand_documents)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'extracted_insights' in columns:
            print("✅ Column 'extracted_insights' already exists in brand_documents table")
            conn.close()
            return True
        
        # Add the column
        print("Adding 'extracted_insights' column to brand_documents table...")
        cursor.execute("""
            ALTER TABLE brand_documents 
            ADD COLUMN extracted_insights TEXT
        """)
        
        conn.commit()
        print("✅ Successfully added 'extracted_insights' column")
        
        # Verify
        cursor.execute("PRAGMA table_info(brand_documents)")
        columns = [row[1] for row in cursor.fetchall()]
        print(f"Current columns in brand_documents: {columns}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = migrate()
    sys.exit(0 if success else 1)

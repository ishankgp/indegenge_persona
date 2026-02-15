import sqlite3
import os

DB_PATH = "pharma_personas.db"

def migrate_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 1. Add gemini_corpus_id to brands
    try:
        cursor.execute("ALTER TABLE brands ADD COLUMN gemini_corpus_id VARCHAR")
        print("Added column gemini_corpus_id to brands")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column gemini_corpus_id already exists in brands")
        else:
            print(f"Error adding gemini_corpus_id to brands: {e}")

    # 2. Add gemini_document_name to brand_documents
    try:
        cursor.execute("ALTER TABLE brand_documents ADD COLUMN gemini_document_name VARCHAR")
        print("Added column gemini_document_name to brand_documents")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column gemini_document_name already exists in brand_documents")
        else:
            print(f"Error adding gemini_document_name to brand_documents: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate_db()

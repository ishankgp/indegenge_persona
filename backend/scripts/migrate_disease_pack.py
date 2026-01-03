import sqlite3
import os

def get_database_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "pharma_personas.db")

def migrate_database():
    database_path = get_database_path()
    
    if not os.path.exists(database_path):
        print(f"Database not found at {database_path}. Nothing to migrate.")
        return

    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()

    try:
        # Check current state
        cursor.execute("PRAGMA table_info(personas)")
        existing_columns = {column[1] for column in cursor.fetchall()}
        
        # Add disease_pack column if not exists
        if "disease_pack" not in existing_columns:
            cursor.execute("ALTER TABLE personas ADD COLUMN disease_pack TEXT")
            print("[Added] disease_pack column to personas table")
        else:
            print("disease_pack column already exists, skipping")

        connection.commit()
        print("\nMigration completed successfully!")

    except sqlite3.Error as e:
        connection.rollback()
        print(f"Migration failed: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    migrate_database()


"""
Migration script to add brand_id column to personas table.

This migration:
1. Deletes all existing personas (per user preference for clean start)
2. Adds brand_id column with foreign key to brands table
"""
import os
import sqlite3


def get_database_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.getenv(
        "DATABASE_PATH",
        os.path.join(base_dir, "pharma_personas.db"),
    )


def migrate_database():
    database_path = get_database_path()

    if not os.path.exists(database_path):
        print(f"Database not found at {database_path}. Nothing to migrate.")
        return

    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()

    try:
        # Step 1: Check current state
        cursor.execute("PRAGMA table_info(personas)")
        existing_columns = {column[1] for column in cursor.fetchall()}
        print(f"Existing columns in personas table: {existing_columns}")

        # Step 2: Delete all existing personas (per user preference)
        cursor.execute("SELECT COUNT(*) FROM personas")
        persona_count = cursor.fetchone()[0]
        if persona_count > 0:
            print(f"Deleting {persona_count} existing personas...")
            cursor.execute("DELETE FROM personas")
            print(f"✅ Deleted {persona_count} personas")
        else:
            print("No existing personas to delete")

        # Step 3: Add brand_id column if it doesn't exist
        if "brand_id" not in existing_columns:
            cursor.execute(
                "ALTER TABLE personas ADD COLUMN brand_id INTEGER REFERENCES brands(id)"
            )
            print("✅ Added brand_id column to personas table")
        else:
            print("brand_id column already exists, skipping")

        # Step 4: Create index on brand_id for faster queries
        cursor.execute(
            """
            SELECT name FROM sqlite_master 
            WHERE type='index' AND name='idx_personas_brand_id'
            """
        )
        if not cursor.fetchone():
            cursor.execute(
                "CREATE INDEX idx_personas_brand_id ON personas(brand_id)"
            )
            print("✅ Created index on brand_id column")
        else:
            print("Index on brand_id already exists, skipping")

        connection.commit()
        print("\n🎉 Migration completed successfully!")
        print("\nSummary:")
        print("  - Deleted all existing personas")
        print("  - Added brand_id column (nullable, references brands table)")
        print("  - Created index for brand_id queries")

    except sqlite3.Error as exc:
        connection.rollback()
        print(f"❌ Migration failed: {exc}")
    finally:
        connection.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Brand-Persona Architecture Migration")
    print("=" * 60)
    print()
    migrate_database()


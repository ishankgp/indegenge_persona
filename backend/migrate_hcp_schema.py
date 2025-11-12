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
        cursor.execute("PRAGMA table_info(personas)")
        existing_columns = {column[1] for column in cursor.fetchall()}

        columns_to_add = [
            "persona_subtype TEXT",
            "tagline TEXT",
            "specialty TEXT",
            "practice_setup TEXT",
            "system_context TEXT",
            "decision_influencers TEXT",
            "adherence_to_protocols TEXT",
            "channel_use TEXT",
            "decision_style TEXT",
            "core_insight TEXT",
        ]

        for column_definition in columns_to_add:
            column_name = column_definition.split()[0]
            if column_name not in existing_columns:
                cursor.execute(
                    f"ALTER TABLE personas ADD COLUMN {column_definition}"
                )
                print(f"Added column: {column_name}")
            else:
                print(f"Column already exists, skipping: {column_name}")

        connection.commit()
        print("Migration completed successfully.")

    except sqlite3.Error as exc:
        connection.rollback()
        print(f"Migration failed: {exc}")
    finally:
        connection.close()


if __name__ == "__main__":
    migrate_database()


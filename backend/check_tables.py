import sqlite3

conn = sqlite3.connect('pharma_personas.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall()]
print('Tables in database:', tables)

# Check if simulations table exists
if 'simulations' in tables:
    cursor.execute("SELECT COUNT(*) FROM simulations")
    count = cursor.fetchone()[0]
    print(f"Simulations table exists with {count} records")
else:
    print("Simulations table does not exist - creating it...")
    # Create the simulations table
    cursor.execute("""
        CREATE TABLE simulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            persona_id INTEGER,
            scenario TEXT,
            parameters TEXT,
            results TEXT,
            response_rate REAL,
            insights TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    print("Simulations table created")

conn.close()

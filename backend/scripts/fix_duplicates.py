
import sys
import os

# Add backend directory to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker
from app.models import BrandDocument
from app.database import Base, SQLALCHEMY_DATABASE_URL

def fix_duplicates():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("🔍 Checking for duplicate documents...")
        
        # Find duplicates
        # Group by brand_id and filename, count > 1
        duplicates_query = db.query(
            BrandDocument.brand_id,
            BrandDocument.filename,
            func.count(BrandDocument.id).label('count')
        ).group_by(
            BrandDocument.brand_id,
            BrandDocument.filename
        ).having(func.count(BrandDocument.id) > 1).all()

        if not duplicates_query:
            print("✅ No duplicates found.")
            return

        print(f"⚠️ Found {len(duplicates_query)} sets of duplicates.")

        total_deleted = 0
        for brand_id, filename, count in duplicates_query:
            print(f"  - Brand {brand_id}, File '{filename}': {count} copies")
            
            # Get all copies ordered by ID (assuming higher ID is newer)
            copies = db.query(BrandDocument).filter(
                BrandDocument.brand_id == brand_id,
                BrandDocument.filename == filename
            ).order_by(BrandDocument.id.desc()).all()
            
            # Keep the newest (first in list), delete the rest
            to_keep = copies[0]
            to_delete = copies[1:]
            
            print(f"    Keeping ID {to_keep.id}, deleting {len(to_delete)} older copies: {[d.id for d in to_delete]}")
            
            for doc in to_delete:
                db.delete(doc)
                total_deleted += 1

        db.commit()
        print(f"✨ Cleanup complete. Deleted {total_deleted} duplicate documents.")

    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_duplicates()

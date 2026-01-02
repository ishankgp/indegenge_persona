
import sys
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Add Backend root to path
sys.path.append(os.getcwd())

from app import models, schemas, document_processor, vector_search, crud
from app.database import SessionLocal, engine, Base

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_rag():
    db = SessionLocal()
    try:
        brand_name = f"Test Brand {int(datetime.now().timestamp())}"
        logger.info(f"Creating brand: {brand_name}")
        
        # 1. Create Brand
        brand_data = schemas.BrandCreate(name=brand_name)
        brand = crud.create_brand(db, brand_data)
        logger.info(f"Brand created: ID {brand.id}")
        
        # 2. Simulate Upload & Ingestion
        # We simulate the content of a file
        text_content = "The brand 'GeminiCure' is a revolutionary treatment for chronic boredom. It works by generating infinite creative ideas."
        extracted_insights = [{"type": "Motivation", "text": "Patients are motivated by creativity.", "segment": "General"}]
        
        chunk_size = 800
        chunks = [text_content]
        filename = "gemini_test_doc.txt"
        
        logger.info("Generating embeddings (Gemini Ingestion)...")
        # Ensure we pass the API key loaded from env (handled by document_processor)
        
        gemini_corpus_id, gemini_document_name, chunk_ids = document_processor.generate_vector_embeddings(
            chunks,
            brand_id=brand.id,
            filename=filename,
            chunk_size=chunk_size,
            insights=extracted_insights,
            existing_corpus_id=brand.gemini_corpus_id
        )
        
        if not gemini_corpus_id:
            print("FAILED to create/get corpus ID. Is GEMINI_API_KEY valid?")
            return
            
        print(f"Ingestion success. Corpus: {gemini_corpus_id}, Document: {gemini_document_name}")
         
         # Update Brand with Corpus ID
        if not brand.gemini_corpus_id:
            brand.gemini_corpus_id = gemini_corpus_id
            db.add(brand)
            db.commit()
            db.refresh(brand)
            
        print("Sleeping 10s for indexing...")
        import time
        time.sleep(10)

        # 3. Simulate Search
        print("Testing Search...")
        results = vector_search.search_brand_chunks(
            brand_id=brand.id,
            corpus_id=brand.gemini_corpus_id,
            documents=[], # Not needed for pure Gemini search anymore
            target_segment="General"
        )
        
        if results:
            print(f"Search returned {len(results)} results:")
            for r in results:
                print(f" - {r['text'][:50]}...")
        else:
            print("Search returned no results. Indexing might take a moment or failed.")

    finally:
        db.close()

if __name__ == "__main__":
    verify_rag()

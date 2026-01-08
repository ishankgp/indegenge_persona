import json
import os
import tempfile
import logging
from typing import List, Optional, Tuple

from openai import OpenAI
from pypdf import PdfReader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_openai_client: Optional[OpenAI] = None


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """Simple text chunker to break long passages into overlapping chunks."""
    if not text:
        return []

    if chunk_size <= 0:
        logger.warning("Chunk size must be positive; returning empty list.")
        return []
    
    if overlap >= chunk_size:
        logger.warning("Overlap must be smaller than chunk size; using non-overlapping chunks.")
        overlap = 0

    chunks: List[str] = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(text_length, start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        # Ensure we always advance by at least 1 to prevent infinite loop
        increment = max(1, chunk_size - overlap)
        start += increment

    return chunks


def _get_openai_client() -> Optional[OpenAI]:
    """Lazily initialize an OpenAI client when an API key is available."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=api_key)

    return _openai_client

def extract_text(filepath: str) -> str:
    """
    Extracts text from a file (PDF or Text).
    Returns empty string if no text could be extracted (e.g. image-based PDF).
    """
    try:
        ext = os.path.splitext(filepath)[1].lower()
        text = ""
        
        if ext == ".pdf":
            reader = PdfReader(filepath)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        elif ext in [".txt", ".md", ".csv"]:
            with open(filepath, "r", encoding="utf-8") as f:
                text = f.read()
        
        return text.strip()
    except Exception as e:
        logger.error(f"Error extracting text from {filepath}: {e}")
        return ""

def classify_document(text: str) -> str:
    """
    Classifies the document text into one of the 7 knowledge pillars using OpenAI.
    """
    if not text:
        return "Unclassified / Image-only"

    client = _get_openai_client()
    if client is None:
        logger.warning("OpenAI API key not configured; returning offline classification.")
        return "Unclassified (Offline)"

    # Truncate text to first 1000 chars to save tokens, usually enough for classification
    truncated_text = text[:1000]

    prompt = f"""
    You are an expert pharma brand strategist. Classify the following document text into EXACTLY ONE of these 7 categories:

    1. Disease & Patient Journey Overview
    2. Treatment Landscape / SoC
    3. Brand Value Proposition & Core Messaging
    4. Safety & Tolerability Summary
    5. HCP & Patient Segmentation
    6. Market Research & Insight Summaries
    7. Adherence / Persistence / Discontinuation Insights

    If the text doesn't fit well, choose the closest match.
    Return ONLY the category name, nothing else.

    Document Text:
    {truncated_text}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that classifies documents."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            max_tokens=50
        )
        category = response.choices[0].message.content.strip()
        
        # Validate category against list to ensure exact match
        valid_categories = [
            "Disease & Patient Journey Overview",
            "Treatment Landscape / SoC",
            "Brand Value Proposition & Core Messaging",
            "Safety & Tolerability Summary",
            "HCP & Patient Segmentation",
            "Market Research & Insight Summaries",
            "Adherence / Persistence / Discontinuation Insights"
        ]
        
        # Simple fuzzy match or exact match check
        for valid in valid_categories:
            if valid.lower() in category.lower():
                return valid
                
        return "Unclassified"
        
    except Exception as e:
        logger.error(f"Error classifying document: {e}")
        return "Unclassified (Error)"




def generate_vector_embeddings(
    chunks: List[str],
    *,
    brand_id: int,
    filename: str,
    chunk_size: int,
    insights: Optional[List[dict]] = None,
    existing_corpus_id: Optional[str] = None
) -> Tuple[Optional[str], Optional[str], List[str]]:
    """
    Generate vector embeddings for the given chunks using OpenAI.
    
    This function:
    1. Creating a Vector Store for the brand/document if needed.
    2. Uploading the file to OpenAI.
    3. Attaching the file to the Vector Store.
    
    Returns:
        (None, vector_store_id, []) - We return vector_store_id as the second element (document identifier)
    """
    client = _get_openai_client()
    if not client:
        logger.warning("OpenAI client not initialized.")
        return None, None, []

    if not chunks:
        logger.info("No chunks/text to ingest.")
        return None, None, []
        
    # Create valid filename
    safe_filename = "".join([c for c in filename if c.isalnum() or c in "._-"])
    
    try:
        # 1. Create a Vector Store
        # For simplicity in this revert, we create a new store for each document batch or use the brand's store logic if we had it.
        # Based on previous code analysis, we were creating a store per document.
        vs_name = f"brand-{brand_id}-{safe_filename}"
        vector_store = client.beta.vector_stores.create(name=vs_name)
        
        # 2. Upload File (Stream the text content as a file)
        # We need to recreate the file content from chunks or use the original file if we had the path.
        # Since we receive 'chunks' (list of str), we'll join them to form the document content.
        full_text = "\n\n".join(chunks)
        
        # Create a temporary file to upload
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix=".txt", encoding='utf-8') as tmp:
            tmp.write(full_text)
            tmp_path = tmp.name
            
        try:
            with open(tmp_path, "rb") as file_stream:
                file_batch = client.beta.vector_stores.file_batches.upload_and_poll(
                    vector_store_id=vector_store.id,
                    files=[file_stream]
                )
                logger.info(f"Uploaded file batch status: {file_batch.status}")
                logger.info(f"File counts: {file_batch.file_counts}")

            return None, vector_store.id, []
            
        finally:
            os.remove(tmp_path)

    except Exception as e:
        logger.error(f"Failed to ingest into OpenAI Vector Store: {e}")
        return None, None, []

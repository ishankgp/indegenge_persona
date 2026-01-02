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

    if chunk_size <= overlap:
        logger.warning("Chunk size must be larger than overlap; using non-overlapping chunks.")
        overlap = 0

    chunks: List[str] = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(text_length, start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap if chunk_size > overlap else chunk_size

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



import google.generativeai as genai
from google.generativeai import retriever

def configure_genai():
    """Configure Gemini API with key from environment."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("Gemini API key not found (GEMINI_API_KEY or GOOGLE_API_KEY).")
        return
    genai.configure(api_key=api_key)

def _get_or_create_corpus(brand_id: int, existing_corpus_id: Optional[str] = None) -> Optional[str]:
    """
    Get an existing corpus or create a new one for the brand.
    Returns the corpus resource name (e.g., 'corpora/123...').
    """
    configure_genai()
    
    # If we already have a corpus ID, try to get it to ensure it exists
    if existing_corpus_id:
        try:
            # Verify existence (this might throw if not found)
            retriever.get_corpus(name=existing_corpus_id)
            return existing_corpus_id
        except Exception:
            logger.warning(f"Corpus {existing_corpus_id} not found, creating new one.")
    
    # Create new corpus
    display_name = f"Brand {brand_id} Corpus"
    try:
        corpus = retriever.create_corpus(display_name=display_name)
        logger.info(f"Created new Gemini corpus: {corpus.name}")
        return corpus.name
    except Exception as e:
        logger.error(f"Failed to create Gemini corpus: {e}")
        return None

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
    Ingest document into Gemini Semantic Retriever.
    
    Returns:
        (corpus_id, document_name, chunk_ids)
    """
    configure_genai()

    if not chunks and not insights:
        logger.info("No content to ingest.")
        return existing_corpus_id, None, []

    # 1. Ensure Corpus exists
    corpus_name = _get_or_create_corpus(brand_id, existing_corpus_id)
    if not corpus_name:
        return None, None, []

    # 2. Create Document in Corpus
    # Sanitize filename (alphanumeric + underscores, max 63 chars)
    # Gemini doc names are resource names, but 'display_name' can be anything.
    # We let Gemini generate the ID or use valid char name.
    safe_display_name = filename[:60]
    
    try:
        # Create document resource
        doc = retriever.create_document(corpus=corpus_name, display_name=safe_display_name)
        document_name = doc.name
        logger.info(f"Created Gemini document: {document_name}")
    except Exception as e:
        logger.error(f"Failed to create Gemini document: {e}")
        return corpus_name, None, []

    # 3. Prepare Chunks
    # Ideally we use 'insights' if available, otherwise 'chunks'.
    # Gemini chunks are text + metadata.
    
    batch_chunks = []
    
    if insights:
        for idx, insight in enumerate(insights):
            text = (insight.get("text") or "").strip()
            if not text: 
                continue
                
            metadata = {
                "type": insight.get("type"),
                "segment": insight.get("segment") or "General",
                "source_snippet": (insight.get("source_snippet") or text)[:100], # Limit metadata length
                "source_document": filename,
                "brand_id": str(brand_id),
            }
            # Add non-null metadata only
            custom_metadata = [{"key": k, "string_value": str(v)} for k, v in metadata.items() if v]

            batch_chunks.append({
                "data": {"string_value": text},
                "custom_metadata": custom_metadata
            })
            
    elif chunks:
        for idx, text in enumerate(chunks):
            text = text.strip()
            if not text:
                continue
            
            metadata = {
                "source_document": filename,
                "brand_id": str(brand_id),
                "segment": "General"
            }
            custom_metadata = [{"key": k, "string_value": str(v)} for k, v in metadata.items() if v]

            batch_chunks.append({
                "data": {"string_value": text},
                "custom_metadata": custom_metadata
            })

    if not batch_chunks:
        return corpus_name, document_name, []

    # 4. Upload Chunks (Batch)
    # Gemini allows max 100 chunks per batch request, loop if needed
    batch_size = 100
    chunk_ids = []
    
    try:
        for i in range(0, len(batch_chunks), batch_size):
            batch = batch_chunks[i : i + batch_size]
            response = retriever.batch_create_chunks(
                parent=document_name,
                requests=[{"chunk": c} for c in batch]
            )
            # Collect created chunk resource names
            chunk_ids.extend([c.name for c in response.chunks])
            
        logger.info(f"Ingested {len(chunk_ids)} chunks into {document_name}")
        
    except Exception as e:
        logger.error(f"Failed to upload chunks to Gemini: {e}")
        # We might want to delete the document if ingestion fails partially, but keeping it for now.
        return corpus_name, document_name, chunk_ids

    return corpus_name, document_name, chunk_ids

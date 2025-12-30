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


def generate_vector_embeddings(
    chunks: List[str],
    *,
    brand_id: int,
    filename: str,
    chunk_size: int,
    insights: Optional[List[dict]] = None,
) -> Tuple[Optional[str], List[str]]:
    """Create a vector store populated with chunked insights when possible.

    The function prefers structured ``insights`` (Motivation/Belief/Tension
    entries) for metadata-rich retrieval. If insights are unavailable, it
    falls back to embedding raw text chunks. Returns the vector store ID and a
    list of locally generated chunk identifiers for bookkeeping.
    """

    client = _get_openai_client()
    if client is None:
        logger.warning("OpenAI API key not configured; skipping embeddings and vector store creation.")
        return None, []

    payload_entries: List[dict] = []

    if insights:
        for idx, insight in enumerate(insights):
            text = (insight.get("text") or "").strip()
            if not text:
                continue

            payload_entries.append(
                {
                    "text": text,
                    "metadata": {
                        "type": insight.get("type"),
                        "segment": insight.get("segment") or "General",
                        "source_snippet": insight.get("source_snippet") or text,
                        "source_document": filename,
                        "brand_id": str(brand_id),
                        "chunk_index": idx,
                        "chunk_size": chunk_size,
                    },
                }
            )

    if not payload_entries and chunks:
        for idx, chunk in enumerate(chunks):
            text = chunk.strip()
            if not text:
                continue
            payload_entries.append(
                {
                    "text": text,
                    "metadata": {
                        "segment": "General",
                        "source_document": filename,
                        "brand_id": str(brand_id),
                        "chunk_index": idx,
                        "chunk_size": chunk_size,
                    },
                }
            )

    if not payload_entries:
        logger.info("No chunks or insights available for vectorization.")
        return None, []

    vector_store_id: Optional[str] = None
    chunk_ids: List[str] = [f"chunk-{idx}" for idx in range(len(payload_entries))]

    try:
        vector_store = client.vector_stores.create(
            name=f"brand-{brand_id}-{filename}",
            metadata={"brand_id": brand_id, "filename": filename, "chunk_size": chunk_size},
        )
        vector_store_id = getattr(vector_store, "id", None)
    except Exception as e:  # noqa: BLE001 - log and continue gracefully
        logger.error("Error creating vector store: %s", e)
        return None, []

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".jsonl") as temp_file:
            temp_path = temp_file.name
            for entry in payload_entries:
                temp_file.write(json.dumps(entry) + "\n")

        with open(temp_path, "rb") as file_obj:
            uploaded_file = client.files.create(file=file_obj, purpose="assistants")

        client.vector_stores.file_batches.upload_and_poll(
            vector_store_id=vector_store_id,
            file_ids=[uploaded_file.id],
        )
        logger.info("Uploaded %s entries to vector store %s", len(payload_entries), vector_store_id)
    except Exception as e:  # noqa: BLE001 - log and cleanup
        logger.error("Error uploading chunks to vector store %s: %s", vector_store_id, e)
        try:
            client.vector_stores.delete(vector_store_id)
        except Exception as cleanup_exc:  # noqa: BLE001 - best-effort cleanup
            logger.warning("Cleanup failed for vector store %s: %s", vector_store_id, cleanup_exc)
        return None, []
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                logger.warning("Failed to remove temporary chunk file at %s", temp_path)

    return vector_store_id, chunk_ids

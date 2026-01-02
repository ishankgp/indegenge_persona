
import logging
from typing import Dict, List, Optional
import os
import google.generativeai as genai
from google.generativeai import retriever

logger = logging.getLogger(__name__)

def configure_genai():
    """Configure Gemini API with key from environment."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        logger.warning("Gemini API key not found (GEMINI_API_KEY or GOOGLE_API_KEY).")
        return
    genai.configure(api_key=api_key)

def search_brand_chunks(
    *,
    brand_id: int,
    corpus_id: Optional[str] = None,
    documents: Optional[List] = None,
    target_segment: Optional[str] = None,
    top_k: int = 15,
) -> Optional[List[Dict[str, str]]]:
    """
    Query Gemini's Semantic Retriever for brand-specific snippets.
    
    Requires `corpus_id` (the Gemini corpus name) to be passed.
    """
    configure_genai()
    
    if not corpus_id:
        logger.info("Vector search skipped (no corpus_id provided).")
        return None

    query_text = target_segment or "brand insights"
    
    # Optional: Filter by specific documents if needed, but usually we search the whole brand corpus.
    # Gemini allows filtering by custom metadata.
    # filter_mask = {"key": "brand_id", "string_value": str(brand_id)} 
    # We already search a specific Corpus (per brand), so no need to filter by brand_id again 
    # unless we share a corpus.
    
    # Add segment filter if provided and if we indexed it
    metadata_filters = []
    if target_segment:
        # Note: This assumes exact match on 'segment' metadata key we added in document_processor
        # Gemini filters are exact match.
        # But 'segment' in ingestion was: "segment": insight.get("segment") or "General"
        # If target_segment is broad, exact match might be too strict. 
        # For now, let's just query and let semantic search do the work, 
        # or rely on the query text to boost relevance.
        pass

    try:
        results = retriever.query(
            name=corpus_id,
            query=query_text,
            results_count=top_k,
            metadata_filters=metadata_filters
        )
    except Exception as exc:
        logger.warning("Gemini vector search failed for corpus %s: %s", corpus_id, exc)
        return None

    retrieved_insights: List[Dict[str, str]] = []

    for chunk in results:
        # Robust access to text data
        text = ""
        if hasattr(chunk.data, 'string_value'):
             text = chunk.data.string_value
        elif isinstance(chunk.data, str):
             text = chunk.data
        else:
             # Fallback/Debug
             text = str(chunk.data)

        if not text:
            continue
            
        # Extract metadata
        meta = {}
        for m in chunk.custom_metadata:
            meta[m.key] = m.string_value
            
        retrieved_insights.append(
            {
                "type": meta.get("type"),
                "text": text,
                "segment": meta.get("segment") or target_segment or "General",
                "source_snippet": meta.get("source_snippet") or text,
                "source_document": meta.get("source_document") or "Gemini Search",
            }
        )

    if not retrieved_insights:
        return None

    logger.info("Gemini search returned %s snippets", len(retrieved_insights))
    return retrieved_insights

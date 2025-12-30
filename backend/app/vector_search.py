import logging
from typing import Dict, List, Optional

from . import persona_engine

logger = logging.getLogger(__name__)


def _extract_text_from_content(content) -> str:
    """Normalize possible response content structures into plain text."""
    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: List[str] = []
        for item in content:
            if isinstance(item, dict):
                text = item.get("text") or item.get("value") or ""
                parts.append(str(text))
            else:
                parts.append(str(item))
        return " ".join(p.strip() for p in parts if p).strip()

    return str(content or "").strip()


def _extract_results(response) -> List[dict]:
    """Return a unified list of search results across possible SDK shapes."""
    if response is None:
        return []

    if hasattr(response, "data") and isinstance(response.data, list):
        return response.data

    if hasattr(response, "results") and isinstance(response.results, list):
        return response.results

    return []


def search_brand_chunks(
    *,
    brand_id: int,
    documents: List,
    target_segment: Optional[str] = None,
    top_k: int = 15,
) -> Optional[List[Dict[str, str]]]:
    """
    Query OpenAI's vector database for brand-specific snippets.

    Returns a list of insight-like dicts compatible with the existing MBT aggregation
    pipeline, or ``None`` when vector search is not available.
    """

    client = persona_engine.get_openai_client()
    vector_api = getattr(client, "vector_stores", None) if client else None
    if client is None or vector_api is None:
        logger.info("Vector search unavailable (no OpenAI client/vector API).")
        return None

    query_method = None
    # Support either ``query`` or ``search`` depending on SDK version
    if hasattr(vector_api, "query"):
        query_method = vector_api.query
    elif hasattr(vector_api, "search"):
        query_method = vector_api.search

    if query_method is None:
        logger.info("Vector search unavailable (no query/search method).")
        return None

    vector_store_ids = [doc.vector_store_id for doc in documents if getattr(doc, "vector_store_id", None)]
    if not vector_store_ids:
        logger.info("Vector search skipped (no vector_store_id on documents).")
        return None

    filters: Dict[str, str] = {"brand_id": str(brand_id)}
    if target_segment:
        filters["segment"] = target_segment

    query_text = target_segment or "brand insights"
    retrieved_insights: List[Dict[str, str]] = []

    for store_id in vector_store_ids:
        kwargs = {"vector_store_id": store_id, "query": query_text, "top_k": top_k}
        try:
            # Some SDK versions expect "filter", others "filters"; try both gracefully.
            try:
                response = query_method(**kwargs, filter=filters)
            except TypeError:
                response = query_method(**kwargs, filters=filters)
        except Exception as exc:
            logger.warning("Vector search failed for store %s: %s", store_id, exc)
            continue

        for item in _extract_results(response):
            metadata = getattr(item, "metadata", {}) or {}
            content = getattr(item, "content", None)
            if content is None:
                content = getattr(item, "text", None) or getattr(item, "value", None)

            text = metadata.get("text") or _extract_text_from_content(content)
            if not text:
                continue

            retrieved_insights.append(
                {
                    "type": metadata.get("type"),
                    "text": text,
                    "segment": metadata.get("segment") or target_segment or metadata.get("audience") or "General",
                    "source_snippet": metadata.get("source_snippet") or text,
                    "source_document": metadata.get("source_document")
                    or metadata.get("filename")
                    or f"vector_store:{store_id}",
                }
            )

    if not retrieved_insights:
        return None

    logger.info("Vector search returned %s snippets across %s stores", len(retrieved_insights), len(vector_store_ids))
    return retrieved_insights


import logging
from typing import Dict, List, Optional
import os
import openai

logger = logging.getLogger(__name__)
def _get_openai_client():
    """Configure OpenAI client with key from environment."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OpenAI API key not found (OPENAI_API_KEY).")
        return None
    return openai.OpenAI(api_key=api_key)

def search_brand_chunks(
    brand_id: int,
    documents: List[dict],
    query_text: str = "",
    top_k: int = 5,
    target_segment: str = None
) -> Optional[List[Dict[str, str]]]:
    """
    Search OpenAI Vector Stores for relevant chunks.
    
    Args:
        documents: List of dictionaries comprising [{'vector_store_id': ...}]
    """
    client = _get_openai_client()
    if not client:
        return None
        
    # Aggregate vector store IDs
    vector_store_ids = []
    for d in documents:
        if isinstance(d, dict):
            vs_id = d.get('vector_store_id')
        else:
            vs_id = getattr(d, 'vector_store_id', None)
            
        if vs_id:
            vector_store_ids.append(vs_id)
    
    if not vector_store_ids:
        logger.info("No vector stores to search.")
        return None

    all_results = []
    
    for vs_id in vector_store_ids:
        try:
             # Create a thread for search
            thread = client.beta.threads.create(
                tool_resources={
                    "file_search": {
                        "vector_store_ids": [vs_id]
                    }
                }
            )
            
            # Create a message with the query
            client.beta.threads.messages.create(
                thread_id=thread.id,
                role="user",
                content=query_text
            )
            
            # Create a run to perform the search (using a dummy assistant or ad-hoc)
            # Since we don't have a persistent assistant here, we can create a temporary one OR simple rely on the fact 
            # that we usually need an assistant to run a thread.
            # Assuming we need a helper assistant for RAG.
            
            assistant = client.beta.assistants.create(
                name="RAG Search Helper",
                instructions="You are a helper to retrieve documents. Return relevant excerpts.",
                model="gpt-4-turbo",
                tools=[{"type": "file_search"}]
            )
            
            run = client.beta.threads.runs.create_and_poll(
                thread_id=thread.id,
                assistant_id=assistant.id
            )
            
            if run.status == 'completed':
                messages = list(client.beta.threads.messages.list(thread_id=thread.id, run_id=run.id))
                # Parse messages for citations/content
                for msg in messages:
                    if msg.role == 'assistant' and msg.content:
                         text_content = msg.content[0].text.value
                         all_results.append({
                             "text": text_content,
                             "source_document": vs_id,
                             "segment": target_segment or "General"
                         })
                         
            # Cleanup (Assistant, Thread) - Essential to avoid clutter
            client.beta.assistants.delete(assistant.id)
            client.beta.threads.delete(thread.id)

        except Exception as e:
            logger.error(f"Search failed for VS {vs_id}: {e}")
            continue

    if not all_results:
        return None
        
    return all_results[:top_k]

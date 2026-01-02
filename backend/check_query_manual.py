
import os
import google.ai.generativelanguage as glm
from google.api_core import client_options as client_options_lib
import google.generativeai as genai

# Use the corpus ID from the log
CORPUS_ID = "corpora/brand-5-corpus-iva4e0i3tcuu" # Replace if needed
QUERY = "test query"

def test_query():
    api_key = os.getenv("GEMINI_API_KEY") 
    print(f"Using API Key: {api_key[:5]}...")
    
    # Try default client (likely v1beta)
    try:
        print("Testing default RetrieverServiceClient...")
        client = glm.RetrieverServiceClient(
            client_options=client_options_lib.ClientOptions(api_key=api_key)
        )
        request = glm.QueryCorpusRequest(name=CORPUS_ID, query=QUERY)
        response = client.query_corpus(request)
        print("Success default!")
        print(response)
    except Exception as e:
        print(f"Default failed: {e}")

    # Try importing explicit v1beta
    try:
        print("\nTesting v1beta explicit...")
        from google.ai import generativelanguage_v1beta as glm_beta
        client = glm_beta.RetrieverServiceClient(
            client_options=client_options_lib.ClientOptions(api_key=api_key)
        )
        request = glm_beta.QueryCorpusRequest(name=CORPUS_ID, query=QUERY)
        response = client.query_corpus(request)
        print("Success v1beta!")
        print(response)
    except Exception as e:
        print(f"v1beta failed: {e}")

if __name__ == "__main__":
    test_query()

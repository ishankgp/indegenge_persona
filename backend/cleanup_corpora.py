
import google.generativeai as genai
import google.ai.generativelanguage as glm
from google.api_core import client_options as client_options_lib
import os
from dotenv import load_dotenv

load_dotenv()

def cleanup():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("No API Key")
        return

    client = glm.RetrieverServiceClient(
        client_options=client_options_lib.ClientOptions(api_key=api_key)
    )

    print("Listing Corpora...")
    req = glm.ListCorporaRequest()
    try:
        resp = client.list_corpora(req)
        for c in resp.corpora:
            print(f"Deleting {c.name} ({c.display_name})...")
            req_del = glm.DeleteCorpusRequest(name=c.name, force=True)
            client.delete_corpus(req_del)
            print("Deleted.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    cleanup()


import google.generativeai as genai
try:
    from google.generativeai import retriever
    print(f"Retriever detected: {dir(retriever)}")
except ImportError:
    print("No retriever module")

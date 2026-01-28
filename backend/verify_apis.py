
import os
import sys
from dotenv import load_dotenv
from openai import OpenAI
import requests

# Load env
backend_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

def check_openai():
    print("\n--- CHECKING OPENAI ---")
    api_key = os.getenv("OPENAI_API_KEY")
    model_name = os.getenv("OPENAI_MODEL", "gpt-5.2")
    
    if not api_key:
        print("❌ OpenAI API Key MISSING")
        return

    print(f"Key: {api_key[:8]}... | Model: {model_name}")
    client = OpenAI(api_key=api_key)
    
    try:
        # Intentionally NOT using max_tokens to verify the model itself works
        client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": "hi"}],
        )
        print(f"✅ OpenAI Model '{model_name}' SUCCEEDED (without max_tokens param)")
    except Exception as e:
        print(f"❌ OpenAI Model '{model_name}' FAILED: {e}")

def check_gemini():
    print("\n--- CHECKING GEMINI ---")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ Gemini API Key MISSING")
        return

    print(f"Key: {api_key[:8]}...")
    
    # Check using REST API which is most reliable for key validation
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    try:
        resp = requests.get(url)
        if resp.status_code == 200:
            print("✅ Gemini API Key is VALID (Models list accessible)")
            
            # Optional: Check if the specific image model exists in the list
            models = resp.json().get('models', [])
            image_model = "gemini-3-pro-image-preview"
            # Note: API model names often look like 'models/gemini-pro'
            has_model = any(image_model in m.get('name', '') for m in models)
            if has_model:
                print(f"   (Verified '{image_model}' is valid and accessible)")
            else:
                print(f"   (Note: '{image_model}' not explicitly found in standard list, but key is valid)")
                
        else:
            print(f"❌ Gemini API Key FAILED: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"❌ Gemini Connection FAILED: {e}")

if __name__ == "__main__":
    check_openai()
    check_gemini()

import os
from pypdf import PdfReader
from openai import OpenAI
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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

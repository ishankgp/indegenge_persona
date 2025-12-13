from openai import OpenAI
import os
from dotenv import load_dotenv
import json
from typing import Optional, List, Dict, Any
import re

# Load environment variables from the project root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

# Cache for the OpenAI client.  The SDK requires an API key during
# instantiation, so we create the client lazily to avoid raising an exception
# when the key is absent (for example in local development or during unit
# tests).
_openai_client: Optional[OpenAI] = None
MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o")


def get_openai_client() -> Optional[OpenAI]:
    """Return a configured ``OpenAI`` client if an API key is available."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    global _openai_client
    if _openai_client is None:
        _openai_client = OpenAI(api_key=api_key)

    return _openai_client

def create_patient_persona_prompt(age, gender, condition, location, concerns, brand_insights: Optional[List[Dict[str, str]]] = None):
    """Creates the exact, detailed prompt for generating a patient persona."""
    
    # Base prompt
    prompt = f"""
    **Role:** You are an AI expert in creating realistic, empathetic user personas for the pharmaceutical industry. Your personas must be nuanced and avoid stereotypes.

    **Task:** Generate a detailed patient persona based on the following attributes.

    **Input Data:**
    - Age: {age}
    - Gender: {gender}
    - Primary Medical Condition: "{condition}"
    - Location: {location}
    - Key Concerns: "{concerns}"
"""
    
    # Add brand insights context if provided
    if brand_insights:
        motivations = [i.get("text") for i in brand_insights if i.get("type") == "Motivation" and i.get("text")]
        beliefs = [i.get("text") for i in brand_insights if i.get("type") == "Belief" and i.get("text")]
        tensions = [i.get("text") for i in brand_insights if i.get("type") == "Tension" and i.get("text")]
        
        prompt += f"""
    **Brand Context (MBT Framework):**
    The persona should be grounded in the following brand-specific insights. Incorporate these naturally into the persona's motivations, beliefs, and pain points:
    
    - Motivations from brand research: {motivations[:5] if motivations else ['None provided']}
    - Beliefs from brand research: {beliefs[:5] if beliefs else ['None provided']}
    - Tensions/Pain points from brand research: {tensions[:5] if tensions else ['None provided']}
"""
    
    prompt += """
    **Output Format:**
    Generate a response in a pure JSON format. Do not include any text, code block markers, or explanations before or after the JSON object. The JSON object must have the following keys:
    - "name": A realistic first and last name.
    - "demographics": An object with "age", "gender", "location", and "occupation".
    - "medical_background": A brief, narrative summary of their diagnosis and treatment history for the specified condition.
    - "lifestyle_and_values": A paragraph describing their daily life, hobbies, family situation, and what they value most.
    - "motivations": An array of 3-5 goals or desires related to managing their health.
    - "beliefs": An array of 3-5 core convictions or assumptions they hold about their condition, treatment, or healthcare system.
    - "pain_points": An array of 3-5 specific challenges they face related to their condition.
    - "communication_preferences": An object describing how they prefer to receive health information.
    """
    return prompt

def generate_persona_from_attributes(
    age: int, 
    gender: str, 
    condition: str, 
    location: str, 
    concerns: str,
    brand_insights: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Takes user input, builds the prompt, calls the OpenAI API,
    and returns the generated JSON as a string.
    
    If brand_insights is provided, the persona will be grounded in those MBT insights.
    """
    prompt = create_patient_persona_prompt(age, gender, condition, location, concerns, brand_insights)
    
    # First check if OpenAI API key is available in environment
    client = get_openai_client()
    if client is None:
        print("OpenAI API key not found in environment, generating mock persona")
        return generate_mock_persona(age, gender, condition, location, concerns, brand_insights)

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1200,
        )
        
        content = response.choices[0].message.content or "{}"
        
        # Validate that we got a proper JSON response
        try:
            parsed_json = json.loads(content)
            if not parsed_json.get("name") or not parsed_json.get("demographics"):
                raise ValueError("Incomplete persona structure from OpenAI")
            print(f"✅ Generated persona via OpenAI API: {parsed_json.get('name')}")
            return content
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Invalid JSON from OpenAI API, using mock: {e}")
            return generate_mock_persona(age, gender, condition, location, concerns, brand_insights)
        
    except Exception as e:
        print(f"OpenAI API error, falling back to mock persona: {e}")
        return generate_mock_persona(age, gender, condition, location, concerns, brand_insights)

def generate_mock_persona(
    age: int, 
    gender: str, 
    condition: str, 
    location: str, 
    concerns: str,
    brand_insights: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Generate a comprehensive mock persona for demo purposes when OpenAI API is not available.
    If brand_insights is provided, incorporate them into the persona.
    """
    import random
    
    # Mock names based on gender
    male_names = ["James Wilson", "Michael Rodriguez", "David Chen", "Robert Johnson", "Christopher Lee"]
    female_names = ["Sarah Johnson", "Emily Rodriguez", "Lisa Chen", "Maria Garcia", "Jennifer Wilson"]
    
    name = random.choice(female_names if gender.lower() == "female" else male_names)
    
    # Occupation based on age and condition
    occupations = {
        "diabetes": ["Teacher", "Accountant", "Project Manager", "Sales Representative"],
        "hypertension": ["Engineer", "Manager", "Consultant", "Administrative Assistant"],
        "obesity": ["IT Specialist", "Healthcare Worker", "Business Analyst", "Customer Service Rep"],
        "default": ["Professional", "Manager", "Specialist", "Administrator"]
    }
    
    condition_key = condition.lower() if any(c in condition.lower() for c in occupations.keys()) else "default"
    occupation = random.choice(occupations.get(condition_key, occupations["default"]))
    
    # Condition-specific attributes
    condition_data = {
        "diabetes": {
            "pain_points": [
                "Managing blood sugar fluctuations throughout the day",
                "Coordinating medication timing with meals and activities", 
                "Dealing with insurance coverage for continuous glucose monitors",
                "Finding reliable diabetes-friendly meal options when traveling"
            ],
            "motivations": [
                "Preventing long-term complications like neuropathy",
                "Maintaining energy levels for work and family activities",
                "Learning about new diabetes management technologies",
                "Building confidence in self-management skills"
            ],
            "beliefs": [
                "Advanced glucose monitoring technology can help maintain better control",
                "Collaboration with healthcare providers leads to better outcomes",
                "Consistent lifestyle choices are vital for preventing complications"
            ],
            "medical_bg": "Diagnosed with Type 2 diabetes 3 years ago. Initially managed with metformin, recently added SGLT2 inhibitor. Regular A1C monitoring shows gradual improvement."
        },
        "hypertension": {
            "pain_points": [
                "Remembering to take medications consistently",
                "Managing stress-related blood pressure spikes",
                "Understanding the connection between diet and blood pressure",
                "Dealing with medication side effects"
            ],
            "motivations": [
                "Reducing cardiovascular disease risk",
                "Avoiding the need for additional medications",
                "Maintaining an active lifestyle without restrictions",
                "Setting a good health example for family"
            ],
            "beliefs": [
                "Stress management has a direct impact on blood pressure control",
                "Medication adherence is essential even when symptoms are not noticeable",
                "Lifestyle adjustments can reduce reliance on additional medications"
            ],
            "medical_bg": "Diagnosed with essential hypertension 2 years ago. Currently on ACE inhibitor with good blood pressure control. Regular monitoring at home."
        },
        "default": {
            "pain_points": [
                f"Understanding treatment options for {condition}",
                "Managing symptoms that impact daily activities",
                "Navigating healthcare system and insurance",
                "Balancing treatment costs with other expenses"
            ],
            "motivations": [
                "Achieving optimal health outcomes",
                "Maintaining quality of life",
                "Staying informed about latest treatments",
                "Building strong healthcare relationships"
            ],
            "beliefs": [
                "Proactive communication with clinicians leads to better care decisions",
                "Personal research complements physician guidance",
                "Small, consistent changes create meaningful health improvements"
            ],
            "medical_bg": f"Recently diagnosed with {condition}. Working closely with healthcare team to develop effective treatment plan."
        }
    }
    
    # Select appropriate condition data
    if "diabetes" in condition.lower():
        data = condition_data["diabetes"]
    elif "hypertension" in condition.lower() or "blood pressure" in condition.lower():
        data = condition_data["hypertension"] 
    else:
        data = condition_data["default"]
    
    # Extract MBT insights if brand_insights provided
    motivations = list(data["motivations"])
    beliefs = list(data["beliefs"])
    pain_points = list(data["pain_points"])
    
    if brand_insights:
        # Incorporate brand insights into persona
        brand_motivations = [i.get("text") for i in brand_insights if i.get("type") == "Motivation" and i.get("text")]
        brand_beliefs = [i.get("text") for i in brand_insights if i.get("type") == "Belief" and i.get("text")]
        brand_tensions = [i.get("text") for i in brand_insights if i.get("type") == "Tension" and i.get("text")]
        
        # Prepend brand insights so they take priority
        if brand_motivations:
            motivations = brand_motivations[:3] + motivations[:2]
        if brand_beliefs:
            beliefs = brand_beliefs[:3] + beliefs[:2]
        if brand_tensions:
            pain_points = brand_tensions[:3] + pain_points[:2]
    
    persona = {
        "name": name,
        "demographics": {
            "age": age,
            "gender": gender,
            "location": location,
            "occupation": occupation
        },
        "medical_background": data["medical_bg"],
        "lifestyle_and_values": f"Lives in {location} and works as a {occupation}. Values family time and maintaining good health. Enjoys staying active and informed about health topics. Prioritizes open communication with healthcare providers and appreciates evidence-based treatment approaches.",
        "motivations": motivations,
        "beliefs": beliefs,
        "pain_points": pain_points,
        "communication_preferences": {
            "preferred_channels": "Healthcare provider discussions, reputable medical websites, patient education materials",
            "information_style": "Clear, factual explanations with practical applications",
            "frequency": "Regular updates during appointments, immediate access to emergency information"
        }
    }
    
    return json.dumps(persona, indent=2)

def parse_recruitment_prompt(prompt: str) -> dict:
    """
    Parses a natural language recruitment prompt into structured filters using OpenAI Tools.
    """
    client = get_openai_client()
    if client is None:
        print("❌ OpenAI API key not found. Attempting regex fallback.")
        import re
        filters = {}
        
        # Extract limit (e.g., "2 patients", "find 5")
        limit_match = re.search(r'\b(\d+)\b', prompt)
        if limit_match:
            filters['limit'] = int(limit_match.group(1))
            
        # Extract gender - be careful with word boundaries to avoid "female" matching "male"
        # Check for female first since it contains "male"
        if re.search(r'\b(female|women|woman|ladies)\b', prompt, re.IGNORECASE):
            filters['gender'] = 'Female'
        elif re.search(r'\b(male|men|man|gentleman|gentlemen)\b', prompt, re.IGNORECASE):
            # Only set Male if Female wasn't already set
            if 'gender' not in filters:
                filters['gender'] = 'Male'
            
        # Extract persona type
        if re.search(r'\b(patient|patients)\b', prompt, re.IGNORECASE):
            filters['persona_type'] = 'Patient'
        elif re.search(r'\b(doctor|doctors|hcp|physician|physicians|clinician|clinicians)\b', prompt, re.IGNORECASE):
            filters['persona_type'] = 'HCP'
            
        # Extract age ranges
        elderly_match = re.search(r'\b(elderly|senior|seniors|aged)\b', prompt, re.IGNORECASE)
        young_match = re.search(r'\b(young|youth)\b', prompt, re.IGNORECASE)
        middle_aged_match = re.search(r'\b(middle[\s-]aged)\b', prompt, re.IGNORECASE)
        
        if elderly_match:
            filters['age_min'] = 65
        elif young_match:
            filters['age_max'] = 30
        elif middle_aged_match:
            filters['age_min'] = 40
            filters['age_max'] = 60
            
        # Extract common conditions
        conditions_map = {
            r'\b(diabet(es|ic))\b': 'Diabetes',
            r'\b(hypertension|high blood pressure)\b': 'Hypertension',
            r'\b(copd|chronic obstructive)\b': 'COPD',
            r'\b(arthritis|rheumatoid)\b': 'Arthritis',
            r'\b(migraine|migraines|headache)\b': 'Migraine'
        }
        
        for pattern, condition in conditions_map.items():
            if re.search(pattern, prompt, re.IGNORECASE):
                filters['condition'] = condition
                break
            
        print(f"⚠️ Regex Fallback Filters: {filters}")
        return filters
    else:
        print("✅ OpenAI Client initialized successfully.")

    tools = [
        {
            "type": "function",
            "function": {
                "name": "search_personas",
                "description": "Search for personas based on specific criteria",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "age_min": {"type": "integer", "description": "Minimum age"},
                        "age_max": {"type": "integer", "description": "Maximum age"},
                        "gender": {"type": "string", "enum": ["Male", "Female"], "description": "Gender"},
                        "condition": {"type": "string", "description": "Medical condition (e.g., Diabetes)"},
                        "location": {"type": "string", "description": "Location or region"},
                        "persona_type": {"type": "string", "enum": ["Patient", "HCP"], "description": "Type of persona"},
                        "limit": {"type": "integer", "description": "Number of personas to find", "default": 10}
                    },
                    "required": ["limit"]
                }
            }
        }
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": "You are a helpful assistant that extracts search criteria for recruiting personas. Use the search_personas tool."},
                {"role": "user", "content": prompt}
            ],
            tools=tools,
            tool_choice={"type": "function", "function": {"name": "search_personas"}},
            max_tokens=200,
        )
        
        tool_calls = response.choices[0].message.tool_calls
        if tool_calls:
            args = json.loads(tool_calls[0].function.arguments)
            print(f"✅ Parsed filters via Tools: {args}")
            return args
            
        print("⚠️ No tool calls returned by OpenAI")
        return {}
        
    except Exception as e:
        print(f"Error parsing recruitment prompt with tools: {e}")
        print("⚠️ Falling back to regex parsing.")
        import re
        filters = {}
        
        # Extract limit
        limit_match = re.search(r'\b(\d+)\b', prompt)
        if limit_match:
            filters['limit'] = int(limit_match.group(1))
            
        # Extract gender - check female first
        if re.search(r'\b(female|women|woman|ladies)\b', prompt, re.IGNORECASE):
            filters['gender'] = 'Female'
        elif re.search(r'\b(male|men|man|gentleman|gentlemen)\b', prompt, re.IGNORECASE):
            if 'gender' not in filters:
                filters['gender'] = 'Male'
            
        # Extract persona type
        if re.search(r'\b(patient|patients)\b', prompt, re.IGNORECASE):
            filters['persona_type'] = 'Patient'
        elif re.search(r'\b(doctor|doctors|hcp|physician|physicians|clinician|clinicians)\b', prompt, re.IGNORECASE):
            filters['persona_type'] = 'HCP'
            
        # Extract age ranges
        if re.search(r'\b(elderly|senior|seniors|aged)\b', prompt, re.IGNORECASE):
            filters['age_min'] = 65
        elif re.search(r'\b(young|youth)\b', prompt, re.IGNORECASE):
            filters['age_max'] = 30
        elif re.search(r'\b(middle[\s-]aged)\b', prompt, re.IGNORECASE):
            filters['age_min'] = 40
            filters['age_max'] = 60
            
        # Extract conditions
        conditions_map = {
            r'\b(diabet(es|ic))\b': 'Diabetes',
            r'\b(hypertension|high blood pressure)\b': 'Hypertension',
            r'\b(copd|chronic obstructive)\b': 'COPD',
            r'\b(arthritis|rheumatoid)\b': 'Arthritis',
            r'\b(migraine|migraines|headache)\b': 'Migraine'
        }
        
        for pattern, condition in conditions_map.items():
            if re.search(pattern, prompt, re.IGNORECASE):
                filters['condition'] = condition
                break
            
        return filters


def extract_mbt_from_text(document_text: str, max_chars: int = 6000) -> List[Dict[str, str]]:
    """
    Extract motivations, beliefs, and tensions/pain points from a document.
    Each item includes a type, text, optional segment, and source snippet.
    """
    text = (document_text or "").strip()
    if not text:
        return []

    truncated_text = text[:max_chars]
    client = get_openai_client()

    if client is None:
        return _fallback_mbt_extraction(truncated_text)

    system_prompt = (
        "You are an insights analyst using the Motivations-Beliefs-Tensions (MBT) framework. "
        "Given a pharma brand document, extract up to 5 items for each category. "
        "For each item provide: type ('Motivation' | 'Belief' | 'Tension'), "
        "text (short sentence), segment (e.g., 'General', 'Elderly Patients', 'HCP Endocrinologists'), "
        "and a short source_snippet quoting the text you derived it from."
    )

    extraction_request = [
        {
            "role": "system",
            "content": system_prompt,
        },
        {
            "role": "user",
            "content": f"Document:\n```\n{truncated_text}\n```",
        },
    ]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=extraction_request,
            response_format={"type": "json_object"},
            max_tokens=900,
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        raw_insights = parsed.get("insights") or parsed.get("items") or parsed

        if isinstance(raw_insights, dict):
            # Some models might return {"motivations": [], "beliefs": [], ...}
            normalized = []
            for insight_type, entries in raw_insights.items():
                if not isinstance(entries, list):
                    continue
                for entry in entries:
                    normalized.append(
                        {
                            "type": entry.get("type", insight_type[:-1].title()),
                            "text": entry.get("text", "").strip(),
                            "segment": entry.get("segment", "General"),
                            "source_snippet": entry.get("source_snippet", "").strip(),
                        }
                    )
        elif isinstance(raw_insights, list):
            normalized = [
                {
                    "type": entry.get("type", "Motivation"),
                    "text": entry.get("text", "").strip(),
                    "segment": entry.get("segment", "General"),
                    "source_snippet": entry.get("source_snippet", "").strip(),
                }
                for entry in raw_insights
            ]
        else:
            normalized = []

        return [
            insight
            for insight in normalized
            if insight.get("text")
        ]
    except Exception as exc:
        print(f"⚠️ MBT extraction failed ({exc}). Falling back to heuristics.")
        return _fallback_mbt_extraction(truncated_text)


def _fallback_mbt_extraction(text: str) -> List[Dict[str, str]]:
    """
    Very lightweight keyword-based extraction so the feature still works offline.
    """
    lowered = text.lower()
    insights: List[Dict[str, str]] = []

    def add_insight(insight_type: str, phrase: str):
        insights.append(
            {
                "type": insight_type,
                "text": phrase,
                "segment": "General",
                "source_snippet": "",
            }
        )

    if any(word in lowered for word in ["cost", "afford", "price", "reimbursement"]):
        add_insight("Tension", "Cost and affordability barriers.")
    if any(word in lowered for word in ["side effect", "safety", "tolerability"]):
        add_insight("Belief", "Safety profile requires ongoing reassurance.")
        add_insight("Tension", "Worries about tolerability and side effects.")
    if any(word in lowered for word in ["efficacy", "outcome", "results", "control"]):
        add_insight("Motivation", "Seeking better clinical outcomes and control.")
    if any(word in lowered for word in ["convenient", "once-weekly", "device", "autoinjector"]):
        add_insight("Motivation", "Prefers convenient dosing and delivery formats.")
    if any(word in lowered for word in ["support", "education", "coaching"]):
        add_insight("Belief", "Education and support improve adherence.")

    if not insights:
        add_insight("Motivation", "Desire to manage the condition more confidently.")

    return insights


def enrich_persona_from_brand_context(
    persona_payload: Dict[str, Any],
    brand_insights: List[Dict[str, str]],
    target_fields: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Enrich an existing persona JSON using curated brand insights.
    """
    target_fields = target_fields or ["motivations", "beliefs", "pain_points"]
    client = get_openai_client()
    limited_insights = brand_insights[:20]

    if client is None:
        return _fallback_persona_enrichment(persona_payload, limited_insights, target_fields)

    system_prompt = (
        "You are updating a healthcare persona using verified brand insights. "
        "For the target fields (motivations, beliefs, pain_points), MERGE the existing values "
        "with relevant insights from the brand data. Keep existing items that are still relevant, "
        "add new items from brand insights, and remove duplicates or semantically similar entries. "
        "Keep all other persona content unchanged. Return the full persona JSON."
    )

    user_payload = json.dumps(
        {
            "persona": persona_payload,
            "target_fields": target_fields,
            "brand_insights": limited_insights,
        }
    )[:8000]

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_payload},
            ],
            response_format={"type": "json_object"},
            max_tokens=1200,
        )
        content = response.choices[0].message.content or "{}"
        updated = json.loads(content)
        if isinstance(updated, dict):
            return updated
    except Exception as exc:
        print(f"⚠️ Persona enrichment failed ({exc}). Using fallback.")

    return _fallback_persona_enrichment(persona_payload, limited_insights, target_fields)


def suggest_persona_attributes(
    brand_insights: List[Dict[str, str]],
    persona_type: str = "Patient"
) -> Dict[str, List[str]]:
    """
    Suggest motivations/beliefs/tensions for manual persona creation.
    """
    client = get_openai_client()
    limited_insights = brand_insights[:25]

    if client is None:
        return _fallback_persona_suggestions(limited_insights)

    system_prompt = (
        f"You are helping craft a {persona_type} persona. "
        "Convert the provided brand insights into actionable lists of motivations, "
        "beliefs, and tensions. Provide 3-5 items per list."
    )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps({"brand_insights": limited_insights})[:8000],
                },
            ],
            response_format={"type": "json_object"},
            max_tokens=600,
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        return {
            "motivations": parsed.get("motivations", []),
            "beliefs": parsed.get("beliefs", []),
            "tensions": parsed.get("tensions", []),
        }
    except Exception as exc:
        print(f"⚠️ Persona suggestion generation failed ({exc}). Using fallback.")
        return _fallback_persona_suggestions(limited_insights)


def _fallback_persona_enrichment(
    persona_payload: Dict[str, Any],
    brand_insights: List[Dict[str, str]],
    target_fields: List[str]
) -> Dict[str, Any]:
    """Append simple text snippets to persona fields when LLM is unavailable."""
    persona_copy = json.loads(json.dumps(persona_payload))
    summary_texts = [insight.get("text") for insight in brand_insights if insight.get("text")]
    summary = summary_texts[:3]

    def merge_unique(existing: List[str], new: List[str]) -> List[str]:
        """Merge lists and remove exact duplicates."""
        combined = list(existing or []) + list(new or [])
        seen = set()
        result = []
        for item in combined:
            normalized = item.strip().lower()
            if normalized not in seen:
                seen.add(normalized)
                result.append(item)
        return result

    if "motivations" in target_fields and summary:
        persona_copy["motivations"] = merge_unique(
            persona_copy.get("motivations", []), summary
        )
    if "beliefs" in target_fields and summary:
        persona_copy["beliefs"] = merge_unique(
            persona_copy.get("beliefs", []), summary
        )
    if "pain_points" in target_fields and summary:
        persona_copy["pain_points"] = merge_unique(
            persona_copy.get("pain_points", []), summary
        )

    return persona_copy


def _fallback_persona_suggestions(brand_insights: List[Dict[str, str]]) -> Dict[str, List[str]]:
    texts = [insight.get("text") for insight in brand_insights if insight.get("text")]
    return {
        "motivations": texts[:3],
        "beliefs": texts[3:6] or texts[:2],
        "tensions": texts[6:9] or texts[:2],
    }


def extract_persona_archetypes(brand_insights: List[Dict[str, str]], limit: int = 3) -> List[Dict[str, Any]]:
    """
    Analyze brand insights to identify distinct persona archetypes.
    Returns a list of archetype definitions (name, description, key traits).
    """
    client = get_openai_client()
    if client is None:
        # Fallback mock archetypes
        return [
            {
                "name": "The Proactive Researcher",
                "description": "Highly engaged patient who actively seeks information and treatment options.",
                "key_traits": ["Information-seeking", "Self-advocate", "Tech-savvy"],
                "demographics_hint": "Age 30-50, Urban/Suburban"
            },
            {
                "name": "The Overwhelmed Caregiver",
                "description": "Managing condition for a family member while balancing other responsibilities.",
                "key_traits": ["Stressed", "Time-poor", "Needs support"],
                "demographics_hint": "Age 40-60, Female skew"
            },
            {
                "name": "The Skeptical Traditionalist",
                "description": "Prefers established treatments and relies heavily on doctor's authority.",
                "key_traits": ["Cautious", "Loyal", "Change-averse"],
                "demographics_hint": "Age 60+, Rural/Suburban"
            }
        ][:limit]

    system_prompt = (
        "You are a strategic marketing analyst. Analyze the provided brand insights (Motivations, Beliefs, Tensions) "
        f"to identify {limit} distinct, realistic persona archetypes that represent key segments of the target audience. "
        "Each archetype should have a unique behavioral profile."
    )

    user_payload = json.dumps(brand_insights[:50])  # Limit input size

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Brand Insights:\n{user_payload}\n\nGenerate {limit} distinct archetypes."},
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
        
        # Handle various potential JSON structures
        archetypes = parsed.get("archetypes") or parsed.get("personas") or []
        if not archetypes and isinstance(parsed, list):
            archetypes = parsed
            
        # Normalize output
        normalized = []
        for arch in archetypes:
            normalized.append({
                "name": arch.get("name", "Unknown Archetype"),
                "description": arch.get("description", "No description provided."),
                "key_traits": arch.get("key_traits", []) or arch.get("traits", []),
                "demographics_hint": arch.get("demographics_hint") or arch.get("demographics", "General")
            })
            
        return normalized[:limit]
        
    except Exception as e:
        print(f"⚠️ Archetype extraction failed: {e}")
        return []


def generate_persona_from_archetype(archetype: Dict[str, Any], brand_insights: Optional[List[Dict[str, str]]] = None) -> str:
    """
    Generate a full persona JSON based on an archetype definition and optional brand insights.
    """
    client = get_openai_client()
    
    # Construct prompt based on archetype
    prompt = f"""
    **Role:** You are an AI expert in creating realistic user personas.
    
    **Task:** Generate a detailed persona based on the following archetype:
    
    **Archetype:** {archetype.get('name')}
    **Description:** {archetype.get('description')}
    **Key Traits:** {', '.join(archetype.get('key_traits', []))}
    **Demographics Hint:** {archetype.get('demographics_hint')}
    """
    
    # Add brand insights context if provided
    if brand_insights:
        motivations = [i.get("text") for i in brand_insights if i.get("type") == "Motivation" and i.get("text")]
        beliefs = [i.get("text") for i in brand_insights if i.get("type") == "Belief" and i.get("text")]
        tensions = [i.get("text") for i in brand_insights if i.get("type") == "Tension" and i.get("text")]
        
        prompt += f"""
    **Brand Context:**
    Incorporate these specific insights into the persona's profile where relevant:
    - Motivations: {motivations[:3]}
    - Beliefs: {beliefs[:3]}
    - Tensions: {tensions[:3]}
    """
    
    prompt += """
    **Output Format:**
    Generate a pure JSON object with the following structure (same as standard persona generation):
    {
        "name": "Full Name",
        "demographics": { "age": int, "gender": "string", "location": "string", "occupation": "string" },
        "medical_background": "string",
        "lifestyle_and_values": "string",
        "motivations": ["string"],
        "beliefs": ["string"],
        "pain_points": ["string"],
        "communication_preferences": { ... },
        "persona_type": "Patient" (or HCP if implied by archetype),
        "specialty": "string" (if HCP)
    }
    """
    
    if client is None:
        # Fallback to mock generation using hints
        return generate_mock_persona(
            age=45, gender="Female", condition="General", location="USA", concerns="General", brand_insights=brand_insights
        )

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1500,
        )
        return response.choices[0].message.content or "{}"
    except Exception as e:
        print(f"⚠️ Persona generation from archetype failed: {e}")
        return "{}"

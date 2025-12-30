from openai import OpenAI
import os
from dotenv import load_dotenv
import json
from typing import Optional, List, Dict, Any
import re
import uuid
import random
from datetime import datetime

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

import threading

_openai_client: Optional[OpenAI] = None
_client_lock = threading.Lock()

def get_openai_client() -> Optional[OpenAI]:
    """Return a configured ``OpenAI`` client if an API key is available."""

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    global _openai_client
    with _client_lock:
        if _openai_client is None:
            _openai_client = OpenAI(api_key=api_key)

    return _openai_client


def _enriched_string(value: Optional[str], confidence: float = 0.72, evidence: Optional[List[str]] = None) -> Dict[str, Any]:
    """Create an enriched string payload that matches the persona schema."""

    value = value or ""
    status = "suggested" if value else "empty"
    return {
        "value": value,
        "status": status,
        "confidence": confidence,
        "evidence": evidence or [],
    }


def _enriched_text(value: Optional[str], confidence: float = 0.72, evidence: Optional[List[str]] = None) -> Dict[str, Any]:
    """Create an enriched text payload that matches the persona schema."""

    value = value or ""
    status = "suggested" if value else "empty"
    return {
        "value": value,
        "status": status,
        "confidence": confidence,
        "evidence": evidence or [],
    }


def _enriched_list(values: Optional[List[str]], confidence: float = 0.72, evidence: Optional[List[str]] = None) -> Dict[str, Any]:
    """Create an enriched list payload that matches the persona schema."""

    values = [v for v in values or [] if v]
    status = "suggested" if values else "empty"
    return {
        "value": values,
        "status": status,
        "confidence": confidence,
        "evidence": evidence or [],
    }


def _build_attribute_based_name(
    age: int,
    gender: str,
    condition: str,
    occupation: Optional[str] = None,
) -> str:
    """Construct a descriptive persona name based on provided attributes.

    The output follows an "adjective + role" pattern such as "Methodical Manager"
    so personas feel more like archetypes than real individuals.
    """

    normalized_condition = (condition or "").lower()
    normalized_occupation = (occupation or "").strip()
    seed = hash((age, gender.lower(), normalized_condition, normalized_occupation.lower()))
    rng = random.Random(seed)

    # Build a descriptor list that reflects persona context
    base_descriptors = [
        "Methodical",
        "Resilient",
        "Curious",
        "Pragmatic",
        "Insightful",
        "Steady",
        "Empathetic",
        "Determined",
        "Adaptive",
        "Thoughtful",
    ]

    if age < 30:
        base_descriptors.extend(["Energetic", "Exploratory"])
    elif age > 55:
        base_descriptors.extend(["Seasoned", "Measured"])

    condition_descriptors = {
        "diabetes": ["Disciplined", "Balanced"],
        "hypertension": ["Calm", "Steady"],
        "obesity": ["Motivated", "Committed"],
        "cancer": ["Courageous", "Resilient"],
        "asthma": ["Prepared", "Mindful"],
    }

    for keyword, descriptors in condition_descriptors.items():
        if keyword in normalized_condition:
            base_descriptors.extend(descriptors)
            break

    descriptor = rng.choice(base_descriptors)

    # Role draws from occupation when available; otherwise, fall back to condition
    if normalized_occupation:
        role = normalized_occupation.title()
    else:
        condition_role_map = {
            "diabetes": "Diabetes Navigator",
            "hypertension": "Heart Health Planner",
            "asthma": "Airway Advocate",
            "cancer": "Care Journey Guide",
        }
        role = condition_role_map.get(normalized_condition, "Health Navigator")

    return f"{descriptor} {role}"


def _normalize_brand_insights(brand_insights: Optional[List[Dict[str, str]]]) -> Dict[str, List[str]]:
    """Return brand motivations/beliefs/tensions as lists of text."""

    insights = brand_insights or []
    return {
        "motivations": [i.get("text") for i in insights if i.get("type") == "Motivation" and i.get("text")],
        "beliefs": [i.get("text") for i in insights if i.get("type") == "Belief" and i.get("text")],
        "tensions": [i.get("text") for i in insights if i.get("type") == "Tension" and i.get("text")],
    }


def _build_schema_persona(
    *,
    name: str,
    age: int,
    gender: str,
    condition: str,
    location: str,
    concerns: str,
    occupation: str,
    motivations: List[str],
    beliefs: List[str],
    pain_points: List[str],
    lifestyle: str,
    medical_background: str,
    communication_preferences: Dict[str, Any],
    persona_type: str = "patient",
    brand_insights: Optional[List[Dict[str, str]]] = None,
    existing_persona: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Upgrade or build a persona so it complies with the richer JSON schema while
    preserving legacy top-level keys used by the UI.
    """

    persona_type_value = (persona_type or "patient").lower()
    normalized_brand = _normalize_brand_insights(brand_insights)
    now_iso = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    persona_id = (existing_persona or {}).get("meta", {}).get("persona_id") or str(uuid.uuid4())

    primary_motivation = motivations[0] if motivations else (normalized_brand["motivations"][0] if normalized_brand["motivations"] else "Manage condition confidently")
    main_belief = beliefs[0] if beliefs else (normalized_brand["beliefs"][0] if normalized_brand["beliefs"] else "Good care is collaborative")
    main_tension = pain_points[0] if pain_points else (normalized_brand["tensions"][0] if normalized_brand["tensions"] else concerns or "Balancing treatment with daily life")

    # Compose snapshot details
    age_range = f"{max(age - 5, 18)}-{age + 5}" if age else "Unknown"
    life_context = (
        f"Lives in {location}, works as a {occupation}. {lifestyle}"
        if lifestyle
        else f"Lives in {location} and works as a {occupation}."
    )

    # Schema compliant payload
    schema_payload: Dict[str, Any] = {
        "schema_version": "1.0.0",
        "persona_type": persona_type_value,
        "meta": {
            "persona_id": persona_id,
            "name": name,
            "label": (existing_persona or {}).get("meta", {}).get("label")
            or f"{condition.title()} {gender.title()} archetype",
            "created_at": (existing_persona or {}).get("meta", {}).get("created_at") or now_iso,
            "updated_at": now_iso,
            "brand": (existing_persona or {}).get("meta", {}).get("brand"),
            "indication": condition,
            "disease_area": condition,
            "journey_stage": (existing_persona or {}).get("meta", {}).get("journey_stage") or "Active management",
            "market": location,
            "language": (existing_persona or {}).get("meta", {}).get("language") or "en-US",
            "status": (existing_persona or {}).get("meta", {}).get("status") or "draft",
            "sources": (existing_persona or {}).get("meta", {}).get("sources") or [],
        },
        "core": {
            "snapshot": {
                "age_range": _enriched_string(
                    (existing_persona or {}).get("core", {})
                    .get("snapshot", {})
                    .get("age_range", {})
                    .get("value")
                    or age_range
                ),
                "life_context": _enriched_text(
                    (existing_persona or {}).get("core", {})
                    .get("snapshot", {})
                    .get("life_context", {})
                    .get("value")
                    or life_context
                ),
                "practice_context": (existing_persona or {}).get("core", {})
                .get("snapshot", {})
                .get("practice_context")
                or _enriched_text(""),
            },
            "mbt": {
                "motivation": {
                    "primary_motivation": _enriched_string(primary_motivation, 0.84),
                    "success_definition": _enriched_text(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("motivation", {})
                        .get("success_definition", {})
                        .get("value")
                        or f"Feels successful when daily routines stay on track and {condition.lower()} is controlled without constant worry.",
                        0.78,
                    ),
                    "top_outcomes": _enriched_list(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("motivation", {})
                        .get("top_outcomes", {})
                        .get("value")
                        or motivations[:3]
                        or [
                            "Consistent symptom control",
                            "Confidence in treatment plan",
                            "Energy to participate in family or work",
                        ],
                        0.8,
                    ),
                },
                "beliefs": {
                    "core_belief_statements": _enriched_list(
                        beliefs or main_belief,
                        0.75,
                    ),
                    "trust_anchors": _enriched_list(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("beliefs", {})
                        .get("trust_anchors", {})
                        .get("value")
                        or [
                            "Treating clinician guidance",
                            "Specialist recommendations",
                            "Peer experiences from trusted communities",
                        ],
                        0.7,
                    ),
                    "attitudes_toward_pharma_marketing": _enriched_string(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("beliefs", {})
                        .get("attitudes_toward_pharma_marketing", {})
                        .get("value")
                        or "Skeptical until evidence is clear and endorsed by clinicians.",
                        0.68,
                    ),
                    "locus_of_responsibility": _enriched_string(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("beliefs", {})
                        .get("locus_of_responsibility", {})
                        .get("value")
                        or "Shared between self-management and provider guidance.",
                        0.69,
                    ),
                },
                "tension": {
                    "emotional_undercurrent": _enriched_text(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("tension", {})
                        .get("emotional_undercurrent", {})
                        .get("value")
                        or f"Balances optimism about new therapies with worry about {condition.lower()} progressing.",
                        0.77,
                    ),
                    "main_worry": _enriched_string(main_tension[0] if isinstance(main_tension, list) else main_tension, 0.73),
                    "sensitivity_points": _enriched_list(pain_points[:3] or [concerns], 0.71),
                    "emotional_rewards": _enriched_list(
                        (existing_persona or {})
                        .get("core", {})
                        .get("mbt", {})
                        .get("tension", {})
                        .get("emotional_rewards", {})
                        .get("value")
                        or [
                            "Feeling in control of daily routines",
                            "Positive feedback from clinicians",
                            "Visible progress markers like lab results",
                        ],
                        0.7,
                    ),
                },
                "core_insight": _enriched_text(
                    (existing_persona or {})
                    .get("core", {})
                    .get("mbt", {})
                    .get("core_insight", {})
                    .get("value")
                    or f"Confidence grows when treatment plans acknowledge the daily trade-offs of living with {condition.lower()} while offering clear milestones to celebrate progress.",
                    0.79,
                ),
            },
            "decision_drivers": {
                "ranked_drivers": (
                    (existing_persona or {})
                    .get("core", {})
                    .get("decision_drivers", {})
                    .get("ranked_drivers")
                    or [
                        {"rank": 1, "driver": "Clinical effectiveness", "detail": "Prefers options with consistent real-world evidence."},
                        {"rank": 2, "driver": "Ease of use", "detail": "Looks for simple dosing and minimal disruption to routines."},
                        {"rank": 3, "driver": "Safety and tolerability", "detail": "Wants predictable side-effect management aligned to lifestyle."},
                    ]
                ),
                "tie_breakers": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("decision_drivers", {})
                    .get("tie_breakers", {})
                    .get("value")
                    or ["Insurance coverage", "Physician endorsement", "Peer testimony"],
                    0.65,
                ),
            },
            "messaging": {
                "what_lands": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("messaging", {})
                    .get("what_lands", {})
                    .get("value")
                    or [
                        "Concrete data on outcomes people like them experience",
                        "Visual trackers that show weekly progress",
                        "Stories that acknowledge challenges then show a path forward",
                    ],
                    0.7,
                ),
                "what_fails": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("messaging", {})
                    .get("what_fails", {})
                    .get("value")
                    or [
                        "Overly promotional claims",
                        "Jargon-heavy materials without practical next steps",
                        "Messaging that ignores cost or access hurdles",
                    ],
                    0.65,
                ),
                "preferred_voice": _enriched_string(
                    (existing_persona or {})
                    .get("core", {})
                    .get("messaging", {})
                    .get("preferred_voice", {})
                    .get("value")
                    or "Calm, collaborative, and practical.",
                    0.7,
                ),
                "preferred_proof_format": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("messaging", {})
                    .get("preferred_proof_format", {})
                    .get("value")
                    or ["Infographics with data", "Clinician walkthroughs", "Checklists"],
                    0.66,
                ),
            },
            "barriers_objections": {
                "objections": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("barriers_objections", {})
                    .get("objections", {})
                    .get("value")
                    or pain_points[:3],
                    0.71,
                ),
                "practical_barriers": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("barriers_objections", {})
                    .get("practical_barriers", {})
                    .get("value")
                    or ["Insurance approvals", "Scheduling follow-ups", "Coordinating labs or supplies"],
                    0.68,
                ),
                "perceptual_barriers": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("barriers_objections", {})
                    .get("perceptual_barriers", {})
                    .get("value")
                    or ["Skepticism about promises", "Fear of side effects", "Distrust of marketing claims"],
                    0.66,
                ),
            },
            "channel_behavior": {
                "preferred_sources": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("channel_behavior", {})
                    .get("preferred_sources", {})
                    .get("value")
                    or ["Clinician consults", "Condition-specific newsletters", "Trusted patient forums"],
                    0.65,
                ),
                "engagement_depth": _enriched_string(
                    (existing_persona or {})
                    .get("core", {})
                    .get("channel_behavior", {})
                    .get("engagement_depth", {})
                    .get("value")
                    or "Regular check-ins with bursts of research when symptoms change.",
                    0.64,
                ),
                "visit_behavior": _enriched_text(
                    (existing_persona or {})
                    .get("core", {})
                    .get("channel_behavior", {})
                    .get("visit_behavior", {})
                    .get("value")
                    or "Prepares questions before appointments and prefers seeing data summaries during visits.",
                    0.63,
                ),
                "digital_habits": _enriched_text(
                    (existing_persona or {})
                    .get("core", {})
                    .get("channel_behavior", {})
                    .get("digital_habits", {})
                    .get("value")
                    or "Uses patient portals and mobile trackers; subscribes to a few trusted newsletters.",
                    0.62,
                ),
            },
            "agent_testing_prompts": {
                "paraphrase_test": _enriched_text(
                    (existing_persona or {})
                    .get("core", {})
                    .get("agent_testing_prompts", {})
                    .get("paraphrase_test", {})
                    .get("value")
                    or "Explain why this treatment fits their routine in two sentences using plain language.",
                    0.61,
                ),
                "proof_test": _enriched_text(
                    (existing_persona or {})
                    .get("core", {})
                    .get("agent_testing_prompts", {})
                    .get("proof_test", {})
                    .get("value")
                    or "Share a proof point about sustained outcomes that would reassure them despite concerns about side effects.",
                    0.61,
                ),
                "switch_scenario": _enriched_text(
                    (existing_persona or {})
                    .get("core", {})
                    .get("agent_testing_prompts", {})
                    .get("switch_scenario", {})
                    .get("value")
                    or "Describe how they would react if costs increased mid-therapy and what support would keep them engaged.",
                    0.6,
                ),
                "scoring_hooks": _enriched_list(
                    (existing_persona or {})
                    .get("core", {})
                    .get("agent_testing_prompts", {})
                    .get("scoring_hooks", {})
                    .get("value")
                    or [
                        "Mentions balancing routine with therapy",
                        "References credible data sources",
                        "Acknowledges cost or access mitigation",
                    ],
                    0.6,
                ),
            },
        },
    }

    if persona_type_value == "patient":
        schema_payload["patient_specific"] = {
            "condition_stage": _enriched_string(
                concerns or f"Managing {condition.lower()} with stable routine."
            ),
            "current_regimen_experience": _enriched_string(
                f"Currently balancing treatment plan with daily responsibilities in {location}.",
                0.64,
            ),
        }
    else:
        schema_payload["hcp_specific"] = (existing_persona or {}).get("hcp_specific")

    # Legacy compatibility fields for existing UI surfaces
    schema_payload.update(
        {
            "name": name,
            "persona_type": persona_type_value,
            "demographics": {
                "age": age,
                "gender": gender,
                "location": location,
                "occupation": occupation,
            },
            "medical_background": medical_background,
            "lifestyle_and_values": lifestyle,
            "motivations": motivations,
            "beliefs": beliefs,
            "pain_points": pain_points,
            "communication_preferences": communication_preferences,
        }
    )

    return schema_payload

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
    Return a pure JSON object (no code fences) that conforms to the persona schema below. Populate nested enriched fields with detailed strings and lists. Also include legacy compatibility fields at the top level (name, demographics, medical_background, motivations, beliefs, pain_points, lifestyle_and_values, communication_preferences).

    {
      "schema_version": "1.0.0",
      "persona_type": "patient",
      "meta": {
        "persona_id": "unique string",
        "name": "<full name>",
        "label": "short archetype label",
        "created_at": "<ISO timestamp>",
        "updated_at": "<ISO timestamp>",
        "brand": "",
        "indication": "{condition}",
        "disease_area": "{condition}",
        "journey_stage": "",
        "market": "{location}",
        "language": "en-US",
        "status": "draft",
        "sources": []
      },
      "core": {
        "snapshot": {
          "age_range": {"value": "{age-5}-{age+5}", "status": "suggested", "confidence": 0.7, "evidence": []},
          "life_context": {"value": "rich paragraph about daily life, routines, and responsibilities", "status": "suggested", "confidence": 0.72, "evidence": []}
        },
        "mbt": {
          "motivation": {
            "primary_motivation": {"value": "explicit primary motivation", "status": "suggested", "confidence": 0.8, "evidence": []},
            "success_definition": {"value": "how they define success in their journey", "status": "suggested", "confidence": 0.75, "evidence": []},
            "top_outcomes": {"value": ["list of top desired outcomes"], "status": "suggested", "confidence": 0.74, "evidence": []}
          },
          "beliefs": {
            "core_belief_statements": {"value": ["beliefs about care, control, and responsibility"], "status": "suggested", "confidence": 0.73, "evidence": []},
            "trust_anchors": {"value": ["who or what they trust"], "status": "suggested", "confidence": 0.7, "evidence": []},
            "attitudes_toward_pharma_marketing": {"value": "explicit stance", "status": "suggested", "confidence": 0.68, "evidence": []},
            "locus_of_responsibility": {"value": "self / shared / provider led", "status": "suggested", "confidence": 0.68, "evidence": []}
          },
          "tension": {
            "emotional_undercurrent": {"value": "emotions underlying their behaviors", "status": "suggested", "confidence": 0.72, "evidence": []},
            "main_worry": {"value": "central fear or concern", "status": "suggested", "confidence": 0.7, "evidence": []},
            "sensitivity_points": {"value": ["triggers or topics to avoid"], "status": "suggested", "confidence": 0.69, "evidence": []},
            "emotional_rewards": {"value": ["what makes them feel progress"], "status": "suggested", "confidence": 0.69, "evidence": []}
          },
          "core_insight": {"value": "tight insight that links motivation, belief, and tension", "status": "suggested", "confidence": 0.74, "evidence": []}
        },
        "decision_drivers": {
          "ranked_drivers": [{"rank": 1, "driver": "", "detail": ""}],
          "tie_breakers": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []}
        },
        "messaging": {
          "what_lands": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []},
          "what_fails": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []},
          "preferred_voice": {"value": "", "status": "suggested", "confidence": 0.65, "evidence": []},
          "preferred_proof_format": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []}
        },
        "barriers_objections": {
          "objections": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []},
          "practical_barriers": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []},
          "perceptual_barriers": {"value": [""], "status": "suggested", "confidence": 0.65, "evidence": []}
        },
        "channel_behavior": {
          "preferred_sources": {"value": [""], "status": "suggested", "confidence": 0.64, "evidence": []},
          "engagement_depth": {"value": "", "status": "suggested", "confidence": 0.64, "evidence": []},
          "visit_behavior": {"value": "", "status": "suggested", "confidence": 0.64, "evidence": []},
          "digital_habits": {"value": "", "status": "suggested", "confidence": 0.64, "evidence": []}
        },
        "agent_testing_prompts": {
          "paraphrase_test": {"value": "", "status": "suggested", "confidence": 0.6, "evidence": []},
          "proof_test": {"value": "", "status": "suggested", "confidence": 0.6, "evidence": []},
          "switch_scenario": {"value": "", "status": "suggested", "confidence": 0.6, "evidence": []},
          "scoring_hooks": {"value": [""], "status": "suggested", "confidence": 0.6, "evidence": []}
        }
      },
      "patient_specific": {
        "condition_stage": {"value": "stage description", "status": "suggested", "confidence": 0.64, "evidence": []},
        "current_regimen_experience": {"value": "how they experience their current regimen", "status": "suggested", "confidence": 0.64, "evidence": []}
      },
      "name": "duplicate for compatibility",
      "demographics": {"age": {age}, "gender": "{gender}", "location": "{location}", "occupation": ""},
      "medical_background": "rich summary",
      "lifestyle_and_values": "rich lifestyle narrative",
      "motivations": [""],
      "beliefs": [""],
      "pain_points": [""],
      "communication_preferences": {"preferred_channels": "", "information_style": "", "frequency": ""}
    }
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
            max_tokens=1600,
        )

        content = response.choices[0].message.content or "{}"

        try:
            parsed_json = json.loads(content)
        except json.JSONDecodeError as e:
            print(f"Invalid JSON from OpenAI API, using mock: {e}")
            return generate_mock_persona(age, gender, condition, location, concerns, brand_insights)

        demographics = parsed_json.get("demographics", {}) if isinstance(parsed_json, dict) else {}
        occupation = demographics.get("occupation") or "Professional"
        lifestyle = parsed_json.get("lifestyle_and_values") or f"Lives in {location} and values staying active and connected."
        medical_background = parsed_json.get("medical_background") or f"Managing {condition} with support from local clinicians."
        motivations = parsed_json.get("motivations") or []
        beliefs = parsed_json.get("beliefs") or []
        pain_points = parsed_json.get("pain_points") or []
        persona_type = parsed_json.get("persona_type", "patient")

        fallback_name = _build_attribute_based_name(age, gender, condition, occupation)

        schema_payload = _build_schema_persona(
            name=parsed_json.get("name") or fallback_name,
            age=age,
            gender=gender,
            condition=condition,
            location=location,
            concerns=concerns,
            occupation=occupation,
            motivations=motivations,
            beliefs=beliefs,
            pain_points=pain_points,
            lifestyle=lifestyle,
            medical_background=medical_background,
            communication_preferences=parsed_json.get("communication_preferences", {}),
            persona_type=persona_type,
            brand_insights=brand_insights,
            existing_persona=parsed_json,
        )
        print(f"✅ Generated persona via OpenAI API: {schema_payload.get('name')}")
        return json.dumps(schema_payload, ensure_ascii=False, indent=2)

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
    
    # Occupation based on age and condition
    occupations = {
        "diabetes": ["Teacher", "Accountant", "Project Manager", "Sales Representative"],
        "hypertension": ["Engineer", "Manager", "Consultant", "Administrative Assistant"],
        "obesity": ["IT Specialist", "Healthcare Worker", "Business Analyst", "Customer Service Rep"],
        "default": ["Professional", "Manager", "Specialist", "Administrator"]
    }
    
    condition_key = condition.lower() if any(c in condition.lower() for c in occupations.keys()) else "default"
    occupation = random.choice(occupations.get(condition_key, occupations["default"]))
    name = _build_attribute_based_name(age, gender, condition, occupation)
    
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
    
    lifestyle = (
        f"Lives in {location} and works as a {occupation}. Values family time and maintaining good health. "
        "Enjoys staying active and informed about health topics. Prioritizes open communication with healthcare providers and appreciates evidence-based treatment approaches."
    )
    communication_preferences = {
        "preferred_channels": "Healthcare provider discussions, reputable medical websites, patient education materials",
        "information_style": "Clear, factual explanations with practical applications",
        "frequency": "Regular updates during appointments, immediate access to emergency information",
    }

    schema_payload = _build_schema_persona(
        name=name,
        age=age,
        gender=gender,
        condition=condition,
        location=location,
        concerns=concerns,
        occupation=occupation,
        motivations=motivations,
        beliefs=beliefs,
        pain_points=pain_points,
        lifestyle=lifestyle,
        medical_background=data["medical_bg"],
        communication_preferences=communication_preferences,
        persona_type="patient",
        brand_insights=brand_insights,
    )

    return json.dumps(schema_payload, ensure_ascii=False, indent=2)

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


def extract_persona_from_transcript(transcript_text: str) -> Dict[str, Any]:
    """Map transcript text into enriched persona schema suggestions using heuristics."""

    cleaned = (transcript_text or "").strip()
    if not cleaned:
        return {}

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", cleaned) if s.strip()]
    lower_sentences = [s.lower() for s in sentences]

    def _find_sentences(keywords: List[str], limit: int = 3) -> List[str]:
        matches = []
        for original, lower in zip(sentences, lower_sentences):
            if any(k in lower for k in keywords):
                matches.append(original)
            if len(matches) >= limit:
                break
        return matches

    def _score(matches: List[str], base: float = 0.55) -> float:
        if not matches:
            return 0.45
        bump = min(len(matches), 3) * 0.08
        return round(min(base + bump, 0.9), 2)

    motivations = _find_sentences(["motivat", "drive", "goal", "want to", "hoping"], limit=4)
    beliefs = _find_sentences(["believe", "thinks", "feels", "assume", "expects"], limit=4)
    tensions = _find_sentences(["worry", "concern", "pain", "struggle", "challenge", "frustrated"], limit=4)

    # Demographic extraction heuristics
    age_match = re.search(r"(\d{2})\s*-?\s*year-old", cleaned.lower())
    age_value = age_match.group(1) if age_match else ""
    gender_value = ""
    gender_evidence: List[str] = []
    if any(" she " in s or s.strip().startswith("she ") for s in lower_sentences) or "female" in cleaned.lower():
        gender_value = "Female"
        gender_evidence = [s for s in sentences if "she" in s.lower() or "female" in s.lower()][:1]
    elif any(" he " in s or s.strip().startswith("he ") for s in lower_sentences) or "male" in cleaned.lower():
        gender_value = "Male"
        gender_evidence = [s for s in sentences if "he" in s.lower() or "male" in s.lower()][:1]

    location_match = re.search(r"from ([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)", cleaned)
    location_value = location_match.group(1) if location_match else ""
    location_evidence = [location_match.group(0)] if location_match else []

    # Summaries and synthesized insights
    summary = " ".join(sentences[:2]) if sentences else cleaned[:200]
    core_insight_parts = [motivations[0] if motivations else "", tensions[0] if tensions else ""]
    core_insight = " | ".join([p for p in core_insight_parts if p])

    motivation_score = _score(motivations)
    belief_score = _score(beliefs)
    tension_score = _score(tensions)

    demographics = {
        "age": _enriched_string(age_value, 0.62 if age_value else 0.4, [age_match.group(0)] if age_match else []),
        "gender": _enriched_string(gender_value, 0.61 if gender_value else 0.4, gender_evidence),
        "location": _enriched_string(location_value, 0.58 if location_value else 0.4, location_evidence),
    }

    return {
        "schema_version": "1.0.0",
        "summary": summary,
        "source": {
            "character_count": len(cleaned),
            "sentence_count": len(sentences),
            "excerpt": cleaned[:240],
        },
        "demographics": demographics,
        "legacy": {
            "motivations": motivations,
            "beliefs": beliefs,
            "tensions": tensions,
        },
        "core": {
            "snapshot": {
                "age_range": _enriched_string("", 0.52),
                "life_context": _enriched_text(summary, 0.64, sentences[:1]),
            },
            "mbt": {
                "motivation": {
                    "primary_motivation": _enriched_string(motivations[0] if motivations else "", motivation_score, motivations[:1]),
                    "success_definition": _enriched_text("", 0.55),
                    "top_outcomes": _enriched_list(motivations, motivation_score, motivations),
                },
                "beliefs": {
                    "core_belief_statements": _enriched_list(beliefs, belief_score, beliefs),
                    "trust_anchors": _enriched_list([], 0.5),
                    "attitudes_toward_pharma_marketing": _enriched_string("", 0.48),
                    "locus_of_responsibility": _enriched_string("", 0.48),
                },
                "tension": {
                    "emotional_undercurrent": _enriched_text("", 0.5),
                    "main_worry": _enriched_string(tensions[0] if tensions else "", tension_score, tensions[:1]),
                    "sensitivity_points": _enriched_list(tensions, tension_score, tensions),
                    "emotional_rewards": _enriched_list([], 0.5),
                },
                "core_insight": _enriched_text(core_insight, 0.6, [core_insight] if core_insight else []),
            },
        },
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

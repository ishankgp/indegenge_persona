"""
Coverage Engine - Analyze persona coverage and suggest gaps to fill

This service analyzes the distribution of personas across different
dimensions and suggests new personas to create for better coverage.
"""

import json
import logging
from typing import Dict, List, Optional, Any
from collections import defaultdict

from openai import OpenAI
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func

from . import models

# Load environment variables
backend_dir = os.path.dirname(os.path.dirname(__file__))
env_path = os.path.join(backend_dir, '.env')
load_dotenv(env_path)

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-5.2")

# Lazy-loaded OpenAI client with thread-safe initialization
import threading

_openai_client: Optional[OpenAI] = None
_client_lock = threading.Lock()


def get_openai_client() -> Optional[OpenAI]:
    """Return a configured OpenAI client when an API key is present."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    global _openai_client
    with _client_lock:
        if _openai_client is None:
            _openai_client = OpenAI(api_key=api_key)

    return _openai_client


# Coverage dimension definitions
COVERAGE_DIMENSIONS = {
    "persona_type": {
        "label": "Persona Type",
        "values": ["Patient", "HCP"],
        "weight": 1.0
    },
    "age_range": {
        "label": "Age Range",
        "values": ["18-34", "35-44", "45-54", "55-64", "65+"],
        "weight": 0.8
    },
    "gender": {
        "label": "Gender",
        "values": ["Male", "Female", "Other"],
        "weight": 0.6
    },
    "decision_style": {
        "label": "Decision Style (HCP)",
        "values": ["Evidence-Based", "Experience-Driven", "Peer-Influenced", "Protocol-Follower"],
        "weight": 0.7
    },
    "journey_stage": {
        "label": "Patient Journey Stage",
        "values": ["Newly Diagnosed", "Active Treatment", "Long-term Management", "Treatment Switching"],
        "weight": 0.9
    }
}


def _get_age_range(age: Optional[int]) -> Optional[str]:
    """Convert age to age range bucket."""
    if age is None:
        return None
    if age < 18:
        return None
    elif age < 35:
        return "18-34"
    elif age < 45:
        return "35-44"
    elif age < 55:
        return "45-54"
    elif age < 65:
        return "55-64"
    else:
        return "65+"


def analyze_coverage_gaps(
    brand_id: Optional[int],
    db: Session
) -> Dict[str, Any]:
    """
    Analyze persona coverage and identify gaps.
    
    Args:
        brand_id: Optional brand ID to filter personas
        db: Database session
        
    Returns:
        Coverage analysis with gaps and recommendations
    """
    # Get personas
    query = db.query(models.Persona)
    if brand_id:
        query = query.filter(models.Persona.brand_id == brand_id)
    
    personas = query.all()
    
    if not personas:
        return {
            "total_personas": 0,
            "coverage_score": 0,
            "gaps": [],
            "dimensions": {},
            "message": "No personas found. Start by creating personas to analyze coverage."
        }
    
    # Analyze each dimension
    dimension_analysis = {}
    
    for dim_key, dim_config in COVERAGE_DIMENSIONS.items():
        counts = defaultdict(int)
        
        for persona in personas:
            if dim_key == "persona_type":
                value = persona.persona_type
            elif dim_key == "age_range":
                value = _get_age_range(persona.age)
            elif dim_key == "gender":
                value = persona.gender
            elif dim_key == "decision_style":
                value = persona.decision_style
            elif dim_key == "journey_stage":
                # Try to extract from persona JSON
                try:
                    pj = json.loads(persona.full_persona_json or "{}")
                    value = pj.get("journey_stage") or pj.get("core", {}).get("snapshot", {}).get("life_context", {}).get("value")
                except:
                    value = None
            else:
                value = None
            
            if value:
                # Normalize value
                value_lower = str(value).lower()
                for expected in dim_config["values"]:
                    if expected.lower() in value_lower or value_lower in expected.lower():
                        counts[expected] += 1
                        break
                else:
                    counts[str(value)] += 1
        
        # Calculate coverage for this dimension
        covered = len([v for v in dim_config["values"] if counts.get(v, 0) > 0])
        total = len(dim_config["values"])
        coverage_pct = covered / total if total > 0 else 0
        
        # Identify gaps
        gaps = [v for v in dim_config["values"] if counts.get(v, 0) == 0]
        underrepresented = [v for v in dim_config["values"] if 0 < counts.get(v, 0) < len(personas) * 0.1]
        
        dimension_analysis[dim_key] = {
            "label": dim_config["label"],
            "coverage_percent": round(coverage_pct * 100),
            "distribution": dict(counts),
            "gaps": gaps,
            "underrepresented": underrepresented,
            "weight": dim_config["weight"]
        }
    
    # Calculate overall coverage score
    weighted_score = 0
    total_weight = 0
    
    for dim_key, analysis in dimension_analysis.items():
        weight = COVERAGE_DIMENSIONS[dim_key]["weight"]
        weighted_score += (analysis["coverage_percent"] / 100) * weight
        total_weight += weight
    
    overall_score = round((weighted_score / total_weight) * 100) if total_weight > 0 else 0
    
    # Compile top gaps
    all_gaps = []
    for dim_key, analysis in dimension_analysis.items():
        for gap in analysis["gaps"]:
            all_gaps.append({
                "dimension": dim_key,
                "dimension_label": analysis["label"],
                "missing_value": gap,
                "severity": "high" if COVERAGE_DIMENSIONS[dim_key]["weight"] >= 0.8 else "medium"
            })
        for under in analysis["underrepresented"]:
            all_gaps.append({
                "dimension": dim_key,
                "dimension_label": analysis["label"],
                "missing_value": under,
                "severity": "low",
                "note": "underrepresented"
            })
    
    # Sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_gaps.sort(key=lambda x: severity_order.get(x["severity"], 2))
    
    return {
        "total_personas": len(personas),
        "coverage_score": overall_score,
        "dimensions": dimension_analysis,
        "gaps": all_gaps[:10],  # Top 10 gaps
        "message": _get_coverage_message(overall_score)
    }


def _get_coverage_message(score: int) -> str:
    """Generate a human-readable coverage message."""
    if score >= 80:
        return "Excellent coverage! Your persona library represents most key segments."
    elif score >= 60:
        return "Good coverage with some gaps. Consider adding personas for underrepresented segments."
    elif score >= 40:
        return "Moderate coverage. Several important segments are missing from your library."
    else:
        return "Limited coverage. Create more diverse personas to improve market representation."


async def suggest_next_personas(
    brand_id: Optional[int],
    db: Session,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """
    Use LLM to suggest specific personas to create next.
    
    Args:
        brand_id: Optional brand ID
        db: Database session
        limit: Maximum number of suggestions
        
    Returns:
        List of persona suggestions with pre-filled attributes
    """
    # Get coverage analysis
    coverage = analyze_coverage_gaps(brand_id, db)
    
    if not coverage["gaps"]:
        return [{
            "suggestion": "Your persona library has good coverage!",
            "type": "info"
        }]
    
    client = get_openai_client()
    if client is None:
        # Fallback: return simple suggestions based on gaps
        return _fallback_suggestions(coverage["gaps"], limit)
    
    # Get brand info for context
    brand_name = "General"
    brand_condition = ""
    if brand_id:
        brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
        if brand:
            brand_name = brand.name
    
    # Get existing persona summary
    existing_summary = []
    for dim_key, analysis in coverage["dimensions"].items():
        if analysis["distribution"]:
            existing_summary.append(f"{analysis['label']}: {dict(analysis['distribution'])}")
    
    prompt = f"""You are a pharmaceutical market research expert helping to build a comprehensive persona library.

**Brand:** {brand_name}
**Current Personas:** {coverage['total_personas']}
**Coverage Score:** {coverage['coverage_score']}%

**Existing Distribution:**
{chr(10).join(existing_summary)}

**Identified Gaps:**
{json.dumps(coverage['gaps'][:8], indent=2)}

**Task:** Suggest {limit} specific personas to create that would fill the most important gaps.

For each suggestion, provide:
1. A descriptive name/title for the persona
2. Key attributes (age, gender, type, condition concerns)
3. Why this persona fills an important gap
4. Priority (high/medium)

Return as JSON array:
```json
[
  {{
    "name": "Skeptical Senior Patient",
    "persona_type": "Patient",
    "age": 68,
    "gender": "Male",
    "primary_concern": "Treatment side effects",
    "decision_style": "Peer-Influenced",
    "rationale": "Fills gap in 65+ age group with skeptical mindset",
    "priority": "high"
  }}
]
```"""

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1500,
        )
        
        content = response.choices[0].message.content or "[]"
        
        try:
            parsed = json.loads(content)
            if isinstance(parsed, dict):
                suggestions = parsed.get("suggestions", parsed.get("personas", []))
            else:
                suggestions = parsed
        except json.JSONDecodeError:
            suggestions = []
        
        # Limit and format suggestions
        return suggestions[:limit]
        
    except Exception as e:
        logger.error(f"Persona suggestion failed: {e}")
        return _fallback_suggestions(coverage["gaps"], limit)


def _fallback_suggestions(gaps: List[Dict], limit: int) -> List[Dict[str, Any]]:
    """Generate simple suggestions based on gaps when LLM is unavailable."""
    suggestions = []
    
    for gap in gaps[:limit]:
        dim = gap["dimension"]
        value = gap["missing_value"]
        
        suggestion = {
            "name": f"New {value} Persona",
            "fill_gap": f"{gap['dimension_label']}: {value}",
            "priority": gap["severity"],
            "rationale": f"No personas currently represent the {value} segment"
        }
        
        # Pre-fill known attributes
        if dim == "persona_type":
            suggestion["persona_type"] = value
        elif dim == "age_range":
            # Extract middle of range
            try:
                if value == "65+":
                    suggestion["age"] = 70
                else:
                    parts = value.split("-")
                    suggestion["age"] = int((int(parts[0]) + int(parts[1])) / 2)
            except:
                pass
        elif dim == "gender":
            suggestion["gender"] = value
        elif dim == "decision_style":
            suggestion["decision_style"] = value
        
        suggestions.append(suggestion)
    
    return suggestions


def get_coverage_summary(
    brand_id: Optional[int],
    db: Session
) -> Dict[str, Any]:
    """
    Get a quick coverage summary with visual data.
    
    Returns data suitable for charts and dashboards.
    """
    analysis = analyze_coverage_gaps(brand_id, db)
    
    # Prepare chart data
    chart_data = []
    for dim_key, dim_analysis in analysis["dimensions"].items():
        chart_data.append({
            "dimension": dim_analysis["label"],
            "coverage": dim_analysis["coverage_percent"],
            "gap_count": len(dim_analysis["gaps"])
        })
    
    # Sort by coverage (ascending = worst first)
    chart_data.sort(key=lambda x: x["coverage"])
    
    return {
        "total_personas": analysis["total_personas"],
        "overall_score": analysis["coverage_score"],
        "message": analysis["message"],
        "chart_data": chart_data,
        "top_gaps": analysis["gaps"][:5],
        "needs_attention": analysis["coverage_score"] < 60
    }


# Synchronous wrappers
def suggest_next_personas_sync(
    brand_id: Optional[int],
    db: Session,
    limit: int = 5
) -> List[Dict[str, Any]]:
    """Synchronous wrapper for suggest_next_personas."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(suggest_next_personas(brand_id, db, limit))

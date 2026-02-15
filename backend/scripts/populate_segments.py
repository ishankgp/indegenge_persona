"""
Script to populate persona_subtype (segment) for all existing personas.
Assigns segments based on persona_type and characteristics from full_persona_json.
"""

import os
import sys
import json
import sqlite3
import random

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.segments import SEGMENTS

# Patient segments
PATIENT_SEGMENTS = [seg["name"] for seg in SEGMENTS if seg["persona_type"] == "Patient"]
# HCP segments  
HCP_SEGMENTS = [seg["name"] for seg in SEGMENTS if seg["persona_type"] == "HCP"]


def get_database_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "pharma_personas.db")


def analyze_persona_for_segment(persona_json: dict, persona_type: str) -> str:
    """Analyze persona characteristics to assign the most fitting segment."""
    
    # Get MBT data (motivations, beliefs, tensions)
    motivations = []
    beliefs = []
    pain_points = []
    
    # Extract from various possible locations
    if isinstance(persona_json.get("motivations"), list):
        motivations = persona_json["motivations"]
    if isinstance(persona_json.get("beliefs"), list):
        beliefs = persona_json["beliefs"]
    if isinstance(persona_json.get("pain_points"), list):
        pain_points = persona_json["pain_points"]
    
    # Check nested core.mbt structure
    core = persona_json.get("core", {})
    mbt = core.get("mbt", {})
    
    if mbt:
        motivation_data = mbt.get("motivation", {})
        if motivation_data.get("top_outcomes", {}).get("value"):
            motivations.extend(motivation_data["top_outcomes"]["value"] if isinstance(motivation_data["top_outcomes"]["value"], list) else [])
        
        beliefs_data = mbt.get("beliefs", {})
        if beliefs_data.get("core_belief_statements", {}).get("value"):
            beliefs.extend(beliefs_data["core_belief_statements"]["value"] if isinstance(beliefs_data["core_belief_statements"]["value"], list) else [])
        
        tension_data = mbt.get("tension", {})
        if tension_data.get("sensitivity_points", {}).get("value"):
            pain_points.extend(tension_data["sensitivity_points"]["value"] if isinstance(tension_data["sensitivity_points"]["value"], list) else [])
    
    # Convert to lowercase text for keyword matching
    all_text = " ".join([str(m).lower() for m in motivations + beliefs + pain_points])
    
    if persona_type.lower() == "hcp":
        # HCP segment detection
        evidence_keywords = ["evidence", "clinical", "trial", "data", "research", "guideline", "protocol", "study", "rct"]
        pragmatic_keywords = ["adherence", "cost", "access", "real-world", "practical", "affordable", "insurance", "burden"]
        
        evidence_score = sum(1 for kw in evidence_keywords if kw in all_text)
        pragmatic_score = sum(1 for kw in pragmatic_keywords if kw in all_text)
        
        if evidence_score > pragmatic_score:
            return "Evidence-Based Academic"
        elif pragmatic_score > evidence_score:
            return "Pragmatic Clinician"
        else:
            # Default based on some other heuristics or random
            return random.choice(HCP_SEGMENTS)
    else:
        # Patient segment detection
        proactive_keywords = ["control", "research", "optimize", "understand", "knowledge", "active", "engaged", "informed"]
        overwhelmed_keywords = ["overwhelmed", "struggle", "burden", "complex", "difficult", "stress", "frustrated", "exhausted"]
        skeptical_keywords = ["skeptic", "natural", "avoid", "distrust", "pharma", "side effect", "chemical", "alternative"]
        
        proactive_score = sum(1 for kw in proactive_keywords if kw in all_text)
        overwhelmed_score = sum(1 for kw in overwhelmed_keywords if kw in all_text)
        skeptical_score = sum(1 for kw in skeptical_keywords if kw in all_text)
        
        scores = {
            "Proactive Manager": proactive_score,
            "Overwhelmed Struggler": overwhelmed_score,
            "Skeptical Avoider": skeptical_score
        }
        
        max_score = max(scores.values())
        if max_score > 0:
            # Return segment with highest score
            for segment, score in scores.items():
                if score == max_score:
                    return segment
        
        # Default: distribute evenly
        return random.choice(PATIENT_SEGMENTS)


def populate_segments():
    """Populate persona_subtype for all existing personas."""
    database_path = get_database_path()
    
    if not os.path.exists(database_path):
        print(f"Database not found at {database_path}")
        return
    
    connection = sqlite3.connect(database_path)
    cursor = connection.cursor()
    
    try:
        # Get all personas
        cursor.execute("""
            SELECT id, name, persona_type, persona_subtype, full_persona_json 
            FROM personas
        """)
        personas = cursor.fetchall()
        
        print(f"Found {len(personas)} personas")
        
        updated_count = 0
        for persona_id, name, persona_type, current_subtype, full_json in personas:
            # Parse JSON
            try:
                persona_json = json.loads(full_json) if full_json else {}
            except json.JSONDecodeError:
                persona_json = {}
            
            # Determine segment
            segment = analyze_persona_for_segment(persona_json, persona_type or "Patient")
            
            # Update the persona
            cursor.execute("""
                UPDATE personas 
                SET persona_subtype = ? 
                WHERE id = ?
            """, (segment, persona_id))
            
            status = "[Updated]" if not current_subtype else "[Replaced]"
            print(f"{status}: {name} ({persona_type}) -> {segment}")
            updated_count += 1
        
        connection.commit()
        print(f"\nSuccessfully populated segments for {updated_count} personas")
        
    except sqlite3.Error as e:
        connection.rollback()
        print(f"Error: {e}")
    finally:
        connection.close()


if __name__ == "__main__":
    populate_segments()

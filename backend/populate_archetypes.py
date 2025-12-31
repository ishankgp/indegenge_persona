"""
Script to populate persona_subtype (archetype) for all existing personas.
Assigns archetypes based on persona_type and characteristics from full_persona_json.
"""

import os
import sys
import json
import sqlite3
import random

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.archetypes import ARCHETYPES

# Patient archetypes
PATIENT_ARCHETYPES = [arch["name"] for arch in ARCHETYPES if arch["persona_type"] == "Patient"]
# HCP archetypes  
HCP_ARCHETYPES = [arch["name"] for arch in ARCHETYPES if arch["persona_type"] == "HCP"]


def get_database_path() -> str:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_dir, "pharma_personas.db")


def analyze_persona_for_archetype(persona_json: dict, persona_type: str) -> str:
    """Analyze persona characteristics to assign the most fitting archetype."""
    
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
        # HCP archetype detection
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
            return random.choice(HCP_ARCHETYPES)
    else:
        # Patient archetype detection
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
            # Return archetype with highest score
            for archetype, score in scores.items():
                if score == max_score:
                    return archetype
        
        # Default: distribute evenly
        return random.choice(PATIENT_ARCHETYPES)


def populate_archetypes():
    """Populate persona_subtype for all personas missing it."""
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
            
            # Determine archetype
            archetype = analyze_persona_for_archetype(persona_json, persona_type or "Patient")
            
            # Update the persona
            cursor.execute("""
                UPDATE personas 
                SET persona_subtype = ? 
                WHERE id = ?
            """, (archetype, persona_id))
            
            status = "[Updated]" if not current_subtype else "[Replaced]"
            print(f"{status}: {name} ({persona_type}) -> {archetype}")
            updated_count += 1
        
        connection.commit()
        print(f"\nSuccessfully populated archetypes for {updated_count} personas")
        
    except sqlite3.Error as e:
        connection.rollback()
        print(f"Error: {e}")
    finally:
        connection.close()


if __name__ == "__main__":
    populate_archetypes()


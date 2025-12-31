from typing import List, Dict, Any

# Initial set of persona archetypes
# These serve as base layers for persona generation

ARCHETYPES: List[Dict[str, Any]] = [
    # --- Patient Archetypes ---
    {
        "name": "Overwhelmed Struggler",
        "persona_type": "Patient",
        "description": "Feels defeated by disease progression and treatment burden. Often struggles with adherence due to complexity or emotional burnout.",
        "motivations": [
            "Simplify treatment regimen",
            "See tangible, quick results to regain hope",
            "Reduce daily burden of disease management"
        ],
        "beliefs": [
            "Healthcare is overwhelming and confusing",
            "Medications often fail me despite my efforts",
            "Lifestyle changes are too hard to maintain"
        ],
        "pain_points": [
            "Complex regimens cause frustration",
            "Cost and side effects are major worries",
            "Feeling judged by healthcare providers"
        ]
    },
    {
        "name": "Proactive Manager",
        "persona_type": "Patient",
        "description": "Highly engaged with their health, researches treatments, and seeks partnership with their doctor.",
        "motivations": [
            "Optimize long-term health outcomes",
            "Understand the 'why' behind treatment decisions",
            "Maintain active lifestyle and independence"
        ],
        "beliefs": [
            "Knowledge is power in managing my condition",
            "I am responsible for my own health outcomes",
            "Newer treatments are likely better than old ones"
        ],
        "pain_points": [
            "Lack of detailed information from doctors",
            "Insurance barriers to accessing best treatments",
            "Fear of missing out on the latest advancements"
        ]
    },
    {
        "name": "Skeptical Avoider",
        "persona_type": "Patient",
        "description": "Distrusts pharmaceutical interventions and prefers natural or minimal approaches. Avoids doctors until necessary.",
        "motivations": [
            "Avoid medication side effects at all costs",
            "Prove that natural remedies can work",
            "Minimize interaction with the healthcare system"
        ],
        "beliefs": [
            "Pharma companies just want profit",
            "Natural is always better than chemical",
            "Doctors overprescribe medication"
        ],
        "pain_points": [
            "Feeling pushed into taking drugs",
            "Side effects that affect quality of life",
            "Loss of control over one's body"
        ]
    },
    # --- HCP Archetypes ---
    {
        "name": "Evidence-Based Academic",
        "persona_type": "HCP",
        "description": "Relies strictly on clinical trials and guidelines. Skeptical of marketing, values data above all.",
        "motivations": [
            "Prescribe treatments with proven mortality/morbidity benefits",
            "Stay on the cutting edge of clinical research",
            "Teach and mentor other physicians"
        ],
        "beliefs": [
            "Randomized Controlled Trials (RCTs) are the gold standard",
            "Marketing materials are often biased",
            "Protocol adherence ensures safety"
        ],
        "pain_points": [
            "Patient non-compliance ruining outcomes",
            "Insurance denials for guideline-backed therapies",
            "Lack of time to read all new literature"
        ]
    },
    {
        "name": "Pragmatic Clinician",
        "persona_type": "HCP",
        "description": "Focused on what works in the real world for their specific patient population. Values ease of access and adherence.",
        "motivations": [
            "Ensure patients actually take the medicine (adherence)",
            "Minimize callbacks for prior authorizations",
            "Keep patient costs low"
        ],
        "beliefs": [
            "The best drug is the one the patient can afford and will take",
            "Guidelines are helpful but don't fit every patient",
            "Clinical experience trumps theoretical data"
        ],
        "pain_points": [
            "Administrative burden (PA, paperwork)",
            "Patients stopping meds due to cost",
            "High frequency of side effect complaints"
        ]
    }
]

def get_archetype_by_name(name: str) -> Dict[str, Any] | None:
    for arch in ARCHETYPES:
        if arch["name"] == name:
            return arch
    return None

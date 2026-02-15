from typing import List, Dict, Any

# Initial set of disease context packs
# These provide condition-specific MBT grounding

DISEASE_PACKS: Dict[str, Dict[str, Any]] = {
    "Type 2 Diabetes": {
        "condition_name": "Type 2 Diabetes",
        "motivations": [
            "Avoid long-term complications (blindness, amputation, kidney failure)",
            "Maintain independence in daily life and diet",
            "Achieve stable blood sugar numbers to please doctor"
        ],
        "beliefs": [
            "Diet and lifestyle are as important as medicine",
            "Diabetes progression feels inevitable despite efforts",
            "Insulin is a sign of failure or end-stage disease"
        ],
        "pain_points": [
            "Fear of needles, injections, or hypoglycemia",
            "Frustration with the constant mental math of managing blood sugar",
            "Social stigma of being 'unhealthy' or having a 'lifestyle disease'"
        ]
    },
    "Obesity": {
        "condition_name": "Obesity",
        "motivations": [
            "Lose weight to improve mobility and energy",
            "Reduce risk of other health issues (diabetes, heart disease)",
            "Feel better about physical appearance and fit into clothes"
        ],
        "beliefs": [
            "Weight is a biological struggle, not just willpower",
            "I have tried everything and nothing sticks long-term",
            "Society judges me based on my size"
        ],
        "pain_points": [
            "Shame and specialized equipment needs at doctor visits",
            "Yo-yo dieting and regaining lost weight",
            "Judgment from family, friends, and strangers"
        ]
    },
    "Psoriasis": {
        "condition_name": "Psoriasis",
        "motivations": [
            "Achieve clear skin to feel confident in public",
            "Stop the itching and physical discomfort",
            "Wear normal clothes without worrying about flakes"
        ],
        "beliefs": [
            "This adds a significant burden to my daily routine",
            "Stress makes my flare-ups worse",
            "People think it's contagious or poor hygiene"
        ],
        "pain_points": [
            "Embarrassment in social situations (dating, swimming)",
            "Time-consuming application of creams and topicals",
            "Fear of treatments stopping working over time"
        ]
    }
}

def get_disease_pack(condition_key: str) -> Dict[str, Any] | None:
    # Simple lookup for now, can be enhanced with fuzzy matching if needed
    return DISEASE_PACKS.get(condition_key)

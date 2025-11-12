"""Populate the database with predefined HCP personas from HCP Persona.md."""

import json
import os
from typing import List, Dict

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app import models


def build_personas() -> List[Dict[str, str]]:
    """Return the five HCP personas defined in HCP Persona.md."""

    personas = [
        {
            "name": "Dr. Michael Chen",
            "persona_type": "HCP",
            "persona_subtype": "Dr. Michael Chen",
            "tagline": "Minimalist, rep-only, no time for fluff.",
            "age": 49,
            "gender": "Male",
            "condition": "Critical Care / Internal Medicine",
            "location": "Tier-1 city, tertiary hospital",
            "specialty": "Critical Care / Internal Medicine",
            "practice_setup": "High-acuity ICU, heavy caseload, academic plus on-call",
            "system_context": "Hospital protocols drive choice; strict formulary",
            "decision_influencers": "Hospital guidelines, senior KOLs, internal P&T committee",
            "adherence_to_protocols": "Very high; rarely deviates",
            "channel_use": (
                "Accepts occasional in-person rep if concise & data-first; "
                "Ignores bulk email / portals / webinars"
            ),
            "decision_style": "Rational, guideline-led, low openness to novelty",
            "core_insight": (
                "He wants only what is essential to keep patients safe and compliant with hospital "
                "policy, believes credible info should be short, referenced, and protocol-aligned, "
                "so he engages only when brands respect his time and context."
            ),
            "full_persona": {
                "persona_subtype": "Essential",
                "tagline": "Minimalist, rep-only, no time for fluff.",
                "identity_and_context": {
                    "name": "Dr. Michael Chen",
                    "age_gender": "49, Male",
                    "location": "Tier-1 city, tertiary hospital",
                    "specialty": "Critical Care / Internal Medicine",
                    "practice_setup": "High-acuity ICU, heavy caseload, academic plus on-call",
                    "system_context": "Hospital protocols drive choice; strict formulary",
                    "decision_influencers": "Hospital guidelines, senior KOLs, internal P&T committee",
                },
                "mbt": {
                    "goals_motivations": [
                        "Maintain protocol-aligned, evidence-based care; zero drama with Pharmacy/Administration",
                        "Avoid stock-outs / formulary conflicts",
                        "Get only clinically relevant, outcome-impacting updates",
                        "Minimize cognitive overload in a chaotic environment",
                    ],
                    "beliefs": [
                        "If it's important, it will be in guidelines or hospital protocols.",
                        "Reps exist to serve my information need, not shape my philosophy.",
                        "Digital promos = clutter; vetted PDFs and summaries are enough.",
                    ],
                    "tensions_and_pain_points": [
                        "No time: 10-12 hr shifts + calls; ignores non-essential outreach",
                        "Distrusts brand bias; wants head-to-head + hard endpoints",
                        "Hospital formulary blocks many 'interesting' options anyway",
                    ],
                },
                "behavior_layer": {
                    "adherence_to_protocols": "Very high; rarely deviates",
                    "channel_use": [
                        "Accepts occasional in-person rep if concise & data-first",
                        "Ignores bulk email / portals / webinars",
                    ],
                    "decision_style": "Rational, guideline-led, low openness to novelty",
                },
                "core_insight": (
                    "He wants only what is essential to keep patients safe and compliant with hospital policy, "
                    "believes credible info should be short, referenced, and protocol-aligned, so he engages only "
                    "when brands respect his time and context."
                ),
                "activation_hooks": {
                    "what_to_do": [
                        "1-pager clinical updates; formulary-fit flags; ICU-relevant evidence",
                        "Rep visits only when there's real change (guideline update, new RWE, protocol tweak)",
                    ],
                    "never_do": "Long brand stories, relationship-building lunches, generic digital spam",
                    "cta": "Here is the 1 change that affects your ICU protocol this month.",
                },
            },
        },
        {
            "name": "Dr. Anita Rao",
            "persona_type": "HCP",
            "persona_subtype": "Dr. Anita Rao",
            "tagline": "Rep-first, relationship-driven, pragmatic prescriber.",
            "age": 55,
            "gender": "Female",
            "condition": "Cardiology",
            "location": "Tier-2 city, high-volume cardiology clinic + nursing home rounds",
            "specialty": "Cardiology",
            "practice_setup": "High-volume cardiology clinic plus nursing home rounds",
            "system_context": "Mix of private pay and insurance; brand loyal",
            "decision_influencers": "Long-standing rep relationships, peer KOLs, CME events",
            "adherence_to_protocols": "High to her own habits; tough to shift once stable",
            "channel_use": (
                "Strong preference for rep calls, CMEs, small round tables; "
                "Light email use; rarely logs in to portals"
            ),
            "decision_style": "Trust and experience-led, conservative adopter",
            "core_insight": (
                "She wants trusted, low-friction, proven solutions, believes relationships and reputation equal "
                "risk protection, so face-to-face, continuity, and tangible support are the levers to drive prescribing."
            ),
            "full_persona": {
                "persona_subtype": "Traditionalist",
                "tagline": "Rep-first, relationship-driven, pragmatic prescriber.",
                "identity_and_context": {
                    "name": "Dr. Anita Rao",
                    "age_gender": "55, Female",
                    "location": "Tier-2 city, high-volume cardiology clinic + nursing home rounds",
                    "specialty": "Cardiology",
                    "practice_setup": "High-volume cardiology clinic plus nursing home rounds",
                    "system_context": "Mix of private pay and insurance; brand loyal",
                    "decision_influencers": "Long-standing rep relationships, peer KOLs, CME events",
                },
                "mbt": {
                    "goals_motivations": [
                        "Provide reliable, proven therapies with predictable outcomes",
                        "Maintain smooth clinic flow; avoid switching chaos",
                        "Reward companies that show up with support, samples, and CME",
                    ],
                    "beliefs": [
                        "If I know and trust the company and rep, I can trust their brands.",
                        "New isn't always better; I wait until I see comfort in the community.",
                        "Face-to-face is still the best way to understand a product.",
                    ],
                    "tensions_and_pain_points": [
                        "Overloaded with patients; limited time to verify every claim",
                        "Feels abandoned when brands go fully digital",
                        "Regulatory noise makes her fear being misled or audited",
                    ],
                },
                "behavior_layer": {
                    "adherence_to_protocols": "High to her own habits; tough to shift once stable",
                    "channel_use": [
                        "Strong preference for rep calls, CMEs, small round tables",
                        "Light email use; rarely logs in to portals",
                    ],
                    "decision_style": "Trust and experience-led, conservative adopter",
                },
                "core_insight": (
                    "She wants trusted, low-friction, proven solutions, believes relationships and reputation equal risk "
                    "protection, so face-to-face, continuity, and tangible support are the levers to drive prescribing."
                ),
                "activation_hooks": {
                    "what_to_do": [
                        "Consistent field presence, localized CME, quick leave-behinds, patient education kits",
                    ],
                    "never_do": "Push her to self-serve portal as primary mode",
                    "cta": "Talk to our MSL or join this focused CME to validate what you already use.",
                },
            },
        },
        {
            "name": "Dr. Elena Petrova",
            "persona_type": "HCP",
            "persona_subtype": "Dr. Elena Petrova",
            "tagline": "Data-hungry, hybrid, open to being convinced.",
            "age": 38,
            "gender": "Female",
            "condition": "Endocrinology",
            "location": "Urban academic center",
            "specialty": "Endocrinology",
            "practice_setup": "Academic medical center with research involvement",
            "system_context": "Mix of clinical practice and research; involved in trials",
            "decision_influencers": "Peer-reviewed data, guidelines, expert webinars, key congresses",
            "adherence_to_protocols": "High to evidence; fast but rational adopter",
            "channel_use": (
                "Engages with webinars, on-demand content, HCP portals; Selective rep access; prefers MSLs for complex topics"
            ),
            "decision_style": "Analytical, self-directed, digitally comfortable",
            "core_insight": (
                "She wants high-quality, on-demand, evidence-dense content, believes good data and autonomy beat promotional "
                "noise, so brands that enable smart self-service plus expert access win disproportionate share."
            ),
            "full_persona": {
                "persona_subtype": "Seeker",
                "tagline": "Data-hungry, hybrid, open to being convinced.",
                "identity_and_context": {
                    "name": "Dr. Elena Petrova",
                    "age_gender": "38, Female",
                    "location": "Urban academic center",
                    "specialty": "Endocrinology",
                    "practice_setup": "Academic medical center with research involvement",
                    "system_context": "Mix of clinical practice and research; involved in trials",
                    "decision_influencers": "Peer-reviewed data, guidelines, expert webinars, key congresses",
                },
                "mbt": {
                    "goals_motivations": [
                        "Stay ahead of the curve; offer latest evidence-based options",
                        "Build academic credibility",
                        "Personalize therapy (co-morbidities, access, biomarkers)",
                    ],
                    "beliefs": [
                        "If there is robust data and guideline alignment, I'm in.",
                        "Digital is efficient if curated; I don't need handholding.",
                        "Pharma can be a partner if transparent on data and limitations.",
                    ],
                    "tensions_and_pain_points": [
                        "Over-supply of mediocre content; under-supply of deep clinical insight",
                        "Time fragmented; hates redundant rep calls",
                        "Needs fast answers to nuanced questions (subgroups, comorbidities, RWE)",
                    ],
                },
                "behavior_layer": {
                    "adherence_to_protocols": "High to evidence; fast but rational adopter",
                    "channel_use": [
                        "Engages with webinars, on-demand content, HCP portals",
                        "Selective rep access; prefers MSLs for complex topics",
                    ],
                    "decision_style": "Analytical, self-directed, digitally comfortable",
                },
                "core_insight": (
                    "She wants high-quality, on-demand, evidence-dense content, believes good data and autonomy beat promotional "
                    "noise, so brands that enable smart self-service plus expert access win disproportionate share."
                ),
                "activation_hooks": {
                    "what_to_do": [
                        "Tiered resources: RCT decks, RWE tools, subgroup explorers",
                        "Smart portal with rapid MSL escalation; congress highlights",
                    ],
                    "never_do": "Surface-level brand fluff",
                    "cta": "Explore outcomes in your patient type in two clicks; book a 15-minute MSL slot if needed.",
                },
            },
        },
        {
            "name": "Dr. Luis Martinez",
            "persona_type": "HCP",
            "persona_subtype": "Dr. Luis Martinez",
            "tagline": "Wants to engage, blocked by system, admin, or context.",
            "age": 42,
            "gender": "Male",
            "condition": "Oncology",
            "location": "Public hospital plus satellite clinic, lower-income catchment",
            "specialty": "Oncology",
            "practice_setup": "Public hospital and satellite clinic serving lower-income patients",
            "system_context": "Formularies, tenders, reimbursement caps, overloaded OPD",
            "decision_influencers": "National guidelines, hospital board, cost-effectiveness, NGOs",
            "adherence_to_protocols": "Tries to balance guidelines with affordability",
            "channel_use": (
                "Responds to targeted reps or MSLs who solve logistical problems; Uses email/WhatsApp for quick docs, forms, support links"
            ),
            "decision_style": "Constrained optimizer; not against innovation, but blocked",
            "core_insight": (
                "He is motivated to do the right thing but structurally blocked, believes access and process support matter as much "
                "as efficacy, so solutions that reduce friction unlock adoption."
            ),
            "full_persona": {
                "persona_subtype": "Constrained",
                "tagline": "Wants to engage, blocked by system, admin, or context.",
                "identity_and_context": {
                    "name": "Dr. Luis Martinez",
                    "age_gender": "42, Male",
                    "location": "Public hospital + satellite clinic, lower-income catchment",
                    "specialty": "Oncology",
                    "practice_setup": "Public hospital and satellite clinic serving lower-income patients",
                    "system_context": "Formularies, tenders, reimbursement caps, overloaded OPD",
                    "decision_influencers": "National guidelines, hospital board, cost-effectiveness, NGOs",
                },
                "mbt": {
                    "goals_motivations": [
                        "Give patients equitable access to effective therapies",
                        "Navigate constraints without feeling complicit in undertreatment",
                        "Use tools that simplify prior authorizations, documentation, and patient support",
                    ],
                    "beliefs": [
                        "Best treatment is useless if my patients can't access or afford it.",
                        "Pharma support is acceptable if it's transparent and patient-centric.",
                        "I need help operationalizing care, not just hearing about molecules.",
                    ],
                    "tensions_and_pain_points": [
                        "Reimbursement restrictions versus clinical ideal",
                        "Admin load; drowning in paperwork, prior authorizations, documentation",
                        "Fragmented support programs, each with different processes",
                    ],
                },
                "behavior_layer": {
                    "adherence_to_protocols": "Tries to balance guidelines with affordability",
                    "channel_use": [
                        "Responds to targeted reps or MSLs who solve logistical problems",
                        "Uses email/WhatsApp for quick docs, forms, support links",
                    ],
                    "decision_style": "Constrained optimizer; not against innovation, but blocked",
                },
                "core_insight": (
                    "He is motivated to do the right thing but structurally blocked, believes access and process support matter as much "
                    "as efficacy, so solutions that reduce friction unlock adoption."
                ),
                "activation_hooks": {
                    "what_to_do": [
                        "Streamlined patient support, templates, prior-authorization packs",
                        "Co-created case-based content framed for constrained settings",
                    ],
                    "never_do": "Pitch premium brands without an access story",
                    "cta": "Here is how to get eligible patients on this therapy with minimal extra steps.",
                },
            },
        },
        {
            "name": "Dr. Sara Nilsson",
            "persona_type": "HCP",
            "persona_subtype": "Dr. Sara Nilsson",
            "tagline": "Digital-native, omni-engaged, influence amplifier.",
            "age": 34,
            "gender": "Female",
            "condition": "Respiratory / Allergy",
            "location": "Metro private multi-specialty plus telehealth",
            "specialty": "Respiratory / Allergy",
            "practice_setup": "Metro private multi-specialty clinic plus telehealth",
            "system_context": "Tech-forward clinic; affluent and digital-first patients",
            "decision_influencers": "Global congresses, preprints, KOLs on social platforms, own analytics",
            "adherence_to_protocols": "Rapid adopter; experiments within evidence and safety",
            "channel_use": (
                "Heavy on on-demand portals, apps, webinars, podcasts, chat, remote MSL; Social media active"
            ),
            "decision_style": "Self-directed, data and UX sensitive, networked",
            "core_insight": (
                "She wants to co-create the future of care, believes always-on, personalized, tech-enabled engagement is table "
                "stakes, so integrated, API-like, omnichannel support converts her into a vocal advocate."
            ),
            "full_persona": {
                "persona_subtype": "Enthusiast",
                "tagline": "Digital-native, omni-engaged, influence amplifier.",
                "identity_and_context": {
                    "name": "Dr. Sara Nilsson",
                    "age_gender": "34, Female",
                    "location": "Metro private multi-specialty + telehealth",
                    "specialty": "Respiratory / Allergy",
                    "practice_setup": "Metro private multi-specialty clinic plus telehealth",
                    "system_context": "Tech-forward clinic; affluent and digital-first patients",
                    "decision_influencers": "Global congresses, preprints, KOLs on social platforms, own analytics",
                },
                "mbt": {
                    "goals_motivations": [
                        "Be an early adopter of validated innovations",
                        "Build digital presence, thought leadership, and patient trust",
                        "Use tools, apps, and data to optimize adherence and experience",
                    ],
                    "beliefs": [
                        "If it's not digital, it's behind.",
                        "I can filter bias; just give me fast, deep access to everything.",
                        "Engagement should be two-way, personalized, and continuous.",
                    ],
                    "tensions_and_pain_points": [
                        "Fragmented experiences across brand portals and platforms",
                        "Content rarely tailored to her advanced knowledge level",
                        "Bored by basic rep pitches; wants API over brochure",
                    ],
                },
                "behavior_layer": {
                    "adherence_to_protocols": "Rapid adopter; experiments within evidence and safety",
                    "channel_use": [
                        "Heavy on on-demand portals, apps, webinars, podcasts, chat, remote MSL",
                        "Social media active; influences peers",
                    ],
                    "decision_style": "Self-directed, data and UX sensitive, networked",
                },
                "core_insight": (
                    "She wants to co-create the future of care, believes always-on, personalized, tech-enabled engagement is "
                    "table stakes, so integrated, API-like, omnichannel support converts her into a vocal advocate."
                ),
                "activation_hooks": {
                    "what_to_do": [
                        "Early access to data, tools, calculators, APIs, patient-facing apps",
                        "Invite to advisory boards, beta programs, co-creation sprints",
                    ],
                    "never_do": "Treat her like a mass email recipient or average GP",
                    "cta": "Test this new decision-support module with your patients; your feedback shapes v2.",
                },
            },
        },
    ]

    return personas


def populate_personas(session: Session) -> None:
    personas = build_personas()

    for persona_data in personas:
        existing = (
            session.query(models.Persona)
            .filter(models.Persona.name == persona_data["name"])
            .first()
        )

        if existing:
            print(f"Persona already exists, skipping: {persona_data['name']}")
            continue

        persona = models.Persona(
            name=persona_data["name"],
            persona_type=persona_data["persona_type"],
            persona_subtype=persona_data["persona_subtype"],
            tagline=persona_data["tagline"],
            age=persona_data["age"],
            gender=persona_data["gender"],
            condition=persona_data["condition"],
            location=persona_data["location"],
            specialty=persona_data.get("specialty"),
            practice_setup=persona_data.get("practice_setup"),
            system_context=persona_data.get("system_context"),
            decision_influencers=persona_data.get("decision_influencers"),
            adherence_to_protocols=persona_data.get("adherence_to_protocols"),
            channel_use=persona_data.get("channel_use"),
            decision_style=persona_data.get("decision_style"),
            core_insight=persona_data.get("core_insight"),
            full_persona_json=json.dumps(persona_data["full_persona"], ensure_ascii=False, indent=2),
        )

        session.add(persona)
        print(f"Added persona: {persona.name}")

    session.commit()
    print("All HCP personas have been populated.")


def main():
    session = SessionLocal()
    try:
        populate_personas(session)
    finally:
        session.close()


if __name__ == "__main__":
    main()


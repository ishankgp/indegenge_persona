"""
Mock Veeva CRM data for demonstration purposes.
Contains realistic pharma HCP profiles across multiple specialties.
"""

MOCK_VEEVA_DATA = {
    "hcp_profiles": [
        # ENDOCRINOLOGY - Tier 1 KOLs
        {
            "npi": "1234567890",
            "name": "Dr. Sarah Chen",
            "specialty": "Endocrinology",
            "institution": "Mayo Clinic",
            "location": "Rochester, MN",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-10",
                "call_frequency": "Monthly",
                "engagement_score": 8.2,
                "preferred_topics": ["Diabetes management", "Patient outcomes", "Digital health tools"],
                "objections": ["Cost concerns", "Side effect profile", "Insurance coverage"],
                "call_notes": "Highly engaged physician, interested in innovative treatments."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Metformin", "Jardiance", "Ozempic"],
                "patient_volume": "High (250+ diabetes patients)",
                "adoption_rate": "Early adopter",
                "therapeutic_areas": ["Type 2 Diabetes", "Prediabetes", "Obesity"]
            },
            "patient_demographics": {
                "avg_age": 58,
                "gender_split": {"male": 45, "female": 55},
                "insurance_mix": {"commercial": 70, "medicare": 25, "medicaid": 5},
                "comorbidities": ["Hypertension", "Hyperlipidemia", "Obesity"]
            }
        },
        {
            "npi": "1234567891",
            "name": "Dr. James Patterson",
            "specialty": "Endocrinology",
            "institution": "Stanford Medicine",
            "location": "Palo Alto, CA",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-11",
                "call_frequency": "Bi-weekly",
                "engagement_score": 9.3,
                "preferred_topics": ["GLP-1 therapies", "Continuous glucose monitoring", "Precision medicine"],
                "objections": ["Formulary restrictions", "Prior authorization", "Patient access"],
                "call_notes": "Research-focused, leads clinical trials."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Ozempic", "Mounjaro", "Trulicity", "Dexcom"],
                "patient_volume": "Very High (400+ diabetes patients)",
                "adoption_rate": "Innovation leader",
                "therapeutic_areas": ["Type 1 Diabetes", "Type 2 Diabetes", "Gestational Diabetes"]
            },
            "patient_demographics": {
                "avg_age": 54,
                "gender_split": {"male": 48, "female": 52},
                "insurance_mix": {"commercial": 85, "medicare": 12, "medicaid": 3},
                "comorbidities": ["Hypertension", "Dyslipidemia", "Sleep apnea"]
            }
        },
        # RHEUMATOLOGY
        {
            "npi": "2345678901",
            "name": "Dr. Michael Rodriguez",
            "specialty": "Rheumatology",
            "institution": "Johns Hopkins",
            "location": "Baltimore, MD",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-05",
                "call_frequency": "Bi-weekly",
                "engagement_score": 9.1,
                "preferred_topics": ["Biologic therapies", "Patient quality of life", "Treatment adherence"],
                "objections": ["Prior authorization burden", "Injection frequency", "Monitoring requirements"],
                "call_notes": "Research-focused physician, values clinical trial data."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Humira", "Enbrel", "Rituxan", "Methotrexate"],
                "patient_volume": "Medium (150+ RA patients)",
                "adoption_rate": "Evidence-based adopter",
                "therapeutic_areas": ["Rheumatoid Arthritis", "Psoriatic Arthritis", "Ankylosing Spondylitis"]
            },
            "patient_demographics": {
                "avg_age": 52,
                "gender_split": {"male": 25, "female": 75},
                "insurance_mix": {"commercial": 80, "medicare": 15, "medicaid": 5},
                "comorbidities": ["Depression", "Osteoporosis", "Cardiovascular disease"]
            }
        },
        # NEUROLOGY
        {
            "npi": "3456789012",
            "name": "Dr. Emily Thompson",
            "specialty": "Neurology",
            "institution": "Cleveland Clinic",
            "location": "Cleveland, OH",
            "tier": "Tier 2",
            "interaction_history": {
                "last_call": "2024-09-12",
                "call_frequency": "Monthly",
                "engagement_score": 7.8,
                "preferred_topics": ["Migraine prevention", "Patient education", "Lifestyle modifications"],
                "objections": ["Side effects profile", "Drug interactions", "Patient compliance"],
                "call_notes": "Patient-centric approach, focuses on quality of life improvements."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Aimovig", "Emgality", "Ajovy", "Topiramate"],
                "patient_volume": "High (300+ migraine patients)",
                "adoption_rate": "Moderate adopter",
                "therapeutic_areas": ["Migraine", "Cluster headaches", "Tension headaches"]
            },
            "patient_demographics": {
                "avg_age": 38,
                "gender_split": {"male": 20, "female": 80},
                "insurance_mix": {"commercial": 85, "medicare": 10, "medicaid": 5},
                "comorbidities": ["Anxiety", "Depression", "Sleep disorders"]
            }
        },
        # CARDIOLOGY
        {
            "npi": "5678901234",
            "name": "Dr. David Kumar",
            "specialty": "Cardiology",
            "institution": "Cedar Sinai",
            "location": "Los Angeles, CA",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-11",
                "call_frequency": "Bi-weekly",
                "engagement_score": 8.8,
                "preferred_topics": ["PCSK9 inhibitors", "Cholesterol management", "Cardiovascular outcomes"],
                "objections": ["Cost effectiveness", "Step therapy", "Injection logistics"],
                "call_notes": "Preventive cardiology focus. Strong advocate for aggressive lipid management."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Repatha", "Praluent", "Atorvastatin", "Rosuvastatin"],
                "patient_volume": "High (350+ cardiac patients)",
                "adoption_rate": "Evidence-based adopter",
                "therapeutic_areas": ["Hyperlipidemia", "CAD", "Heart Failure"]
            },
            "patient_demographics": {
                "avg_age": 65,
                "gender_split": {"male": 60, "female": 40},
                "insurance_mix": {"commercial": 65, "medicare": 30, "medicaid": 5},
                "comorbidities": ["Diabetes", "Hypertension", "Obesity"]
            }
        },
        # ONCOLOGY
        {
            "npi": "6789012345",
            "name": "Dr. Steven Chang",
            "specialty": "Oncology",
            "institution": "MD Anderson Cancer Center",
            "location": "Houston, TX",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-13",
                "call_frequency": "Weekly",
                "engagement_score": 9.2,
                "preferred_topics": ["Immunotherapy", "Biomarker testing", "Precision oncology"],
                "objections": ["Toxicity management", "Sequencing decisions", "Access delays"],
                "call_notes": "Leading lung cancer researcher. Expertise in immunotherapy combinations."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Keytruda", "Opdivo", "Tecentriq", "Tagrisso"],
                "patient_volume": "High (250+ cancer patients)",
                "adoption_rate": "Innovation leader",
                "therapeutic_areas": ["Lung Cancer", "Melanoma", "Bladder Cancer"]
            },
            "patient_demographics": {
                "avg_age": 64,
                "gender_split": {"male": 52, "female": 48},
                "insurance_mix": {"commercial": 70, "medicare": 25, "medicaid": 5},
                "comorbidities": ["COPD", "Cardiovascular disease", "Secondary malignancies"]
            }
        },
        # PSYCHIATRY
        {
            "npi": "7890123456",
            "name": "Dr. Rebecca Miller",
            "specialty": "Psychiatry",
            "institution": "McLean Hospital",
            "location": "Belmont, MA",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-10",
                "call_frequency": "Monthly",
                "engagement_score": 8.1,
                "preferred_topics": ["Treatment-resistant depression", "Novel antidepressants", "Suicide prevention"],
                "objections": ["Side effect profiles", "Drug interactions", "Monitoring requirements"],
                "call_notes": "Depression specialist with interest in treatment-resistant cases."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Spravato", "Trintellix", "Rexulti", "Abilify"],
                "patient_volume": "Medium (180+ depression patients)",
                "adoption_rate": "Evidence-based adopter",
                "therapeutic_areas": ["Major Depression", "Bipolar Disorder", "Treatment-Resistant Depression"]
            },
            "patient_demographics": {
                "avg_age": 42,
                "gender_split": {"male": 35, "female": 65},
                "insurance_mix": {"commercial": 80, "medicare": 15, "medicaid": 5},
                "comorbidities": ["Anxiety", "Substance abuse", "PTSD"]
            }
        },
        # GASTROENTEROLOGY
        {
            "npi": "9012345678",
            "name": "Dr. Mark Thompson",
            "specialty": "Gastroenterology",
            "institution": "Mount Sinai Health System",
            "location": "New York, NY",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-11",
                "call_frequency": "Bi-weekly",
                "engagement_score": 8.3,
                "preferred_topics": ["IBD biologics", "Biosimilars", "Treat-to-target strategies"],
                "objections": ["Prior authorization", "Infusion scheduling", "Loss of response"],
                "call_notes": "IBD specialist with large referral practice."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Remicade", "Humira", "Entyvio", "Stelara"],
                "patient_volume": "High (220+ IBD patients)",
                "adoption_rate": "Early adopter",
                "therapeutic_areas": ["Crohn's Disease", "Ulcerative Colitis", "IBD"]
            },
            "patient_demographics": {
                "avg_age": 35,
                "gender_split": {"male": 45, "female": 55},
                "insurance_mix": {"commercial": 85, "medicare": 10, "medicaid": 5},
                "comorbidities": ["Anxiety", "Arthritis", "Anemia"]
            }
        }
    ]
}

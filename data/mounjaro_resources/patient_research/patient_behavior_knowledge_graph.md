# Patient Behavior & Treatment Adherence Data
## For Knowledge Graph Extraction

This document contains structured data about patient behaviors, motivations, and barriers that can be extracted into knowledge graph nodes and relationships.

---

## ENTITY: Patient Motivations for Treatment Adherence

### Motivation Categories

| ID | Motivation | Description | Related_Behavior | Strength |
|----|------------|-------------|------------------|----------|
| MOT_001 | Education_Understanding | Higher disease knowledge improves adherence | Information_Seeking | High |
| MOT_002 | Self_Efficacy | Belief in ability to manage condition | Self_Management | High |
| MOT_003 | Family_Support | Strong family/social network | Social_Engagement | High |
| MOT_004 | Risk_Awareness | Understanding of complications | Preventive_Behavior | Medium |
| MOT_005 | Provider_Trust | Strong patient-provider relationship | Care_Engagement | High |
| MOT_006 | Illness_Acceptance | Accepting chronic nature of condition | Treatment_Commitment | Medium |
| MOT_007 | Weight_Loss_Desire | Strong motivation to lose weight | GLP1_Preference | High |
| MOT_008 | Quality_of_Life | Desire for improved daily functioning | Lifestyle_Change | High |
| MOT_009 | Long_Term_Health | Focus on future health outcomes | Sustained_Adherence | High |
| MOT_010 | Simplified_Regimen | Preference for easier treatment | Once_Weekly_Injectable | Medium |

---

## ENTITY: Barriers to Treatment Adherence

### Barrier Categories

| ID | Barrier | Category | Impact_Level | Intervention_Type |
|----|---------|----------|--------------|-------------------|
| BAR_001 | Medication_Cost | Financial | High | Access_Programs |
| BAR_002 | Side_Effects_GI | Treatment | Medium | Dose_Titration |
| BAR_003 | Injection_Fear | Psychological | Medium | Education |
| BAR_004 | Depression | Psychological | High | Mental_Health_Support |
| BAR_005 | Diabetes_Distress | Psychological | High | Counseling |
| BAR_006 | Low_Health_Literacy | Knowledge | High | Simplified_Education |
| BAR_007 | Complex_Regimen | Treatment | Medium | Simplification |
| BAR_008 | Insurance_Coverage | Financial | High | Prior_Authorization |
| BAR_009 | Stigma_Weight | Social | Medium | Supportive_Messaging |
| BAR_010 | Stigma_Diabetes | Social | Medium | Destigmatization |
| BAR_011 | Lack_Family_Support | Social | Medium | Support_Groups |
| BAR_012 | Time_Constraints | Lifestyle | Medium | Convenience_Focus |
| BAR_013 | Forgetfulness | Behavioral | Low | Reminders |
| BAR_014 | Cognitive_Impairment | Health | High | Caregiver_Involvement |
| BAR_015 | Long_Term_Safety_Concerns | Psychological | Medium | Evidence_Based_Info |

---

## ENTITY: Patient Segments (Psychographic)

### Segment Definitions

```
SEGMENT: Self_Achiever
├── TRAITS: [Proactive, Goal_Oriented, Health_Conscious]
├── BEHAVIORS: [Regular_Checkups, Self_Monitoring, Research_Driven]
├── MOTIVATIONS: [MOT_001, MOT_002, MOT_009]
├── BARRIERS: [BAR_015]
├── PREFERRED_MESSAGING: Achievement, Control, Progress_Tracking
└── CHANNEL_PREFERENCE: Digital, Mobile_Apps, Wearables

SEGMENT: Balance_Seeker
├── TRAITS: [Wellness_Oriented, Information_Gatherer, Holistic]
├── BEHAVIORS: [Multi_Source_Research, Provider_Consultation]
├── MOTIVATIONS: [MOT_001, MOT_005, MOT_008]
├── BARRIERS: [BAR_007, BAR_012]
├── PREFERRED_MESSAGING: Balance, Well_Being, Lifestyle_Integration
└── CHANNEL_PREFERENCE: Healthcare_Provider, Online_Communities

SEGMENT: Priority_Juggler
├── TRAITS: [Busy, Family_First, Time_Constrained]
├── BEHAVIORS: [Delayed_Self_Care, Family_Health_Focus]
├── MOTIVATIONS: [MOT_003, MOT_010]
├── BARRIERS: [BAR_012, BAR_013]
├── PREFERRED_MESSAGING: Convenience, Family_Benefit, Time_Saving
└── CHANNEL_PREFERENCE: Quick_Digital, SMS_Reminders

SEGMENT: Willful_Endurer
├── TRAITS: [Disengaged, Reactive, Skeptical]
├── BEHAVIORS: [Emergency_Only_Care, Treatment_Avoidance]
├── MOTIVATIONS: [MOT_004] (when complications arise)
├── BARRIERS: [BAR_003, BAR_006, BAR_010]
├── PREFERRED_MESSAGING: Crisis_Prevention, Practical_Benefits
└── CHANNEL_PREFERENCE: Provider_Direct, Minimal_Outreach

SEGMENT: Cost_Conscious
├── TRAITS: [Budget_Aware, Value_Seeking, Practical]
├── BEHAVIORS: [Generic_Preference, Savings_Program_Use]
├── MOTIVATIONS: [MOT_008, MOT_010]
├── BARRIERS: [BAR_001, BAR_008]
├── PREFERRED_MESSAGING: Affordability, Value, Savings_Programs
└── CHANNEL_PREFERENCE: Pharmacy, Cost_Comparison_Tools

SEGMENT: Social_Influencer
├── TRAITS: [Community_Connected, Trend_Aware, Vocal]
├── BEHAVIORS: [Social_Media_Active, Experience_Sharing]
├── MOTIVATIONS: [MOT_007, MOT_008]
├── BARRIERS: [BAR_009]
├── PREFERRED_MESSAGING: Success_Stories, Community, Transformation
└── CHANNEL_PREFERENCE: Social_Media, Online_Forums, Influencers
```

---

## ENTITY: Treatment Journey Stages

### Journey Map

```
STAGE: Awareness
├── PATIENT_ACTIONS: [Research, Symptom_Recognition, Media_Exposure]
├── TOUCHPOINTS: [Social_Media, News, Word_of_Mouth, Advertising]
├── EMOTIONS: [Curiosity, Hope, Skepticism]
├── KEY_QUESTIONS: ["Does this work?", "Is it safe?", "What are side effects?"]
└── CONTENT_NEEDS: [Basic_Info, Success_Stories, Safety_Overview]

STAGE: Consideration
├── PATIENT_ACTIONS: [Provider_Discussion, Insurance_Check, Comparison]
├── TOUCHPOINTS: [Doctor_Visit, Pharmacy, Insurance_Portal]
├── EMOTIONS: [Anticipation, Anxiety, Uncertainty]
├── KEY_QUESTIONS: ["Is this right for me?", "Can I afford it?", "How do I use it?"]
└── CONTENT_NEEDS: [Efficacy_Data, Cost_Info, Eligibility_Criteria]

STAGE: Initiation
├── PATIENT_ACTIONS: [Prescription_Fill, First_Injection, Side_Effect_Monitoring]
├── TOUCHPOINTS: [Pharmacy, Starter_Kit, Mobile_App]
├── EMOTIONS: [Excitement, Nervousness, Determination]
├── KEY_QUESTIONS: ["Am I doing this right?", "Are these side effects normal?"]
└── CONTENT_NEEDS: [Injection_Training, Side_Effect_Management, Expectations]

STAGE: Titration
├── PATIENT_ACTIONS: [Dose_Escalation, Side_Effect_Management, Progress_Tracking]
├── TOUCHPOINTS: [Follow_Up_Visits, Refills, Support_Calls]
├── EMOTIONS: [Patience, Frustration, Encouragement]
├── KEY_QUESTIONS: ["When will I see results?", "Should I increase dose?"]
└── CONTENT_NEEDS: [Titration_Schedule, Progress_Benchmarks, Tips]

STAGE: Maintenance
├── PATIENT_ACTIONS: [Consistent_Use, Lifestyle_Integration, Regular_Monitoring]
├── TOUCHPOINTS: [Quarterly_Visits, Refills, Health_Apps]
├── EMOTIONS: [Confidence, Satisfaction, Routine]
├── KEY_QUESTIONS: ["How long do I stay on this?", "Can I reduce dose?"]
└── CONTENT_NEEDS: [Long_Term_Data, Lifestyle_Tips, Maintenance_Guidance]

STAGE: Discontinuation_Risk
├── PATIENT_ACTIONS: [Missed_Doses, Cost_Concerns, Side_Effect_Complaints]
├── TOUCHPOINTS: [Lapsed_Refills, Support_Outreach]
├── EMOTIONS: [Frustration, Disappointment, Doubt]
├── KEY_QUESTIONS: ["Is this worth it?", "Are there alternatives?"]
└── CONTENT_NEEDS: [Adherence_Support, Alternative_Options, Success_Reminder]
```

---

## RELATIONSHIPS: Entity Connections

### Motivation → Behavior Relationships

```
RELATIONSHIP: Drives
├── Education_Understanding → Information_Seeking
├── Self_Efficacy → Self_Management
├── Family_Support → Social_Engagement
├── Risk_Awareness → Preventive_Behavior
├── Weight_Loss_Desire → GLP1_Preference
└── Simplified_Regimen → Once_Weekly_Injectable

RELATIONSHIP: Influences
├── Provider_Trust → Treatment_Initiation
├── Illness_Acceptance → Long_Term_Adherence
├── Quality_of_Life → Lifestyle_Modification
└── Long_Term_Health → Sustained_Treatment
```

### Barrier → Outcome Relationships

```
RELATIONSHIP: Causes
├── Medication_Cost → Discontinuation
├── Side_Effects_GI → Dose_Reduction
├── Depression → Non_Adherence
├── Low_Health_Literacy → Misuse
├── Stigma_Weight → Delayed_Treatment
└── Insurance_Coverage → Access_Denial

RELATIONSHIP: Requires_Intervention
├── Medication_Cost → Access_Programs
├── Side_Effects_GI → Titration_Support
├── Injection_Fear → Training_Videos
├── Depression → Mental_Health_Referral
└── Low_Health_Literacy → Simplified_Materials
```

### Segment → Content Relationships

```
RELATIONSHIP: Responds_To
├── Self_Achiever → Data_Driven_Content
├── Balance_Seeker → Holistic_Messaging
├── Priority_Juggler → Convenience_Focused
├── Willful_Endurer → Crisis_Prevention
├── Cost_Conscious → Value_Messaging
└── Social_Influencer → Transformation_Stories
```

---

## ATTRIBUTES: Demographic Data Points

### Age-Based Patterns

| Age_Group | Primary_Motivation | Primary_Barrier | GLP1_Likelihood | Adherence_Pattern |
|-----------|-------------------|-----------------|-----------------|-------------------|
| 20-29 | Weight_Loss_Cosmetic | Cost, Stigma | Low | Variable |
| 30-39 | Weight_Prevention | Time_Constraints | Medium | Moderate |
| 40-49 | Comorbidity_Prevention | Complex_Regimen | High | Good |
| 50-59 | Chronic_Disease_Management | Side_Effects | Higher | High |
| 60+ | Complication_Avoidance | Cognitive, Cost | Medium | Variable |

### Gender Patterns

| Gender | Representation | Primary_Driver | Messaging_Preference |
|--------|---------------|----------------|---------------------|
| Female | 65-77% | Weight_Loss, QoL | Transformation, Community |
| Male | 23-35% | Health_Metrics, Control | Data, Achievement |

### Income Patterns

| Income_Level | Access_Likelihood | Primary_Barrier | Support_Needed |
|--------------|-------------------|-----------------|----------------|
| <$50K | 72% lower | Cost, Coverage | Savings_Programs |
| $50K-$100K | Moderate | Coverage_Gaps | Copay_Assistance |
| $100K-$250K | Higher | Time | Convenience |
| >$250K | 72% higher | Minimal | Premium_Experience |

---

## Sources & Citations

1. NIH PubMed Central - Treatment adherence studies
2. Frontiers in Endocrinology - GLP-1 patient experience
3. Health Affairs - Psychographic segmentation healthcare
4. JMIR - Patient-reported outcomes GLP-1
5. Real Chemistry - GLP-1 patient demographics report
6. ADA Diabetes Care - Adherence interventions review

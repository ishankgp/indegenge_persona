# Obesity & Diabetes Patient Decision-Making Research
## For Persona Testing & Knowledge Graph Creation

---

## DECISION FACTORS: Treatment Selection

### Primary Decision Attributes

| Factor | Weight | Patient_Priority | HCP_Priority |
|--------|--------|------------------|--------------|
| Efficacy | High | Weight_Loss_Amount | A1C_Reduction |
| Safety | High | Long_Term_Effects | Contraindications |
| Side_Effects | Medium-High | GI_Tolerance | Manageable |
| Cost | High | Out_of_Pocket | Coverage |
| Convenience | Medium | Dosing_Frequency | Compliance |
| Administration | Medium | Injection_vs_Oral | Technique |

### Decision Journey Mapping

```yaml
Decision_Stage_1_Problem_Recognition:
  Triggers:
    - Failed_Diet_Attempts
    - Comorbidity_Diagnosis
    - Doctor_Recommendation
    - Social_Media_Exposure
    - Weight_Related_Event
  Patient_Mindset:
    - "I've tried everything"
    - "My health is suffering"
    - "I need medical help"
  Key_Question: "Is there a real solution?"

Decision_Stage_2_Information_Search:
  Sources:
    Primary:
      - Healthcare_Provider
      - Internet_Search
      - Social_Media
    Secondary:
      - Friends_Family
      - Online_Forums
      - News_Articles
  Patient_Mindset:
    - "What are my options?"
    - "Does this really work?"
    - "What do others say?"
  Key_Question: "Which treatment is right for me?"

Decision_Stage_3_Evaluation:
  Criteria:
    - Efficacy_vs_Side_Effects
    - Cost_vs_Coverage
    - Injection_Acceptability
    - Brand_Reputation
    - Word_of_Mouth
  Patient_Mindset:
    - "Comparing Mounjaro vs Wegovy vs others"
    - "Can I afford this?"
    - "Am I okay with injections?"
  Key_Question: "Is this worth the tradeoffs?"

Decision_Stage_4_Trial_Decision:
  Influencers:
    - Doctor_Recommendation_Strength: High
    - Insurance_Approval: Critical
    - Personal_Motivation: High
    - Family_Support: Medium
  Patient_Mindset:
    - "I'm ready to try this"
    - "I'll give it a few months"
  Key_Question: "Am I committed to this?"

Decision_Stage_5_Continuation_Decision:
  Reassessment_Points:
    - Week_4: Side_Effect_Tolerance
    - Week_12: Initial_Results
    - Week_24: Sustained_Progress
    - Week_52: Long_Term_Commitment
  Continue_Factors:
    - Visible_Weight_Loss
    - Improved_Energy
    - Better_Lab_Results
    - Manageable_Side_Effects
  Discontinue_Factors:
    - Intolerable_Side_Effects
    - Insufficient_Results
    - Cost_Burden
    - Life_Circumstances
```

---

## PATIENT PERSONAS: Detailed Profiles

### Persona 1: "Maria" - The Weight Loss Warrior

```yaml
Profile:
  Name: Maria
  Age: 45
  Gender: Female
  BMI: 34
  Conditions: [Prediabetes, Hypertension]
  Income: $85,000
  Insurance: Commercial_PPO

Demographics:
  Education: College_Degree
  Occupation: Office_Manager
  Family: Married, 2_Children
  Location: Suburban

Psychographics:
  Segment: Self_Achiever
  Values: [Health, Family, Appearance]
  Lifestyle: Busy_Professional
  Tech_Comfort: High

Health_History:
  Weight_History: Yo_Yo_Dieting
  Past_Attempts: [Weight_Watchers, Gym, Keto]
  Medications: [Lisinopril]
  HCP_Relationship: Trusting

Treatment_Journey:
  Awareness_Source: Social_Media_Friend
  Decision_Driver: Fear_of_Diabetes
  Concerns: [Side_Effects, Injections, Long_Term]
  Motivations: [Weight_Loss, Energy, Health]

Messaging_Preferences:
  Tone: Empowering, Data_Driven
  Content: Success_Stories, Clinical_Data
  Channel: Mobile_App, Email
  Frequency: Weekly

Potential_Barriers:
  - Initial_Injection_Anxiety
  - GI_Side_Effects_First_Month
  - Concern_About_Long_Term_Use

Support_Needs:
  - Injection_Training_Video
  - Side_Effect_Tips
  - Progress_Tracking_App
```

### Persona 2: "Robert" - The Reluctant Diabetic

```yaml
Profile:
  Name: Robert
  Age: 58
  Gender: Male
  BMI: 32
  Conditions: [Type_2_Diabetes, High_Cholesterol]
  Income: $120,000
  Insurance: Medicare_Advantage

Demographics:
  Education: Graduate_Degree
  Occupation: Engineer_Retired
  Family: Married, Grandchildren
  Location: Urban

Psychographics:
  Segment: Willful_Endurer
  Values: [Independence, Logic, Family]
  Lifestyle: Sedentary_Active_Mind
  Tech_Comfort: Moderate

Health_History:
  Weight_History: Gradual_Gain
  Past_Attempts: [Doctor_Advised_Diet]
  Medications: [Metformin, Statin]
  HCP_Relationship: Skeptical_But_Compliant

Treatment_Journey:
  Awareness_Source: Endocrinologist_Recommendation
  Decision_Driver: Poor_A1C_Results
  Concerns: [Is_This_Necessary, Side_Effects, Cost]
  Motivations: [A1C_Control, Avoid_Insulin, Grandchildren]

Messaging_Preferences:
  Tone: Factual, No_Nonsense
  Content: Clinical_Evidence, Numbers
  Channel: Doctor_Discussion, Email
  Frequency: Minimal

Potential_Barriers:
  - Resistance_to_New_Medications
  - "I'm too old for injectable"
  - Cost_on_Fixed_Income

Support_Needs:
  - Doctor-Led_Education
  - Simple_Instructions
  - Spousal_Involvement
```

### Persona 3: "Jessica" - The Social Seeker

```yaml
Profile:
  Name: Jessica
  Age: 32
  Gender: Female
  BMI: 36
  Conditions: [Obesity, Mild_Anxiety]
  Income: $55,000
  Insurance: Employer_High_Deductible

Demographics:
  Education: Some_College
  Occupation: Retail_Manager
  Family: Single
  Location: Urban

Psychographics:
  Segment: Social_Influencer
  Values: [Community, Appearance, Authenticity]
  Lifestyle: Social_Active
  Tech_Comfort: Very_High

Health_History:
  Weight_History: Always_Overweight
  Past_Attempts: [Gym_Memberships, Fad_Diets]
  Medications: [None]
  HCP_Relationship: Infrequent_Visits

Treatment_Journey:
  Awareness_Source: TikTok_Instagram
  Decision_Driver: Friend_Transformation
  Concerns: [Cost, Stigma, "Taking Shortcut"]
  Motivations: [Appearance, Dating, Energy]

Messaging_Preferences:
  Tone: Relatable, Community_Focused
  Content: Transformation_Stories, Real_People
  Channel: Social_Media, Video
  Frequency: Daily_Engagement

Potential_Barriers:
  - High_Deductible_Cost
  - Feels_Like_Cheating
  - Access_Without_Diabetes_Diagnosis

Support_Needs:
  - Community_Support_Group
  - Savings_Program_Info
  - Lifestyle_Tips_Beyond_Medication
```

### Persona 4: "David" - The Cost-Conscious Caregiver

```yaml
Profile:
  Name: David
  Age: 52
  Gender: Male
  BMI: 38
  Conditions: [Type_2_Diabetes, Sleep_Apnea]
  Income: $48,000
  Insurance: Medicaid

Demographics:
  Education: High_School
  Occupation: Warehouse_Worker
  Family: Married, Caregiver_for_Parent
  Location: Rural

Psychographics:
  Segment: Cost_Conscious
  Values: [Family, Hard_Work, Practicality]
  Lifestyle: Labor_Intensive_Work
  Tech_Comfort: Low

Health_History:
  Weight_History: Adult_Onset_Obesity
  Past_Attempts: [Limited_Due_to_Cost]
  Medications: [Metformin_Only]
  HCP_Relationship: Limited_Access

Treatment_Journey:
  Awareness_Source: Doctor_Mention
  Decision_Driver: Health_Scare
  Concerns: [Cost, Time_Off_Work, Family_Duties]
  Motivations: [Being_There_for_Family, Work_Ability]

Messaging_Preferences:
  Tone: Practical, Supportive
  Content: Savings_Options, Simple_Benefits
  Channel: Phone, In_Person
  Frequency: As_Needed

Potential_Barriers:
  - Medicaid_Prior_Auth_Required
  - Transportation_to_Pharmacy
  - Limited_Time_for_Health

Support_Needs:
  - Patient_Assistance_Program
  - Simple_Phone_Support
  - Flexible_Scheduling
```

---

## RELATIONSHIP MAPPING: Persona Interactions

### Content Response Matrix

| Persona | Clinical_Data | Transformation_Story | Cost_Info | Side_Effect_Tips | Community |
|---------|--------------|---------------------|-----------|------------------|-----------|
| Maria | HIGH | Medium | Low | HIGH | Medium |
| Robert | HIGH | Low | Medium | Medium | Low |
| Jessica | Low | HIGH | HIGH | Medium | HIGH |
| David | Low | Low | HIGH | Low | Low |

### Channel Preference Matrix

| Persona | Mobile_App | Email | Social | Phone | In_Person |
|---------|-----------|-------|--------|-------|-----------|
| Maria | HIGH | HIGH | Medium | Low | Medium |
| Robert | Low | Medium | Low | Medium | HIGH |
| Jessica | HIGH | Low | HIGH | Low | Low |
| David | Low | Low | Low | HIGH | HIGH |

---

## Sources

1. JMIR Patient Preferences - Weight Loss Medication Study
2. DovePress - Patient Decision Making Obesity
3. Frontiers Psychology - Healthcare Segmentation
4. NIH - GLP-1 Patient Experience Qualitative Research
5. Real Chemistry - GLP-1 User Demographics 2024

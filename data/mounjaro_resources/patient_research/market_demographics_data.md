# GLP-1 Market & Demographics Data
## Structured for Knowledge Graph Extraction

---

## ENTITY: GLP-1 Medications

### Product Comparison

| Medication | Brand | Active_Ingredient | Mechanism | Primary_Indication | Administration |
|------------|-------|-------------------|-----------|-------------------|----------------|
| Mounjaro | Eli_Lilly | Tirzepatide | Dual_GIP_GLP1 | Type_2_Diabetes | Once_Weekly_SC |
| Zepbound | Eli_Lilly | Tirzepatide | Dual_GIP_GLP1 | Obesity | Once_Weekly_SC |
| Ozempic | Novo_Nordisk | Semaglutide | GLP1_Only | Type_2_Diabetes | Once_Weekly_SC |
| Wegovy | Novo_Nordisk | Semaglutide | GLP1_Only | Obesity | Once_Weekly_SC |
| Rybelsus | Novo_Nordisk | Semaglutide | GLP1_Only | Type_2_Diabetes | Daily_Oral |
| Trulicity | Eli_Lilly | Dulaglutide | GLP1_Only | Type_2_Diabetes | Once_Weekly_SC |
| Saxenda | Novo_Nordisk | Liraglutide | GLP1_Only | Obesity | Daily_SC |
| Victoza | Novo_Nordisk | Liraglutide | GLP1_Only | Type_2_Diabetes | Daily_SC |

### Weight Loss Efficacy Comparison

| Medication | Max_Dose | Mean_Weight_Loss | Trial_Duration | Study |
|------------|----------|------------------|----------------|-------|
| Mounjaro | 15mg | 20.9% | 72_weeks | SURMOUNT-1 |
| Wegovy | 2.4mg | 14.9% | 68_weeks | STEP-1 |
| Ozempic | 2.0mg | 9.6% | 68_weeks | STEP-2 |
| Saxenda | 3.0mg | 8.0% | 56_weeks | SCALE |

---

## ENTITY: Patient Demographics

### US Demographics

```yaml
Total_GLP1_Users_Estimated: 15_million+

Gender_Distribution:
  Female: 65%
  Male: 35%

Age_Distribution:
  18-29: 8%
  30-39: 18%
  40-49: 28%
  50-59: 26%
  60-69: 15%
  70+: 5%

Race_Ethnicity_Usage:
  Non_Hispanic_White: 5.1%
  Non_Hispanic_Black: 4.1%
  Native_American: 4.0%
  Hispanic: 3.7%
  Asian: 3.2%

Income_Correlation:
  Under_50K: Baseline
  50K_100K: 1.3x_Baseline
  100K_250K: 1.5x_Baseline
  Over_250K: 1.72x_Baseline

Insurance_Type:
  Commercial: 68%
  Medicare: 22%
  Medicaid: 7%
  Uninsured: 3%
```

### UK Demographics (Mounjaro Specific)

```yaml
Gender_Distribution:
  Female: 77.6%
  Male: 22.4%

Age_Distribution:
  Under_30: 5%
  30-39: 25%
  40-49: 30%
  50-59: 25%
  60+: 15%

Geographic_Hotspots:
  - Glasgow
  - Birmingham
  - Manchester
  - London
  - Leeds

Access_Method:
  Private_Purchase: 90%
  NHS_Prescription: 10%

Market_Share:
  Mounjaro: 79%
  Wegovy: 20%
  Other: 1%
```

---

## ENTITY: Condition Prevalence

### Obesity Statistics

```yaml
US_Obesity_Prevalence:
  Overall_Adults: 41.9%
  By_Age:
    20-39: 39.8%
    40-59: 44.3%
    60+: 41.5%
  By_Gender:
    Male: 41.1%
    Female: 42.5%
  By_Race:
    Non_Hispanic_Black: 49.9%
    Hispanic: 45.6%
    Non_Hispanic_White: 41.4%
    Non_Hispanic_Asian: 16.1%

BMI_Categories:
  Overweight_25-29.9: 30.7%
  Obesity_Class_I_30-34.9: 22.3%
  Obesity_Class_II_35-39.9: 10.8%
  Obesity_Class_III_40+: 8.8%

GLP1_Eligible_Population: ~100_million
GLP1_Current_Penetration: ~6%
```

### Type 2 Diabetes Statistics

```yaml
US_T2D_Prevalence:
  Total_Diagnosed: 37.3_million
  Percentage_Adults: 11.3%
  Undiagnosed: 8.5_million

By_Age:
  18-44: 4.4%
  45-64: 14.5%
  65+: 26.8%

By_Race:
  American_Indian: 14.5%
  Non_Hispanic_Black: 12.1%
  Hispanic: 11.8%
  Non_Hispanic_White: 7.4%
  Asian: 9.5%

Comorbidities:
  Obesity: 89%
  Hypertension: 75%
  Dyslipidemia: 65%
  Cardiovascular_Disease: 32%
```

---

## ENTITY: Treatment Patterns

### Medication Adherence Rates

```yaml
GLP1_Adherence_12_Month:
  Overall: 35-55%
  Weight_Loss_Indication: 32%
  Diabetes_Indication: 48%

Discontinuation_Reasons:
  Side_Effects: 35%
  Cost: 28%
  Lack_of_Efficacy_Perceived: 15%
  Achieved_Goal: 8%
  Access_Issues: 7%
  Other: 7%

Time_to_Discontinuation:
  Within_1_Month: 12%
  Within_3_Months: 25%
  Within_6_Months: 40%
  Within_12_Months: 55%

Predictors_of_Adherence:
  Higher_Education: Positive
  Family_Support: Positive
  Prior_Injection_Experience: Positive
  Higher_BMI: Positive
  Lower_Income: Negative
  Younger_Age: Negative
```

### Prescriber Patterns

```yaml
Primary_Prescribers:
  Endocrinologist: 35%
  Primary_Care: 40%
  Obesity_Medicine: 15%
  Other_Specialist: 10%

Prescription_Drivers:
  Patient_Request: 45%
  Clinical_Guideline: 30%
  Failed_Prior_Therapy: 15%
  Comorbidity_Management: 10%

Prior_Authorization_Rate: 65%
Average_PA_Approval_Time: 7-14_days
PA_Denial_Rate: 25%
```

---

## RELATIONSHIPS: Market Dynamics

### Competitive Positioning

```
RELATIONSHIP: Competes_With
├── Mounjaro → Ozempic (for T2D)
├── Zepbound → Wegovy (for Obesity)
├── Mounjaro → Wegovy (off-label weight loss)
└── All_GLP1s → Bariatric_Surgery (alternative)

RELATIONSHIP: Preferred_Over
├── Mounjaro → Ozempic (when max weight loss desired)
├── Wegovy → Saxenda (efficacy)
├── Once_Weekly → Daily (convenience)
└── Dual_Agonist → Single_Agonist (efficacy)

RELATIONSHIP: Covered_By
├── Commercial_Plans → Most_GLP1s (with PA)
├── Medicare_Part_D → Diabetes_Indications_Only
├── Medicaid → Variable_by_State
└── Cash_Pay → All (at full price)
```

### Patient Flow

```
RELATIONSHIP: Flows_From
├── Diet_Exercise_Failure → GLP1_Consideration
├── Metformin_Insufficient → GLP1_Addition
├── Bariatric_Surgery_Candidate → GLP1_Alternative
└── Social_Media_Awareness → Provider_Request

RELATIONSHIP: Leads_To
├── GLP1_Success → Maintenance_Therapy
├── GLP1_Side_Effects → Dose_Adjustment | Switch | Discontinue
├── GLP1_Discontinue → Weight_Regain (typical)
└── GLP1_Long_Term → Reduced_Comorbidities
```

---

## ENTITY: Payer Coverage

### Coverage Tiers

| Payer_Type | Diabetes_Coverage | Obesity_Coverage | Prior_Auth | Step_Therapy |
|------------|------------------|------------------|------------|--------------|
| Commercial_PPO | Tier_2-3 | Often_Covered | Yes | Sometimes |
| Commercial_HMO | Tier_2-3 | Variable | Yes | Yes |
| Medicare_Part_D | Covered | NOT_Covered | Yes | Yes |
| Medicare_Advantage | Covered | Some_Plans | Yes | Yes |
| Medicaid | Variable | Rarely | Yes | Yes |

### Access Barriers

```yaml
Prior_Authorization_Requirements:
  - BMI_Documentation
  - Failed_Diet_Exercise
  - Comorbidity_Proof
  - Lab_Values_A1C
  - Sometimes_Failed_Other_Meds

Common_Denial_Reasons:
  - BMI_Below_Threshold
  - No_Documented_Diet_Attempt
  - Not_Preferred_Agent
  - Step_Therapy_Not_Met
  - Diagnosis_Not_Covered

Patient_Assistance_Programs:
  Mounjaro_Savings_Card: "$25_copay_eligible"
  Lilly_Cares: "Income_qualified_free"
  Manufacturer_Samples: "Limited_starter"
```

---

## Sources

1. CDC NHANES - Obesity & Diabetes Prevalence
2. IQVIA - GLP-1 Market Analysis 2024
3. Real Chemistry - Patient Demographics Report
4. Click2Pharmacy - UK User Statistics
5. CMS - Medicare Coverage Policies
6. Published Clinical Trials - Efficacy Data

#!/usr/bin/env python3
"""
Setup Mounjaro brand with realistic mock documents containing quality MBT insights.
This script:
1. Cleans up existing test brands
2. Creates/renames brand to "Mounjaro"
3. Populates with 7 comprehensive documents about Mounjaro (tirzepatide GLP-1)
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import crud, schemas, database, persona_engine, models
import time

# Realistic Mounjaro (tirzepatide) documents
MOUNJARO_DOCUMENTS = {
    "Disease & Patient Journey Overview": """
Type 2 Diabetes (T2D) Patient Journey: Understanding the Emotional and Clinical Landscape

Epidemiology: Over 37 million Americans live with diabetes, with 90-95% having Type 2 Diabetes. The diagnosis often comes after years of prediabetes, creating a sense of regret and missed opportunities for earlier intervention.

Patient Emotional Burden: Newly diagnosed patients experience significant emotional distress. They worry about complications—vision loss, kidney disease, amputation—that they've heard about from family members. There's a fear of dependence on medications and the stigma of "failing" at managing their health through diet alone.

Treatment Progression Reality: Most patients start with metformin, but 50% require additional therapy within 3 years due to progressive beta-cell decline. This progression feels like personal failure, when it's actually the natural course of the disease. Patients desire treatments that halt this decline and restore their sense of control.

Barriers to Optimal Care: Cost concerns are paramount—67% of patients report worrying about medication affordability. Complexity of regimens creates fatigue; patients juggle multiple pills, different timing requirements, and fear of hypoglycemia. They seek simplicity and convenience without compromising efficacy.

Quality of Life Impact: Beyond glucose numbers, patients care deeply about energy levels, ability to participate in family activities, and maintaining independence. Weight gain from some diabetes medications adds to their frustration, particularly when obesity contributed to their diagnosis.

What Patients Want: Our research shows patients prioritize three things: 1) Proven results in preventing complications, 2) Minimal disruption to daily life, 3) Support in achieving weight goals alongside diabetes management. They want to feel empowered, not overwhelmed.
    """,
    
    "Treatment Landscape / SoC": """
Current Standard of Care and Competitive Analysis for Type 2 Diabetes

First-Line Therapy: Metformin remains the standard initial therapy per ADA guidelines, with 78% of newly diagnosed patients starting here. However, metformin alone rarely maintains glycemic control long-term, with most patients requiring intensification.

GLP-1 Receptor Agonist Class: The landscape has shifted dramatically toward GLP-1 RAs due to CV and renal benefits. Key competitors include:
- Ozempic (semaglutide): Once-weekly, 1.5% A1C reduction, strong weight loss (12-15 lbs average)
- Trulicity (dulaglutide): Once-weekly, 1.3% A1C reduction, moderate weight loss
- Victoza (liraglutide): Daily injection, proven CV benefit, 1.2% A1C reduction

SGLT2 Inhibitors: Jardiance and Farxiga offer CV and renal protection with modest A1C reduction (0.7-0.8%), popular among cardiologists and nephrologists.

Treatment Selection Drivers: Physicians consider A1C gap to goal, CV/renal risk profile, weight status, injection acceptance, and cost/coverage. HCPs express frustration with prior authorization delays and coverage denials that prevent optimal therapy.

Unmet Needs in Current Landscape:
- Greater A1C reduction without increasing hypoglycemia risk
- Superior weight loss to address obesity epidemic
- Simplified once-weekly dosing with easy titration
- Reduced GI side effects that cause discontinuation
- Cost-effective options given insurance barriers

Physician Perspectives: Endocrinologists seek "best-in-class" efficacy for complex patients. PCPs value safety, simplicity, and tolerability for their busy practices. Both desire treatments that improve adherence through convenient dosing and meaningful patient-reported benefits.

Market Opportunity: With only 35% of T2D patients at goal A1C <7%, there's significant room for more effective therapies that patients will actually take consistently.
    """,
    
    "Brand Value Proposition & Core Messaging": """
Mounjaro (tirzepatide): Redefining Diabetes Control

Unique Mechanism: Mounjaro is the first and only GIP/GLP-1 receptor agonist, combining dual incretin action for superior glycemic control and weight reduction. This dual mechanism addresses both insulin resistance and beta-cell dysfunction.

Efficacy Leadership: SURPASS clinical trial program demonstrated:
- Up to 2.6% A1C reduction (vs 1.9% for semaglutide 1mg)
- 84% of patients reached A1C <7% (vs 67% comparator)
- Average weight loss of 15-25 lbs (dose-dependent)
- Sustained efficacy through 2+ years

Core Message: "Mounjaro delivers what matters most—powerful A1C reduction and significant weight loss in one once-weekly injection."

Patient Benefits:
- Confidence in reaching glycemic goals with superior efficacy
- Meaningful weight loss that improves overall health and self-esteem
- Convenient once-weekly dosing fits seamlessly into life
- Reduced worry about diabetes progression and complications

HCP Value Proposition:
- Most effective option for patients needing intensive glucose control
- Addresses both hyperglycemia and obesity in one agent
- Simple, predictable titration schedule
- Differentiated mechanism provides alternative for GLP-1 non-responders

Competitive Differentiation:
- Superior A1C reduction vs all GLP-1 RAs
- Greater weight loss than any other diabetes medication
- Novel dual incretin mechanism
- Proven non-inferiority for CV safety

Brand Personality: Empowering, innovative, results-driven. Mounjaro represents hope for patients tired of incremental improvements—it's a breakthrough that delivers transformational results.

Target Messaging: "More powerful control. More meaningful weight loss. Once a week." This encapsulates efficacy, weight benefit, and convenience in patient-friendly language.
    """,
    
    "Safety & Tolerability Summary": """
Mounjaro Safety Profile: Phase 3 SURPASS Trial Data

Overall Safety Assessment: Mounjaro demonstrated a favorable safety profile across 6,000+ patients in the SURPASS program with median exposure of 2 years. No new safety signals identified compared to GLP-1 RA class.

Gastrointestinal Side Effects (Most Common):
- Nausea: 20-30% (mostly mild-moderate, transient)
- Diarrhea: 15-20% 
- Vomiting: 8-12%
- Constipation: 6-8%

GI Tolerability Strategies: Side effects peak in first 4-8 weeks then decline substantially. Gradual titration and patient education significantly improve tolerability. Most patients who experience nausea continue therapy successfully.

Hypoglycemia: Very low risk (<2%) when not combined with sulfonylureas or insulin. Dose reduction of concomitant insulin may be needed. This low hypo risk is crucial for patient confidence and safety.

Injection Site Reactions: Minimal (<5%), mostly mild erythema or itching that resolve quickly. Once-weekly dosing reduces overall exposure vs daily injections.

Serious Adverse Events: 
- Pancreatitis: Rate similar to background T2D population (0.2%)
- Thyroid C-cell tumors: Boxed warning (class effect), contraindicated in MTC/MEN2 history
- Acute gallbladder disease: 1.8% (associated with rapid weight loss)

Cardiovascular Safety: SURPASS-CVOT demonstrated non-inferiority for major adverse cardiovascular events vs dulaglutide. Superiority trial ongoing.

Renal Considerations: No dose adjustment needed for mild-moderate impairment. Limited data in severe impairment/ESRD.

Long-term Safety: No unexpected safety findings in 2-year extension studies. Discontinuation due to adverse events: 6.2% (comparable to other GLP-1 RAs).

HCP Confidence: The safety profile allows physicians to prescribe confidently to appropriate patients with clear communication about expected GI effects and mitigation strategies. The low hypoglycemia risk is particularly valued.
    """,
    
    "HCP & Patient Segmentation": """
Healthcare Provider and Patient Segmentation Framework

HCP SEGMENTS:

1. Efficacy-Driven Specialists (Endocrinologists, 25%)
- Profile: Academic and community endocrinologists managing complex T2D
- Priorities: Maximum A1C reduction, weight loss, latest therapies
- Mounjaro Fit: "Best-in-class" efficacy for difficult-to-control patients
- Messaging: Superior outcomes data, novel MOA, comprehensive SURPASS results
- Objections: None significant—early adopters excited by differentiation

2. Evidence-Based PCPs (35%)
- Profile: Primary care physicians who stay current on guidelines
- Priorities: Proven efficacy, safety, clear place in therapy
- Mounjaro Fit: Option for patients not at goal on metformin +/- other agents
- Messaging: ADA-recognized therapy, robust phase 3 data, CV safety
- Objections: Cost/coverage concerns, prior auth burden, GI side effects

3. Safety-First Prescribers (30%)
- Profile: Conservative PCPs, older physicians, risk-averse
- Priorities: Established safety, tolerability, avoiding complications
- Mounjaro Fit: Low hypoglycemia risk, manageable GI profile
- Messaging: Favorable safety profile, predictable titration, patient support
- Objections: "Too new," prefer waiting for longer-term data

4. Convenience-Focused Physicians (10%)
- Profile: High-volume PCPs prioritizing simple regimens
- Priorities: Once-weekly dosing, easy titration, patient adherence
- Mounjaro Fit: Simple weekly injection with straightforward titration
- Messaging: Convenient dosing, comprehensive patient support program
- Objections: None if coverage is good

PATIENT ARCHETYPES:

1. The Proactive Manager (30%)
- Demographics: 45-60 years, recently diagnosed or well-controlled
- Psychology: Takes ownership, researches options, wants best outcomes
- Motivations: Prevent complications, maintain independence, optimize health
- Concerns: Disease progression despite current efforts
- Mounjaro Appeal: Superior efficacy data, comprehensive control

2. The Overwhelmed Struggler (35%)
- Demographics: 50-70 years, multiple comorbidities, A1C >8%
- Psychology: Feels defeated by disease progression, medication burden
- Motivations: Simplify treatment, reduce pill burden, see real results
- Concerns: Complexity, cost, side effects, feeling like a "failure"
- Mounjaro Appeal: Powerful results with simple once-weekly dosing

3. The Weight-Focused Patient (20%)
- Demographics: 35-55 years, obesity-driven T2D, image-conscious
- Psychology: Frustrated by weight gain from diabetes meds
- Motivations: Weight loss as much as glucose control, improve appearance
- Concerns: Medications that worsen weight problem
- Mounjaro Appeal: Significant weight loss alongside glucose control

4. The Cost-Conscious Pragmatist (15%)
- Demographics: 55-75 years, fixed income, Medicare/limited coverage
- Psychology: Practical, seeks "good enough" control within budget
- Motivations: Avoid complications without financial strain
- Concerns: Medication costs, insurance coverage, out-of-pocket expenses
- Mounjaro Appeal: Depends entirely on coverage/copay assistance availability
    """,
    
    "Market Research & Insight Summaries": """
Mounjaro Market Research: HCP and Patient Insights

HCP Qualitative Research Findings (N=120 physicians across specialties):

Switching Dynamics: 45% of physicians report willingness to switch patients from current GLP-1 to Mounjaro based on superior efficacy data. However, 60% prefer trial in GLP-1-naive patients first due to insurance step-therapy requirements.

Key Barriers Identified:
- Prior authorization hassles (cited by 82% as primary barrier)
- Uncertainty about patient coverage/copay (78%)
- Concern about GI tolerability in practice vs trials (55%)
- Lack of long-term CV outcome data (40%)

Physician Enthusiasm: Despite barriers, 88% agree Mounjaro represents "meaningful advancement" over existing GLP-1 RAs. Endocrinologists show highest enthusiasm (Net Promoter Score: +67), PCPs more cautious (+42).

Ideal Patient Profile (HCP Perspective): Patients with A1C >8% despite metformin +/- other oral agents, BMI >30, good injection acceptance, commercial insurance or Medicare Part D with strong coverage.

Patient-Reported Insights (N=500 T2D patients):

Treatment Goal Priorities:
1. Avoiding complications (ranked #1 by 68%)
2. A1C control without hypoglycemia (61%)
3. Weight loss (54%)
4. Convenient dosing (48%)
5. Medication cost (43%)

Injection Acceptance: 72% willing to consider weekly injection if it meant better results than daily pills. Fear of injections significantly lower than 10 years ago due to GLP-1 class familiarity.

Weight Loss as Motivator: 83% of patients with BMI >30 state weight loss is "extremely" or "very" important consideration in diabetes treatment choice. This represents significant motivational leverage for Mounjaro.

Cost Sensitivity: 67% would not start therapy if monthly cost exceeded $75. Copay assistance program awareness and enrollment is critical for uptake.

Information Sources Patients Trust:
1. Physician recommendation (87%)
2. Pharmacy counseling (52%)
3. Patient support programs (41%)
4. Online reviews from other patients (38%)

Critical Success Factors: Research indicates success requires:
- Clear HCP education on appropriate patient selection
- Proactive management of PA/coverage issues
- GI side effect management tools and patient prep
- Robust copay assistance and patient support program
- Patient testimonials showcasing real-world results
    """,
    
    "Adherence / Persistence / Discontinuation Insights": """
Mounjaro Adherence and Persistence: Real-World Evidence and Insights

Discontinuation Rates in Clinical Trials:
- Overall discontinuation: 6.2% due to adverse events through 2 years
- Primarily GI-related in first 12 weeks (4.8%)
- Efficacy-related discontinuation: <1% (very rare)
- Late discontinuation (>6 months): 1.4% (mostly non-AE reasons)

Persistence Comparison: Early real-world data suggests Mounjaro 12-month persistence rate of 78%, comparing favorably to historical GLP-1 RA persistence (65-72%). Superior efficacy and weight loss likely drive improved adherence.

GI Tolerability and Adherence: Analysis shows patients who experience mild-moderate nausea in first month have similar 12-month adherence (74%) as those without nausea (79%), suggesting good overall tolerance when expectations are set appropriately.

Factors Associated with Better Persistence:
- Prior GLP-1 RA experience (82% vs 76% naive patients)
- Strong weight loss results in first 3 months (86% persistence)
- Low out-of-pocket costs <$50/month (91% vs 62% >$50)
- Enrollment in patient support program (84% vs 71%)
- Specialist vs PCP prescriber (83% vs 74%)

Reasons for Discontinuation (Beyond AE):
- Cost/insurance loss (32% of discontinuations)
- Reached glycemic goal and wanted to simplify (18%)
- Physician-initiated switch or add-on (15%)
- Patient discretion/unknown (35%)

Device and Administration Factors: Single-dose pen design with hidden needle contributes to high injection acceptance. Injection confidence scores improve from 6.2/10 at baseline to 8.7/10 at 12 weeks.

Interventions That Improve Persistence:
- Proactive outreach at week 2-4 to address GI side effects
- Early weight loss counseling to set expectations
- Copay assistance enrollment and monitoring
- Provider education on titration strategies
- Patient success stories and peer support

Long-term Adherence Insights: Patients who persist beyond 6 months show excellent long-term adherence (>85% at 2 years), suggesting early period is critical window for support and intervention.

Clinical Implications: Maximizing adherence requires:
1. Pre-treatment counseling on expected GI effects and management
2. Aggressive copay assistance and insurance navigation support
3. Close follow-up in first 3 months with encouragement
4. Celebrating weight loss wins to maintain motivation
5. Simplifying concomitant medication regimen where possible
    """
}

def setup_mounjaro_brand():
    """Setup Mounjaro brand with realistic documents."""
    db = database.SessionLocal()
    
    try:
        print("🚀 Setting up Mounjaro Brand...")
        print("=" * 60)
        
        # Step 1: Clean up and rename existing brands
        print("\n[1/3] Managing brands...")
        existing_brands = db.query(models.Brand).all()
        
        mounjaro_brand = None
        for brand in existing_brands:
            if "mounjaro" in brand.name.lower():
                mounjaro_brand = brand
                print(f"  ✅ Found existing Mounjaro brand (ID: {brand.id})")
            elif "test" in brand.name.lower() or "diabetes" in brand.name.lower():
                # Rename first test brand to Mounjaro
                if not mounjaro_brand:
                    brand.name = "Mounjaro"
                    db.commit()
                    mounjaro_brand = brand
                    print(f"  ✅ Renamed brand ID {brand.id} to 'Mounjaro'")
                else:
                    # Delete other test brands
                    db.query(models.BrandDocument).filter(
                        models.BrandDocument.brand_id == brand.id
                    ).delete()
                    db.delete(brand)
                    db.commit()
                    print(f"  🗑️  Deleted test brand: {brand.name}")
        
        # Create Mounjaro brand if none exists
        if not mounjaro_brand:
            brand_create = schemas.BrandCreate(name="Mounjaro")
            mounjaro_brand = crud.create_brand(db, brand_create)
            print(f"  ✅ Created new Mounjaro brand (ID: {mounjaro_brand.id})")
        
        # Step 2: Clear existing documents for clean slate
        print("\n[2/3] Clearing existing Mounjaro documents...")
        deleted_count = db.query(models.BrandDocument).filter(
            models.BrandDocument.brand_id == mounjaro_brand.id
        ).delete()
        db.commit()
        print(f"  🗑️  Removed {deleted_count} old documents")
        
        # Step 3: Create new documents
        print("\n[3/3] Creating Mounjaro documents with MBT insights...")
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        created_docs = []
        for category, text in MOUNJARO_DOCUMENTS.items():
            print(f"\n  📄 Processing: {category}")
            
            # Create file
            filename = f"Mounjaro_{category.replace(' ', '_').replace('/', '-')}.txt"
            filepath = f"{upload_dir}/{int(time.time())}_{filename}"
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(text.strip())
            
            # Extract MBT insights
            print(f"     Extracting MBT insights...")
            insights = persona_engine.extract_mbt_from_text(text)
            
            # Add source document to each insight
            enriched_insights = [
                {**insight, "source_document": filename}
                for insight in insights
            ]
            
            # Count by type
            motivations = len([i for i in insights if i.get("type") == "Motivation"])
            beliefs = len([i for i in insights if i.get("type") == "Belief"])
            tensions = len([i for i in insights if i.get("type") == "Tension"])
            
            print(f"     ✅ Extracted: {motivations} Motivations, {beliefs} Beliefs, {tensions} Tensions")
            
            # Create chunks and vector embeddings (OpenAI)
            print(f"     Ingesting into OpenAI Vector Store...")
            from app import document_processor
            
            chunk_size = 800
            chunks = document_processor.chunk_text(text, chunk_size=chunk_size)
            
            # Generate embeddings and get vector_store_id
            _, vector_store_id, chunk_ids = document_processor.generate_vector_embeddings(
                chunks,
                brand_id=mounjaro_brand.id,
                filename=filename,
                chunk_size=chunk_size,
                insights=enriched_insights or []
            )
            print(f"     ✅ Vector Store Created: {vector_store_id}")

            # Create document
            doc_create = schemas.BrandDocumentCreate(
                brand_id=mounjaro_brand.id,
                filename=filename,
                filepath=filepath,
                category=category,
                summary=text[:200].strip() + "...",
                extracted_insights=enriched_insights,
                vector_store_id=vector_store_id,
                chunk_size=chunk_size,
                chunk_ids=chunk_ids
            )
            
            new_doc = crud.create_brand_document(db, doc_create)
            created_docs.append(new_doc)
        
        print("\n" + "=" * 60)
        print(f"✅ SUCCESS!")
        print(f"   Brand: Mounjaro (ID: {mounjaro_brand.id})")
        print(f"   Documents: {len(created_docs)}")
        print(f"   Total Insights: {sum(len(doc.extracted_insights or []) for doc in created_docs)}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup_mounjaro_brand()

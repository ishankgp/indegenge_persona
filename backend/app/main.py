from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
import traceback
import json
import base64
import io
import logging
import os
import time
from datetime import datetime

# Note: dotenv loading removed - pass environment variables directly

from . import crud, models, schemas, persona_engine, cohort_engine
from .database import engine, get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PharmaPersonaSim API",
    description="Transform qualitative personas into quantitative insights using LLMs",
    version="1.0.0"
)


def transform_to_frontend_format(backend_response: dict) -> dict:
    """Transform backend response to match frontend AnalysisResults interface."""
    # Transform individual_responses to match frontend expectations
    transformed_responses = []
    for response in backend_response.get('individual_responses', []):
        # Extract metrics into a flat responses object
        metrics_data = response.get('metrics', {})
        responses = {}
        
        # Convert metrics to frontend format
        for metric_key, metric_value in metrics_data.items():
            if isinstance(metric_value, dict) and 'score' in metric_value:
                responses[metric_key] = metric_value['score']
            else:
                responses[metric_key] = metric_value
        
        transformed_responses.append({
            'persona_id': response.get('persona_id'),
            'persona_name': response.get('persona_name'),
            'reasoning': response.get('analysis_summary', ''),
            'responses': responses
        })
    
    # Transform summary_statistics to match frontend format
    summary_stats = {}
    backend_stats = backend_response.get('summary_statistics', {})
    for metric, stats in backend_stats.items():
        if isinstance(stats, dict) and 'mean' in stats:
            summary_stats[f"{metric}_avg"] = stats['mean']
    
    return {
        'cohort_size': backend_response.get('cohort_size', 0),
        'stimulus_text': backend_response.get('stimulus_text', ''),
        'metrics_analyzed': backend_response.get('metrics_analyzed', []),
        'individual_responses': transformed_responses,
        'summary_statistics': summary_stats,
        'insights': backend_response.get('insights', []),
        'suggestions': backend_response.get('suggestions', []),
        'preamble': backend_response.get('content_summary', ''),
        'created_at': backend_response.get('created_at', '')
    }


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log raw request details to help debug 422s (validation errors)
    try:
        body = await request.body()
    except Exception:
        body = b""
    
    logger.error("🔴 Request validation error: %s", exc)
    logger.error("🔴 Request method: %s", request.method)
    logger.error("🔴 Request URL: %s", request.url)
    logger.error("🔴 Request headers: %s", dict(request.headers))
    logger.error("🔴 Request body size: %d", len(body))
    logger.error("🔴 Error details: %s", exc.errors())
    
    if body:
        try:
            preview = body[:2000].decode('utf-8', errors='replace')
            logger.error("🔴 Request body preview (first 2000 chars): %s", preview)
        except Exception:
            logger.error("🔴 Request body preview unavailable (binary)")
    
    return JSONResponse(
        status_code=422, 
        content={
            "detail": "Request validation failed. See server logs for raw request preview.",
            "errors": exc.errors()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    # Log all unhandled exceptions
    logger.error("🔥 Unhandled server exception: %s", str(exc))
    logger.error("🔥 Request method: %s", request.method)
    logger.error("🔥 Request URL: %s", request.url)
    logger.error("🔥 Exception type: %s", type(exc).__name__)
    logger.error("🔥 Full traceback:", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error occurred. Check server logs for details.",
            "error_type": type(exc).__name__
        }
    )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
async def root():
    return {"message": "PharmaPersonaSim API is running!"}

@app.get("/")
async def root_redirect():
    return {"message": "PharmaPersonaSim API - use /api endpoints"}

# --- Persona Endpoints ---

@app.post("/personas/generate", response_model=schemas.Persona)
async def generate_and_create_persona(persona_data: schemas.PersonaCreate, db: Session = Depends(get_db)):
    """
    Receives user input, calls the persona_engine, saves the result to the database,
    and returns the new persona.
    """
    # 1. Call the persona engine to generate the full persona JSON
    full_persona_json = persona_engine.generate_persona_from_attributes(
        age=persona_data.age,
        gender=persona_data.gender,
        condition=persona_data.condition,
        location=persona_data.location,
        concerns=persona_data.concerns
    )
    
    if not full_persona_json or full_persona_json == "{}":
        raise HTTPException(status_code=500, detail="Failed to generate persona from LLM.")

    # 2. Save the result to the database
    new_persona = crud.create_persona(
        db=db, 
        persona_data=persona_data, 
        persona_json=full_persona_json
    )
    
    return new_persona

@app.post("/personas/manual", response_model=schemas.Persona)
async def create_manual_persona(manual_data: dict, db: Session = Depends(get_db)):
    """
    Create a persona manually with detailed attributes provided by the user.
    """
    try:
        # Build the persona JSON from the provided data
        persona_json = {
            "name": manual_data.get("name", ""),
            "demographics": manual_data.get("demographics", {}),
            "medical_background": manual_data.get("medical_background", ""),
            "lifestyle_and_values": manual_data.get("lifestyle_and_values", ""),
            "pain_points": [point for point in manual_data.get("pain_points", []) if point.strip()],
            "motivations": [motivation for motivation in manual_data.get("motivations", []) if motivation.strip()],
            "communication_preferences": manual_data.get("communication_preferences", {})
        }
        
        # Create a PersonaCreate object for database insertion
        persona_create_data = schemas.PersonaCreate(
            age=manual_data.get("age", 0),
            gender=manual_data.get("gender", ""),
            condition=manual_data.get("condition", ""),
            location=manual_data.get("region", ""),  # Map region to location for database compatibility
            concerns=""  # Manual personas don't have concerns field
        )
        
        # Save to database
        new_persona = crud.create_persona(
            db=db,
            persona_data=persona_create_data,
            persona_json=json.dumps(persona_json)
        )
        
        return new_persona
        
    except Exception as e:
        logger.error(f"Error creating manual persona: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create manual persona: {str(e)}")

@app.get("/personas/", response_model=List[schemas.Persona])
async def get_all_personas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Returns a list of all personas from the database.
    """
    personas = crud.get_personas(db, skip=skip, limit=limit)
    return personas

@app.head("/personas/")
async def head_personas(db: Session = Depends(get_db)):
    """Lightweight HEAD endpoint to allow health probes without transferring payload."""
    count = db.query(models.Persona).count()
    return Response(status_code=200, headers={"X-Total-Personas": str(count)})

@app.delete("/personas/{persona_id}", status_code=204)
async def delete_persona(persona_id: int, db: Session = Depends(get_db)):
    """Delete a persona by ID."""
    success = crud.delete_persona(db, persona_id=persona_id)
    if not success:
        raise HTTPException(status_code=404, detail="Persona not found")
    return Response(status_code=204)

# --- Saved Simulation Endpoints ---

@app.post("/simulations/save", response_model=schemas.SavedSimulation)
async def save_simulation(simulation_data: schemas.SavedSimulationCreate, db: Session = Depends(get_db)):
    """Saves a simulation result to the database."""
    # Check if a simulation with the same name already exists
    existing_simulation = db.query(models.SavedSimulation).filter(models.SavedSimulation.name == simulation_data.name).first()
    if existing_simulation:
        raise HTTPException(status_code=400, detail="A simulation with this name already exists.")
    
    return crud.create_saved_simulation(db=db, simulation_data=simulation_data)

@app.get("/simulations/saved", response_model=List[schemas.SavedSimulation])
async def get_saved_simulations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Returns a list of all saved simulations."""
    return crud.get_saved_simulations(db, skip=skip, limit=limit)

@app.get("/simulations/saved/{simulation_id}", response_model=schemas.SavedSimulation)
async def get_saved_simulation(simulation_id: int, db: Session = Depends(get_db)):
    """Returns a specific saved simulation by ID."""
    db_simulation = crud.get_saved_simulation(db, simulation_id=simulation_id)
    if db_simulation is None:
        raise HTTPException(status_code=404, detail="Saved simulation not found")
    return db_simulation

@app.delete("/simulations/saved/{simulation_id}", status_code=204)
async def delete_saved_simulation(simulation_id: int, db: Session = Depends(get_db)):
    """Deletes a saved simulation by ID."""
    success = crud.delete_saved_simulation(db, simulation_id=simulation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Saved simulation not found")
    return None

# --- Cohort Analysis Endpoints ---

@app.post("/cohorts/analyze")
async def analyze_cohort(request: schemas.CohortAnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyzes how a cohort of personas responds to a stimulus (text only).
    """
    try:
        # Validate that all persona IDs exist
        for persona_id in request.persona_ids:
            persona = crud.get_persona(db, persona_id)
            if not persona:
                raise HTTPException(status_code=404, detail=f"Persona with ID {persona_id} not found")
        
        # Run the cohort analysis
        analysis_result = cohort_engine.run_cohort_analysis(
            persona_ids=request.persona_ids,
            stimulus_text=request.stimulus_text,
            metrics=request.metrics,
            db=db
        )
        
        # Save simulation data
        try:
            crud.create_cohort_simulation(
                db=db,
                persona_ids=request.persona_ids,
                stimulus_text=request.stimulus_text,
                results=analysis_result,
                insights=analysis_result.get('insights', [])
            )
        except Exception as save_error:
            print(f"Error saving simulation: {save_error}")
            # Don't fail the request if saving fails
        
        return transform_to_frontend_format(analysis_result)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in cohort analysis: {e}")
        print("Full traceback:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/cohorts/analyze-multimodal")
async def analyze_multimodal_cohort(
    persona_ids: str = Form(...),
    metrics: str = Form(...),
    content_type: str = Form(...),
    stimulus_text: Optional[str] = Form(None),
    stimulus_images: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db)
):
    """
    Analyzes how a cohort of personas responds to multimodal stimuli (text and/or images).
    """
    start_time = time.time()
    logger.info("� Multimodal analysis request started at %s", datetime.now().isoformat())
    
    try:
        logger.info("🔍 Multimodal analysis request: content_type=%s, personas=%s, metrics=%s", 
                   content_type, persona_ids, metrics)
        logger.info("📝 Stimulus text length: %d", len(stimulus_text) if stimulus_text else 0)
        logger.info("🖼️ Number of uploaded images: %d", len(stimulus_images))
        
        # Parse JSON fields with detailed error handling
        try:
            persona_ids_list = json.loads(persona_ids)
            logger.info("✅ Parsed persona_ids: %s", persona_ids_list)
        except json.JSONDecodeError as e:
            logger.error("❌ Failed to parse persona_ids JSON: %s", e)
            raise HTTPException(status_code=400, detail=f"Invalid persona_ids JSON: {str(e)}")
        
        try:
            metrics_list = json.loads(metrics)
            logger.info("✅ Parsed metrics: %s", metrics_list)
        except json.JSONDecodeError as e:
            logger.error("❌ Failed to parse metrics JSON: %s", e)
            raise HTTPException(status_code=400, detail=f"Invalid metrics JSON: {str(e)}")
            
        logger.info("✅ Parsed: %d personas, %d metrics", len(persona_ids_list), len(metrics_list))

        # Validate that all persona IDs exist
        for persona_id in persona_ids_list:
            persona = crud.get_persona(db, persona_id)
            if not persona:
                logger.error("❌ Persona with ID %d not found", persona_id)
                raise HTTPException(status_code=404, detail=f"Persona with ID {persona_id} not found")
        logger.info("✅ All %d personas validated", len(persona_ids_list))

        # Validate content type and stimulus
        if content_type not in ['text', 'image', 'both']:
            logger.error("❌ Invalid content_type: %s", content_type)
            raise HTTPException(status_code=400, detail=f"Invalid content_type: {content_type}")

        # Content validation
        has_text = stimulus_text and stimulus_text.strip()
        has_images = len(stimulus_images) > 0

        if content_type == 'text' and not has_text:
            logger.error("❌ Content type 'text' requires stimulus_text")
            raise HTTPException(status_code=400, detail="Content type 'text' requires stimulus_text")
        elif content_type == 'image' and not has_images:
            logger.error("❌ Content type 'image' requires at least one image")
            raise HTTPException(status_code=400, detail="Content type 'image' requires at least one image")
        elif content_type == 'both' and (not has_text or not has_images):
            logger.error("❌ Content type 'both' requires both text and images")
            raise HTTPException(status_code=400, detail="Content type 'both' requires both text and images")

        logger.info("✅ Content validation passed for type: %s", content_type)

        # Process uploaded images
        processed_images = []
        if stimulus_images:
            logger.info("🖼️ Processing %d uploaded images...", len(stimulus_images))
            for i, image in enumerate(stimulus_images):
                try:
                    logger.info("📷 Image %d: %s, type: %s, size: %d", 
                              i+1, image.filename, image.content_type, image.size)
                    
                    contents = await image.read()
                    logger.info("📷 Image %d read: %d bytes", i+1, len(contents))
                    
                    encoded = base64.b64encode(contents).decode('utf-8')
                    logger.info("📷 Image %d encoded to base64: %d chars", i+1, len(encoded))
                    
                    processed_images.append({
                        'filename': image.filename,
                        'content_type': image.content_type,
                        'data': encoded
                    })
                    logger.info("✅ Image %d processed successfully", i+1)
                except Exception as e:
                    logger.error("❌ Error processing image %d (%s): %s", i+1, image.filename, str(e))
                    raise HTTPException(status_code=400, detail=f"Error processing image {image.filename}: {str(e)}")

        logger.info("🖼️ Final processed images count: %d", len(processed_images))

        # Run multimodal analysis
        logger.info("🚀 Starting multimodal cohort analysis...")
        analysis_result = cohort_engine.run_multimodal_cohort_analysis(
            persona_ids=persona_ids_list,
            stimulus_text=stimulus_text or "",
            stimulus_images=processed_images,
            content_type=content_type,
            metrics=metrics_list,
            db=db
        )
        logger.info("✅ Multimodal cohort analysis completed successfully")

        # Save simulation data
        try:
            stimulus_summary = f"Content: {content_type}"
            if stimulus_text:
                stimulus_summary += f" | Text: {stimulus_text[:100]}{'...' if len(stimulus_text) > 100 else ''}"
            if processed_images:
                stimulus_summary += f" | Images: {len(processed_images)}"

            crud.create_cohort_simulation(
                db=db,
                persona_ids=persona_ids_list,
                stimulus_text=stimulus_summary,
                results=analysis_result,
                insights=analysis_result.get('insights', [])
            )
            logger.info("✅ Simulation data saved to database")
        except Exception as save_error:
            logger.error("❌ Error saving multimodal simulation: %s", save_error)
            # Don't fail the request if saving fails

        # Transform response format to match frontend expectations
        transformed_result = transform_to_frontend_format(analysis_result)
        
        end_time = time.time()
        duration = end_time - start_time
        logger.info("🎯 Multimodal analysis completed in %.2f seconds", duration)
        
        return transformed_result
        
    except ValueError as e:
        logger.error("❌ ValueError in multimodal analysis: %s", str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except json.JSONDecodeError as e:
        logger.error("❌ JSON decode error in multimodal analysis: %s", str(e))
        raise HTTPException(status_code=400, detail=f"Invalid JSON in form data: {str(e)}")
    except Exception as e:
        logger.error("❌ Unexpected error in multimodal cohort analysis: %s", str(e))
        logger.error("❌ Full traceback:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- Statistics Endpoint ---
@app.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get statistics about personas and simulations"""
    stats = crud.get_simulation_stats(db)
    persona_count = db.query(models.Persona).count()
    stats["total_personas"] = persona_count
    return stats

# --- Health Check ---
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PharmaPersonaSim API"}

@app.get("/health/db")
async def health_db(db: Session = Depends(get_db)):
    """Database health including persona count."""
    try:
        count = db.query(models.Persona).count()
        return {"status": "ok", "personas": count}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Veeva CRM Integration Simulation Endpoints ---

# Mock Veeva CRM data - realistic pharma HCP profiles and patient segments
# Comprehensive dataset demonstrating fact-based, data-driven persona creation
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
                "call_notes": "Highly engaged physician, interested in innovative treatments. Prefers evidence-based discussions."
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
                "call_notes": "Research-focused, leads clinical trials. Strong influence on treatment guidelines."
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
        # ENDOCRINOLOGY - Tier 2
        {
            "npi": "1234567892",
            "name": "Dr. Lisa Kumar",
            "specialty": "Endocrinology",
            "institution": "Community Health Network",
            "location": "Indianapolis, IN",
            "tier": "Tier 2",
            "interaction_history": {
                "last_call": "2024-09-09",
                "call_frequency": "Monthly",
                "engagement_score": 7.1,
                "preferred_topics": ["Cost-effective treatments", "Patient compliance", "Lifestyle interventions"],
                "objections": ["Drug costs", "Insurance coverage", "Patient adherence challenges"],
                "call_notes": "Community-focused physician, emphasizes practical treatment approaches."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Metformin", "Glipizide", "Jardiance", "Lantus"],
                "patient_volume": "Medium (180+ diabetes patients)",
                "adoption_rate": "Conservative adopter",
                "therapeutic_areas": ["Type 2 Diabetes", "Prediabetes", "Metabolic syndrome"]
            },
            "patient_demographics": {
                "avg_age": 62,
                "gender_split": {"male": 42, "female": 58},
                "insurance_mix": {"commercial": 55, "medicare": 35, "medicaid": 10},
                "comorbidities": ["Hypertension", "Obesity", "Depression"]
            }
        },

        # RHEUMATOLOGY - Tier 1 KOLs
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
                "call_notes": "Research-focused physician, values clinical trial data. Advocates for personalized treatment approaches."
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
        {
            "npi": "2345678902",
            "name": "Dr. Rachel Morgan",
            "specialty": "Rheumatology",
            "institution": "Hospital for Special Surgery",
            "location": "New York, NY",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-13",
                "call_frequency": "Weekly",
                "engagement_score": 8.9,
                "preferred_topics": ["JAK inhibitors", "Biosimilars", "Patient reported outcomes"],
                "objections": ["Safety monitoring", "Drug interactions", "Long-term effects"],
                "call_notes": "Subspecialty expert in psoriatic arthritis. Active in medical societies."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Xeljanz", "Rinvoq", "Otezla", "Cosentyx"],
                "patient_volume": "High (200+ arthritis patients)",
                "adoption_rate": "Early adopter",
                "therapeutic_areas": ["Psoriatic Arthritis", "Rheumatoid Arthritis", "Lupus"]
            },
            "patient_demographics": {
                "avg_age": 49,
                "gender_split": {"male": 30, "female": 70},
                "insurance_mix": {"commercial": 85, "medicare": 10, "medicaid": 5},
                "comorbidities": ["Psoriasis", "Depression", "Fibromyalgia"]
            }
        },

        # NEUROLOGY - Multiple Tiers
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
                "call_notes": "Patient-centric approach, focuses on quality of life improvements. Interested in preventive strategies."
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
        {
            "npi": "3456789013",
            "name": "Dr. Alan Rosenberg",
            "specialty": "Neurology",
            "institution": "NYU Langone",
            "location": "New York, NY",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-14",
                "call_frequency": "Bi-weekly",
                "engagement_score": 8.5,
                "preferred_topics": ["Multiple sclerosis", "Disease-modifying therapies", "MRI monitoring"],
                "objections": ["Safety concerns", "Infusion logistics", "Patient monitoring burden"],
                "call_notes": "MS specialist, runs comprehensive clinic. Values long-term disability prevention."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Ocrevus", "Tysabri", "Tecfidera", "Gilenya"],
                "patient_volume": "Medium (120+ MS patients)",
                "adoption_rate": "Evidence-based adopter",
                "therapeutic_areas": ["Multiple Sclerosis", "Neuromyelitis Optica", "CNS Demyelinating Diseases"]
            },
            "patient_demographics": {
                "avg_age": 42,
                "gender_split": {"male": 35, "female": 65},
                "insurance_mix": {"commercial": 80, "medicare": 15, "medicaid": 5},
                "comorbidities": ["Depression", "Fatigue", "Cognitive dysfunction"]
            }
        },

        # PULMONOLOGY
        {
            "npi": "4567890123",
            "name": "Dr. Robert Williams",
            "specialty": "Pulmonology",
            "institution": "Mass General Brigham",
            "location": "Boston, MA", 
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-08",
                "call_frequency": "Bi-weekly",
                "engagement_score": 8.7,
                "preferred_topics": ["COPD management", "Inhaler techniques", "Patient education"],
                "objections": ["Device complexity", "Cost considerations", "Insurance formulary"],
                "call_notes": "Strong advocate for patient education and proper inhaler technique. Values long-term outcomes."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Spiriva", "Symbicort", "Advair", "Trelegy"],
                "patient_volume": "Medium (180+ COPD patients)",
                "adoption_rate": "Evidence-based adopter",
                "therapeutic_areas": ["COPD", "Asthma", "Pulmonary Fibrosis"]
            },
            "patient_demographics": {
                "avg_age": 68,
                "gender_split": {"male": 55, "female": 45},
                "insurance_mix": {"commercial": 40, "medicare": 55, "medicaid": 5},
                "comorbidities": ["Cardiovascular disease", "Anxiety", "Osteoporosis"]
            }
        },
        {
            "npi": "4567890124",
            "name": "Dr. Jennifer Park",
            "specialty": "Pulmonology",
            "institution": "UCSF Medical Center",
            "location": "San Francisco, CA",
            "tier": "Tier 2",
            "interaction_history": {
                "last_call": "2024-09-07",
                "call_frequency": "Monthly",
                "engagement_score": 7.3,
                "preferred_topics": ["Asthma biologics", "Personalized medicine", "Allergy testing"],
                "objections": ["Prior authorization", "High copays", "Injection burden"],
                "call_notes": "Specialist in severe asthma and allergic conditions. Research interests in phenotyping."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Xolair", "Dupixent", "Nucala", "Fasenra"],
                "patient_volume": "Medium (140+ asthma patients)",
                "adoption_rate": "Early adopter",
                "therapeutic_areas": ["Severe Asthma", "COPD", "Eosinophilic Lung Disease"]
            },
            "patient_demographics": {
                "avg_age": 45,
                "gender_split": {"male": 40, "female": 60},
                "insurance_mix": {"commercial": 75, "medicare": 20, "medicaid": 5},
                "comorbidities": ["Allergic rhinitis", "GERD", "Sinusitis"]
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
        {
            "npi": "5678901235",
            "name": "Dr. Maria Gonzalez",
            "specialty": "Cardiology",
            "institution": "Texas Heart Institute",
            "location": "Houston, TX",
            "tier": "Tier 2",
            "interaction_history": {
                "last_call": "2024-09-06",
                "call_frequency": "Monthly",
                "engagement_score": 7.5,
                "preferred_topics": ["Heart failure management", "Device therapy", "Guideline adherence"],
                "objections": ["Formulary limitations", "Patient compliance", "Monitoring requirements"],
                "call_notes": "Heart failure specialist. Focuses on evidence-based medicine and guideline implementation."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Entresto", "Jardiance", "Metoprolol", "Lisinopril"],
                "patient_volume": "Medium (200+ HF patients)",
                "adoption_rate": "Conservative adopter",
                "therapeutic_areas": ["Heart Failure", "Hypertension", "Atrial Fibrillation"]
            },
            "patient_demographics": {
                "avg_age": 72,
                "gender_split": {"male": 55, "female": 45},
                "insurance_mix": {"commercial": 45, "medicare": 50, "medicaid": 5},
                "comorbidities": ["Diabetes", "CKD", "COPD"]
            }
        },

        # ONCOLOGY - High value specialty
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
                "call_notes": "Leading lung cancer researcher. Expertise in immunotherapy combinations and resistance mechanisms."
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
        {
            "npi": "6789012346",
            "name": "Dr. Angela Foster",
            "specialty": "Oncology",
            "institution": "Memorial Sloan Kettering",
            "location": "New York, NY",
            "tier": "Tier 1",
            "interaction_history": {
                "last_call": "2024-09-12",
                "call_frequency": "Bi-weekly",
                "engagement_score": 8.9,
                "preferred_topics": ["Breast cancer therapeutics", "CDK4/6 inhibitors", "Hormone therapy"],
                "objections": ["Side effect management", "Quality of life", "Treatment duration"],
                "call_notes": "Breast cancer specialist with focus on HR+ disease. Strong research background in drug development."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Ibrance", "Kisqali", "Verzenio", "Herceptin"],
                "patient_volume": "High (200+ breast cancer patients)",
                "adoption_rate": "Early adopter",
                "therapeutic_areas": ["Breast Cancer", "Gynecologic Oncology"]
            },
            "patient_demographics": {
                "avg_age": 58,
                "gender_split": {"male": 2, "female": 98},
                "insurance_mix": {"commercial": 75, "medicare": 20, "medicaid": 5},
                "comorbidities": ["Osteoporosis", "Depression", "Lymphedema"]
            }
        },

        # PSYCHIATRY - Growing importance
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
                "call_notes": "Depression specialist with interest in treatment-resistant cases. Research focus on ketamine therapies."
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

        # DERMATOLOGY
        {
            "npi": "8901234567",
            "name": "Dr. Catherine Lee",
            "specialty": "Dermatology",
            "institution": "University of Pennsylvania",
            "location": "Philadelphia, PA",
            "tier": "Tier 2",
            "interaction_history": {
                "last_call": "2024-09-09",
                "call_frequency": "Monthly",
                "engagement_score": 7.6,
                "preferred_topics": ["Psoriasis biologics", "Patient quality of life", "Long-term safety"],
                "objections": ["Injection frequency", "Cost concerns", "Safety monitoring"],
                "call_notes": "Psoriasis specialist with focus on moderate-to-severe disease. Patient advocacy oriented."
            },
            "prescribing_patterns": {
                "preferred_brands": ["Cosentyx", "Taltz", "Skyrizi", "Humira"],
                "patient_volume": "Medium (150+ psoriasis patients)",
                "adoption_rate": "Moderate adopter",
                "therapeutic_areas": ["Psoriasis", "Atopic Dermatitis", "Psoriatic Arthritis"]
            },
            "patient_demographics": {
                "avg_age": 45,
                "gender_split": {"male": 55, "female": 45},
                "insurance_mix": {"commercial": 85, "medicare": 10, "medicaid": 5},
                "comorbidities": ["Depression", "Cardiovascular disease", "Metabolic syndrome"]
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
                "call_notes": "IBD specialist with large referral practice. Strong advocate for early aggressive therapy."
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

@app.get("/crm/connection-status")
async def get_crm_connection_status():
    """Get Veeva CRM connection status (simulated)"""
    return {
        "status": "connected",
        "last_sync": "2024-09-14T10:30:00Z",
        "sync_status": "success",
        "total_hcp_profiles": len(MOCK_VEEVA_DATA["hcp_profiles"]),
        "data_freshness": "Real-time",
        "environment": "Production",
        "vault_instance": "pharmasim-vault.veevavault.com"
    }

@app.get("/crm/hcp-profiles")
async def get_hcp_profiles(specialty: Optional[str] = None, tier: Optional[str] = None):
    """Get HCP profiles from Veeva CRM (simulated)"""
    import time
    
    # Simulate API delay for realism
    time.sleep(0.5)
    
    profiles = MOCK_VEEVA_DATA["hcp_profiles"]
    
    # Filter by specialty if provided
    if specialty:
        profiles = [p for p in profiles if p["specialty"].lower() == specialty.lower()]
    
    # Filter by tier if provided  
    if tier:
        profiles = [p for p in profiles if p["tier"].lower() == tier.lower()]
    
    return {
        "profiles": profiles,
        "total_count": len(profiles),
        "filtered_by": {
            "specialty": specialty,
            "tier": tier
        },
        "sync_timestamp": datetime.now().isoformat()
    }

@app.post("/crm/import-personas")
async def import_personas_from_crm(request: dict, db: Session = Depends(get_db)):
    """Import personas from selected HCP profiles with user configuration"""
    import time
    import random
    
    try:
        selected_npis = request.get("selected_npis", [])
        user_config = request.get("options", {})
        
        if not selected_npis:
            raise HTTPException(status_code=400, detail="No HCP profiles selected")
        
        # Extract user configuration
        max_personas = user_config.get("maxPersonas", 5)
        age_range = user_config.get("ageRange", {"min": 25, "max": 75})
        focus_areas = user_config.get("focusAreas", "")
        specific_conditions = user_config.get("specificConditions", "")
        demographic_prefs = user_config.get("demographicPreferences", "")
        insights_goal = user_config.get("insightsGoal", "")
        
        # Find selected profiles
        selected_profiles = [
            profile for profile in MOCK_VEEVA_DATA["hcp_profiles"]
            if profile["npi"] in selected_npis
        ]
        
        if not selected_profiles:
            raise HTTPException(status_code=404, detail="Selected HCP profiles not found")
        
        created_personas = []
        personas_per_profile = max(1, max_personas // len(selected_profiles))
        
        for profile_idx, profile in enumerate(selected_profiles):
            # Calculate how many personas to generate for this profile
            remaining_slots = max_personas - len(created_personas)
            if remaining_slots <= 0:
                break
                
            profiles_left = len(selected_profiles) - profile_idx
            personas_for_this_profile = min(
                personas_per_profile,
                remaining_slots if profiles_left == 1 else personas_per_profile
            )
            
            # Generate personas for this HCP profile
            for persona_idx in range(personas_for_this_profile):
                # Simulate processing time
                time.sleep(0.2)
                
                # Use user-specified age range
                persona_age = random.randint(age_range["min"], age_range["max"])
                
                # Generate gender based on profile data and demographic preferences
                patient_demo = profile["patient_demographics"]
                if "diverse" in demographic_prefs.lower():
                    # Force more diversity
                    persona_gender = random.choice(["Male", "Female"])
                else:
                    # Use HCP's patient population gender distribution
                    persona_gender = "Male" if patient_demo["gender_split"]["male"] > 50 else "Female"
                
                # Determine condition based on user input or HCP specialty
                if specific_conditions.strip():
                    # User specified conditions - pick one
                    user_conditions = [c.strip() for c in specific_conditions.split(",")]
                    persona_condition = random.choice(user_conditions)
                else:
                    # Use HCP specialty-appropriate conditions
                    if profile["specialty"] == "Endocrinology":
                        persona_condition = random.choice(["Type 2 Diabetes", "Type 1 Diabetes", "Thyroid Disorders"])
                    elif profile["specialty"] == "Rheumatology":
                        persona_condition = random.choice(["Rheumatoid Arthritis", "Osteoarthritis", "Lupus"])
                    elif profile["specialty"] == "Neurology":
                        persona_condition = random.choice(["Migraines", "Epilepsy", "Multiple Sclerosis"])
                    elif profile["specialty"] == "Pulmonology":
                        persona_condition = random.choice(["COPD", "Asthma", "Lung Cancer"])
                    else:
                        persona_condition = "General Health"
                
                # Build comprehensive concerns incorporating user focus areas
                base_concerns = f"Patient from {profile['name']}'s practice"
                if focus_areas.strip():
                    base_concerns += f" - Focus areas: {focus_areas}"
                if insights_goal.strip():
                    base_concerns += f" - Research goal: {insights_goal}"
                
                # Add HCP-specific context
                hcp_topics = profile['interaction_history']['preferred_topics']
                base_concerns += f" - HCP interests: {', '.join(hcp_topics)}"
                
                persona_data = {
                    "age": persona_age,
                    "gender": persona_gender,
                    "condition": persona_condition,
                    "location": profile["location"],
                    "concerns": base_concerns
                }
                
                # Generate the persona using existing engine
                generated_persona_json = persona_engine.generate_persona_from_attributes(
                    persona_data["age"],
                    persona_data["gender"], 
                    persona_data["condition"],
                    persona_data["location"],
                    persona_data["concerns"]
                )
                
                # Parse the JSON response from the persona engine
                try:
                    persona_json = json.loads(generated_persona_json)
                    
                    # Ensure the persona has all required fields
                    if not persona_json or not persona_json.get("name"):
                        raise json.JSONDecodeError("Invalid or empty persona JSON", "", 0)
                        
                except json.JSONDecodeError:
                    # If JSON parsing fails, create a comprehensive fallback structure
                    persona_json = {
                        "name": f"Patient {len(created_personas) + 1}",
                        "demographics": {
                            "age": persona_data["age"],
                            "gender": persona_data["gender"],
                            "location": persona_data["location"],
                            "occupation": "Healthcare Patient"
                        },
                        "medical_background": f"Patient with {persona_data['condition']} from {profile['name']}'s practice at {profile['institution']}. Regularly monitored by {profile['specialty']} specialists.",
                        "lifestyle_and_values": f"Lives in {persona_data['location']} and values quality healthcare. Seeks to maintain an active lifestyle while managing {persona_data['condition']}. Family-oriented and health-conscious.",
                        "pain_points": [
                            f"Managing {persona_data['condition']} symptoms",
                            "Understanding treatment options",
                            "Healthcare costs and insurance coverage",
                            "Balancing daily activities with health needs"
                        ],
                        "motivations": [
                            "Achieving better health outcomes",
                            "Maintaining independence and quality of life",
                            "Staying informed about treatment advances",
                            "Building strong relationships with healthcare providers"
                        ],
                        "communication_preferences": {
                            "preferred_channels": "Direct communication with healthcare team",
                            "information_style": "Clear, evidence-based explanations",
                            "frequency": "Regular check-ins and updates"
                        }
                    }
                
                # Add enhanced CRM metadata with user configuration
                persona_json["crm_metadata"] = {
                    "source": "Veeva CRM",
                    "hcp_profile": {
                        "npi": profile["npi"],
                        "name": profile["name"],
                        "specialty": profile["specialty"],
                        "institution": profile["institution"]
                    },
                    "user_configuration": {
                        "max_personas_requested": max_personas,
                        "age_range_specified": age_range,
                        "focus_areas": focus_areas,
                        "specific_conditions": specific_conditions,
                        "demographic_preferences": demographic_prefs,
                        "insights_goal": insights_goal
                    },
                    "import_timestamp": datetime.now().isoformat(),
                    "data_lineage": f"Generated from {profile['name']}'s patient population with user customization"
                }
                
                # Extract basic fields from the persona JSON
                persona_name = persona_json.get("name", f"Patient {len(created_personas) + 1}")
                
                # Save to database
                db_persona = models.Persona(
                    name=persona_name,
                    age=persona_data["age"],
                    gender=persona_data["gender"],
                    condition=persona_data["condition"],
                    location=persona_data["location"],
                    full_persona_json=json.dumps(persona_json)
                )
                db.add(db_persona)
                db.commit()
                db.refresh(db_persona)
                
                created_personas.append({
                    "id": db_persona.id,
                    "name": db_persona.name,
                    "source_hcp": profile["name"],
                    "specialty": profile["specialty"],
                    "condition": db_persona.condition,
                    "age": db_persona.age,
                    "gender": db_persona.gender
                })
                
                # Break if we've reached the max personas limit
                if len(created_personas) >= max_personas:
                    break
            
            # Break outer loop if we've reached the max
            if len(created_personas) >= max_personas:
                break
        
        return {
            "success": True,
            "created_personas": created_personas,
            "total_created": len(created_personas),
            "max_requested": max_personas,
            "processing_time": f"{len(created_personas) * 0.2:.1f} seconds",
            "import_summary": {
                "source": "Veeva CRM",
                "hcp_profiles_processed": len(selected_profiles),
                "personas_generated": len(created_personas),
                "user_configuration_applied": {
                    "age_range": f"{age_range['min']}-{age_range['max']} years",
                    "focus_areas_included": bool(focus_areas.strip()),
                    "specific_conditions_used": bool(specific_conditions.strip()),
                    "demographic_customization": bool(demographic_prefs.strip()),
                    "insights_goal_defined": bool(insights_goal.strip())
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error importing personas from CRM: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import personas: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

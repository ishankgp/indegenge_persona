from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import uvicorn
import traceback
import json
import base64
import io
import logging
import os
import re
import time
import uuid
from datetime import datetime

# Note: dotenv loading removed - pass environment variables directly

from . import crud, models, schemas, persona_engine, cohort_engine, document_processor, avatar_engine, image_improvement, image_improvement
from .database import engine, get_db
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Run startup migration to add brand_id and avatar_url columns if missing
def run_startup_migration():
    """Add brand_id and avatar_url columns to personas table if they don't exist."""
    try:
        from sqlalchemy import inspect, text

        def add_column_if_missing(column_name: str, ddl_statement: str):
            inspector = inspect(engine)
            columns = {c['name'] for c in inspector.get_columns('personas')}
            if column_name in columns:
                logger.info("✅ %s column already exists in personas table", column_name)
                return False

            logger.info("🔄 Running migration: Adding %s column to personas table...", column_name)
            with engine.connect() as conn:
                conn.execute(text(ddl_statement))
                conn.commit()
            logger.info("✅ Migration complete: %s column added", column_name)
            return True

        with engine.connect() as conn:
            initial_count = conn.execute(text("SELECT COUNT(*) FROM personas")).scalar() or 0

        brand_added = add_column_if_missing(
            'brand_id',
            "ALTER TABLE personas ADD COLUMN brand_id INTEGER REFERENCES brands(id)"
        )
        avatar_added = add_column_if_missing(
            'avatar_url',
            "ALTER TABLE personas ADD COLUMN avatar_url VARCHAR"
        )

        with engine.connect() as conn:
            final_count = conn.execute(text("SELECT COUNT(*) FROM personas")).scalar() or 0

        if initial_count == final_count:
            logger.info(
                "✅ personas table row count unchanged after migrations: %s rows",
                final_count
            )
        else:
            logger.warning(
                "⚠️ personas table row count changed during migrations: before=%s, after=%s",
                initial_count,
                final_count
            )

        if not (brand_added or avatar_added):
            logger.info("ℹ️ No schema changes required during startup migration")

    except Exception as e:
        logger.error(f"Migration warning: {e}")

run_startup_migration()

app = FastAPI(
    title="PharmaPersonaSim API",
    description="Transform qualitative personas into quantitative insights using LLMs",
    version="1.0.0"
)


def transform_to_frontend_format(backend_response: dict) -> dict:
    """Transform backend response to match frontend AnalysisResults interface."""
    transformed_responses = []
    for response in backend_response.get('individual_responses', []):
        responses = {}
        reasoning = response.get('analysis_summary') or response.get('reasoning', '')

        if isinstance(response.get('responses'), dict):
            responses = response['responses']
        else:
            metrics_data = response.get('metrics', {}) or {}
            for metric_key, metric_value in metrics_data.items():
                if isinstance(metric_value, dict):
                    if 'score' in metric_value:
                        responses[metric_key] = metric_value['score']
                    elif 'value' in metric_value:
                        responses[metric_key] = metric_value['value']
                else:
                    responses[metric_key] = metric_value

        transformed_responses.append({
            'persona_id': response.get('persona_id'),
            'persona_name': response.get('persona_name'),
            'avatar_url': response.get('avatar_url'),
            'persona_type': response.get('persona_type'),
            'reasoning': reasoning,
            'responses': responses,
            'answers': response.get('answers')
        })

    backend_stats = backend_response.get('summary_statistics', {}) or {}
    if backend_stats and any(isinstance(v, dict) for v in backend_stats.values()):
        summary_stats = {}
        for metric, stats in backend_stats.items():
            if isinstance(stats, dict) and 'mean' in stats:
                summary_stats[f"{metric}_avg"] = stats['mean']
            else:
                summary_stats[metric] = stats
    else:
        summary_stats = backend_stats

    return {
        'cohort_size': backend_response.get('cohort_size', 0),
        'stimulus_text': backend_response.get('stimulus_text', ''),
        'metrics_analyzed': backend_response.get('metrics_analyzed', []),
        'questions': backend_response.get('questions'),
        'individual_responses': transformed_responses,
        'summary_statistics': summary_stats,
        'insights': backend_response.get('insights', []),
        'suggestions': backend_response.get('suggestions', []),
        'preamble': backend_response.get('preamble') or backend_response.get('content_summary', ''),
        'created_at': backend_response.get('created_at', ''),
        'metric_weights': backend_response.get('metric_weights')
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
        except (UnicodeDecodeError, AttributeError) as e:
            logger.error("🔴 Request body preview unavailable: %s", e)
    
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
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Configurable via ALLOWED_ORIGINS env var
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
    
    If brand_id is provided, the persona will be automatically grounded in that brand's MBT insights.
    Also generates a DALL-E 3 avatar for the persona.
    """
    # Fetch brand MBT insights if brand_id is provided
    brand_insights = None
    if persona_data.brand_id:
        brand = db.query(models.Brand).filter(models.Brand.id == persona_data.brand_id).first()
        if not brand:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        documents = crud.get_brand_documents(db, persona_data.brand_id)
        aggregated = _aggregate_brand_insights(documents, target_segment=None, limit_per_category=5)
        brand_insights = _flatten_insights(aggregated)
    
    # 1. Call the persona engine to generate the full persona JSON
    # If brand insights exist, include them in generation
    full_persona_json = persona_engine.generate_persona_from_attributes(
        age=persona_data.age,
        gender=persona_data.gender,
        condition=persona_data.condition,
        location=persona_data.location,
        concerns=persona_data.concerns,
        brand_insights=brand_insights
    )
    
    if not full_persona_json or full_persona_json == "{}":
        raise HTTPException(status_code=500, detail="Failed to generate persona from LLM.")

    # 2. Save the result to the database
    new_persona = crud.create_persona(
        db=db, 
        persona_data=persona_data, 
        persona_json=full_persona_json
    )
    
    # 3. Generate avatar using DALL-E 3
    try:
        # Parse the persona JSON to extract additional attributes
        persona_json_parsed = json.loads(full_persona_json)
        specialty = persona_json_parsed.get("specialty")
        if not specialty and isinstance(persona_json_parsed.get("demographics"), dict):
            specialty = persona_json_parsed.get("demographics", {}).get("specialty")
        persona_type = persona_json_parsed.get("persona_type", "Patient")
        
        avatar_url = avatar_engine.generate_avatar(
            age=persona_data.age,
            gender=persona_data.gender,
            persona_type=persona_type,
            specialty=specialty,
            name=new_persona.name
        )
        
        if avatar_url:
            # Update the persona with the avatar URL
            new_persona.avatar_url = avatar_url
            db.commit()
            db.refresh(new_persona)
            logger.info(f"✅ Avatar generated for persona {new_persona.id}: {avatar_url[:50]}...")
    except Exception as avatar_error:
        logger.warning(f"⚠️ Avatar generation failed for persona {new_persona.id}: {avatar_error}")
        # Don't fail the request if avatar generation fails - persona is still created
    
    return new_persona

@app.post("/personas/manual", response_model=schemas.Persona)
async def create_manual_persona(manual_data: dict, db: Session = Depends(get_db)):
    """
    Create a persona manually with detailed attributes provided by the user.
    
    If brand_id is provided, the persona will be associated with that brand.
    """
    try:
        # Extract brand_id if provided
        brand_id = manual_data.get("brand_id")
        
        # Validate brand exists if provided
        if brand_id:
            brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
            if not brand:
                raise HTTPException(status_code=404, detail="Brand not found")
        
        # Build the persona JSON from the provided data
        persona_json = {
            "name": manual_data.get("name", ""),
            "demographics": manual_data.get("demographics", {}),
            "medical_background": manual_data.get("medical_background", ""),
            "lifestyle_and_values": manual_data.get("lifestyle_and_values", ""),
            "motivations": [motivation for motivation in manual_data.get("motivations", []) if motivation.strip()],
            "beliefs": [belief for belief in manual_data.get("beliefs", []) if belief.strip()],
            "pain_points": [point for point in manual_data.get("pain_points", []) if point.strip()],
            "communication_preferences": manual_data.get("communication_preferences", {})
        }
        
        # Create a PersonaCreate object for database insertion
        persona_create_data = schemas.PersonaCreate(
            age=manual_data.get("age", 0),
            gender=manual_data.get("gender", ""),
            condition=manual_data.get("condition", ""),
            location=manual_data.get("region", ""),  # Map region to location for database compatibility
            concerns="",  # Manual personas don't have concerns field
            brand_id=brand_id
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
async def get_all_personas(
    skip: int = 0, 
    limit: int = 100, 
    brand_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Returns a list of personas from the database.
    
    If brand_id is provided, returns only personas belonging to that brand.
    """
    if brand_id is not None:
        personas = crud.get_personas_by_brand(db, brand_id=brand_id, skip=skip, limit=limit)
    else:
        personas = crud.get_personas(db, skip=skip, limit=limit)
    return personas

@app.put("/personas/{persona_id}", response_model=schemas.Persona)
async def update_persona_endpoint(
    persona_id: int,
    persona_update: schemas.PersonaUpdate,
    db: Session = Depends(get_db)
):
    """Update persona attributes or enriched JSON."""
    updated = crud.update_persona(db, persona_id, persona_update)
    if not updated:
        raise HTTPException(status_code=404, detail="Persona not found")
    return updated

@app.post("/personas/{persona_id}/enrich-from-brand", response_model=schemas.Persona)
async def enrich_persona_from_brand(
    persona_id: int,
    request: schemas.PersonaBrandEnrichmentRequest,
    db: Session = Depends(get_db)
):
    persona = crud.get_persona(db, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    brand = db.query(models.Brand).filter(models.Brand.id == request.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    documents = crud.get_brand_documents(db, request.brand_id)
    aggregated = _aggregate_brand_insights(documents, request.target_segment, limit_per_category=8)
    flattened = _flatten_insights(aggregated)

    try:
        persona_json = json.loads(persona.full_persona_json or "{}")
    except json.JSONDecodeError:
        persona_json = {}

    enriched = persona_engine.enrich_persona_from_brand_context(
        persona_json,
        flattened,
        target_fields=request.target_fields
    )

    updated = crud.update_persona(
        db,
        persona_id,
        schemas.PersonaUpdate(full_persona_json=enriched)
    )

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to persist enriched persona")

    return updated

@app.post("/personas/recruit", response_model=List[schemas.Persona])
async def recruit_personas(request: schemas.PersonaSearchRequest, db: Session = Depends(get_db)):
    """
    Recruit personas based on a natural language prompt.
    """
    # 1. Parse the prompt into structured filters
    filters_dict = persona_engine.parse_recruitment_prompt(request.prompt)
    
    # 2. Convert to Pydantic model
    try:
        filters = schemas.PersonaSearchFilters(**filters_dict)
    except Exception as e:
        # If parsing fails or returns empty, default to basic search or empty
        logger.warning(f"Failed to parse filters from prompt: {e}")
        filters = schemas.PersonaSearchFilters()

    # 3. Search the database
    personas = crud.search_personas(db, filters)
    
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


@app.post("/personas/{persona_id}/regenerate-avatar", response_model=schemas.Persona)
async def regenerate_persona_avatar(persona_id: int, db: Session = Depends(get_db)):
    """
    Regenerate the avatar for an existing persona using DALL-E 3.
    
    This will generate a new, unique avatar based on the persona's demographics
    and replace the existing avatar URL.
    """
    # Get the persona
    persona = crud.get_persona(db, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    # Parse persona JSON for additional attributes
    try:
        persona_json = json.loads(persona.full_persona_json or "{}")
    except json.JSONDecodeError:
        persona_json = {}
    
    specialty = persona_json.get("specialty") or persona_json.get("demographics", {}).get("specialty")
    persona_type = persona.persona_type or "Patient"
    
    # Generate new avatar
    try:
        import random
        avatar_url = avatar_engine.generate_avatar(
            age=persona.age,
            gender=persona.gender,
            persona_type=persona_type,
            specialty=specialty,
            name=f"{persona.name}_regen_{random.randint(1, 10000)}"  # Unique seed for new result
        )
        
        if not avatar_url:
            raise HTTPException(status_code=500, detail="Failed to generate avatar")
        
        # Update the persona with new avatar URL
        persona.avatar_url = avatar_url
        db.commit()
        db.refresh(persona)
        
        logger.info(f"✅ Avatar regenerated for persona {persona_id}: {avatar_url[:50]}...")
        return persona
        
    except Exception as e:
        logger.error(f"❌ Failed to regenerate avatar for persona {persona_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate avatar: {str(e)}")

# --- Saved Simulation Endpoints ---

@app.post("/simulations/save", response_model=schemas.SavedSimulation)
async def save_simulation(simulation_data: schemas.SavedSimulationCreate, db: Session = Depends(get_db)):
    """Saves a simulation result to the database."""
    # Check if a simulation with the same name already exists
    existing_simulation = db.query(models.SavedSimulation).filter(models.SavedSimulation.name == simulation_data.name).first()
    if existing_simulation:
        raise HTTPException(status_code=400, detail="A simulation with this name already exists.")
    
    # Validate that critical fields are present in the data
    data = simulation_data.simulation_data
    required_fields = ['stimulus_text', 'metrics_analyzed', 'individual_responses', 'summary_statistics']
    missing_fields = [field for field in required_fields if field not in data]
    
    if missing_fields:
        logger.warning(f"Saving simulation with missing fields: {missing_fields}")
    
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
            metric_weights=request.metric_weights,
            db=db,
            questions=request.questions
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
    metric_weights: Optional[str] = Form(None),
    content_type: str = Form(...),
    stimulus_text: Optional[str] = Form(None),
    questions: Optional[str] = Form(None),
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

        metric_weights_dict: Optional[Dict[str, float]] = None
        if metric_weights:
            try:
                parsed_weights = json.loads(metric_weights)
                if isinstance(parsed_weights, dict):
                    metric_weights_dict = {}
                    for k, v in parsed_weights.items():
                        if v is None:
                            continue
                        try:
                            metric_weights_dict[str(k)] = float(v)
                        except (ValueError, TypeError) as ve:
                            raise HTTPException(status_code=400, detail=f"Invalid weight value for '{k}': {v}. Must be numeric.")
                    logger.info("✅ Parsed metric_weights: %s", metric_weights_dict)
                else:
                    raise HTTPException(status_code=400, detail="metric_weights must be a JSON object/dict")
            except json.JSONDecodeError as e:
                logger.error("❌ Failed to parse metric_weights JSON: %s", e)
                raise HTTPException(status_code=400, detail=f"Invalid metric_weights JSON: {str(e)}")
            except HTTPException:
                raise
            except Exception as e:
                logger.error("❌ Failed to normalize metric_weights: %s", e)
                raise HTTPException(status_code=400, detail=f"Invalid metric_weights payload: {str(e)}")

        questions_list: Optional[List[str]] = None
        if questions:
            try:
                parsed_questions = json.loads(questions)
                if isinstance(parsed_questions, list):
                    questions_list = [str(q) for q in parsed_questions if str(q).strip()]
                    logger.info("✅ Parsed questions: %s", questions_list)
            except json.JSONDecodeError as e:
                logger.error("❌ Failed to parse questions JSON: %s", e)
                raise HTTPException(status_code=400, detail=f"Invalid questions JSON: {str(e)}")
            
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
            metric_weights=metric_weights_dict,
            questions=questions_list,
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


# --- Image Improvement Endpoint ---
@app.post("/cohorts/improve-image")
async def improve_marketing_image(
    analysis_results: str = Form(...),
    original_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Improve marketing images based on persona reactions from analysis.
    Takes the analysis results and original image, returns improved version.
    """
    try:
        logger.info("🎨 Image improvement request received")
        
        # Parse analysis results
        try:
            analysis_data = json.loads(analysis_results)
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse analysis_results JSON: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid analysis_results JSON: {str(e)}")
        
        # Read and encode original image
        image_contents = await original_image.read()
        original_image_base64 = base64.b64encode(image_contents).decode('utf-8')
        
        # Extract persona insights
        individual_responses = analysis_data.get('individual_responses', [])
        summary_statistics = analysis_data.get('summary_statistics', {})
        
        persona_insights = image_improvement.extract_persona_insights(
            individual_responses,
            summary_statistics
        )
        
        logger.info(f"📊 Extracted insights from {len(individual_responses)} persona responses")
        
        # Generate improved image
        improved_result = image_improvement.improve_image_with_ai(
            original_image_base64=original_image_base64,
            image_content_type=original_image.content_type or "image/png",
            persona_insights=persona_insights,
            individual_responses=individual_responses,
            summary_statistics=summary_statistics
        )
        
        logger.info("✅ Image improvement completed successfully")
        
        return {
            "status": "success",
            "improved_image_base64": improved_result['improved_image_base64'],
            "improvements": improved_result['improvements'],
            "analysis": improved_result['analysis'],
            "original_format": improved_result.get('original_format', 'PNG')
        }
        
    except Exception as e:
        logger.error(f"❌ Error improving image: {e}")
        logger.error("❌ Full traceback:", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to improve image: {str(e)}")


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



def _normalize_insight_type(raw_type: Optional[str]) -> str:
    if not raw_type:
        return "Motivation"
    normalized = raw_type.strip().lower()
    if "tension" in normalized or "pain" in normalized or "barrier" in normalized:
        return "Tension"
    if "belief" in normalized or "perception" in normalized or "attitude" in normalized:
        return "Belief"
    return "Motivation"


def _insight_matches_segment(insight_segment: Optional[str], target_segment: Optional[str]) -> bool:
    if not target_segment:
        return True
    if not insight_segment or insight_segment.lower() == "general":
        return True
    return target_segment.lower() in insight_segment.lower()


def _dedupe_and_limit(insights: List[Dict[str, str]], limit: int = 5) -> List[Dict[str, str]]:
    seen = set()
    unique = []
    for insight in insights:
        text = insight.get("text", "").strip()
        if not text:
            continue
        key = (insight.get("type", ""), text.lower())
        if key in seen:
            continue
        seen.add(key)
        unique.append(insight)
    if len(unique) > limit * 2:
        llm_result = _llm_merge_insights(unique, limit)
        if llm_result:
            return llm_result
    if limit:
        return unique[:limit]
    return unique


def _aggregate_brand_insights(
    documents: List[models.BrandDocument],
    target_segment: Optional[str],
    limit_per_category: int
) -> Dict[str, List[Dict[str, str]]]:
    motivations: List[Dict[str, str]] = []
    beliefs: List[Dict[str, str]] = []
    tensions: List[Dict[str, str]] = []

    for doc in documents:
        for raw_insight in (doc.extracted_insights or []):
            insight_type = _normalize_insight_type(raw_insight.get("type"))
            segment = raw_insight.get("segment") or "General"

            if not _insight_matches_segment(segment, target_segment):
                continue

            normalized = {
                "type": insight_type,
                "text": (raw_insight.get("text") or "").strip(),
                "segment": segment,
                "source_snippet": (raw_insight.get("source_snippet") or "").strip(),
                "source_document": raw_insight.get("source_document") or doc.filename,
            }

            if insight_type == "Motivation":
                motivations.append(normalized)
            elif insight_type == "Belief":
                beliefs.append(normalized)
            else:
                tensions.append(normalized)

    return {
        "motivations": _dedupe_and_limit(motivations, limit_per_category),
        "beliefs": _dedupe_and_limit(beliefs, limit_per_category),
        "tensions": _dedupe_and_limit(tensions, limit_per_category),
    }


def _flatten_insights(aggregated: Dict[str, List[Dict[str, str]]]) -> List[Dict[str, str]]:
    ordered_types = [("motivations", "Motivation"), ("beliefs", "Belief"), ("tensions", "Tension")]
    flattened: List[Dict[str, str]] = []
    for key, label in ordered_types:
        for insight in aggregated.get(key, []):
            flattened.append({**insight, "type": label})
    return flattened


def _llm_merge_insights(insights: List[Dict[str, str]], limit: int) -> List[Dict[str, str]]:
    client = persona_engine.get_openai_client()
    if client is None:
        return insights[:limit]

    system_prompt = (
        "You are consolidating brand insights for the MBT framework. "
        "Merge overlapping items, retain citations, and output at most "
        f"{limit} concise insights as JSON array."
    )
    user_payload = json.dumps(insights)[:6000]

    try:
        response = client.chat.completions.create(
            model=persona_engine.MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_payload},
            ],
            response_format={"type": "json_array"},
            max_tokens=600,
        )
        content = response.choices[0].message.content or "[]"
        merged = json.loads(content)
        normalized = []
        for entry in merged:
            normalized.append(
                {
                    "type": _normalize_insight_type(entry.get("type")),
                    "text": (entry.get("text") or "").strip(),
                    "segment": entry.get("segment", "General"),
                    "source_snippet": (entry.get("source_snippet") or "").strip(),
                    "source_document": entry.get("source_document"),
                }
            )
        return [item for item in normalized if item["text"]][:limit]
    except Exception as exc:
        logger.warning(f"Insight consolidation failed: {exc}")
        return insights[:limit]


# --- Brand Library Endpoints ---

@app.post("/api/brands", response_model=schemas.Brand)
async def create_brand(brand: schemas.BrandCreate, db: Session = Depends(get_db)):
    """Create a new brand context."""
    # Check if brand exists
    existing = db.query(models.Brand).filter(models.Brand.name == brand.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Brand already exists")
    return crud.create_brand(db, brand)

@app.get("/api/brands", response_model=List[schemas.Brand])
async def get_brands(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all brands."""
    return crud.get_brands(db, skip, limit)

@app.post("/api/brands/{brand_id}/upload", response_model=schemas.BrandDocument)
async def upload_brand_document(
    brand_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a document, extract text, classify it, and save to DB."""
    # Verify brand exists
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Create uploads directory if not exists
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file locally with sanitized filename and UUID prefix to avoid collisions
    original_filename = file.filename or "upload"
    safe_filename = os.path.basename(original_filename)
    safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", safe_filename).lstrip(".") or "upload"
    unique_prefix = uuid.uuid4().hex
    safe_file_location = os.path.join(upload_dir, f"{unique_prefix}_{safe_filename}")

    with open(safe_file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Extract text
    text = document_processor.extract_text(safe_file_location)
    
    # Classify
    category = document_processor.classify_document(text)

    extracted_insights = [
        {
            **insight,
            "source_document": safe_filename
        }
        for insight in persona_engine.extract_mbt_from_text(text)
    ]
    
    # Create document record
    doc_create = schemas.BrandDocumentCreate(
        brand_id=brand_id,
        filename=safe_filename,
        filepath=safe_file_location,
        category=category,
        summary=text[:200] + "..." if text else "No text extracted",
        extracted_insights=extracted_insights
    )
    
    return crud.create_brand_document(db, doc_create)

@app.get("/api/brands/{brand_id}/documents", response_model=List[schemas.BrandDocument])
async def get_brand_documents(brand_id: int, db: Session = Depends(get_db)):
    """List documents for a specific brand."""
    return crud.get_brand_documents(db, brand_id)

@app.get("/api/brands/{brand_id}/personas", response_model=List[schemas.Persona])
async def get_brand_personas(
    brand_id: int, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """List personas belonging to a specific brand."""
    # Verify brand exists
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    return crud.get_personas_by_brand(db, brand_id, skip=skip, limit=limit)

@app.get("/api/brands/{brand_id}/personas/count")
async def get_brand_personas_count(brand_id: int, db: Session = Depends(get_db)):
    """Get the count of personas for a specific brand."""
    # Verify brand exists
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    count = crud.get_personas_count_by_brand(db, brand_id)
    return {"brand_id": brand_id, "brand_name": brand.name, "persona_count": count}

@app.get("/api/brands/{brand_id}/context", response_model=schemas.BrandContextResponse)
async def get_brand_context(
    brand_id: int,
    target_segment: Optional[str] = None,
    limit_per_category: int = 5,
    db: Session = Depends(get_db)
):
    """Aggregate MBT insights for a brand with optional segment filtering."""
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    limit_per_category = max(1, min(limit_per_category, 15))
    documents = crud.get_brand_documents(db, brand_id)
    aggregated = _aggregate_brand_insights(documents, target_segment, limit_per_category)

    return schemas.BrandContextResponse(
        brand_id=brand.id,
        brand_name=brand.name,
        **aggregated
    )

@app.post("/api/brands/{brand_id}/persona-suggestions", response_model=schemas.BrandSuggestionResponse)
async def get_brand_persona_suggestions(
    brand_id: int,
    request: schemas.BrandSuggestionRequest,
    db: Session = Depends(get_db)
):
    """Generate MBT suggestion lists for manual persona creation."""
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    limit = max(1, min(request.limit_per_category, 10))
    documents = crud.get_brand_documents(db, brand_id)
    aggregated = _aggregate_brand_insights(documents, request.target_segment, limit)
    flattened = _flatten_insights(aggregated)

    suggestions = persona_engine.suggest_persona_attributes(
        flattened,
        persona_type=request.persona_type or "Patient"
    )

    return schemas.BrandSuggestionResponse(
        brand_id=brand.id,
        brand_name=brand.name,
        target_segment=request.target_segment,
        persona_type=request.persona_type,
        motivations=suggestions.get("motivations", []),
        beliefs=suggestions.get("beliefs", []),
        tensions=suggestions.get("tensions", []),
    )

@app.post("/api/brands/{brand_id}/seed", response_model=List[schemas.BrandDocument])
async def seed_brand_documents(brand_id: int, db: Session = Depends(get_db)):
    """Populate the brand with mock documents for demo purposes."""
    # Verify brand exists
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Mock data for 7 categories
    mock_data = {
        "Disease & Patient Journey Overview": "This document covers the epidemiology, pathophysiology, and patient journey for Type 2 Diabetes. It highlights the emotional burden of diagnosis and the progressive nature of the disease.",
        "Treatment Landscape / SoC": "Current Standard of Care involves Metformin as first-line, followed by GLP-1 RAs or SGLT2 inhibitors. This review analyzes the efficacy and safety profiles of leading competitors.",
        "Brand Value Proposition & Core Messaging": "Our brand offers superior glycemic control with weight loss benefits. Key message: 'Power to control, freedom to live.' Differentiators include once-weekly dosing.",
        "Safety & Tolerability Summary": "Summary of adverse events from Phase 3 trials. GI side effects are most common but transient. No new safety signals observed in long-term extension studies.",
        "HCP & Patient Segmentation": "HCP Segments: 1. Efficacy-Driven Experts, 2. Safety-First Prescribers. Patient Archetypes: 1. The Proactive Manager, 2. The Overwhelmed Struggler.",
        "Market Research & Insight Summaries": "Qualitative research indicates that HCPs are hesitant to switch stable patients. Patients desire treatments that minimize lifestyle disruption.",
        "Adherence / Persistence / Discontinuation Insights": "Data shows 20% discontinuation rate at 6 months due to cost and GI issues. Persistence is higher with the autoinjector device compared to vials."
    }

    created_docs = []
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    for category, text in mock_data.items():
        # Create a dummy file
        filename = f"Mock_{category.replace(' ', '_').replace('/', '-')}.txt"
        filepath = f"{upload_dir}/{int(time.time())}_{filename}"
        
        with open(filepath, "w") as f:
            f.write(text)
            
        # Classify (we know the category, but let's run it through processor to be safe/consistent, 
        # or just assign it since it's a seed)
        # For speed and reliability of the demo, we can force the category or let the AI do it.
        # Let's force it to ensure the demo works perfectly for the user's specific request.
        
        doc_create = schemas.BrandDocumentCreate(
            brand_id=brand_id,
            filename=filename,
            filepath=filepath,
            category=category,
            summary=text,
            extracted_insights=[
                {
                    **insight,
                    "source_document": filename
                }
                for insight in persona_engine.extract_mbt_from_text(text)
            ]
        )
        
        new_doc = crud.create_brand_document(db, doc_create)
        created_docs.append(new_doc)
        
    return created_docs

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

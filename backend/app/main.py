from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, Request
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
    from fastapi import Response
    return Response(status_code=200, headers={"X-Total-Personas": str(count)})

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

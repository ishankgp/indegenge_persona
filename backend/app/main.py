from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import uvicorn
import traceback

from . import crud, models, schemas, persona_engine, cohort_engine
from .database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PharmaPersonaSim API",
    description="Transform qualitative personas into quantitative insights using LLMs",
    version="1.0.0"
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

# --- Cohort Analysis Endpoints ---

@app.post("/cohorts/analyze")
async def analyze_cohort(request: schemas.CohortAnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyzes how a cohort of personas responds to a stimulus.
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
        
        return analysis_result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error in cohort analysis: {e}")
        print("Full traceback:")
        traceback.print_exc()
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

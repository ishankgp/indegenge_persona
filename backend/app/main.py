from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, Request, Response, Query, BackgroundTasks, Body
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

from .chat_engine import ChatEngine
from . import models, schemas, crud, persona_engine, cohort_engine, auto_enrichment, database, vector_search
from . import archetypes, disease_packs
from . import asset_analyzer
from .database import engine, get_db
import shutil

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
models.Base.metadata.create_all(bind=engine)

# Run startup migration to add missing columns for personas and brand documents
def run_startup_migration():
    """Add new columns to existing tables if they don't exist."""
    try:
        from sqlalchemy import inspect, text

        def add_column_if_missing(table_name: str, column_name: str, ddl_statement: str):
            inspector = inspect(engine)
            columns = {c['name'] for c in inspector.get_columns(table_name)}
            if column_name in columns:
                logger.info("✅ %s column already exists in %s table", column_name, table_name)
                return False

            logger.info("🔄 Running migration: Adding %s column to %s table...", column_name, table_name)
            with engine.connect() as conn:
                conn.execute(text(ddl_statement))
                conn.commit()
            logger.info("✅ Migration complete: %s column added", column_name)
            return True

        with engine.connect() as conn:
            initial_count = conn.execute(text("SELECT COUNT(*) FROM personas")).scalar() or 0

        brand_added = add_column_if_missing(
            'personas',
            'brand_id',
            "ALTER TABLE personas ADD COLUMN brand_id INTEGER REFERENCES brands(id)"
        )
        avatar_added = add_column_if_missing(
            'personas',
            'avatar_url',
            "ALTER TABLE personas ADD COLUMN avatar_url VARCHAR"
        )

        vector_store_added = add_column_if_missing(
            'brand_documents',
            'vector_store_id',
            "ALTER TABLE brand_documents ADD COLUMN vector_store_id VARCHAR"
        )
        chunk_size_added = add_column_if_missing(
            'brand_documents',
            'chunk_size',
            "ALTER TABLE brand_documents ADD COLUMN chunk_size INTEGER"
        )
        chunk_ids_added = add_column_if_missing(
            'brand_documents',
            'chunk_ids',
            "ALTER TABLE brand_documents ADD COLUMN chunk_ids JSON"
        )
        
        # Add document_type column for knowledge graph classification
        document_type_added = add_column_if_missing(
            'brand_documents',
            'document_type',
            "ALTER TABLE brand_documents ADD COLUMN document_type VARCHAR DEFAULT 'brand_messaging'"
        )

        # Create knowledge_nodes table if it doesn't exist
        def create_table_if_missing(table_name: str, create_statement: str):
            inspector = inspect(engine)
            if table_name in inspector.get_table_names():
                logger.info("✅ %s table already exists", table_name)
                return False
            logger.info("🔄 Creating %s table...", table_name)
            with engine.connect() as conn:
                conn.execute(text(create_statement))
                conn.commit()
            logger.info("✅ %s table created", table_name)
            return True

        knowledge_nodes_created = create_table_if_missing(
            'knowledge_nodes',
            """
            CREATE TABLE knowledge_nodes (
                id VARCHAR PRIMARY KEY,
                brand_id INTEGER REFERENCES brands(id),
                node_type VARCHAR,
                text TEXT NOT NULL,
                summary VARCHAR(200),
                segment VARCHAR,
                journey_stage VARCHAR,
                source_document_id INTEGER REFERENCES brand_documents(id),
                source_quote TEXT,
                confidence FLOAT DEFAULT 0.7,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verified_by_user BOOLEAN DEFAULT FALSE
            )
            """
        )
        
        knowledge_relations_created = create_table_if_missing(
            'knowledge_relations',
            """
            CREATE TABLE knowledge_relations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                brand_id INTEGER REFERENCES brands(id),
                from_node_id VARCHAR REFERENCES knowledge_nodes(id),
                to_node_id VARCHAR REFERENCES knowledge_nodes(id),
                relation_type VARCHAR,
                strength FLOAT DEFAULT 0.7,
                context TEXT,
                inferred_by VARCHAR DEFAULT 'llm',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
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

        migrations_run = [brand_added, avatar_added, vector_store_added, chunk_size_added, 
                         chunk_ids_added, document_type_added, knowledge_nodes_created, 
                         knowledge_relations_created]
        if not any(migrations_run):
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

@app.post("/api/personas/generate", response_model=schemas.Persona)
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
    
    # 1. Get Archetype and Disease Context if provided
    archetype_data = None
    if persona_data.archetype:
        archetype_data = archetypes.get_archetype_by_name(persona_data.archetype)

    disease_data = None
    if persona_data.disease:
        disease_data = disease_packs.get_disease_pack(persona_data.disease)

    # 2. Call the persona engine to generate the full persona JSON
    # If brand insights exist, include them in generation
    full_persona_json = persona_engine.generate_persona_from_attributes(
        age=persona_data.age,
        gender=persona_data.gender,
        condition=persona_data.condition,
        location=persona_data.location,
        concerns=persona_data.concerns,
        archetype=archetype_data,
        disease_context=disease_data,
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
    
    # 3. Post-creation updates (Archetype tagging and Avatar)
    updates_needed = False
    
    if archetype_data:
        new_persona.persona_subtype = archetype_data.get("name")
        # Ensure correct type is set if archetype dictates it
        if archetype_data.get("persona_type"):
            new_persona.persona_type = archetype_data.get("persona_type")
        updates_needed = True

    if disease_data:
        new_persona.disease_pack = disease_data.get("condition_name")
        updates_needed = True

    # Generate avatar using fallback (DALL-E 3 generation removed)
    try:
        # Parse the persona JSON to extract additional attributes
        persona_json_parsed = json.loads(full_persona_json)
        persona_type_raw = persona_json_parsed.get("persona_type", "Patient")
        persona_type = "HCP" if str(persona_type_raw).lower() == "hcp" else "Patient"
        
        avatar_url = avatar_engine.get_fallback_avatar(
            persona_type=persona_type,
            gender=persona_data.gender
        )
        
        if avatar_url:
            # Update the persona with the avatar URL
            new_persona.avatar_url = avatar_url
            updates_needed = True
            logger.info(f"✅ Fallback avatar generated for persona {new_persona.id}")
            
    except Exception as avatar_error:
        logger.warning(f"⚠️ Avatar generation failed for persona {new_persona.id}: {avatar_error}")
        # Don't fail the request if avatar generation fails - persona is still created
    
    if updates_needed:
        db.commit()
        db.refresh(new_persona)
    
    return new_persona

@app.post("/api/personas/manual", response_model=schemas.Persona)
async def create_manual_persona(manual_data: dict, db: Session = Depends(get_db)):
    """
    Create a persona manually with detailed attributes provided by the user.
    
    If brand_id is provided, the persona will be associated with that brand.
    """
    try:
        # Extract brand_id if provided
        brand_id = manual_data.get("brand_id")
        brand_insights = None

        # Validate brand exists if provided
        if brand_id:
            brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
            if not brand:
                raise HTTPException(status_code=404, detail="Brand not found")

            documents = crud.get_brand_documents(db, brand_id)
            aggregated = _aggregate_brand_insights(documents, target_segment=None, limit_per_category=5)
            brand_insights = _flatten_insights(aggregated)

        location = manual_data.get("location") or manual_data.get("region", "")
        demographics = manual_data.get("demographics", {})
        motivations = [motivation for motivation in manual_data.get("motivations", []) if str(motivation).strip()]
        beliefs = [belief for belief in manual_data.get("beliefs", []) if str(belief).strip()]
        pain_points = [point for point in manual_data.get("pain_points", []) if str(point).strip()]
        communication_preferences = manual_data.get("communication_preferences", {})
        medical_background = manual_data.get("medical_background", "") or f"Managing {manual_data.get('condition', '').lower()} with support from local clinicians."
        lifestyle = manual_data.get("lifestyle_and_values") or manual_data.get("lifestyle") or f"Lives in {location} and balances health goals with daily responsibilities."
        occupation = demographics.get("occupation") or manual_data.get("occupation") or "Professional"

        schema_payload = persona_engine._build_schema_persona(
            name=manual_data.get("name", ""),
            age=manual_data.get("age", 0),
            gender=manual_data.get("gender", ""),
            condition=manual_data.get("condition", ""),
            location=location,
            concerns=manual_data.get("concerns", ""),
            occupation=occupation,
            motivations=motivations,
            beliefs=beliefs,
            pain_points=pain_points,
            lifestyle=lifestyle,
            medical_background=medical_background,
            communication_preferences=communication_preferences,
            persona_type=manual_data.get("persona_type", "patient"),
            brand_insights=brand_insights,
            existing_persona=manual_data,
        )

        # Create a PersonaCreate object for database insertion
        persona_create_data = schemas.PersonaCreate(
            age=manual_data.get("age", 0),
            gender=manual_data.get("gender", ""),
            condition=manual_data.get("condition", ""),
            location=location,  # Map region/location into database location field
            concerns="",  # Manual personas don't have concerns field
            brand_id=brand_id
        )

        # Save to database
        new_persona = crud.create_persona(
            db=db,
            persona_data=persona_create_data,
            persona_json=json.dumps(schema_payload, ensure_ascii=False)
        )
        
        return new_persona
        
    except Exception as e:
        logger.error(f"Error creating manual persona: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create manual persona: {str(e)}")

@app.get("/api/personas/", response_model=List[schemas.Persona])
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

@app.get("/api/personas/{persona_id}", response_model=schemas.Persona)
def get_persona(persona_id: int, db: Session = Depends(get_db)):
    """Get a single persona by ID"""
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona

@app.put("/api/personas/{persona_id}", response_model=schemas.Persona)
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

@app.post("/api/personas/{persona_id}/enrich-from-brand", response_model=schemas.Persona)
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


@app.post("/api/personas/{persona_id}/enrich", response_model=schemas.Persona)
async def enrich_persona(
    persona_id: int,
    db: Session = Depends(get_db)
):
    """
    Enrich an existing persona to match the full schema depth using LLM.
    
    This endpoint takes an existing persona and fills in any missing schema fields 
    such as core.mbt (motivations, beliefs, tensions), decision_drivers, messaging,
    channel_behavior, etc. It uses LLM when available and falls back to sensible
    defaults when OpenAI is unavailable.
    
    No brand_id is required - enrichment is based on existing persona data.
    """
    persona = crud.get_persona(db, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    try:
        persona_json = json.loads(persona.full_persona_json or "{}")
    except json.JSONDecodeError:
        persona_json = {}

    # Enrich the persona using the new function
    enriched = persona_engine.enrich_existing_persona(persona_json)

    # Update the database with the enriched persona
    updated = crud.update_persona(
        db,
        persona_id,
        schemas.PersonaUpdate(full_persona_json=enriched)
    )

    if not updated:
        raise HTTPException(status_code=500, detail="Failed to persist enriched persona")

    logger.info(f"✅ Enriched persona {persona_id} with full schema depth")
    return updated


@app.post("/api/personas/recruit", response_model=List[schemas.Persona])
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


@app.post("/api/personas/check-similarity")
async def check_persona_similarity_endpoint(
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Check if a new persona is similar to existing personas.
    
    Returns similarity analysis to help users avoid creating duplicates.
    If similar personas exist, suggests using existing ones instead.
    """
    from . import similarity_service
    
    new_persona_attrs = request.get("persona_attrs", {})
    brand_id = request.get("brand_id")
    threshold = request.get("threshold", 0.7)
    
    if not new_persona_attrs:
        raise HTTPException(status_code=400, detail="persona_attrs is required")
    
    # Get existing personas (optionally filtered by brand)
    if brand_id:
        existing_personas = crud.get_personas_by_brand(db, brand_id=brand_id, limit=50)
    else:
        existing_personas = crud.get_personas(db, limit=50)
    
    # Convert to dicts for the similarity service
    existing_dicts = []
    for p in existing_personas:
        persona_dict = {
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "condition": p.condition,
            "persona_type": p.persona_type,
            "persona_subtype": p.persona_subtype,
            "decision_style": p.decision_style,
            "full_persona_json": p.full_persona_json
        }
        existing_dicts.append(persona_dict)
    
    # Check similarity
    result = similarity_service.check_persona_similarity_sync(
        new_persona_attrs=new_persona_attrs,
        existing_personas=existing_dicts,
        brand_id=brand_id,
        threshold=threshold
    )
    
    return result


@app.post("/api/personas/from-transcript")
async def extract_persona_from_transcript(
    file: Optional[UploadFile] = File(None),
    transcript_text: Optional[str] = Form(None),
    use_llm: Optional[bool] = Form(True),
    verify_quotes: Optional[bool] = Form(True),
):
    """Accept a transcript file or raw text and return persona suggestions.
    
    Args:
        file: Optional transcript file (PDF, TXT, MD, DOCX)
        transcript_text: Optional raw transcript text
        use_llm: If True, use LLM for comprehensive extraction (default True)
        verify_quotes: If True, validate extracted quotes against source (default True)
    """

    text_content = (transcript_text or "").strip()

    if file:
        try:
            raw_bytes = await file.read()
            text_content = raw_bytes.decode("utf-8", errors="ignore")
        except Exception as exc:
            logger.error("Failed to read transcript file: %s", exc)
            raise HTTPException(status_code=400, detail="Could not read transcript file")

    if not text_content:
        raise HTTPException(status_code=400, detail="Transcript text is required")

    # Use comprehensive LLM extraction if enabled, otherwise fall back to heuristics
    if use_llm:
        suggestions = persona_engine.extract_comprehensive_persona_from_transcript(
            text_content,
            verify_quotes=verify_quotes
        )
    else:
        suggestions = persona_engine.extract_persona_from_transcript(text_content)

    if not suggestions:
        raise HTTPException(status_code=500, detail="Failed to extract suggestions from transcript")

    suggestions["source"] = suggestions.get("source", {})
    suggestions["source"].update({
        "filename": getattr(file, "filename", None),
        "received_via": "file" if file else "text",
    })
    
    # Count extracted items for summary
    legacy = suggestions.get("legacy", {})
    extraction_summary = {
        "motivations_count": len(legacy.get("motivations", [])),
        "beliefs_count": len(legacy.get("beliefs", [])),
        "tensions_count": len(legacy.get("tensions", [])),
        "extraction_method": suggestions.get("extraction_method", "heuristics"),
    }
    suggestions["extraction_summary"] = extraction_summary

    return suggestions


@app.get("/api/personas/{persona_id}/export")
async def export_persona_for_simulation(
    persona_id: int,
    include_evidence: bool = True,
    db: Session = Depends(get_db)
):
    """Export a persona in a format ready for simulation.
    
    Returns the enriched persona JSON structured for the cohort analysis engine.
    This endpoint provides the same data as the standard GET but in a format
    optimized for simulation payloads.
    
    Args:
        persona_id: The ID of the persona to export
        include_evidence: Whether to include evidence metadata (default True)
    """
    persona = crud.get_persona(db, persona_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    try:
        persona_json = json.loads(persona.full_persona_json or "{}")
    except json.JSONDecodeError:
        persona_json = {}
    
    # Build simulation-ready export
    export_data = {
        "id": persona.id,
        "name": persona.name,
        "persona_type": persona.persona_type or "Patient",
        "demographics": {
            "age": persona.age,
            "gender": persona.gender,
            "condition": persona.condition,
            "location": persona.location,
        },
        # Include full persona data for rich simulation context
        "full_persona": persona_json,
        # Extract key fields for quick access
        "motivations": persona_json.get("motivations", []),
        "beliefs": persona_json.get("beliefs", []),
        "pain_points": persona_json.get("pain_points", []),
        "medical_background": persona_json.get("medical_background", ""),
        "lifestyle_and_values": persona_json.get("lifestyle_and_values", ""),
        "communication_preferences": persona_json.get("communication_preferences", {}),
    }
    
    # Include HCP-specific fields if applicable
    if persona.persona_type and persona.persona_type.lower() == "hcp":
        export_data["hcp_context"] = {
            "specialty": persona.specialty,
            "practice_setup": persona.practice_setup,
            "decision_influencers": persona.decision_influencers,
            "adherence_to_protocols": persona.adherence_to_protocols,
            "decision_style": persona.decision_style,
        }
    
    # Include enriched schema fields if available
    core = persona_json.get("core", {})
    if core:
        export_data["mbt"] = core.get("mbt", {})
        export_data["decision_drivers"] = core.get("decision_drivers", {})
        export_data["messaging"] = core.get("messaging", {})
        export_data["barriers_objections"] = core.get("barriers_objections", {})
        export_data["channel_behavior"] = core.get("channel_behavior", {})
    
    # Strip evidence if not requested (for smaller payloads)
    if not include_evidence:
        export_data = _strip_evidence_from_export(export_data)
    
    export_data["export_metadata"] = {
        "exported_at": datetime.now().isoformat(),
        "schema_version": persona_json.get("schema_version", "1.0.0"),
        "includes_evidence": include_evidence,
    }
    
    return export_data


def _strip_evidence_from_export(data: dict) -> dict:
    """Remove evidence arrays from export data to reduce payload size."""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == "evidence":
                continue  # Skip evidence arrays
            result[key] = _strip_evidence_from_export(value)
        return result
    elif isinstance(data, list):
        return [_strip_evidence_from_export(item) for item in data]
    return data

@app.head("/api/personas/")
async def head_personas(db: Session = Depends(get_db)):
    """Lightweight HEAD endpoint to allow health probes without transferring payload."""
    count = db.query(models.Persona).count()
    return Response(status_code=200, headers={"X-Total-Personas": str(count)})

@app.delete("/api/personas/{persona_id}", status_code=204)
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

# Seeding Endpoint (Temporary)
@app.post("/api/admin/seed")
async def seed_data(
    background_tasks: BackgroundTasks, 
    key: str = Query(..., description="Admin Secret")
):
    """
    Trigger database seeding remotely.
    This runs setup_mounjaro and create_sample_personas in the background.
    """
    # Simple hardcoded check for safety
    if key != "indegene_secret_seed_2024":
        raise HTTPException(status_code=403, detail="Invalid admin key")
        
    def run_seeding_job():
        logger.info("🚀 Starting Remote Seeding Job...")
        try:
            # Import here to avoid circular dependencies if any, and ensure it uses current env
            import sys
            import os
            
            # Ensure backend dir is in path (it should be)
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(current_dir)
            if backend_dir not in sys.path:
                sys.path.append(backend_dir)
            
            import setup_mounjaro
            import create_sample_personas
            
            logger.info("--- Running setup_mounjaro ---")
            setup_mounjaro.setup_mounjaro_brand()
            
            logger.info("--- Running create_sample_personas ---")
            create_sample_personas.create_personas()
            
            logger.info("✅ Remote Seeding Job Completed Successfully")
        except Exception as e:
            logger.error(f"❌ Remote Seeding Job Failed: {e}")
            import traceback
            traceback.print_exc()

    background_tasks.add_task(run_seeding_job)
    return {"message": "Seeding job started in background. Check server logs for progress."}

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


def _aggregate_insight_entries(
    insight_entries: List[Dict[str, str]],
    target_segment: Optional[str],
    limit_per_category: int,
) -> Dict[str, List[Dict[str, str]]]:
    motivations: List[Dict[str, str]] = []
    beliefs: List[Dict[str, str]] = []
    tensions: List[Dict[str, str]] = []

    for raw_insight in insight_entries:
        insight_type = _normalize_insight_type(raw_insight.get("type"))
        segment = raw_insight.get("segment") or "General"

        if not _insight_matches_segment(segment, target_segment):
            continue

        normalized = {
            "type": insight_type,
            "text": (raw_insight.get("text") or "").strip(),
            "segment": segment,
            "source_snippet": (raw_insight.get("source_snippet") or "").strip(),
            "source_document": raw_insight.get("source_document")
            or raw_insight.get("source_document_filename")
            or "",
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


def _aggregate_brand_insights(
    documents: List[models.BrandDocument],
    target_segment: Optional[str],
    limit_per_category: int
) -> Dict[str, List[Dict[str, str]]]:
    insight_entries: List[Dict[str, str]] = []

    for doc in documents:
        for raw_insight in (doc.extracted_insights or []):
            insight_entries.append(
                {
                    **raw_insight,
                    "source_document_filename": getattr(doc, "filename", None),
                }
            )

    return _aggregate_insight_entries(insight_entries, target_segment, limit_per_category)


def _aggregate_with_vector_search(
    brand_id: int,
    documents: List[models.BrandDocument],
    target_segment: Optional[str],
    limit_per_category: int,
) -> Dict[str, List[Dict[str, str]]]:
    """Prefer vector-search snippets when available, fall back to full documents."""

    vector_results = vector_search.search_brand_chunks(
        brand_id=brand_id,
        documents=documents,
        query_text=target_segment or "brand insights",
        top_k=limit_per_category * 3,
        target_segment=target_segment
    )

    if vector_results:
        logger.info("Using vector search results for brand %s", brand_id)
        return _aggregate_insight_entries(vector_results, target_segment, limit_per_category)

    logger.info("Vector search unavailable (or empty); aggregating from documents for brand %s", brand_id)
    return _aggregate_brand_insights(documents, target_segment, limit_per_category)


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


# --- Archetypes & Disease Packs Endpoints ---

@app.get("/api/archetypes")
async def get_archetypes():
    """List all available persona archetypes for grounding persona generation."""
    from .archetypes import ARCHETYPES
    return ARCHETYPES


@app.get("/api/disease-packs")
async def get_disease_packs():
    """List all available disease context packs with MBT grounding."""
    from .disease_packs import DISEASE_PACKS
    # Return as list with name as key identifier
    return [
        {"name": key, **value}
        for key, value in DISEASE_PACKS.items()
    ]

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

    # Create chunks and vector embeddings (OpenAI)
    chunk_size = 800
    chunks = document_processor.chunk_text(text, chunk_size=chunk_size)
    
    # generate_vector_embeddings returns (None, vector_store_id, chunk_ids)
    _, vector_store_id, chunk_ids = document_processor.generate_vector_embeddings(
        chunks,
        brand_id=brand_id,
        filename=safe_filename,
        chunk_size=chunk_size,
        insights=extracted_insights
    )

    # Create or replace document record while cleaning up any stale vectors
    chunk_size_value = chunk_size if (chunks or vector_store_id) else None

    doc_create = schemas.BrandDocumentCreate(
        brand_id=brand_id,
        filename=safe_filename,
        filepath=safe_file_location,
        category=category,
        summary=text[:200] + "..." if text else "No text extracted",
        extracted_insights=extracted_insights,
        vector_store_id=vector_store_id,
        chunk_size=chunk_size_value,
        chunk_ids=chunk_ids or None,
    )

    new_doc = crud.upsert_brand_document(db, doc_create)

    # Trigger Knowledge Graph Extraction
    try:
        from . import knowledge_extractor
        logger.info(f"🧠 Starting knowledge extraction for document {new_doc.id}")
        nodes = await knowledge_extractor.extract_knowledge_from_document(
            document_id=new_doc.id,
            document_text=text,
            document_type=category or "brand_messaging",
            brand_id=brand_id,
            brand_name=brand.name,
            db=db
        )
        
        if nodes:
            logger.info(f"🧠 Inferring relationships for brand {brand_id}")
            await knowledge_extractor.infer_relationships(
                brand_id=brand_id,
                new_nodes=nodes,
                db=db
            )
    except Exception as e:
        logger.error(f"❌ Knowledge extraction failed for document {new_doc.id}: {e}")
        # We don't fail the request, just log the error

    return new_doc

@app.get("/api/brands/{brand_id}/documents", response_model=List[schemas.BrandDocument])
async def get_brand_documents(brand_id: int, db: Session = Depends(get_db)):
    """List documents for a specific brand."""
    return crud.get_brand_documents(db, brand_id)


@app.delete("/api/brands/{brand_id}/documents/{document_id}", status_code=204)
async def delete_brand_document(brand_id: int, document_id: int, db: Session = Depends(get_db)):
    """Delete a brand document and remove any associated vectors."""
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    deleted = crud.delete_brand_document(db, document_id=document_id, brand_id=brand_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    return Response(status_code=204)

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
    aggregated = _aggregate_with_vector_search(
        brand_id=brand_id,
        documents=documents,
        target_segment=target_segment,
        limit_per_category=limit_per_category,
    )

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
    aggregated = _aggregate_with_vector_search(
        brand_id=brand_id,
        documents=documents,
        target_segment=request.target_segment,
        limit_per_category=limit,
    )
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
        
        chunk_size = 800
        chunks = document_processor.chunk_text(text, chunk_size=chunk_size)
        
        extracted_insights = [
            {
                **insight,
                "source_document": filename
            }
            for insight in persona_engine.extract_mbt_from_text(text)
        ]

        _, vector_store_id, chunk_ids = document_processor.generate_vector_embeddings(
            chunks,
            brand_id=brand_id,
            filename=filename,
            chunk_size=chunk_size,
            insights=extracted_insights
        )

        doc_create = schemas.BrandDocumentCreate(
            brand_id=brand_id,
            filename=filename,
            filepath=filepath,
            category=category,
            summary=text,
            extracted_insights=extracted_insights,
            vector_store_id=vector_store_id,
            chunk_size=chunk_size,
            chunk_ids=chunk_ids or None
        )
        
        new_doc = crud.upsert_brand_document(db, doc_create)
        created_docs.append(new_doc)
        
        # Trigger Knowledge Graph Extraction for this document
        try:
            from . import knowledge_extractor
            logger.info(f"🧠 Starting knowledge extraction for seeded document {new_doc.id}")
            nodes = await knowledge_extractor.extract_knowledge_from_document(
                document_id=new_doc.id,
                document_text=text,
                document_type="brand_messaging", # Default for mock data
                brand_id=brand_id,
                brand_name=brand.name,
                db=db
            )
            
            if nodes:
                # We can infer relationships cumulatively
                await knowledge_extractor.infer_relationships(
                    brand_id=brand_id,
                    new_nodes=nodes,
                    db=db
                )
        except Exception as e:
            logger.error(f"❌ Knowledge extraction failed for seeded document {new_doc.id}: {e}")

    return created_docs


# --- Bulk Folder Ingestion Endpoint ---

class FolderIngestRequest(BaseModel):
    """Request model for folder ingestion."""
    folder_path: str
    recursive: bool = True

class IngestResult(BaseModel):
    """Result of ingesting a single file."""
    filename: str
    status: str
    document_id: Optional[int] = None
    nodes_created: int = 0
    error: Optional[str] = None

class FolderIngestResponse(BaseModel):
    """Response for folder ingestion."""
    total_files: int
    successful: int
    failed: int
    total_nodes_created: int
    results: List[IngestResult]

@app.post("/api/brands/{brand_id}/ingest-folder", response_model=FolderIngestResponse)
async def ingest_folder(
    brand_id: int,
    request: FolderIngestRequest,
    db: Session = Depends(get_db)
):
    """
    Ingest all documents from a folder into the brand's knowledge graph.
    
    Supports: PDF, TXT, MD, CSV files.
    Automatically extracts knowledge nodes and infers relationships.
    """
    # Verify brand exists
    brand = db.query(models.Brand).filter(models.Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    folder_path = request.folder_path
    
    # Handle relative paths from project root
    if not os.path.isabs(folder_path):
        # Try relative to current working directory
        if not os.path.exists(folder_path):
            # Try relative to backend directory
            backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            project_root = os.path.dirname(backend_dir)
            folder_path = os.path.join(project_root, request.folder_path)
    
    if not os.path.exists(folder_path) or not os.path.isdir(folder_path):
        raise HTTPException(
            status_code=400, 
            detail=f"Folder not found: {request.folder_path}"
        )
    
    # Collect files
    supported_extensions = {'.pdf', '.txt', '.md', '.csv'}
    files_to_process = []
    
    if request.recursive:
        for root, dirs, files in os.walk(folder_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in supported_extensions:
                    files_to_process.append(os.path.join(root, file))
    else:
        for file in os.listdir(folder_path):
            ext = os.path.splitext(file)[1].lower()
            if ext in supported_extensions:
                files_to_process.append(os.path.join(folder_path, file))
    
    if not files_to_process:
        raise HTTPException(
            status_code=400,
            detail=f"No supported files found in folder (PDF, TXT, MD, CSV)"
        )
    
    logger.info(f"📁 Found {len(files_to_process)} files to ingest for brand {brand.name}")
    
    results: List[IngestResult] = []
    total_nodes_created = 0
    all_new_nodes = []
    
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    for filepath in files_to_process:
        filename = os.path.basename(filepath)
        logger.info(f"📄 Processing: {filename}")
        
        try:
            # Extract text
            text = document_processor.extract_text(filepath)
            
            if not text or len(text.strip()) < 50:
                results.append(IngestResult(
                    filename=filename,
                    status="skipped",
                    error="No text content or too short"
                ))
                continue
            
            # Classify document
            category = document_processor.classify_document(text)
            
            # Extract MBT insights
            extracted_insights = [
                {**insight, "source_document": filename}
                for insight in persona_engine.extract_mbt_from_text(text)
            ]
            
            # Create chunks and embeddings
            chunk_size = 800
            chunks = document_processor.chunk_text(text, chunk_size=chunk_size)
            
            _, vector_store_id, chunk_ids = document_processor.generate_vector_embeddings(
                chunks,
                brand_id=brand_id,
                filename=filename,
                chunk_size=chunk_size,
                insights=extracted_insights
            )
            
            # Copy file to uploads with unique prefix
            unique_prefix = uuid.uuid4().hex
            safe_filename = re.sub(r"[^A-Za-z0-9._-]", "_", filename).lstrip(".") or "upload"
            dest_path = os.path.join(upload_dir, f"{unique_prefix}_{safe_filename}")
            shutil.copy2(filepath, dest_path)
            
            # Create document record
            doc_create = schemas.BrandDocumentCreate(
                brand_id=brand_id,
                filename=safe_filename,
                filepath=dest_path,
                category=category,
                summary=text[:200] + "..." if len(text) > 200 else text,
                extracted_insights=extracted_insights,
                vector_store_id=vector_store_id,
                chunk_size=chunk_size if chunks else None,
                chunk_ids=chunk_ids or None,
            )
            
            new_doc = crud.upsert_brand_document(db, doc_create)
            
            # Extract knowledge graph nodes
            nodes_created = 0
            try:
                from . import knowledge_extractor
                nodes = await knowledge_extractor.extract_knowledge_from_document(
                    document_id=new_doc.id,
                    document_text=text,
                    document_type=category or "brand_messaging",
                    brand_id=brand_id,
                    brand_name=brand.name,
                    db=db
                )
                nodes_created = len(nodes) if nodes else 0
                total_nodes_created += nodes_created
                if nodes:
                    all_new_nodes.extend(nodes)
            except Exception as e:
                logger.error(f"❌ Knowledge extraction failed for {filename}: {e}")
            
            results.append(IngestResult(
                filename=filename,
                status="success",
                document_id=new_doc.id,
                nodes_created=nodes_created
            ))
            
        except Exception as e:
            logger.error(f"❌ Failed to process {filename}: {e}")
            results.append(IngestResult(
                filename=filename,
                status="failed",
                error=str(e)
            ))
    
    # Infer relationships for all new nodes at the end
    if all_new_nodes:
        try:
            from . import knowledge_extractor
            logger.info(f"🧠 Inferring relationships for {len(all_new_nodes)} new nodes")
            await knowledge_extractor.infer_relationships(
                brand_id=brand_id,
                new_nodes=all_new_nodes,
                db=db
            )
        except Exception as e:
            logger.error(f"❌ Relationship inference failed: {e}")
    
    successful = sum(1 for r in results if r.status == "success")
    failed = sum(1 for r in results if r.status == "failed")
    
    logger.info(f"✅ Ingestion complete: {successful} successful, {failed} failed, {total_nodes_created} nodes created")
    
    return FolderIngestResponse(
        total_files=len(files_to_process),
        successful=successful,
        failed=failed,
        total_nodes_created=total_nodes_created,
        results=results
    )


# --- Veeva CRM Integration Simulation Endpoints ---
# Mock data moved to separate module for cleaner code organization
from .mock_veeva_data import MOCK_VEEVA_DATA

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


# --- Asset Intelligence Endpoints ---

@app.post("/api/assets/analyze")
async def analyze_asset_with_personas(
    file: UploadFile = File(...),
    persona_ids: str = Form(...),
    brand_id: Optional[int] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Analyze a marketing asset from the perspective of selected personas.
    
    Uses Nano Banana Pro (Gemini 3.0 Pro Image) to generate annotated images
    with professional red-lining feedback for each persona.
    
    Now includes Knowledge Graph integration for research-backed, attributable feedback.
    
    Results are cached based on image hash + persona hash. If a persona's
    attributes change, the cache is automatically invalidated.
    
    Args:
        file: The marketing asset image to analyze
        persona_ids: Comma-separated list of persona IDs
        brand_id: Optional brand ID to fetch knowledge graph context for research-backed feedback
        
    Returns:
        List of analysis results, one per persona, each containing:
        - persona_id: ID of the persona
        - persona_name: Name of the persona
        - annotated_image: Base64 encoded annotated image
        - text_summary: Text summary of the feedback
        - citations: Research citations from knowledge graph (if brand_id provided)
        - cached: Whether result was from cache
    """
    import hashlib
    from . import knowledge_alignment
    
    # Parse persona IDs
    try:
        ids = [int(id.strip()) for id in persona_ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid persona_ids format. Expected comma-separated integers.")
    
    if not ids:
        raise HTTPException(status_code=400, detail="At least one persona_id is required.")
    
    # Fetch personas from database
    personas = []
    for persona_id in ids:
        persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
        if persona:
            personas.append({
                "id": persona.id,
                "name": persona.name,
                "persona_type": persona.persona_type,
                "persona_subtype": persona.persona_subtype,
                "decision_style": persona.decision_style,
                "full_persona_json": persona.full_persona_json,
                "brand_id": persona.brand_id  # Include brand_id from persona
            })
        else:
            logger.warning(f"Persona with id {persona_id} not found, skipping.")
    
    if not personas:
        raise HTTPException(status_code=404, detail="No valid personas found for the provided IDs.")
    
    # Determine brand_id (from parameter or from first persona)
    effective_brand_id = brand_id
    if not effective_brand_id and personas:
        effective_brand_id = personas[0].get("brand_id")
    
    # Fetch knowledge graph context if brand_id is available
    knowledge_section = None
    knowledge_context = None
    if effective_brand_id:
        knowledge_context = knowledge_alignment.get_brand_knowledge_context(
            brand_id=effective_brand_id,
            persona_type=personas[0].get("persona_type", "patient"),
            db=db
        )
        if knowledge_context.get("has_knowledge"):
            knowledge_section = knowledge_alignment.build_knowledge_enriched_prompt_section(
                knowledge_context=knowledge_context,
                persona_type=personas[0].get("persona_type", "patient")
            )
            logger.info(f"📚 Knowledge context loaded for brand {effective_brand_id}: {len(knowledge_context.get('key_messages', []))} messages, {len(knowledge_context.get('patient_tensions', []))} tensions")
    
    # Read the uploaded file
    try:
        image_bytes = await file.read()
        mime_type = file.content_type or "image/png"
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")
    
    # Compute image hash for caching
    image_hash = hashlib.sha256(image_bytes).hexdigest()
    asset_name = file.filename
    
    logger.info(f"🎨 Analyzing asset '{asset_name}' (hash: {image_hash[:12]}...) for {len(personas)} personas, with_knowledge={bool(knowledge_section)}")
    
    results = []
    cache_hits = 0
    cache_misses = 0
    
    for persona in personas:
        # Compute persona hash for cache key
        persona_hash = asset_analyzer.compute_persona_hash(persona)
        
        # Check cache first
        cached = crud.get_cached_analysis(
            db=db,
            image_hash=image_hash,
            persona_id=persona["id"],
            persona_hash=persona_hash
        )
        
        if cached:
            logger.info(f"✅ Cache HIT for persona {persona['id']} ({persona['name']})")
            cache_hits += 1
            result = cached.result_json
            result["cached"] = True
            results.append(result)
        else:
            logger.info(f"❌ Cache MISS for persona {persona['id']} ({persona['name']}) - running analysis")
            cache_misses += 1
            
            # Run analysis with knowledge context
            result = await asset_analyzer.analyze_image_with_nano_banana(
                image_bytes=image_bytes,
                persona=persona,
                mime_type=mime_type,
                knowledge_section=knowledge_section
            )
            result["cached"] = False
            
            # Analyze response for citations if we have knowledge context
            if knowledge_context and knowledge_context.get("has_knowledge"):
                citation_analysis = knowledge_alignment.analyze_response_for_citations(
                    text_summary=result.get("text_summary", ""),
                    knowledge_context=knowledge_context
                )
                result["citations"] = citation_analysis.get("citations", [])
                result["research_alignment_score"] = citation_analysis.get("research_alignment_score")
                result["alignment_summary"] = knowledge_alignment.generate_alignment_summary(
                    citations=citation_analysis.get("citations", []),
                    knowledge_context=knowledge_context
                )
            
            # Save to cache
            crud.create_cached_analysis(
                db=db,
                image_hash=image_hash,
                persona_id=persona["id"],
                persona_hash=persona_hash,
                asset_name=asset_name,
                result_json=result
            )
            
            results.append(result)
    
    # Log response details before returning
    for i, result in enumerate(results):
        img = result.get('annotated_image')
        citations = result.get('citations', [])
        logger.info(f"📸 Result {i} ({result.get('persona_name')}): has_image={bool(img)}, citations={len(citations)}, cached={result.get('cached')}")
    
    return {
        "success": True,
        "asset_filename": file.filename,
        "image_hash": image_hash,
        "brand_id": effective_brand_id,
        "knowledge_enabled": bool(knowledge_section),
        "personas_analyzed": len(results),
        "cache_hits": cache_hits,
        "cache_misses": cache_misses,
        "results": results
    }


@app.get("/api/assets/history")
async def get_asset_analysis_history(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieve the history of asset analyses for the dashboard.
    
    Returns a list of past analyses with metadata, grouped by asset.
    """
    cached_results = crud.get_asset_history(db=db, skip=skip, limit=limit)
    
    # Group by image_hash and asset_name for cleaner display
    history = []
    seen_assets = {}
    
    for cached in cached_results:
        asset_key = cached.image_hash
        if asset_key not in seen_assets:
            seen_assets[asset_key] = {
                "image_hash": cached.image_hash,
                "asset_name": cached.asset_name,
                "first_analyzed": cached.created_at.isoformat() if cached.created_at else None,
                "personas": []
            }
            history.append(seen_assets[asset_key])
        
        seen_assets[asset_key]["personas"].append({
            "persona_id": cached.persona_id,
            "persona_hash": cached.persona_hash[:12] + "..." if cached.persona_hash else None,
            "analyzed_at": cached.created_at.isoformat() if cached.created_at else None
        })
    
    return {
        "total_entries": len(cached_results),
        "unique_assets": len(history),
        "history": history
    }


@app.get("/api/assets/history/full")
async def get_full_asset_history(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get full asset analysis history including annotated images and results.
    Groups by image_hash and includes all persona analysis results.
    """
    cached_results = crud.get_asset_history(db=db, skip=skip, limit=limit)
    
    # Group by image_hash with full results
    assets = {}
    for cached in cached_results:
        asset_key = cached.image_hash
        if asset_key not in assets:
            assets[asset_key] = {
                "image_hash": cached.image_hash,
                "asset_name": cached.asset_name,
                "created_at": cached.created_at.isoformat() if cached.created_at else None,
                "results": []
            }
        
        # Include full result_json with annotated image
        result = cached.result_json.copy() if cached.result_json else {}
        result["persona_id"] = cached.persona_id
        result["id"] = cached.id  # Include analysis record ID
        result["analyzed_at"] = cached.created_at.isoformat() if cached.created_at else None
        assets[asset_key]["results"].append(result)
    
    return {
        "total_assets": len(assets),
        "assets": list(assets.values())
    }


@app.delete("/api/assets/cache/clear")
async def clear_asset_analysis_cache(
    db: Session = Depends(get_db)
):
    """
    Clear all cached asset analysis results.
    Useful when API keys change or for testing fresh analyses.
    """
    try:
        # Delete all cached analysis records
        deleted_count = db.query(models.CachedAssetAnalysis).delete()
        db.commit()
        logger.info(f"🗑️ Cleared {deleted_count} cached asset analysis records")
        return {
            "success": True,
            "message": f"Cleared {deleted_count} cached analysis records",
            "deleted_count": deleted_count
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")


@app.delete("/api/assets/history/{analysis_id}")
async def delete_asset_analysis_history(
    analysis_id: int,
    db: Session = Depends(get_db)
):
    """
    Delete a specific asset analysis result by ID
    """
    try:
        analysis = db.query(models.CachedAssetAnalysis).filter(models.CachedAssetAnalysis.id == analysis_id).first()
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis result not found")
        
        db.delete(analysis)
        db.commit()
        return {"success": True, "message": "Analysis result deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis: {str(e)}")


# === Knowledge Graph API Endpoints ===

@app.get("/api/knowledge/brands/{brand_id}/nodes")
async def get_knowledge_nodes(
    brand_id: int,
    node_type: Optional[str] = None,
    segment: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get knowledge nodes for a brand.
    
    Optionally filter by node_type or segment.
    """
    query = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id
    )
    
    if node_type:
        query = query.filter(models.KnowledgeNode.node_type == node_type)
    if segment:
        query = query.filter(models.KnowledgeNode.segment.ilike(f"%{segment}%"))
    
    total = query.count()
    nodes = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "nodes": [
            {
                "id": n.id,
                "node_type": n.node_type,
                "text": n.text,
                "summary": n.summary,
                "segment": n.segment,
                "journey_stage": n.journey_stage,
                "confidence": n.confidence,
                "source_document_id": n.source_document_id,
                "source_quote": n.source_quote,
                "verified": n.verified_by_user,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in nodes
        ]
    }


@app.get("/api/knowledge/brands/{brand_id}/relations")
async def get_knowledge_relations(
    brand_id: int,
    relation_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db)
):
    """
    Get knowledge relations for a brand.
    
    Optionally filter by relation_type.
    """
    query = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id
    )
    
    if relation_type:
        query = query.filter(models.KnowledgeRelation.relation_type == relation_type)
    
    total = query.count()
    relations = query.offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "relations": [
            {
                "id": r.id,
                "from_node_id": r.from_node_id,
                "to_node_id": r.to_node_id,
                "relation_type": r.relation_type,
                "strength": r.strength,
                "context": r.context,
                "inferred_by": r.inferred_by,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in relations
        ]
    }


@app.get("/api/knowledge/brands/{brand_id}/graph")
async def get_full_knowledge_graph(
    brand_id: int,
    db: Session = Depends(get_db)
):
    """
    Get the full knowledge graph for visualization.
    
    Returns nodes and edges in a format suitable for React Flow.
    """
    nodes = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.brand_id == brand_id
    ).all()
    
    relations = db.query(models.KnowledgeRelation).filter(
        models.KnowledgeRelation.brand_id == brand_id
    ).all()
    
    # Format for React Flow
    graph_nodes = []
    for n in nodes:
        graph_nodes.append({
            "id": n.id,
            "type": "knowledgeNode",  # Custom React Flow node type
            "data": {
                "label": n.summary or n.text[:50],
                "node_type": n.node_type,
                "text": n.text,
                "segment": n.segment,
                "confidence": n.confidence,
                "verified": n.verified_by_user,
                "source_quote": n.source_quote
            },
            "position": {"x": 0, "y": 0}  # Frontend will compute layout
        })
    
    graph_edges = []
    for r in relations:
        graph_edges.append({
            "id": f"e-{r.id}",
            "source": r.from_node_id,
            "target": r.to_node_id,
            "type": "knowledgeEdge",  # Custom React Flow edge type
            "data": {
                "relation_type": r.relation_type,
                "strength": r.strength,
                "context": r.context
            },
            "label": r.relation_type,
            "animated": r.relation_type == "contradicts"  # Highlight contradictions
        })
    
    # Count by type for stats
    type_counts = {}
    for n in nodes:
        type_counts[n.node_type] = type_counts.get(n.node_type, 0) + 1
    
    return {
        "brand_id": brand_id,
        "nodes": graph_nodes,
        "edges": graph_edges,
        "stats": {
            "total_nodes": len(nodes),
            "total_edges": len(relations),
            "node_types": type_counts,
            "contradictions": sum(1 for r in relations if r.relation_type == "contradicts")
        }
    }


@app.post("/api/knowledge/documents/{document_id}/extract")
async def extract_knowledge_from_document(
    document_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Trigger knowledge extraction from a document.
    
    This extracts nodes and infers relationships using GPT-5.2.
    """
    from . import knowledge_extractor, document_processor
    
    # Get the document
    document = db.query(models.BrandDocument).filter(
        models.BrandDocument.id == document_id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Get brand info
    brand = db.query(models.Brand).filter(models.Brand.id == document.brand_id).first()
    brand_name = brand.name if brand else "Unknown Brand"
    
    # Get document text from extracted insights or re-extract
    document_text = ""
    if document.extracted_insights:
        insights = document.extracted_insights
        if isinstance(insights, str):
            try:
                insights = json.loads(insights)
            except:
                insights = {}
        
        # Try to get raw text
        document_text = insights.get("raw_text", "")
        if not document_text:
            # Reconstruct from insights
            for key in ["motivations", "beliefs", "tensions"]:
                items = insights.get(key, [])
                if isinstance(items, list):
                    for item in items:
                        if isinstance(item, dict):
                            document_text += item.get("text", "") + ". "
                        elif isinstance(item, str):
                            document_text += item + ". "
    
    if not document_text:
        return {
            "success": False,
            "message": "No text content found in document. Please re-upload with text extraction."
        }
    
    # Determine document type
    doc_type = document.document_type or "brand_messaging"
    
    # Extract knowledge nodes
    nodes = knowledge_extractor.extract_knowledge_from_document_sync(
        document_id=document_id,
        document_text=document_text,
        document_type=doc_type,
        brand_id=document.brand_id,
        brand_name=brand_name,
        db=db
    )
    
    # Infer relationships
    relations = []
    if nodes:
        relations = knowledge_extractor.infer_relationships_sync(
            brand_id=document.brand_id,
            new_nodes=nodes,
            db=db
        )
    
    return {
        "success": True,
        "document_id": document_id,
        "document_type": doc_type,
        "nodes_extracted": len(nodes),
        "relationships_inferred": len(relations),
        "node_ids": [n.id for n in nodes]
    }


@app.post("/api/knowledge/brands/{brand_id}/personas/{persona_id}/enrich")
async def enrich_persona_from_graph(
    brand_id: int,
    persona_id: int,
    db: Session = Depends(get_db)
):
    """
    Enrich a persona with relevant insights from the knowledge graph.
    """
    from . import auto_enrichment
    
    result = auto_enrichment.enrich_persona_from_knowledge_graph_sync(
        persona_id=persona_id,
        brand_id=brand_id,
        db=db
    )
    
    if result is None:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    return {
        "success": True,
        "persona_id": persona_id,
        "enriched": True,
        "nodes_applied": result.get("knowledge_graph_enrichment", {}).get("nodes_applied", 0)
    }


@app.get("/api/knowledge/brands/{brand_id}/persona-check")
async def check_persona_alignment(
    brand_id: int,
    persona_ids: str,  # Comma-separated list of persona IDs
    db: Session = Depends(get_db)
):
    """
    Pre-flight check: Validate if selected personas have known triggers or gaps
    in brand messaging before asset analysis.
    
    Returns alignment status, triggers, gaps, and recommendations.
    """
    from . import persona_check
    
    # Parse persona IDs
    try:
        ids = [int(id.strip()) for id in persona_ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid persona_ids format")
    
    if not ids:
        raise HTTPException(status_code=400, detail="At least one persona_id is required")
    
    result = persona_check.check_persona_alignment(
        brand_id=brand_id,
        persona_ids=ids,
        db=db
    )
    
    result["summary"] = persona_check.get_persona_check_summary(result)
    
    return result

@app.delete("/api/knowledge/nodes/{node_id}")
async def delete_knowledge_node(
    node_id: str,
    db: Session = Depends(get_db)
):
    """Delete a knowledge node and its relationships."""
    node = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.id == node_id
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Delete related relations
    db.query(models.KnowledgeRelation).filter(
        (models.KnowledgeRelation.from_node_id == node_id) |
        (models.KnowledgeRelation.to_node_id == node_id)
    ).delete()
    
    db.delete(node)
    db.commit()
    
    return {"success": True, "deleted_node_id": node_id}


@app.put("/api/knowledge/nodes/{node_id}/verify")
async def verify_knowledge_node(
    node_id: str,
    verified: bool = True,
    db: Session = Depends(get_db)
):
    """Mark a knowledge node as verified by user."""
    node = db.query(models.KnowledgeNode).filter(
        models.KnowledgeNode.id == node_id
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    node.verified_by_user = verified
    db.commit()
    
    return {"success": True, "node_id": node_id, "verified": verified}


# === Coverage & Gap Analysis Endpoints ===

@app.get("/api/coverage/analysis")
async def get_coverage_analysis(
    brand_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Analyze persona library for coverage gaps.
    """
    from . import coverage_engine
    return coverage_engine.get_coverage_summary(brand_id, db)


@app.post("/api/coverage/suggestions")
async def get_coverage_suggestions(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Get AI suggestions for new personas to fill gaps.
    """
    from . import coverage_engine
    
    brand_id = payload.get("brand_id")
    limit = payload.get("limit", 5)
    
    suggestions = coverage_engine.suggest_next_personas_sync(
        brand_id=brand_id,
        db=db,
        limit=limit
    )
    
    return {
        "success": True,
        "suggestions": suggestions
    }


# === Knowledge Graph Node Management Endpoints ===

@app.get("/api/knowledge/brands/{brand_id}/duplicates")
async def get_duplicate_nodes(
    brand_id: int,
    threshold: float = 0.60,
    db: Session = Depends(get_db)
):
    """
    Find duplicate/similar knowledge nodes for review.
    
    Returns pairs of nodes with similarity >= threshold.
    """
    from . import knowledge_merger
    
    candidates = knowledge_merger.find_duplicate_candidates(
        brand_id=brand_id,
        db=db,
        threshold=threshold
    )
    
    return {
        "brand_id": brand_id,
        "threshold": threshold,
        "duplicate_count": len(candidates),
        "duplicates": candidates
    }


@app.post("/api/knowledge/nodes/merge")
async def merge_knowledge_nodes(
    payload: dict = Body(...),
    db: Session = Depends(get_db)
):
    """
    Merge multiple nodes into a primary node.
    
    Payload:
        - primary_id: ID of node to keep
        - secondary_ids: List of node IDs to merge into primary
    """
    from . import knowledge_merger
    
    primary_id = payload.get("primary_id")
    secondary_ids = payload.get("secondary_ids", [])
    
    if not primary_id or not secondary_ids:
        raise HTTPException(status_code=400, detail="primary_id and secondary_ids required")
    
    result = knowledge_merger.merge_nodes(
        primary_id=primary_id,
        secondary_ids=secondary_ids,
        db=db
    )
    
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@app.delete("/api/knowledge/nodes/{node_id}")
async def delete_knowledge_node(
    node_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a single knowledge node and its relationships.
    """
    from . import knowledge_merger
    
    result = knowledge_merger.delete_node(node_id, db)
    
    if result.get("error"):
        raise HTTPException(status_code=404, detail=result["error"])
    
    return result


@app.post("/api/knowledge/brands/{brand_id}/auto-merge")
async def auto_merge_duplicate_nodes(
    brand_id: int,
    threshold: float = 0.85,
    db: Session = Depends(get_db)
):
    """
    Automatically merge nodes with very high similarity (>= threshold).
    
    Use with caution - this is a destructive operation.
    """
    from . import knowledge_merger
    
    result = knowledge_merger.auto_merge_duplicates(
        brand_id=brand_id,
        db=db,
        threshold=threshold
    )
    
    return result



# --- Chat Endpoints ---

@app.post("/api/chat/sessions", response_model=schemas.ChatSession)
async def create_chat_session(
    session_data: schemas.ChatSessionCreate, 
    db: Session = Depends(get_db)
):
    """Start a new chat session with a persona."""
    engine = ChatEngine(db)
    return engine.create_session(session_data.persona_id, session_data.brand_id)

@app.get("/api/chat/sessions/{session_id}", response_model=schemas.ChatSession)
async def get_chat_session(session_id: int, db: Session = Depends(get_db)):
    """Get chat session details."""
    session = crud.get_chat_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

@app.get("/api/chat/sessions/{session_id}/messages", response_model=List[schemas.ChatMessage])
async def get_chat_history_endpoint(
    session_id: int, 
    limit: int = 50, 
    db: Session = Depends(get_db)
):
    """Get message history for a session."""
    if not crud.get_chat_session(db, session_id):
        raise HTTPException(status_code=404, detail="Chat session not found")
    return crud.get_chat_history(db, session_id, limit)

@app.post("/api/chat/sessions/{session_id}/messages", response_model=schemas.ChatMessage)
async def send_chat_message(
    session_id: int,
    message: schemas.ChatMessageCreate,
    db: Session = Depends(get_db)
):
    """Send a message to the persona and get a response."""
    engine = ChatEngine(db)
    
    try:
        # process_message handles saving the user message and generating/saving the assistant response
        response_msg = engine.process_message(session_id, message.content)
        return response_msg
    except ValueError as e:
        # Typically means session or persona not found
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat message: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


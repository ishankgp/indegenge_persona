from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, synthetic_testing_engine, crud
from ..database import get_db

router = APIRouter(
    prefix="/api/synthetic",
    tags=["synthetic"]
)

# Note: Keeping the -testing suffix for analyze to avoid breaking existing frontend if not updated
# but the frontend api.ts actually shows /api/synthetic-testing/analyze
# I will add a redirect or just use two prefixes.
# Better: I'll use /api/synthetic for everything and update api.ts in the next step.

@router.post("/analyze", response_model=schemas.SyntheticTestingResponse)
@router.post("-testing/analyze", response_model=schemas.SyntheticTestingResponse, include_in_schema=False)
async def synthetic_testing_analyze(
    request: schemas.SyntheticTestingRequest,
    db: Session = Depends(get_db)
):
    """
    Run synthetic testing of marketing assets against selected personas.
    """
    assets_data = [
        {
            "id": asset.id,
            "name": asset.name,
            "data": asset.image_data,
            "text": asset.text_content
        }
        for asset in request.assets
    ]
    
    return synthetic_testing_engine.run_synthetic_testing(
        request.persona_ids,
        assets_data,
        db
    )

@router.post("/runs", response_model=schemas.SyntheticTestRun)
async def save_synthetic_run(
    request: schemas.SyntheticTestRunCreate,
    db: Session = Depends(get_db)
):
    return crud.create_synthetic_test_run(db, request)

@router.get("/runs", response_model=List[schemas.SyntheticTestRun])
async def list_synthetic_runs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return crud.get_synthetic_test_runs(db, skip=skip, limit=limit)

@router.get("/runs/{run_id}", response_model=schemas.SyntheticTestRun)
async def get_synthetic_run(
    run_id: int,
    db: Session = Depends(get_db)
):
    db_run = crud.get_synthetic_test_run(db, run_id)
    if not db_run:
        raise HTTPException(status_code=404, detail="Run not found")
    return db_run

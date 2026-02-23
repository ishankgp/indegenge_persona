from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, panel_feedback_engine
from ..database import get_db
import logging
import traceback

router = APIRouter(
    prefix="/api/panel-feedback",
    tags=["panel-feedback"]
)

logger = logging.getLogger(__name__)


@router.post("/analyze", response_model=schemas.PanelFeedbackResponse)
async def panel_feedback_analyze(
    request: schemas.PanelFeedbackRequest,
    db: Session = Depends(get_db)
):
    """
    Run structured panel feedback analysis for uploaded images against selected personas.
    Each image is analyzed separately per persona, producing per-image feedback
    and a results summary table.
    """
    try:
        # Convert Pydantic models to dicts for the engine
        images_data = [img.model_dump() for img in request.stimulus_images]

        result = panel_feedback_engine.run_panel_feedback_analysis(
            persona_ids=request.persona_ids,
            stimulus_text=request.stimulus_text or "",
            stimulus_images=images_data,
            content_type=request.content_type,
            db=db
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Panel feedback analysis failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Panel feedback analysis failed: {str(e)}")


from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
from datetime import datetime
import json

class PersonaBase(BaseModel):
    name: str
    avatar_url: Optional[str] = None  # DALL-E 3 generated avatar image URL
    persona_type: str = "Patient"
    age: int
    gender: str
    condition: str
    location: str
    full_persona_json: str
    brand_id: Optional[int] = None
    persona_subtype: Optional[str] = None
    tagline: Optional[str] = None
    specialty: Optional[str] = None
    practice_setup: Optional[str] = None
    system_context: Optional[str] = None
    decision_influencers: Optional[str] = None
    adherence_to_protocols: Optional[str] = None
    channel_use: Optional[str] = None
    decision_style: Optional[str] = None
    core_insight: Optional[str] = None

class PersonaCreate(BaseModel):
    # This schema is for the input data to the generation endpoint
    age: int
    gender: str
    condition: str
    location: str
    concerns: str
    brand_id: Optional[int] = None

class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    persona_type: Optional[str] = None
    persona_subtype: Optional[str] = None
    tagline: Optional[str] = None
    brand_id: Optional[int] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    specialty: Optional[str] = None
    practice_setup: Optional[str] = None
    system_context: Optional[str] = None
    decision_influencers: Optional[str] = None
    adherence_to_protocols: Optional[str] = None
    channel_use: Optional[str] = None
    decision_style: Optional[str] = None
    core_insight: Optional[str] = None
    full_persona_json: Optional[Union[str, Dict[str, Any]]] = None

class Persona(PersonaBase):
    id: int
    created_at: datetime
    
    # Custom getter to parse the JSON string into a dictionary
    @property
    def full_persona(self) -> Dict[str, Any]:
        return json.loads(self.full_persona_json)

    class Config:
        from_attributes = True

class PersonaSearchRequest(BaseModel):
    prompt: str

class PersonaSearchFilters(BaseModel):
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    gender: Optional[str] = None
    condition: Optional[str] = None
    location: Optional[str] = None
    persona_type: Optional[str] = None
    brand_id: Optional[int] = None
    limit: int = 10

# Cohort Analysis Schemas
class CohortAnalysisRequest(BaseModel):
    persona_ids: List[int]
    stimulus_text: str
    metrics: List[str]
    metric_weights: Optional[Dict[str, float]] = None
    questions: Optional[List[str]] = None

class PersonaResponse(BaseModel):
    persona_id: int
    persona_name: str
    responses: Dict[str, Any]
    reasoning: str
    answers: Optional[List[str]] = None

class CohortAnalysisResponse(BaseModel):
    cohort_size: int
    stimulus_text: str
    metrics_analyzed: List[str]
    questions: Optional[List[str]] = None
    individual_responses: List[PersonaResponse]
    summary_statistics: Dict[str, Any]
    insights: List[str]
    created_at: datetime

# Schemas for Simulation remain unchanged for now, but will be needed later.
class SimulationBase(BaseModel):
    persona_id: int
    scenario: str
    parameters: Dict[str, Any]

class SimulationCreate(SimulationBase):
    pass

class Simulation(SimulationBase):
    id: int
    results: Optional[Dict[str, Any]] = None
    response_rate: Optional[float] = None
    insights: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class SimulationRequest(BaseModel):
    persona_id: int
    scenario: str
    parameters: Dict[str, Any]

# Schemas for Saved Simulations
class SavedSimulationBase(BaseModel):
    name: str
    simulation_data: Dict[str, Any]

class SavedSimulationCreate(SavedSimulationBase):
    pass


class SavedSimulation(SavedSimulationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Brand Library Schemas
class BrandBase(BaseModel):
    name: str

class BrandCreate(BrandBase):
    pass

class Brand(BrandBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class BrandInsight(BaseModel):
    type: str
    text: str
    segment: Optional[str] = "General"
    source_snippet: Optional[str] = None
    source_document: Optional[str] = None


class BrandDocumentBase(BaseModel):
    brand_id: int
    filename: str
    category: str
    summary: Optional[str] = None
    extracted_insights: Optional[List[BrandInsight]] = None

class BrandDocumentCreate(BrandDocumentBase):
    filepath: str

class BrandDocument(BrandDocumentBase):
    id: int
    filepath: str
    created_at: datetime

    class Config:
        from_attributes = True


class BrandContextResponse(BaseModel):
    brand_id: int
    brand_name: str
    motivations: List[BrandInsight]
    beliefs: List[BrandInsight]
    tensions: List[BrandInsight]


class PersonaBrandEnrichmentRequest(BaseModel):
    brand_id: int
    target_segment: Optional[str] = None
    target_fields: Optional[List[str]] = None


class BrandSuggestionRequest(BaseModel):
    target_segment: Optional[str] = None
    persona_type: Optional[str] = "Patient"
    limit_per_category: int = 5


class BrandSuggestionResponse(BaseModel):
    brand_id: int
    brand_name: str
    target_segment: Optional[str] = None
    persona_type: Optional[str] = "Patient"
    motivations: List[str]
    beliefs: List[str]
    tensions: List[str]

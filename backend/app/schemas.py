from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import json

class PersonaBase(BaseModel):
    name: str
    persona_type: str = "Patient"
    age: int
    gender: str
    condition: str
    location: str
    full_persona_json: str
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

class Persona(PersonaBase):
    id: int
    created_at: datetime
    
    # Custom getter to parse the JSON string into a dictionary
    @property
    def full_persona(self) -> Dict[str, Any]:
        return json.loads(self.full_persona_json)

    class Config:
        from_attributes = True

# Cohort Analysis Schemas
class CohortAnalysisRequest(BaseModel):
    persona_ids: List[int]
    stimulus_text: str
    metrics: List[str]

class PersonaResponse(BaseModel):
    persona_id: int
    persona_name: str
    responses: Dict[str, Any]
    reasoning: str

class CohortAnalysisResponse(BaseModel):
    cohort_size: int
    stimulus_text: str
    metrics_analyzed: List[str]
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

class BrandDocumentBase(BaseModel):
    brand_id: int
    filename: str
    category: str
    summary: Optional[str] = None

class BrandDocumentCreate(BrandDocumentBase):
    filepath: str

class BrandDocument(BrandDocumentBase):
    id: int
    filepath: str
    created_at: datetime

    class Config:
        from_attributes = True

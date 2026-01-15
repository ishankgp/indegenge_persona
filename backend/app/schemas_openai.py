"""
OpenAI Structured Output Schemas

Pydantic models for guaranteed schema compliance when using OpenAI's
Structured Outputs feature (beta.chat.completions.parse).

These schemas replace ad-hoc JSON parsing with typed, validated responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum


# =============================================================================
# Knowledge Extraction Schemas
# =============================================================================

class ExtractedNode(BaseModel):
    """A single knowledge node extracted from a document."""
    node_type: Literal[
        "key_message", "value_proposition", "differentiator", "proof_point",
        "epidemiology", "symptom_burden", "treatment_landscape", "unmet_need",
        "patient_motivation", "patient_belief", "patient_tension", "journey_insight",
        "competitor_position", "market_barrier"
    ]
    text: str = Field(..., description="Full insight text (1-2 sentences)")
    summary: str = Field(..., description="Short label for graph display (max 50 chars)")
    segment: Optional[str] = Field(None, description="Who this applies to (e.g., 'Elderly Patients')")
    source_quote: str = Field(..., description="Exact quote from the document")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")


class KnowledgeExtractionResponse(BaseModel):
    """Response schema for knowledge extraction from documents."""
    nodes: List[ExtractedNode] = Field(default_factory=list)


# =============================================================================
# Relationship Inference Schemas
# =============================================================================

class RelationType(str, Enum):
    """Valid relationship types between knowledge nodes."""
    ADDRESSES = "addresses"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    TRIGGERS = "triggers"
    INFLUENCES = "influences"
    RESONATES_WITH = "resonates_with"


class RecommendedApproach(str, Enum):
    """Recommended approaches for handling CONTRADICTS relationships."""
    EDUCATE_WITH_EVIDENCE = "educate_with_evidence"
    VALIDATE_THEN_REDIRECT = "validate_then_redirect"
    COUNTER_WITH_TESTIMONIALS = "counter_with_testimonials"
    BUILD_CREDIBILITY_FIRST = "build_credibility_first"


class InferredRelationship(BaseModel):
    """A relationship inferred between two knowledge nodes."""
    from_node_id: str
    to_node_id: str
    relation_type: RelationType
    strength: float = Field(..., ge=0.0, le=1.0)
    context: str = Field(..., description="Brief explanation of the relationship")
    recommended_approach: Optional[RecommendedApproach] = Field(
        None,
        description="Required for CONTRADICTS relationships"
    )


class RelationshipInferenceResponse(BaseModel):
    """Response schema for relationship inference between nodes."""
    relationships: List[InferredRelationship] = Field(default_factory=list)


# =============================================================================
# Document Classification Schemas
# =============================================================================

class DocumentType(str, Enum):
    """Document type categories for classification."""
    BRAND_MESSAGING = "brand_messaging"
    DISEASE_LITERATURE = "disease_literature"
    INTERVIEW_TRANSCRIPT = "interview_transcript"
    COMPETITIVE_INTEL = "competitive_intel"


class DocumentClassificationResponse(BaseModel):
    """Response schema for document type classification."""
    document_type: DocumentType


# =============================================================================
# Persona Similarity Schemas
# =============================================================================

class SimilarityRecommendation(str, Enum):
    """Recommendation for handling similar personas."""
    USE_EXISTING = "use_existing"
    PROCEED_WITH_CAUTION = "proceed_with_caution"
    SAFE_TO_CREATE = "safe_to_create"


class SimilarityCheckResponse(BaseModel):
    """Response schema for persona similarity checking."""
    most_similar_persona_id: Optional[int] = None
    most_similar_persona_name: Optional[str] = None
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    overlapping_traits: List[str] = Field(default_factory=list)
    key_differences: List[str] = Field(default_factory=list)
    recommendation: SimilarityRecommendation


# =============================================================================
# Coverage Suggestions Schemas
# =============================================================================

class PersonaSuggestion(BaseModel):
    """A suggested persona to fill a coverage gap."""
    name: str = Field(..., description="Descriptive name for the persona")
    persona_type: Literal["Patient", "HCP"]
    age: Optional[int] = Field(None, ge=18, le=100)
    gender: Optional[str] = None
    primary_concern: Optional[str] = None
    decision_style: Optional[str] = None
    rationale: str = Field(..., description="Why this persona fills an important gap")
    priority: Literal["high", "medium"]


class CoverageSuggestionsResponse(BaseModel):
    """Response schema for persona coverage suggestions."""
    suggestions: List[PersonaSuggestion] = Field(default_factory=list)

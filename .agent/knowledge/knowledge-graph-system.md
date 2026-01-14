# PharmPersonaSim - Knowledge Graph System

## Overview
The Knowledge Graph extracts structured knowledge from brand documents and represents relationships between pharma-specific concepts for advanced features like Gap Analysis and Asset Intelligence.

---

## Database Models

### KnowledgeNode
Represents a knowledge node extracted from documents.

| Field | Type | Description |
|-------|------|-------------|
| `id` | String (UUID) | Primary key |
| `brand_id` | Integer | Foreign key to brands |
| `node_type` | String | NodeType enum value |
| `text` | Text | Full node content |
| `summary` | String(200) | Short version for graph labels |
| `segment` | String | Target audience (e.g., "Elderly Patients") |
| `journey_stage` | String | Patient journey stage |
| `source_document_id` | Integer | Foreign key to brand_documents |
| `source_quote` | Text | Exact quote from document |
| `confidence` | Float | Extraction confidence (0-1) |
| `verified_by_user` | Boolean | User verification status |

### KnowledgeRelation
Represents relationships between knowledge nodes.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `brand_id` | Integer | Foreign key to brands |
| `from_node_id` | String | Source node UUID |
| `to_node_id` | String | Target node UUID |
| `relation_type` | String | RelationType enum value |
| `strength` | Float | Relationship strength (0-1) |
| `context` | Text | Why this relationship exists |
| `inferred_by` | String | "llm" or "user" |

---

## Node Types (pharma-specific)

### Brand Pillars
- `key_message` - Core brand messages
- `value_proposition` - Value propositions
- `differentiator` - Competitive differentiators
- `proof_point` - Evidence and proof points

### Disease Knowledge
- `epidemiology` - Disease statistics
- `symptom_burden` - Impact on patients
- `treatment_landscape` - Available treatments
- `unmet_need` - Gaps in current treatments

### Patient Insights
- `patient_motivation` - What drives patients
- `patient_belief` - Patient beliefs
- `patient_tension` - Patient pain points
- `journey_insight` - Patient journey insights

### HCP Insights
- `prescribing_driver` - What influences prescribing
- `clinical_concern` - Clinical concerns
- `practice_constraint` - Practice limitations

### Market
- `competitor_position` - Competitor positioning
- `market_barrier` - Barriers to adoption

---

## Relationship Types

| Type | Description | Example |
|------|-------------|---------|
| `addresses` | Message addresses a tension | Key message → Patient tension |
| `supports` | Evidence supports a claim | Proof point → Value proposition |
| `contradicts` | Insight contradicts messaging | Patient belief → Key message |
| `triggers` | Symptom triggers emotion | Symptom burden → Patient tension |
| `influences` | Factor influences decision | Prescribing driver → Treatment |
| `resonates` | Message resonates with motivation | Key message → Patient motivation |

---

## Document Types for Extraction

| Type | Description |
|------|-------------|
| `brand_messaging` | Brand strategy and messaging documents |
| `disease_literature` | Medical/scientific literature |
| `interview_transcript` | Patient/HCP interview transcripts |
| `competitive_intel` | Competitor analysis documents |

---

## Key Functions

### Extraction
```python
extract_knowledge_from_document(
    document_id: int,
    document_text: str,
    document_type: str,
    brand_id: int,
    brand_name: str,
    db: Session
) -> List[KnowledgeNode]
```

### Relationship Inference
```python
infer_relationships(
    brand_id: int,
    new_nodes: List[KnowledgeNode],
    db: Session
) -> List[KnowledgeRelation]
```

### Deduplication
Uses semantic similarity (OpenAI embeddings) with threshold of 0.65 for accurate matching:
```python
find_similar_node(brand_id, text, node_type, db, threshold=0.65)
```

---

## Use Cases

1. **Gap Analysis** - Compare personas against knowledge graph to find coverage gaps
2. **Asset Intelligence** - Validate marketing assets against knowledge graph nodes
3. **Persona Enrichment** - Ground personas in brand knowledge
4. **Message Validation** - Check if messages align with proven insights

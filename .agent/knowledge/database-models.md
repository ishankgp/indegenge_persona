# PharmPersonaSim - Database Models

## Overview
The application uses SQLAlchemy ORM with SQLite (dev) or PostgreSQL (prod).

---

## Core Models

### Persona
Main model for storing AI-generated personas.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Persona name |
| `avatar_url` | String | DALL-E 3 generated avatar URL |
| `persona_type` | String | "Patient" or "HCP" |
| `persona_subtype` | String | Specific subtype |
| `disease_pack` | String | Condition-specific MBT pack |
| `tagline` | Text | Summary tagline |
| `brand_id` | Integer | Optional brand association |
| `age` | Integer | Persona age |
| `gender` | String | Persona gender |
| `condition` | String | Medical condition |
| `location` | String | Geographic location |
| `specialty` | String | HCP specialty |
| `full_persona_json` | Text | Complete persona data as JSON |
| `created_at` | DateTime | Creation timestamp |

---

### Brand
Represents a pharmaceutical brand.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Brand name (unique) |
| `created_at` | DateTime | Creation timestamp |

---

### BrandDocument
Documents uploaded to the Brand Library.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `brand_id` | Integer | Foreign key to brands |
| `filename` | String | Original filename |
| `file_type` | String | File extension |
| `document_type` | String | DocumentType enum value |
| `vector_store_id` | String | OpenAI Vector Store ID |
| `extracted_insights` | JSON | Extracted insights |
| `gemini_document_name` | String | Gemini document name |
| `chunk_size` | Integer | Chunking size |
| `chunk_ids` | JSON | List of chunk IDs |
| `created_at` | DateTime | Creation timestamp |

---

### Simulation
Stores simulation run results.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `persona_id` | Integer | Foreign key to personas |
| `scenario` | Text | Simulation scenario |
| `parameters` | JSON | Simulation parameters |
| `results` | JSON | Simulation results |
| `response_rate` | Float | Response rate metric |
| `insights` | Text | Generated insights |
| `created_at` | DateTime | Creation timestamp |

---

### SavedSimulation
Named saved simulations for later reference.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `name` | String | Simulation name (unique) |
| `simulation_data` | JSON | Complete simulation data |
| `created_at` | DateTime | Creation timestamp |

---

### CachedAssetAnalysis
Cache for asset analysis to avoid redundant API calls.

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key |
| `image_hash` | String | SHA256 of image bytes |
| `persona_id` | Integer | Persona used for analysis |
| `persona_hash` | String | Hash of persona attributes |
| `asset_name` | String | Original filename |
| `result_json` | JSON | Annotated image + summary |
| `created_at` | DateTime | Creation timestamp |

---

## Knowledge Graph Models

### KnowledgeNode
See [Knowledge Graph System](knowledge-graph-system.md) for details.

### KnowledgeRelation
See [Knowledge Graph System](knowledge-graph-system.md) for details.

---

## Enums

### DocumentType
```python
class DocumentType(enum.Enum):
    BRAND_MESSAGING = "brand_messaging"
    DISEASE_LITERATURE = "disease_literature"
    INTERVIEW_TRANSCRIPT = "interview_transcript"
    COMPETITIVE_INTEL = "competitive_intel"
```

### NodeType
See [Knowledge Graph System](knowledge-graph-system.md) for full list.

### RelationType
```python
class RelationType(enum.Enum):
    ADDRESSES = "addresses"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    TRIGGERS = "triggers"
    INFLUENCES = "influences"
    RESONATES_WITH = "resonates"
```

---

## Database Configuration

```python
# Development (SQLite)
DATABASE_URL = "sqlite:///./pharma_personas.db"

# Production (PostgreSQL)
DATABASE_URL = os.getenv("DATABASE_URL")  # Set in environment
```

---

## Important Notes

1. **Thread Safety**: Never pass ORM objects to worker threads; serialize to dictionaries first
2. **Migrations**: Run startup migration in `main.py` to add missing columns
3. **Database Files**: Never commit `.db` files to git (in `.gitignore`)

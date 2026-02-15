# PharmPersonaSim - AI Agents & Engines

## Overview
PharmaPersonaSim uses a multi-agent architecture where specialized AI engines handle different aspects of persona simulation, analysis, and content generation.

---

## Core Agents

### 1. Persona Engine (`persona_engine.py`)
**Model**: OpenAI GPT-4o | **Purpose**: Generate/enrich AI personas

**Key Capabilities**:
- Generate personas from demographic attributes
- Extract personas from interview transcripts
- Enrich with MBT framework (Motivations, Beliefs, Tensions)
- Generate from archetypes

**Key Functions**:
- `generate_persona_from_attributes()` - Primary persona generation
- `extract_persona_from_transcript()` - Transcript-based extraction
- `extract_persona_archetypes()` - Archetype discovery

---

### 2. Cohort Engine (`cohort_engine.py`)
**Model**: OpenAI GPT-4o with vision | **Purpose**: Analyze persona responses to stimuli

**Key Capabilities**:
- Text-only and multimodal (text + images) analysis
- Parallel processing with ThreadPoolExecutor (5 workers max)
- Quantitative metrics: sentiment, trust, clarity, purchase intent
- Custom question answering

**Key Functions**:
- `run_cohort_analysis()` - Text-only analysis
- `run_multimodal_cohort_analysis()` - Multimodal with images

**⚠️ Thread Safety**: ORM objects must be serialized before passing to worker threads to avoid `DetachedInstanceError`.

---

### 3. Asset Analyzer (`asset_analyzer.py`)
**Model**: Google Gemini 3 Pro Image Preview | **Purpose**: Visual annotation of marketing assets

**Key Capabilities**:
- Visual red-lining with persona-specific feedback
- Color-coded annotations (red=problems, green=effective)
- Returns annotated image + text feedback summary

**Key Function**: `analyze_image_with_nano_banana()`

---

### 4. Image Improvement Engine (`image_improvement.py`)
**Model**: Google Gemini 3 Pro Image Preview | **Purpose**: Generate improved marketing images

**Key Capabilities**:
- Generate improved images based on persona feedback
- Maintain brand consistency while addressing concerns
- Return improved image + rationale

**Key Function**: `improve_image_with_persona_feedback()`

---

### 5. Avatar Engine (`avatar_engine.py`)
**Model**: DALL-E 3 | **Purpose**: Generate persona avatar images

**Key Capabilities**:
- Diverse, realistic avatars with proper representation
- Professional attire based on persona type (HCP vs Patient)
- Deterministic generation

**Key Function**: `generate_avatar()`

---

### 6. Knowledge Extractor (`knowledge_extractor.py`)
**Model**: OpenAI GPT-5.2 | **Purpose**: Extract knowledge graph nodes from documents

**Key Capabilities**:
- Extract structured knowledge nodes from brand documents
- Infer relationships between nodes
- Semantic similarity for deduplication (OpenAI embeddings)

**Key Functions**:
- `extract_knowledge_from_document()` - Main extraction
- `infer_relationships()` - Find node relationships
- `classify_document_type()` - Classify documents

---

### 7. Coverage Engine (`coverage_engine.py`)
**Purpose**: Analyze persona coverage gaps

**Key Capabilities**:
- Analyze which segments are covered by existing personas
- Identify gaps for new persona creation

---

### 8. Document Processor (`document_processor.py`)
**Purpose**: Process and classify brand documents

**Key Capabilities**:
- Text extraction from PDFs
- Document classification (7 pillars)
- Text chunking for vector embeddings

---

## Client Initialization Pattern

All AI engines use lazy, thread-safe client initialization:

```python
import threading
from openai import OpenAI

_openai_client: Optional[OpenAI] = None
_client_lock = threading.Lock()

def get_openai_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    global _openai_client
    with _client_lock:
        if _openai_client is None:
            _openai_client = OpenAI(api_key=api_key)
    return _openai_client
```

---

## Model Configuration

| Model | Used For |
|-------|----------|
| GPT-4o | Persona generation, cohort analysis, document classification |
| DALL-E 3 | Avatar generation (1024x1024, natural style) |
| Gemini 3 Pro Image Preview | Image annotation, image improvement |
| OpenAI Embeddings | Semantic similarity for deduplication |

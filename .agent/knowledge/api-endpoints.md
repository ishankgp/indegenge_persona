# PharmPersonaSim - API Endpoints Reference

## Base URL
- **Development**: `http://localhost:8000`
- **API Documentation**: `http://localhost:8000/docs` (Swagger UI)

---

## Persona Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/personas/` | Generate AI persona from attributes |
| POST | `/personas/manual` | Create persona manually |
| GET | `/personas/` | List all personas (optional brand_id filter) |
| GET | `/personas/{persona_id}` | Get single persona by ID |
| PUT | `/personas/{persona_id}` | Update persona attributes |
| POST | `/personas/{persona_id}/enrich` | Enrich persona with LLM |
| POST | `/personas/{persona_id}/enrich-from-brand` | Enrich from brand insights |
| GET | `/personas/{persona_id}/export` | Export for simulation |
| POST | `/personas/search` | Natural language persona search |
| POST | `/personas/check-similarity` | Check for duplicate personas |
| POST | `/personas/extract-from-transcript` | Extract from interview transcript |

---

## Cohort Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/cohorts/analyze` | Run text-only cohort analysis |
| POST | `/cohorts/analyze/multimodal` | Multimodal analysis (text + images) |

---

## Brand Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands` | List all brands |
| POST | `/api/brands` | Create new brand |
| GET | `/api/brands/{brand_id}` | Get brand details |
| DELETE | `/api/brands/{brand_id}` | Delete brand |

---

## Brand Documents Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands/{brand_id}/documents` | List brand documents |
| POST | `/api/brands/{brand_id}/documents` | Upload document |
| DELETE | `/api/brands/{brand_id}/documents/{doc_id}` | Delete document |
| POST | `/api/brands/{brand_id}/documents/search` | Search documents (RAG) |

---

## Knowledge Graph Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/brands/{brand_id}/knowledge/nodes` | Get all knowledge nodes |
| GET | `/api/brands/{brand_id}/knowledge/relations` | Get all relations |
| GET | `/api/brands/{brand_id}/knowledge/graph` | Get full graph data |
| POST | `/api/brands/{brand_id}/knowledge/extract` | Extract from document |
| POST | `/api/brands/{brand_id}/knowledge/gap-analysis` | Run gap analysis |

---

## Asset Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze-asset` | Analyze marketing asset with persona |
| POST | `/api/improve-asset` | Generate improved asset from feedback |

---

## Simulation Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/simulations/` | List saved simulations |
| POST | `/simulations/save` | Save simulation results |
| GET | `/simulations/{name}` | Get saved simulation |
| DELETE | `/simulations/{name}` | Delete saved simulation |

---

## Coverage & Analysis Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/personas/coverage-analysis` | Analyze persona coverage gaps |

---

## System Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root redirect to docs |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger UI documentation |

---

## Request/Response Patterns

### Creating a Persona
```json
POST /personas/
{
  "age": 45,
  "gender": "Female",
  "condition": "Type 2 Diabetes",
  "location": "Texas",
  "concerns": ["Weight gain", "Daily injections"],
  "persona_type": "Patient",
  "brand_id": 1  // optional
}
```

### Running Cohort Analysis
```json
POST /cohorts/analyze
{
  "persona_ids": [1, 2, 3],
  "stimulus": "New once-weekly treatment...",
  "metrics": ["sentiment", "trust", "clarity", "purchase_intent"],
  "questions": ["What concerns does this address?"]
}
```

### Multimodal Analysis
```json
POST /cohorts/analyze/multimodal
{
  "persona_ids": [1, 2, 3],
  "stimulus": "Marketing copy...",
  "images": ["base64_encoded_image..."],
  "metrics": ["sentiment", "trust"]
}
```

---

## Error Response Format

```json
{
  "detail": "Error message here",
  "status_code": 400
}
```

---

## Authentication

Currently no authentication required (development mode). For production, configure authentication via environment variables.

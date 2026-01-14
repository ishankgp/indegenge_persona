# PharmPersonaSim - Development Patterns & Conventions

## Code Style

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints: `from typing import Dict, List, Optional, Any`
- Use f-strings for string formatting
- Maximum line length: 100 characters (soft limit)
- Add docstrings for functions and classes
- Import order: standard library → third-party → local imports

### TypeScript/React (Frontend)
- TypeScript strict mode enabled
- Use functional components with hooks
- Prefer named exports over default exports
- Use interfaces for type definitions
- ESLint rules in `eslint.config.js`

### File Naming
- Python: `snake_case.py`
- TypeScript/React: `PascalCase.tsx` for components, `camelCase.ts` for utilities

---

## Thread Safety Patterns

### ⚠️ Critical: SQLAlchemy ORM Objects

**Never pass ORM objects to worker threads**. Always serialize to dictionaries first:

```python
# ❌ WRONG - causes DetachedInstanceError
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(process_persona, persona) for persona in personas]

# ✅ CORRECT - serialize first
serialized = [serialize_persona(p) for p in personas]
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(process_persona, data) for data in serialized]
```

Reference: `backend/app/cohort_engine.py` lines 960-985

### Lazy Client Initialization

Use thread-safe singleton pattern for API clients:

```python
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

## Adding New Features

### New API Endpoint
1. Add route in `backend/app/main.py`
2. Create schema in `backend/app/schemas.py` if needed
3. Add CRUD operations in `backend/app/crud.py` if needed
4. Test at `http://localhost:8000/docs`
5. Update frontend API client in `frontend/src/lib/api.ts`

### New Frontend Page
1. Create component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Layout.tsx`
4. Test routing and API integration

### New AI Agent
1. Create new file in `backend/app/` (e.g., `new_agent.py`)
2. Use thread-safe lazy client initialization
3. Default model: `MODEL_NAME = os.getenv("OPENAI_MODEL", "gpt-4o")`
4. Implement proper error handling
5. Document in `AI_AGENTS.md`
6. Add endpoint in `main.py` if needed

---

## Error Handling Patterns

### Consistent Response Structure
Error responses must match success response structure:

```python
# ✅ Include all expected keys even in errors
return {
    "success": False,
    "answers": [],  # Include even if empty
    "error": str(e)
}
```

### API Key Validation
Always check for API keys before initialization:

```python
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    logger.warning("OPENAI_API_KEY not set")
    return {"error": "OpenAI API key not configured"}
```

---

## Environment Variables

| Variable | Location | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | `backend/.env` | OpenAI API key |
| `IMAGE_EDIT_API_KEY` | `backend/.env` | Gemini API key |
| `DATABASE_URL` | `backend/.env` | PostgreSQL URL (prod) |
| `VITE_API_URL` | `.env` | Backend URL (frontend prod) |
| `OPENAI_MODEL` | `backend/.env` | Model name (default: gpt-4o) |

**Important**: Always use `backend/.env` for API keys, not root `.env`

---

## Testing Checklist

Before committing:
- [ ] Run `npm run lint` in frontend directory
- [ ] Run `npm run build` to verify TypeScript compiles
- [ ] Test locally with `python run_app.py`
- [ ] Check browser console for errors
- [ ] Verify API endpoints work in FastAPI docs

---

## Commit Message Format

Prefix with component:
- `[backend] Fix DetachedInstanceError in cohort analysis`
- `[frontend] Add persona comparison page`
- `[docs] Update AGENTS.md with thread safety notes`

---

## Common Gotchas

1. **Port Conflicts**: `run_app.py` auto-kills processes on ports 8000/5173
2. **Database Location**: Use `backend/pharma_personas.db`, not root
3. **CORS**: Configured in `main.py`, allow all origins in dev
4. **Vite Proxy**: API calls proxied in `vite.config.ts`

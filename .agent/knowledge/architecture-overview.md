# PharmPersonaSim - Architecture Overview

## Summary
PharmaPersonaSim is an AI-powered pharmaceutical persona simulation platform that transforms patient/HCP insights into actionable market intelligence. It uses Large Language Models to create dynamic AI personas that simulate realistic responses to marketing campaigns, treatment options, and clinical scenarios.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: SQLAlchemy
- **AI APIs**: OpenAI GPT-4o, Google Gemini 3 Pro, DALL-E 3

### Frontend
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui

## Project Structure

```
pharmapersonasim/
├── backend/
│   ├── app/                    # Main application code
│   │   ├── main.py             # FastAPI endpoints (~2800 lines)
│   │   ├── models.py           # SQLAlchemy models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── crud.py             # Database operations
│   │   ├── database.py         # DB connection setup
│   │   └── [engine files]      # AI agents/engines
│   ├── scripts/                # Utility & migration scripts
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/              # 10 React page components
│   │   ├── components/         # Reusable UI components
│   │   └── lib/api.ts          # API client
│   └── package.json
├── run_app.py                  # Full-stack launcher
└── AGENTS.md                   # AI agent documentation
```

## Key Features

1. **Persona Generation** - Generate HCP/patient personas using GPT-4o with MBT Framework
2. **Brand Library** - Upload and classify documents across 7 knowledge pillars
3. **Cohort Simulation** - Test marketing responses with multiple personas
4. **Knowledge Graph** - Extract and visualize pharma-specific knowledge relationships
5. **Asset Analysis** - Visual annotation and feedback on marketing materials
6. **Analytics Dashboard** - Response breakdown, statistics, and AI insights

## Running the Application

```bash
# Full-stack launch (recommended)
python run_app.py

# Access points
Frontend: http://localhost:5173
Backend API: http://localhost:8000
API Docs: http://localhost:8000/docs
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT models |
| `IMAGE_EDIT_API_KEY` | Yes | Google Gemini API key |
| `DATABASE_URL` | Prod | PostgreSQL connection string |
| `VITE_API_URL` | Prod | Backend URL for production |

# PharmaPersonaSim 🏥

An enterprise-grade AI-powered pharmaceutical persona simulation platform that transforms qualitative patient insights into quantitative market intelligence. Built for pharmaceutical companies to reduce market research time from months to minutes while maintaining scientific rigor and compliance.

## 🎯 Value Proposition

**The Challenge**: Pharmaceutical companies spend $2.6B annually on market research, waiting 6 months for patient insights that drive critical drug positioning and marketing decisions.

**Our Solution**: PharmaPersonaSim uses Large Language Models (LLMs) to create dynamic, interactive AI personas that simulate patient responses to marketing stimuli, treatment options, and clinical scenarios - delivering pharmaceutical market insights in real-time.

**Impact**: 
- ⚡ **90% reduction** in research time (6 months → minutes)
- 💰 **70% cost savings** compared to traditional market research
- 📈 **Unlimited scalability** for enterprise pharmaceutical clients
- 🎯 **Quantitative insights** from qualitative persona data

## 🌟 Key Features

### 1. **AI-Powered Persona Generation**
- Generate detailed HCP (Healthcare Professional) and patient personas using GPT-4
- **Rich HCP Profiles**: Includes specialty, practice setup, patient volume, decision influencers, and adherence to protocols
- **Deep Patient Profiles**: Includes medical history, lifestyle context, motivations, beliefs (MBT framework), and channel preferences
- Automatic segmentation by demographics, condition, and behavioral attributes

### 2. **Brand Library & Knowledge Management**
- Upload and organize brand documents across 7 knowledge pillars:
  - Disease & Patient Journey Overview
  - Treatment Landscape / Standard of Care
  - Brand Value Proposition & Core Messaging
  - Safety & Tolerability Summary
  - HCP & Patient Segmentation
  - Market Research & Insight Summaries
  - Adherence / Persistence / Discontinuation Insights
- Automatic document classification using AI
- Context-aware insights extraction for persona enrichment

### 3. **Cohort Analysis & Simulation**
- Select multiple personas for group analysis
- Test responses to marketing messages, treatment options, or clinical scenarios
- Configure custom metrics (sentiment, purchase intent, trust, message clarity)
- Real-time LLM-powered simulations with reasoning transparency

### 4. **Advanced Analytics Dashboard**
- **Preamble/Analysis Plans**: GPT-5-style upfront planning showing AI reasoning
- Individual persona response breakdown with detailed reasoning
- Summary statistics and trend analysis
- AI-generated insights and actionable suggestions
- Visual data exploration with interactive charts
- Export capabilities for further analysis

### 5. **Enterprise-Ready Architecture**
- RESTful API with comprehensive OpenAPI documentation
- SQLAlchemy ORM with SQLite (development) / PostgreSQL (production)
- CORS-enabled for secure cross-origin requests
- Health monitoring and status endpoints
- Automatic retry logic and resilient API client

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- OpenAI API key (GPT-4 access recommended)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ishankgp/indegenge_persona.git
cd indegenge_persona
```

2. **Set up Python virtual environment**
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. **Install backend dependencies**
```bash
cd backend
pip install -r requirements.txt
cd ..
```

4. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

5. **Configure environment variables**
```bash
# Create .env file in project root
# Add your OpenAI API key:
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
```

6. **Initialize the database** (optional - seeds sample personas)
```bash
python backend/populate_hcp_personas.py
```

7. **Launch the application**
```bash
python run_app.py
```

The application will start both servers:
- 🎨 **Frontend**: http://localhost:5173
- 🔧 **Backend API**: http://127.0.0.1:8000
- 📚 **API Docs**: http://127.0.0.1:8000/docs

## 🏗️ Project Structure

```
pharmapersonasim/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application & API endpoints
│   │   ├── models.py            # SQLAlchemy database models
│   │   ├── schemas.py           # Pydantic request/response schemas
│   │   ├── crud.py              # Database CRUD operations
│   │   ├── database.py          # Database connection setup
│   │   ├── persona_engine.py    # AI persona generation engine
│   │   ├── cohort_engine.py     # Cohort analysis & simulation
│   │   └── document_processor.py # Brand document processing
│   ├── requirements.txt         # Python dependencies
│   ├── pharma_personas.db       # SQLite database (canonical)
│   └── uploads/                 # Uploaded brand documents
├── frontend/
│   ├── src/
│   │   ├── pages/               # Main application pages
│   │   │   ├── Dashboard.tsx    # Landing & overview
│   │   │   ├── PersonaLibrary.tsx # Persona management
│   │   │   ├── CreatePersona.tsx  # Persona creation
│   │   │   ├── BrandLibrary.tsx   # Brand knowledge management
│   │   │   ├── SimulationHub.tsx  # Cohort simulation setup
│   │   │   └── Analytics.tsx      # Results & insights
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── analytics/       # Analytics-specific components
│   │   │   └── Layout.tsx       # App layout with status badge
│   │   ├── lib/
│   │   │   ├── api.ts           # Centralized API client
│   │   │   ├── analytics.ts     # Analytics utilities
│   │   │   └── utils.ts         # General utilities
│   │   └── types/
│   │       └── analytics.ts     # TypeScript type definitions
│   ├── package.json
│   ├── vite.config.ts           # Vite dev proxy configuration
│   └── vercel.json              # Vercel deployment config
├── run_app.py                   # Full-stack application launcher
├── populate_hcp_personas.py     # Sample persona seeder
├── README.md                    # This file
├── DEV_GUIDE.md                 # Developer setup & troubleshooting
├── DEPLOYMENT_STATUS.md         # Deployment information
└── .env                         # Environment variables (not in repo)
```

## 📱 Application Pages & Workflows

### 1. Dashboard
- **Purpose**: Landing page with overview statistics
- **Features**: Persona count, recent simulations, quick access navigation

### 2. Persona Library
- **Purpose**: View, search, and manage all personas
- **Features**: 
  - Browse existing personas with rich profiles
  - Filter by demographics, specialty, or attributes
  - View detailed persona information (motivations, barriers, preferences)
  - Delete or modify personas

### 3. Create Persona
- **Purpose**: Generate new AI-powered personas
- **Features**:
  - Guided form for demographic and professional details
  - AI-generated psychological profiles
  - Automatic segmentation and tagging

### 4. Brand Library
- **Purpose**: Centralized knowledge management for pharmaceutical brands
- **Features**:
  - Create and manage brand profiles
  - Upload documents (PDF, TXT) across 7 knowledge pillars
  - Automatic AI classification of documents
  - Context extraction for persona enrichment
  - Seed sample documents for testing

### 5. Simulation Hub
- **Purpose**: Configure and run cohort analyses
- **Features**:
  - Select multiple personas for group simulation
  - Choose from brand library insights as stimulus
  - Configure custom metrics (sentiment, purchase intent, trust, clarity)
  - Real-time LLM-powered analysis with reasoning

### 6. Analytics Dashboard
- **Purpose**: Visualize simulation results and derive insights
- **Features**:
  - **Analysis Plan (Preamble)**: Shows AI's upfront planning strategy
  - Individual response breakdown with detailed reasoning
  - Summary statistics and aggregate metrics
  - AI-generated insights and recommendations
  - Interactive data visualization
  - Export and sharing capabilities

## 🛠️ Technology Stack

### Backend
- **FastAPI** 0.104.1: Modern, high-performance Python web framework
- **SQLAlchemy** 2.0.23: SQL toolkit and Object-Relational Mapping
- **OpenAI API** >=1.30.0: GPT-4 integration for persona generation and analysis
- **Google GenAI** >=0.2.0: Gemini integration for additional AI capabilities
- **Pydantic** 2.5.0: Data validation and settings management
- **Uvicorn**: Lightning-fast ASGI server
- **python-multipart**: File upload handling
- **pypdf** 3.17.0: PDF document processing
- **Pillow** >=10.0.0: Image processing support

### Frontend
- **React** 19.1.1: Modern UI framework with hooks
- **TypeScript** 5.8.3: Type-safe JavaScript development
- **Vite** 7.1.2: Fast build tool and dev server with proxy support
- **React Router** 7.8.2: Client-side routing
- **Tailwind CSS** 3.4.17: Utility-first CSS framework
- **shadcn/ui**: High-quality, accessible component library
- **Radix UI**: Unstyled, accessible component primitives
- **Recharts** 3.4.1: Composable charting library
- **Axios** 1.11.0: Promise-based HTTP client with retry logic
- **Lucide React**: Beautiful & consistent icon set

### Development & Deployment
- **Vercel**: Frontend hosting (deployed)
- **Railway/Render/Heroku**: Backend deployment options
- **SQLite**: Development database (PostgreSQL for production)
- **Git**: Version control

## 🚢 Deployment

### Frontend (Vercel) ✅ DEPLOYED

The frontend is currently deployed on Vercel:
- **Live URL**: https://indegenge-persona-k6a4ifekb-indegenes.vercel.app
- **Status**: Production-ready

**To deploy updates:**

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy from frontend directory:
```bash
cd frontend
vercel --prod
```

3. Set environment variable in Vercel dashboard:
   - `VITE_API_URL`: Your backend API URL (e.g., https://your-backend.railway.app)

### Backend Deployment Options

The backend supports multiple deployment platforms:

#### Option 1: Railway (Recommended)
```bash
npm install -g @railway/cli
railway login
cd backend
railway init
railway up
```

Configuration files already included:
- `Procfile`: Defines the start command
- `railway.toml`: Railway-specific settings
- `runtime.txt`: Python version specification

#### Option 2: Render
1. Connect your GitHub repository to Render
2. Create a new **Web Service**
3. Set root directory: `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variable: `OPENAI_API_KEY`

#### Option 3: Heroku
```bash
heroku login
heroku create your-app-name
git subtree push --prefix backend heroku main
```

Ensure `Procfile` contains:
```
web: uvicorn app.main:app --host=0.0.0.0 --port=${PORT:-8000}
```

#### Option 4: AWS EC2 / Google Cloud Run
- Use standard Python application deployment
- Install dependencies from `requirements.txt`
- Run: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Configure firewall to allow port 8000

### Post-Deployment Configuration

After deploying the backend:

1. **Update frontend environment**:
   - Set `VITE_API_URL` in Vercel to your backend URL
   - Redeploy frontend

2. **Verify CORS settings**:
   - Ensure backend `main.py` includes your frontend domain in `allow_origins`

3. **Database migration** (for production):
   - Replace SQLite with PostgreSQL
   - Update `DATABASE_URL` environment variable
   - Run migrations: `alembic upgrade head` (if using Alembic)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

#### Required
- **`OPENAI_API_KEY`**: Your OpenAI API key (required for all AI features)
  - Get yours at: https://platform.openai.com/api-keys
  - Example: `sk-proj-...`

#### Optional (Development)
- **`BACKEND_HOST`**: Backend bind interface (default: `0.0.0.0`)
  - Use `0.0.0.0` for container/Codespaces accessibility
  - Use `127.0.0.1` for localhost-only
- **`BACKEND_PORT`**: Backend port (default: `8000`)
- **`DATABASE_URL`**: Database connection string
  - Development: `sqlite:///./backend/pharma_personas.db` (default)
  - Production: `postgresql://user:pass@host:port/dbname`

#### Required (Production)
- **`VITE_API_URL`**: Frontend API base URL for production builds
  - Example: `https://your-backend.railway.app`
  - Note: Ignored in development (uses Vite proxy)

### Database Architecture

**Single Source of Truth**: `backend/pharma_personas.db`

All data operations go through the FastAPI backend to maintain consistency. The database includes:

- **Personas**: HCP and patient persona profiles with full JSON data
- **Brands**: Pharmaceutical brand records
- **Brand Documents**: Uploaded documents with extracted insights
- **Cohort Analyses**: Historical simulation results (planned)

**Development**: SQLite for rapid iteration and portability  
**Production**: Migrate to PostgreSQL for concurrent access and scalability

### Vite Development Proxy

The frontend uses a Vite dev proxy (configured in `vite.config.ts`) to avoid CORS issues:

**Proxied paths**: `/personas`, `/cohorts`, `/stats`, `/health`, `/api`  
**Target**: `http://127.0.0.1:8000` (backend)

This allows relative API calls in development:
```typescript
// Works in dev without VITE_API_URL
axios.get('/personas/')
```

In production, the `api.ts` client automatically uses `VITE_API_URL` or `window.location.origin`.

## 📝 API Documentation

Once the backend is running, interactive API documentation is available:

- **Swagger UI**: http://127.0.0.1:8000/docs
  - Interactive API explorer with "Try it out" functionality
  - Full endpoint documentation with request/response schemas
  
- **ReDoc**: http://127.0.0.1:8000/redoc
  - Clean, responsive API documentation
  - Better for reference and sharing

### Key API Endpoints

#### Personas
- `GET /personas/` - List all personas
- `POST /personas/` - Create new persona
- `GET /personas/{id}` - Get persona details
- `DELETE /personas/{id}` - Delete persona

#### Brands & Documents
- `GET /api/brands` - List all brands
- `POST /api/brands` - Create new brand
- `POST /api/brands/{id}/upload` - Upload brand document
- `GET /api/brands/{id}/documents` - Get brand documents

#### Cohort Analysis
- `POST /cohorts/analyze` - Run cohort simulation
- `POST /cohorts/analyze-multimodal` - Multimodal analysis (with images)

#### Health & Status
- `GET /health` - Basic health check
- `GET /health/db` - Database status with persona count
- `HEAD /personas/` - Lightweight probe (returns `X-Total-Personas` header)

### API Client (Frontend)

The frontend uses a centralized API client (`src/lib/api.ts`) with:
- Automatic retry logic (3 attempts with exponential backoff)
- Environment-aware base URL configuration
- Typed request/response interfaces
- Consistent error handling

Example usage:
```typescript
import { PersonasAPI, BrandsAPI } from '@/lib/api';

// Fetch personas
const personas = await PersonasAPI.list();

// Create brand
const brand = await BrandsAPI.create({ name: 'MyBrand' });
```

## 🧪 Testing & Development

### Running Tests
```bash
# Backend tests (if available)
cd backend
pytest

# Frontend tests
cd frontend
npm run test
```

### Code Quality
```bash
# Backend linting
cd backend
flake8 app/

# Frontend linting
cd frontend
npm run lint
```

### Development Tips

1. **Hot Reloading**: Both servers support hot reloading
   - Backend: Uvicorn auto-reloads on file changes
   - Frontend: Vite HMR for instant updates

2. **Debug Mode**: Check terminal output for detailed logs
   - Backend logs API requests, errors, and LLM interactions
   - Frontend logs available in browser DevTools console

3. **API Testing**: Use Swagger UI at `/docs` for quick endpoint testing

4. **Database Inspection**: 
   ```bash
   sqlite3 backend/pharma_personas.db
   # .tables - list tables
   # .schema personas - show schema
   # SELECT * FROM personas; - query data
   ```

### Troubleshooting

**Common Issues**:

| Issue | Solution |
|-------|----------|
| Port 8000 already in use | Run `python run_app.py` (auto-kills existing processes) or manually stop the process |
| "Module not found" errors | Ensure virtual environment is activated and dependencies installed |
| Empty persona list | Run `python backend/populate_hcp_personas.py` to seed sample data |
| API connection failed | Check backend is running at http://127.0.0.1:8000/health |
| CORS errors | Verify frontend URL is in backend CORS `allow_origins` list |

For detailed troubleshooting, see **DEV_GUIDE.md**.

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please ensure:
- Code follows existing style conventions
- All tests pass
- New features include appropriate tests
- Documentation is updated

## 📚 Additional Documentation

- **DEV_GUIDE.md**: Developer setup, API architecture, and troubleshooting
- **DEPLOYMENT_STATUS.md**: Current deployment status and instructions
- **DEMO_SCRIPT.md**: 1-minute demo script for presentations
- **INPUT_OUTPUT_README.md**: Brand positioning and data structure guide
- **DATA_NEEDED_FROM_EXPERTS.md**: Requirements for expert-contributed data

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Ishank GP**
- GitHub: [@ishankgp](https://github.com/ishankgp)
- Project: Built for Indegene's pharmaceutical intelligence platform

## 🙏 Acknowledgments

- **OpenAI**: For providing GPT-4 API enabling sophisticated persona simulations
- **Indegene**: For domain expertise and pharmaceutical industry insights
- **FastAPI Community**: For the excellent framework and documentation
- **React & Vite Teams**: For modern, performant frontend tooling
- **shadcn/ui**: For beautiful, accessible UI components
- **Healthcare Professionals**: For providing domain insights and validation

## ⚠️ Important Notes

1. **Research Tool**: This is a research and development tool for market intelligence. Results should be validated with actual patient/HCP research before making critical business decisions.

2. **Compliance**: Ensure all marketing content tested through the platform complies with FDA, EMA, and local regulatory requirements. This tool does not replace MLR (Medical-Legal-Regulatory) review.

3. **Data Privacy**: Do not input actual patient PHI (Protected Health Information) or proprietary clinical trial data. Use synthetic or anonymized data only.

4. **API Costs**: OpenAI API usage incurs costs. Monitor your usage at https://platform.openai.com/usage

5. **Production Readiness**: For production deployment, migrate from SQLite to PostgreSQL and implement proper authentication/authorization.

---

**Built with ❤️ for pharmaceutical innovation | Transforming patient insights through AI**

# PharmaPersonaSim 🏥

A sophisticated AI-powered pharmaceutical persona simulation platform that helps healthcare companies understand patient and HCP perspectives to optimize their engagement strategies.

## 🌟 Features

- **AI-Powered Persona Generation**: Create realistic patient and HCP personas using advanced LLMs.
- **Brand Library**: Upload and analyze brand documents to extract key insights (motivations, beliefs, tensions).
- **Cohort Analysis**: Run simulations across multiple personas to understand group responses.
- **Interactive Dashboard**: Real-time metrics and insights visualization.
- **Professional Healthcare UI**: Modern, accessible interface designed for healthcare professionals.
- **Analytics & Insights**: Deep analysis of patient responses and behavioral patterns.
- **Simulation Hub**: customizable scenarios to test messaging and strategies.

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/ishankgp/indegenge_persona.git
cd indegenge_persona
```

2. **Set up the backend**
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

3. **Set up the frontend**
```bash
cd ../frontend
npm install
```

4. **Configure environment variables**
```bash
# In the root directory
cp .env.example .env
# Edit .env and add your OpenAI API key
```

5. **Initialize the database**
```bash
# Run the migration and population scripts
python migrate_hcp_schema.py # Ensure schema is up to date
python populate_hcp_personas.py  # Seeds HCP personas
```

6. **Run the application**
```bash
python run_app.py
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000

## 🏗️ Project Structure

```
pharmapersonasim/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI application
│   │   ├── models.py         # Database models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── crud.py           # Database operations
│   │   ├── persona_engine.py # AI persona generation
│   │   ├── cohort_engine.py  # Cohort analysis logic
│   │   └── document_processor.py # Brand document processing
│   ├── uploads/              # Uploaded brand documents
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/            # React pages (Analytics, BrandLibrary, etc.)
│   │   ├── components/       # Reusable components
│   │   └── lib/              # Utilities
│   └── package.json
├── run_app.py                # Application launcher
├── populate_hcp_personas.py  # HCP Database seeder
└── migrate_hcp_schema.py     # Schema migration script
```

## 📱 Key Features

### Persona Library
- View and manage patient and HCP personas
- Generate new personas with AI
- Detailed profiles with medical history, practice setup (for HCPs), and preferences

### Brand Library
- Upload PDF/Text documents (Treatment Landscape, Value Proposition, etc.)
- AI extraction of Motivations, Beliefs, and Tensions
- Link brand insights to persona generation

### Simulation Hub
- Select cohorts for analysis
- Configure simulation parameters
- Run AI-powered response simulations

### Analytics Dashboard
- Visualize simulation results
- Track response rates and patterns
- Generate actionable insights
- **New**: GPT-5-style tool preambles for transparent AI reasoning

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **OpenAI API**: LLM integration
- **Pydantic**: Data validation
- **PyPDF2/Text Processing**: Document analysis

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS** & **shadcn/ui**: Modern styling and components
- **Recharts**: Data visualization
- **Axios**: HTTP client

## 🚢 Deployment

### Vercel Deployment (Frontend)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd frontend
vercel
```

### Backend Deployment

The backend is configured for deployment on platforms like **Railway**, **Render**, or **Heroku**.
- Includes `railway.toml` and `Procfile` for easy deployment.
- Ensure `uploads/` directory persistence if needed.

## 🔧 Configuration

### Environment Variables

We use a single canonical SQLite database file stored at `backend/pharma_personas.db`.

Key variables:
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `DATABASE_URL`: Set to `sqlite:///backend/pharma_personas.db`
- `BACKEND_HOST`: Backend server host
- `BACKEND_PORT`: Backend server port
- `VITE_API_URL`: Frontend points here for API calls

## 📝 API Documentation

Once the backend is running, visit:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Ishank GP**
- GitHub: [@ishankgp](https://github.com/ishankgp)

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- The FastAPI and React communities
- Healthcare professionals who provided domain insights

---

**Note**: This is a demonstration project for healthcare persona simulation. Always consult with healthcare professionals for actual medical decisions.

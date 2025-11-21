# PharmaPersonaSim 🏥

A sophisticated AI-powered pharmaceutical persona simulation platform that helps healthcare companies understand patient perspectives and optimize their engagement strategies.

## 🌟 Features

- **AI-Powered Persona Generation**: Create realistic patient personas using advanced LLMs
- **Cohort Analysis**: Run simulations across multiple personas to understand group responses
- **Interactive Dashboard**: Real-time metrics and insights visualization
- **Professional Healthcare UI**: Modern, accessible interface designed for healthcare professionals
- **Analytics & Insights**: Deep analysis of patient responses and behavioral patterns

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- OpenAI API key

### Installation

1. **Clone the repository**
\`\`\`bash
git clone https://github.com/ishankgp/indegenge_persona.git
cd indegenge_persona
\`\`\`

2. **Set up the backend**
\`\`\`bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
\`\`\`

3. **Set up the frontend**
\`\`\`bash
cd ../frontend
npm install
\`\`\`

4. **Configure environment variables**
\`\`\`bash
# In the root directory
cp .env.example .env
# Edit .env and add your OpenAI API key
\`\`\`

5. **Initialize the database**
\`\`\`bash
python populate_db.py  # Seeds personas via API (uses canonical backend DB)
\`\`\`

6. **Run the application**
\`\`\`bash
python run_app.py
\`\`\`

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000

## 🏗️ Project Structure

\`\`\`
pharmapersonasim/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # Database models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── crud.py          # Database operations
│   │   ├── persona_engine.py # AI persona generation
│   │   └── cohort_engine.py  # Cohort analysis logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/           # React pages
│   │   ├── components/      # Reusable components
│   │   └── lib/             # Utilities
│   └── package.json
├── run_app.py               # Application launcher
└── populate_db.py           # Database seeder
\`\`\`

## 📱 Key Features

### Persona Library
- View and manage patient personas
- Generate new personas with AI
- Detailed persona profiles with medical history, demographics, and preferences

### Simulation Hub
- Select cohorts for analysis
- Configure simulation parameters
- Run AI-powered response simulations

### Analytics Dashboard
- Visualize simulation results
- Track response rates and patterns
- Generate actionable insights

## 🛠️ Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **SQLAlchemy**: Database ORM
- **OpenAI API**: LLM integration
- **Pydantic**: Data validation

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Data visualization
- **Axios**: HTTP client

## 🚢 Deployment

### Vercel Deployment (Frontend)

1. Install Vercel CLI:
\`\`\`bash
npm i -g vercel
\`\`\`

2. Deploy:
\`\`\`bash
cd frontend
vercel
\`\`\`

### Backend Deployment

The backend can be deployed to any platform that supports Python applications:
- **Heroku**
- **Railway**
- **Render**
- **AWS EC2**
- **Google Cloud Run**

## 🔧 Configuration

### Environment Variables

We use a single canonical SQLite database file stored at `backend/pharma_personas.db`.

Key variables:
- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `DATABASE_URL`: Set to `sqlite:///backend/pharma_personas.db` (already in `.env.example`)
- `BACKEND_HOST`: Backend server host
- `BACKEND_PORT`: Backend server port
- `BACKEND_URL`: (optional) Override used by `populate_db.py` for seeding
- `VITE_API_URL`: Frontend points here for API calls (e.g. Railway backend URL in production)

If you previously had a duplicate `pharma_personas.db` at the repo root, it has been removed to prevent divergence. Always interact through the API or operate directly on `backend/pharma_personas.db`.

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

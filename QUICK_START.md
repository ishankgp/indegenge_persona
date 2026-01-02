# 🚀 Quick Start Guide - How to Run the Code

This guide will help you set up and run the PharmaPersonaSim application locally.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10 or higher** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [Download Node.js](https://nodejs.org/)
- **Git** (optional, if cloning from repository)

## 🔧 Step-by-Step Setup

### Step 1: Navigate to Project Directory

```bash
cd indegenge_persona
```

### Step 2: Set Up Python Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

**Note:** If you're using `uv` as your package manager (as per your preference), use:
```bash
cd backend
uv pip install -r requirements.txt
cd ..
```

### Step 4: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5: Configure Environment Variables

Create a `.env` file in the project root directory (`indegenge_persona/`) with the following:

```bash
# Create .env file
# Windows (PowerShell)
New-Item -Path .env -ItemType File

# Mac/Linux
touch .env
```

Add the following content to `.env`:

```env
# OpenAI API Key (required for persona generation and analysis)
OPENAI_API_KEY=your_openai_api_key_here

# OpenAI Model (optional, defaults to gpt-4o)
OPENAI_MODEL=gpt-4o

# Nano Banana Pro API Key (for image improvement feature)
IMAGE_EDIT_API_KEY=AIzaSyCphVkbjgVxTriWqfizyEDesLi7b7HT8gk

# Backend Configuration (optional)
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000

# Database Configuration (optional - defaults to SQLite)
# DATABASE_URL=sqlite:///./backend/pharma_personas.db
```

**Important:** Replace `your_openai_api_key_here` with your actual OpenAI API key.

### Step 6: Initialize Database (Optional)

The database will be created automatically on first run. If you want to seed sample personas:

```bash
python backend/populate_hcp_personas.py
```

## 🚀 Running the Application

### Option 1: Run Both Servers Together (Recommended)

The easiest way is to use the provided launcher script:

```bash
python run_app.py
```

This will:
- Start the backend API server on `http://127.0.0.1:8000`
- Start the frontend development server on `http://localhost:5173`
- Handle port conflicts automatically
- Show logs from both servers

### Option 2: Run Servers Separately

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🌐 Accessing the Application

Once both servers are running:

- **Frontend Application**: http://localhost:5173
- **Backend API**: http://127.0.0.1:8000
- **API Documentation**: http://127.0.0.1:8000/docs (Swagger UI)
- **Alternative API Docs**: http://127.0.0.1:8000/redoc

## ✅ Verification Steps

1. **Check Backend Health:**
   ```bash
   curl http://127.0.0.1:8000/health
   ```
   Should return: `{"status":"healthy","service":"PharmaPersonaSim API"}`

2. **Check Database Health:**
   ```bash
   curl http://127.0.0.1:8000/health/db
   ```
   Should return database status and persona count.

3. **Open Frontend:**
   Navigate to http://localhost:5173 in your browser. You should see the Dashboard.

## 🛠️ Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

**Windows:**
```bash
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find process using port 8000
lsof -ti:8000

# Kill the process
kill -9 <PID>
```

### Python Dependencies Issues

If you encounter import errors:

```bash
# Make sure virtual environment is activated
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# Reinstall dependencies
cd backend
pip install -r requirements.txt --upgrade
```

### Node.js Dependencies Issues

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Missing API Keys

Make sure your `.env` file exists and contains valid API keys:
- `OPENAI_API_KEY` - Required for persona generation
- `IMAGE_EDIT_API_KEY` - Required for image improvement feature

### Database Issues

If you encounter database errors:

```bash
# Delete existing database (will recreate on next run)
rm backend/pharma_personas.db

# Or on Windows
del backend\pharma_personas.db
```

## 📝 Common Commands

### Development Mode

```bash
# Run with auto-reload (backend)
cd backend
python -m uvicorn app.main:app --reload

# Run frontend with hot reload (already enabled by default)
cd frontend
npm run dev
```

### Build for Production

```bash
# Build frontend
cd frontend
npm run build

# The built files will be in frontend/dist/
```

### Check Application Status

```bash
# Backend health check
curl http://127.0.0.1:8000/health

# Database health check
curl http://127.0.0.1:8000/health/db
```

## 🎯 Next Steps

Once the application is running:

1. **Create Your First Persona:**
   - Navigate to "Create Persona" from the dashboard
   - Fill in persona details or use AI generation

2. **Upload Brand Documents:**
   - Go to "Brand Library"
   - Create a brand and upload knowledge documents

3. **Run a Simulation:**
   - Go to "Simulation Hub"
   - Select personas and test marketing messages

4. **View Analytics:**
   - After running a simulation, view results in the Analytics dashboard
   - For image analysis, click "Improve Images" to use Nano Banana Pro

## 📚 Additional Resources

- **API Documentation**: http://127.0.0.1:8000/docs
- **README**: See `README.md` for detailed feature documentation
- **Deployment Guide**: See `DEPLOYMENT.md` for production deployment

## 🆘 Need Help?

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that ports 8000 and 5173 are available

---

**Happy Coding! 🎉**





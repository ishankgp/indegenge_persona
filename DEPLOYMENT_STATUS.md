# Deployment Instructions

## Frontend ✅ DEPLOYED
- **URL**: https://indegenge-persona-k6a4ifekb-indegenes.vercel.app
- **Status**: Successfully deployed to Vercel
- **Framework**: React + Vite + TypeScript

## Backend Deployment Options

### Option 1: Railway (Recommended)
1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Deploy: `railway deploy` from the backend directory

### Option 2: Render
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Point to the backend directory
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Option 3: Heroku
1. Create Procfile: `web: uvicorn app.main:app --host=0.0.0.0 --port=${PORT:-5000}`
2. Deploy with: `git push heroku main`

## Update Frontend API URL
Once backend is deployed, update the frontend:
1. Set VITE_API_URL in Vercel environment variables
2. Point to your backend URL (e.g., https://your-backend.railway.app)

## Current Status
- ✅ Frontend: Deployed and accessible
- ⏳ Backend: Choose deployment platform above
- 📱 Demo: Frontend works, will need backend for full functionality

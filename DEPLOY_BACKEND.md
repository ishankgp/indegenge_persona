# Backend Deployment Guide - Railway

This guide will help you deploy the backend to Railway and connect it to your Vercel frontend.

## Prerequisites

- GitHub account (repository already connected)
- Railway account (free tier available)
- OpenAI API key

## Step 1: Deploy Backend to Railway

### Option A: Via Railway Dashboard (Recommended)

1. **Go to Railway**: https://railway.app
2. **Sign in** with your GitHub account
3. **New Project** → **Deploy from GitHub repo**
4. **Select Repository**: Choose your `indegenge_persona` repository
5. **Configure Service**:
   - Click on the new service
   - Go to **Settings** → **Root Directory**
   - Set Root Directory to: `backend`
   - Go to **Settings** → **Deploy**
   - The start command should be: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. **Add PostgreSQL Database**:
   - In your Railway project, click **+ New**
   - Select **Database** → **Add PostgreSQL**
   - Railway will automatically create a `DATABASE_URL` environment variable
7. **Add Environment Variables**:
   - Go to **Variables** tab
   - Add: `OPENAI_API_KEY` = `your-openai-api-key-here`
   - The `DATABASE_URL` is automatically set by Railway
8. **Deploy**:
   - Railway will automatically deploy when you push changes
   - Or click **Deploy** button to trigger deployment
9. **Get Your Backend URL**:
   - Go to **Settings** → **Networking**
   - Click **Generate Domain** (or use the provided one)
   - Copy the URL (e.g., `https://your-app.up.railway.app`)

### Option B: Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend directory
cd backend

# Initialize Railway project
railway init

# Link to existing project (or create new)
railway link

# Add environment variables
railway variables set OPENAI_API_KEY=your-openai-api-key-here

# Deploy
railway up

# Get the URL
railway domain
```

## Step 2: Verify Backend is Running

1. **Check Railway Logs**:
   - Go to Railway dashboard → Your service → **Deployments** → **View Logs**
   - Look for: `Application startup complete` and `Uvicorn running on`

2. **Test Backend API**:
   - Open your backend URL in browser: `https://your-app.up.railway.app/api`
   - Should see: `{"message":"PharmaPersonaSim API is running!"}`
   - Check API docs: `https://your-app.up.railway.app/docs`

3. **Test Health Endpoint**:
   - Visit: `https://your-app.up.railway.app/health/db`
   - Should return database status

## Step 3: Configure Vercel Frontend

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select Your Project**: `indegenge-persona`
3. **Settings** → **Environment Variables**
4. **Add New Variable**:
   - **Name**: `VITE_API_URL`
   - **Value**: Your Railway backend URL (e.g., `https://your-app.up.railway.app`)
   - **Environment**: Select all (Production, Preview, Development)
5. **Save** the environment variable
6. **Redeploy Frontend**:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger auto-deploy

## Step 4: Verify Everything Works

1. **Check Frontend**:
   - Visit: https://indegenge-persona.vercel.app/coverage
   - Should now load without errors
   - Check browser console (F12) for any API errors

2. **Test API Connection**:
   - Open browser DevTools → Network tab
   - Refresh the Persona Coverage page
   - Look for requests to `/personas/` and `/api/brands`
   - Should return 200 status codes

## Troubleshooting

### Backend Won't Start

- **Check Logs**: Railway dashboard → Deployments → View Logs
- **Verify Environment Variables**: Ensure `OPENAI_API_KEY` is set
- **Check Database**: Ensure PostgreSQL is provisioned and `DATABASE_URL` is set
- **Python Version**: Railway should auto-detect Python 3.12 from `runtime.txt`

### Frontend Still Shows Errors

- **Verify VITE_API_URL**: Check Vercel environment variables
- **Redeploy Frontend**: Environment variables require redeploy
- **Check CORS**: Backend already allows all origins (`allow_origins=["*"]`)
- **Browser Console**: Check for specific error messages

### Database Connection Issues

- **Check DATABASE_URL Format**: Should be `postgresql://...` (not `postgres://`)
- **Database Migration**: Tables are created automatically on first startup
- **Railway PostgreSQL**: Ensure database service is running

### API Returns 404

- **Check Root Directory**: Must be set to `backend` in Railway
- **Verify Start Command**: Should be `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Check Routes**: Visit `/api` endpoint to verify API is running

## Next Steps

After successful deployment:

1. ✅ Backend deployed on Railway
2. ✅ Frontend connected via `VITE_API_URL`
3. ✅ Database initialized with PostgreSQL
4. ✅ Persona Coverage page working

You can now:
- Create personas via the frontend
- Upload brand documents
- Run simulations
- View analytics

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Check logs in both platforms for detailed error messages


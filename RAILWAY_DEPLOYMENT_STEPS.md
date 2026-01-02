# Railway Deployment - Step by Step Guide

Follow these steps to deploy your backend to Railway.

## ✅ Prerequisites Checklist

- [ ] GitHub account (repository already connected)
- [ ] Railway account (sign up at https://railway.app - free tier available)
- [ ] OpenAI API key (get from https://platform.openai.com/api-keys)

## 🚀 Step 1: Deploy Backend to Railway

### Option A: Via Railway Dashboard (Easiest - Recommended)

1. **Go to Railway**: https://railway.app
2. **Sign in** with your GitHub account
3. **Click "New Project"**
4. **Select "Deploy from GitHub repo"**
5. **Select your repository**: `indegenge_persona` (or your repo name)
6. **Railway will start deploying automatically**

### Step 1.1: Configure the Service

1. **Click on the service** that Railway created
2. **Go to Settings** → **Root Directory**
3. **Set Root Directory to**: `backend`
4. **Click Save**

### Step 1.2: Add PostgreSQL Database

1. **In your Railway project**, click **"+ New"** button
2. **Select "Database"** → **"Add PostgreSQL"**
3. Railway will automatically:
   - Create a PostgreSQL database
   - Set `DATABASE_URL` environment variable
   - Link it to your service

### Step 1.3: Add Environment Variables

1. **Go to your service** → **Variables** tab
2. **Click "New Variable"**
3. **Add these variables**:

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `OPENAI_API_KEY` | `sk-proj-...` | Your OpenAI API key |

4. **Click "Add"** for each variable
5. **Note**: `DATABASE_URL` is automatically set by Railway (don't add it manually)

### Step 1.4: Get Your Backend URL

1. **Go to Settings** → **Networking** tab
2. **Click "Generate Domain"** (or use the provided one)
3. **Copy the URL** - it will look like:
   - `https://your-app-name.up.railway.app`
   - **SAVE THIS URL** - you'll need it for Vercel!

## 🔍 Step 2: Verify Backend is Running

### Check Railway Logs

1. **Go to Railway Dashboard** → Your service
2. **Click "Deployments"** tab
3. **Click on the latest deployment**
4. **View Logs** - you should see:
   ```
   Application startup complete
   Uvicorn running on 0.0.0.0:PORT
   ```

### Test Backend API

1. **Open your backend URL** in browser:
   - `https://your-app-name.up.railway.app/api`
   - Should see: `{"message":"PharmaPersonaSim API is running!"}`

2. **Check API Documentation**:
   - Visit: `https://your-app-name.up.railway.app/docs`
   - Should show Swagger UI with all API endpoints

3. **Test Health Endpoint**:
   - Visit: `https://your-app-name.up.railway.app/health/db`
   - Should return database status

## 🔗 Step 3: Connect Frontend to Backend

### Set VITE_API_URL in Vercel

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: `indegenge-persona`
3. **Go to Settings** → **Environment Variables**
4. **Click "Add New"**
5. **Fill in**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-app-name.up.railway.app` (your Railway backend URL)
   - **Environment**: Select all three:
     - ☑ Production
     - ☑ Preview  
     - ☑ Development
6. **Click "Save"**

### Redeploy Frontend

1. **Go to Deployments** tab in Vercel
2. **Click "⋯" (three dots)** on the latest deployment
3. **Click "Redeploy"**
4. **Wait for deployment to complete** (usually 1-2 minutes)

## ✅ Step 4: Verify Everything Works

### Test Frontend

1. **Visit**: https://indegenge-persona.vercel.app/coverage
2. **Open Browser DevTools** (F12)
3. **Check Console** - should see:
   ```
   🔧 API baseURL configured as: https://your-app-name.up.railway.app
   ```
4. **Check Network Tab**:
   - Refresh the page
   - Look for requests to `/personas/` and `/api/brands`
   - Should return **200 OK** status
   - Request URL should show your Railway backend URL

### Test Persona Coverage Page

- Should load without errors
- Should display persona statistics
- No "Failed to fetch" errors

## 🐛 Troubleshooting

### Backend Won't Start

**Check Railway Logs:**
- Go to Railway → Your service → Deployments → View Logs
- Look for error messages

**Common Issues:**
- Missing `OPENAI_API_KEY` → Add it in Variables tab
- Database not connected → Ensure PostgreSQL is added
- Python version mismatch → Check `runtime.txt` (should be python-3.12)

### Frontend Still Shows Errors

**Verify Environment Variable:**
- Check Vercel → Settings → Environment Variables
- Ensure `VITE_API_URL` is set correctly
- Must redeploy after adding environment variables

**Check Browser Console:**
- Open DevTools (F12) → Console tab
- Look for error messages
- Check what URL is being used for API calls

### Database Connection Issues

**Check DATABASE_URL:**
- Railway automatically sets this
- Should start with `postgresql://` (not `postgres://`)
- Our code handles the conversion automatically

**Verify Database:**
- Railway → Your project → PostgreSQL service
- Should show "Running" status

### API Returns 404

**Check Root Directory:**
- Railway → Your service → Settings → Root Directory
- Must be set to: `backend`

**Check Start Command:**
- Should be: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Railway reads this from `railway.toml`

## 📊 Monitoring

### Railway Dashboard

- **Logs**: Real-time application logs
- **Metrics**: CPU, Memory usage
- **Deployments**: Deployment history
- **Variables**: Environment variables

### Vercel Dashboard

- **Analytics**: Page views, performance
- **Logs**: Frontend build and runtime logs
- **Deployments**: Deployment history

## 🎉 Success Checklist

- [ ] Backend deployed on Railway
- [ ] Backend URL accessible (test `/api` endpoint)
- [ ] PostgreSQL database connected
- [ ] `VITE_API_URL` set in Vercel
- [ ] Frontend redeployed
- [ ] Persona Coverage page loads without errors
- [ ] API calls successful (check Network tab)

## 📝 Next Steps

After successful deployment:

1. **Test all features**:
   - Create personas
   - Upload brand documents
   - Run simulations
   - View analytics

2. **Monitor usage**:
   - Check Railway logs for errors
   - Monitor API response times
   - Watch for OpenAI API quota limits

3. **Set up custom domain** (optional):
   - Railway → Settings → Networking → Custom Domain
   - Vercel → Settings → Domains → Add Domain

## 🆘 Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Vercel Docs: https://vercel.com/docs
- Check logs in both platforms for detailed error messages






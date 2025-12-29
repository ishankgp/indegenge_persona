# Why Do We Need VITE_API_URL?

## 🏗️ Architecture Overview

Your application has **two separate services**:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   FRONTEND (Vercel)   │         │   BACKEND (Railway)   │
│                       │         │                       │
│  React + Vite App     │────────▶│  FastAPI + Python     │
│  https://indegenge-   │  HTTP   │  https://your-app.    │
│  persona.vercel.app   │ Requests│  railway.app          │
│                       │         │                       │
│  - UI Components      │         │  - API Endpoints      │
│  - User Interface     │         │  - Database           │
│  - Client-side Logic  │         │  - Business Logic      │
└──────────────────────┘         └──────────────────────┘
```

## 🔍 The Problem

### In Development (Local):
```
┌─────────────────────────────────────────────────────────────┐
│              DEVELOPMENT MODE (Local Machine)                 │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   Frontend (Port 5173)│         │   Backend (Port 8000) │
│   http://localhost:   │────────▶│   http://localhost:   │
│   5173                │  Proxy  │   8000                │
│                       │  (Vite) │                       │
│  Uses Vite Proxy:    │         │  FastAPI Server       │
│  /personas → backend  │         │  Running Locally      │
└──────────────────────┘         └──────────────────────┘
```

**How it works:**
- Vite dev server has a **proxy** configured
- When frontend calls `/personas/`, Vite automatically forwards it to `http://localhost:8000/personas/`
- No need to specify backend URL - it's all on the same machine!

### In Production (Vercel):
```
┌─────────────────────────────────────────────────────────────┐
│              PRODUCTION MODE (Separate Servers)               │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   Frontend (Vercel)   │    ❌   │   Backend (Railway)   │
│   https://indegenge-  │  Can't  │   https://your-app.  │
│   persona.vercel.app  │  Find!  │   railway.app        │
│                       │         │                       │
│  ❌ No Proxy!         │         │  FastAPI Server       │
│  ❌ Different Domain  │         │  Different Server     │
│  ❌ Needs Full URL    │         │                       │
└──────────────────────┘         └──────────────────────┘
```

**The Problem:**
- Vercel is a **static hosting** service - no proxy like in development
- Frontend and backend are on **completely different servers**
- Frontend doesn't know where the backend is!
- Without `VITE_API_URL`, the frontend tries to call:
  - `https://indegenge-persona.vercel.app/personas/` ❌ (doesn't exist!)
  - Instead of: `https://your-backend.railway.app/personas/` ✅

## 💡 The Solution: VITE_API_URL

### What Happens in Code:

Looking at `frontend/src/lib/api.ts`:

```typescript
// In DEVELOPMENT:
if (DEV) {
  baseURL = '';  // Empty = use Vite proxy
}

// In PRODUCTION:
else {
  if (VITE_API_URL) {
    baseURL = VITE_API_URL;  // ✅ Use your backend URL
  } else {
    baseURL = window.location.origin;  // ❌ Wrong! Uses Vercel URL
  }
}
```

### Without VITE_API_URL:
```javascript
// Frontend tries to call:
fetch('https://indegenge-persona.vercel.app/personas/')
// ❌ 404 Not Found - Vercel doesn't have a backend!
```

### With VITE_API_URL Set:
```javascript
// Frontend calls:
fetch('https://your-backend.railway.app/personas/')
// ✅ Success! Backend responds with data
```

## 🎯 Why It's Required

1. **Different Servers**: Frontend (Vercel) and Backend (Railway) are separate
2. **No Proxy in Production**: Vite proxy only works in development
3. **Build-Time Configuration**: Vite reads `VITE_API_URL` during build
4. **Security**: Keeps backend URL configurable, not hardcoded
5. **Flexibility**: Can point to different backends (staging, production)

## 📋 How to Set It

### Step-by-Step Instructions:

1. **Deploy Backend First** (if not done):
   - Deploy to Railway/Render/Heroku
   - Get your backend URL (e.g., `https://your-app.up.railway.app`)

2. **Set Environment Variable in Vercel**:
   - Go to: https://vercel.com/dashboard
   - Select your project: `indegenge-persona`
   - Click **Settings** → **Environment Variables**
   - Click **Add New**
   - Fill in:
     - **Key**: `VITE_API_URL`
     - **Value**: `https://your-backend.railway.app` (your actual backend URL)
     - **Environment**: Select all (Production, Preview, Development)
   - Click **Save**

3. **Redeploy Frontend**:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger auto-deploy

4. **Verify**:
   - Visit: https://indegenge-persona.vercel.app/coverage
   - Open browser DevTools (F12) → Console
   - Look for: `🔧 API baseURL configured as: https://your-backend.railway.app`
   - Check Network tab - API calls should go to your backend URL

## 🔍 How to Verify It's Working

### Check Browser Console:
```javascript
// Should see:
🔧 API baseURL configured as: https://your-backend.railway.app
```

### Check Network Requests:
1. Open DevTools → Network tab
2. Refresh the Persona Coverage page
3. Look for requests to `/personas/` or `/api/brands`
4. Check the **Request URL** - should show your backend URL

### Test API Directly:
Visit: `https://your-backend.railway.app/api`
Should see: `{"message":"PharmaPersonaSim API is running!"}`

## 🚨 Common Mistakes

1. **Forgetting to Redeploy**: Environment variables require redeploy
2. **Wrong URL Format**: Must include `https://` and no trailing slash
3. **Not Setting for All Environments**: Should set for Production, Preview, Development
4. **Typo in Variable Name**: Must be exactly `VITE_API_URL` (case-sensitive)
5. **Backend Not Deployed**: Make sure backend is running first!

## 📚 Additional Notes

- **VITE_ Prefix**: Vite only exposes env vars prefixed with `VITE_` to the frontend
- **Build-Time**: Value is baked into the build at build time
- **Security**: Never commit backend URLs to git - use environment variables
- **Multiple Environments**: Can have different URLs for staging/production





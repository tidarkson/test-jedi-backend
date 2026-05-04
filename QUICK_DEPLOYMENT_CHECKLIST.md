# 🚀 Quick Deployment Checklist - Do This Now

## Information You Need (Gather These First)

**From Neon Console (https://console.neon.tech):**
```
Neon Project ID: ___________________
Neon Connection String (pooled):
postgresql://[user]:[password]@[host]:5432/[dbname]?sslmode=require
Copy FULL string: _________________________________
```

**From Railway Dashboard (https://railway.app):**
```
Railway Project Name: ___________________
```

---

## Step-by-Step Actions

### ✅ Phase 1: Neon Database Setup (5 min)

- [ ] Sign into https://console.neon.tech
- [ ] Create new project named "test-jedi-prod"
- [ ] Select region closest to you
- [ ] Click "Connection string" tab
- [ ] Select **"Pooled connection"** (important!)
- [ ] Copy full connection string starting with `postgresql://`
- [ ] **SAVE IT** (paste in top of this checklist)

### ✅ Phase 2: Push Code to GitHub (2 min)

```powershell
# In your backend folder
cd c:\Users\tidar\Documents\Web Dev Projects\test-jedi-backend

# Make sure you're on main branch
git checkout main

# Push all changes (including Dockerfiles)
git add .
git commit -m "Add Railway deployment configs: Dockerfile, Dockerfile.worker, .dockerignore"
git push origin main
```

- [ ] Code pushed to GitHub
- [ ] Verify files exist in GitHub:
  - [ ] `Dockerfile` (for API service)
  - [ ] `Dockerfile.worker` (for worker service)
  - [ ] `.dockerignore`

### ✅ Phase 3: Create Railway API Service (5 min)

1. Go to https://railway.app/dashboard
2. Click **"New"** → **"GitHub Repo"**
3. Select your `test-jedi-backend` repository
4. Railway will auto-build (takes ~2-3 min first time)
5. Wait for green checkmark in "Deployments"

- [ ] Railway API service created
- [ ] Build succeeded (green checkmark)

### ✅ Phase 4: Configure Environment Variables for API (3 min)

**In Railway Dashboard:**
1. Click on your API service
2. Go to **"Variables"** tab
3. Add these variables (copy-paste exactly):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | [paste from Neon above] |
| `JWT_SECRET` | [use generator below] |
| `SESSION_SECRET` | [use generator below] |
| `JWT_EXPIRY` | `15m` |
| `REFRESH_TOKEN_EXPIRY` | `7d` |
| `REDIS_ENABLED` | `true` |
| `REDIS_URL` | [will set in Phase 5] |
| `CORS_ORIGIN` | `http://localhost:3000` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `LOG_LEVEL` | `info` |
| `BCRYPT_ROUNDS` | `12` |

**Generate secure tokens (Windows):**
```powershell
# Run in PowerShell - generates 32-char random string
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Maximum 999999999).ToString() + (Get-Random -Maximum 999999999))) | Select-Object -First 32

# Copy output, paste as JWT_SECRET
# Run again, paste as SESSION_SECRET
```

- [ ] All variables entered
- [ ] DATABASE_URL includes `?sslmode=require`

### ✅ Phase 5: Add Redis Service (2 min)

1. In Railway dashboard, click your **Project** name (top left)
2. Click **"New"** → **"Database"** → **"Redis"**
3. Wait for Redis to fully provision (status shows "Active")
4. Click the new Redis service
5. Go to **"Variables"**
6. Copy the `REDIS_URL` value
7. Go back to your **API service** → **"Variables"**
8. Add new variable: `REDIS_URL` = [paste from Redis]

- [ ] Redis service created
- [ ] REDIS_URL copied to API service variables
- [ ] API service shows "Redeploy" prompt (click it)

### ✅ Phase 6: Deploy Database Migrations (3 min)

**Option A: Via Railway Shell (Recommended)**

1. In Railway dashboard, click your API service
2. Wait for it to finish redeploying (green checkmark)
3. Click **"Deployments"** tab
4. Click the latest (topmost) deployment
5. Click **"Shell"** button
6. Type:
   ```bash
   npx prisma migrate deploy
   ```
7. Press Enter
8. You should see success message with count of migrations

- [ ] Migrations deployed successfully

**Option B: Via Local PowerShell (if Shell option unavailable)**

```powershell
# Set connection string temporarily
$env:DATABASE_URL = "[paste your Neon connection string here]"

# Run migrations
npx prisma migrate deploy

# Expected output should show something like:
# 10 migrations found in ./prisma/migrations
# ✔ Prisma Migrations resolved successfully
```

- [ ] Migrations completed

### ✅ Phase 7: Create Worker Service (3 min)

1. In Railway dashboard, go back to your **Project**
2. Click **"New"** → **"GitHub Repo"** (same backend repo)
3. Railway might auto-detect it as a duplicate. If so:
   - Click the new service
   - Go to **"Settings"** tab
   - Under **"Docker"**, set:
     - **Dockerfile path:** `Dockerfile.worker`
     - **Build command:** `npm run build`
     - **Start command:** `npm run workers`

4. Go to **"Variables"** and paste **ALL the same variables from API service** (copy the entire list)

- [ ] Worker service created
- [ ] Worker variables set (same as API)
- [ ] Worker successfully deployed (green checkmark)

### ✅ Phase 8: Get Public URLs (1 min)

1. Click API service → **"Deployments"**
2. Under latest deployment, you'll see a **"Public URL"** button
3. Click it, copy the URL (should be like `https://test-jedi-backend-prod.railway.app`)
4. **SAVE THIS URL** - you need it for frontend

- [ ] API Public URL: `_________________________________`
- [ ] Note the URL for next steps

### ✅ Phase 9: Test Deployment (2 min)

**Open a terminal:**

```bash
# Replace with YOUR actual URL
curl https://YOUR-API-URL/health

# Should return:
# {
#   "status": "success",
#   "message": "Server is running",
#   "timestamp": "2026-05-XX..."
# }
```

- [ ] Health check returns 200
- [ ] API is live and reachable

### ✅ Phase 10: Update Frontend Config (2 min)

In your **frontend repo** (`test-jedi-software`), create `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://YOUR-API-URL/api/v1
NEXT_PUBLIC_WS_URL=wss://YOUR-API-URL
```

Replace `YOUR-API-URL` with your actual Railway public URL from Phase 8.

- [ ] Frontend .env.production created
- [ ] API URL updated in frontend

### ✅ Phase 11: Deploy Frontend (5 min)

**If using Vercel:**
```bash
cd C:\Users\tidar\Documents\Web Dev Projects\test-jedi-software
vercel deploy --prod
```

**If using Railway:**
1. Go to Railway, click "New" → "GitHub Repo"
2. Select `test-jedi-software`
3. Let it deploy

- [ ] Frontend deployed and accessible

### ✅ Final Verification

In your browser:

1. [ ] Go to your frontend URL
2. [ ] Try to log in (should connect to cloud backend)
3. [ ] Try to create a test case
4. [ ] Try to export a test case as PDF (tests the worker + Redis)

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| API won't start | Check `DATABASE_URL` in variables matches Neon exactly with `?sslmode=require` |
| Migrations fail | Shell SSH into deployment, check logs with `pm2 logs` |
| Worker crashes | Wait 1-2 min for Redis to fully provision, then redeploy worker |
| Frontend can't reach API | Verify `NEXT_PUBLIC_API_URL` in frontend .env matches Railway URL exactly |
| WebSocket fails | Ensure frontend uses `wss://` not `ws://` (secure WebSocket) |

---

## Important Notes

- **Don't commit .env files to GitHub** (they're already in .gitignore)
- **Railway re-deploys automatically** every time you push to GitHub
- **First deploy takes ~3 min**, subsequent deploys ~1-2 min
- **Database backups** are automatic on Neon (free for 6 hours on Basic plan)
- **Logs** available in Railway → Service → "Logs" tab (real-time)

---

## Done! 🎉

Your backend is now running in the cloud without needing a local dev server. Every push to GitHub auto-deploys both API and Worker.

**Next:** Update your frontend to use the cloud backend URL and deploy that too.

# Complete Railway + Neon Deployment Guide for Test-Jedi Backend

## Prerequisites
- Railway account: https://railway.app (sign up with GitHub)
- Neon account: https://console.neon.tech (sign up with GitHub)
- GitHub repository with your code pushed
- Docker installed locally (for testing, optional)

---

## Step 1: Set Up Neon PostgreSQL Database

### 1.1 Create Neon Project
1. Go to https://console.neon.tech
2. Click **"Create a new project"**
3. Name it: `test-jedi-prod` (or your choice)
4. Select region closest to your users (e.g., `us-east-1` for North America)
5. Click **"Create project"**

### 1.2 Get Connection String
1. In Neon console, go to **"Connection string"** (top right of database view)
2. Select **"Pooled connection"** (important for Prisma)
3. Copy the full string, which looks like:
   ```
   postgresql://[user]:[password]@[host]:5432/[dbname]?sslmode=require
   ```
4. **Save this.** You'll need it in Step 3.

### 1.3 (Optional) Create API Key for CI/CD
1. Go to https://console.neon.tech/app/settings/api-keys
2. Click **"Create API key"**
3. Copy and save (you won't see it again)
4. Give it to Railway later for automated migrations

---

## Step 2: Prepare Backend for Railway Deployment

### 2.1 Update Start Command
Railway needs the app to bind to `0.0.0.0`, not `localhost`. Your code already supports this via `HOST` env var, but let's confirm.

Check `src/config/environment.ts` (already defaults to `0.0.0.0` in production if not set). Good.

### 2.2 Add Railway Config File
Create `.railway/config.yaml` in the root of your repo:

```yaml
# Railway configuration
services:
  api:
    dockerfile: Dockerfile
    buildCommand: npm run build
    startCommand: npm start
    port: 3000
    healthCheck:
      path: /health
      interval: 30
      timeout: 10

  worker:
    dockerfile: Dockerfile.worker
    buildCommand: npm run build
    startCommand: npm run workers
    # No exposed port for worker (background service)
```

**Note:** Railway will auto-detect this if present, or you can configure manually via dashboard.

### 2.3 Ensure .dockerignore Exists
Create `.dockerignore` to speed up Docker builds:

```
node_modules
pnpm-lock.yaml
dist
.git
.env
.env.local
.env.*.local
*.md
tests
__tests__
.DS_Store
```

---

## Step 3: Create Railway Services

### 3.1 Create API Service on Railway

1. Go to https://railway.app/dashboard
2. Click **"New"** → **"GitHub Repo"** (or manually create service)
3. Select your GitHub repository with the backend code
4. Railway will auto-detect the Dockerfile
5. Wait for build to complete (first deploy ~3-5 min)

### 3.2 Configure Environment Variables for API Service

Once service is created, click on it and go to **"Variables"** tab. Add:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Must be exact |
| `PORT` | `3000` | Railway will expose this |
| `HOST` | `0.0.0.0` | Bind to all interfaces |
| `DATABASE_URL` | `[Neon connection string from Step 1.2]` | Paste exactly |
| `REDIS_ENABLED` | `true` | Enable cache & queue |
| `REDIS_URL` | `redis://:password@localhost:6379` | Will be set in Step 3.4 |
| `JWT_SECRET` | `[generate strong secret]` | Use `openssl rand -base64 32` |
| `SESSION_SECRET` | `[generate strong secret]` | Use `openssl rand -base64 32` |
| `JWT_EXPIRY` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token lifetime |
| `CORS_ORIGIN` | `https://[your-frontend-domain]` | Where frontend is hosted |
| `FRONTEND_URL` | `https://[your-frontend-domain]` | Same as CORS_ORIGIN |
| `API_VERSION` | `v1` | Current API version |
| `LOG_LEVEL` | `info` | Or `debug` for verbose logs |
| `BCRYPT_ROUNDS` | `12` | Password hashing cost |
| `AWS_REGION` | `us-east-1` | For S3 exports (if used) |
| `SENTRY_ENABLED` | `false` | Set to true if you add Sentry |

**Generate secure secrets:**
```powershell
# Using PowerShell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString() + (Get-Random))) | Select-Object -First 32
```

Or use online tool: https://generate-random.org/

### 3.3 Run Prisma Migrations

After API service is deployed, you need to run database migrations. 

**Option A: Via Railway Shell (Recommended)**
1. In Railway dashboard, open your API service
2. Click **"Deployments"** → latest deployment
3. Click **"View Logs"** (make sure deployment succeeded)
4. If successful, go back and click **"Shell"**
5. Run:
   ```bash
   npx prisma migrate deploy
   ```
6. You should see: `✔ Prisma Migrations resolved` and `9 migrations in ./prisma/migrations` or similar

**Option B: Via Local CLI**
```powershell
# Set Neon DB URL locally
$env:DATABASE_URL = "postgresql://user:pass@host:5432/dbname?sslmode=require"

# Run migrations
npx prisma migrate deploy

# Seed data (optional, for development)
npx prisma db seed
```

### 3.4 Add Redis to Railway

1. In Railway dashboard, click your **Project** name
2. Click **"New Service"** → **"Database"** → **"Redis"**
3. Wait for Redis to provision (~1 min)
4. Click the Redis service, go to **"Variables"**
5. Copy `REDIS_URL` from the variables table
6. Go back to your API service **"Variables"**, paste the `REDIS_URL`
7. Also add to Worker service (Step 3.5) variables

---

## Step 4: Create Worker Service

Railway will host your BullMQ export worker as a separate service.

### 4.1 Create Worker Service

1. Go to your Railway project
2. Click **"New Service"** → **"GitHub Repo"** (same repo)
3. Select your backend repository again
4. Railway might auto-detect it; if not:
   - Click the new service
   - Go to **"Settings"** → **"Build"**
   - Set **"Dockerfile"** to `Dockerfile.worker`
   - Set **"Build Command"** to `npm run build`
   - Set **"Start Command"** to `npm run workers`

### 4.2 Configure Worker Environment Variables

Go to Worker service **"Variables"** and add **the same variables as API** (copy from API service):

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `[same Neon connection string]` |
| `REDIS_ENABLED` | `true` |
| `REDIS_URL` | `[same Redis URL from API]` |
| `JWT_SECRET` | `[same as API]` |
| `SESSION_SECRET` | `[same as API]` |
| `LOG_LEVEL` | `info` |
| `AWS_ACCESS_KEY_ID` | `[if using S3 for exports]` |
| `AWS_SECRET_ACCESS_KEY` | `[if using S3 for exports]` |
| `AWS_S3_BUCKET` | `[if using S3 for exports]` |

---

## Step 5: Configure Frontend to Use Cloud Backend

### 5.1 Get API URL from Railway
1. Go to your Railway API service
2. Click **"Deployments"** → latest
3. At the top right, you'll see **"Public URL"** (e.g., `https://test-jedi-backend-prod.railway.app`)
4. Copy this URL

### 5.2 Update Frontend Environment
In your frontend project (test-jedi-software), create or update `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://test-jedi-backend-prod.railway.app/api/v1
NEXT_PUBLIC_WS_URL=wss://test-jedi-backend-prod.railway.app
```

**Note:** Use `wss://` for WebSocket (secure, over HTTPS)

### 5.3 Deploy Frontend
Deploy your frontend to Vercel, Railway, Render, or your hosting of choice:

```bash
# If deploying to Vercel
vercel deploy --prod
```

---

## Step 6: Verify Deployment

### 6.1 Test Health Check
```bash
curl https://test-jedi-backend-prod.railway.app/health
```

Expected response:
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2026-05-03T..."
}
```

### 6.2 Test API Endpoint (Authentication)
```bash
curl -X POST https://test-jedi-backend-prod.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

Expected: `401 Unauthorized` (user doesn't exist yet, but endpoint is live) OR `200` if you've seeded users

### 6.3 Check Database Connection
1. In Railway API service, click **"Logs"**
2. Look for: `"Prisma initialized"` and `"Background jobs initialized"`
3. If you see these, database is connected ✓

### 6.4 Check Worker Status
1. In Railway Worker service, click **"Logs"**
2. Look for: `"Prisma initialized"` and any BullMQ queue initialization messages
3. If present, worker is running ✓

---

## Step 7: Ongoing Operations

### 7.1 Deploy Updates
Every time you push to your GitHub repo, Railway auto-deploys:
1. Push code to `main` branch (or configured branch)
2. Railway auto-triggers build & deploy
3. Check **"Deployments"** tab for status
4. Old deployments are kept for quick rollback

### 7.2 View Logs
- API Service **"Logs"** → see all HTTP requests, errors, startup info
- Worker Service **"Logs"** → see export job processing, queue status

### 7.3 Create Database Backups
Neon automatically creates daily backups. To restore or manage:
1. Go to https://console.neon.tech
2. Select project → **"Backups"**
3. Click restore if needed (free for 6 hours on Basic plan)

### 7.4 Monitor Environment
- Railway provides **"Usage"** tab showing CPU, memory, egress
- Neon shows **"Database"** tab with connection count, query stats

---

## Troubleshooting

### API won't start: "Prisma not initialized"
**Cause:** `DATABASE_URL` not set or invalid
**Fix:** Copy Neon connection string exactly, ensure `?sslmode=require` at end

### Worker crashes immediately
**Cause:** Redis not connected
**Fix:** Check `REDIS_URL` matches Redis service, wait 1 min for Redis to fully provision

### Build fails: "Puppeteer/chromium not found"
**Cause:** Dockerfile not used
**Fix:** Ensure Railway detected `Dockerfile` correctly. Check **"Settings"** → **"Build"** → **"Dockerfile"** field

### WebSocket connections fail
**Cause:** Frontend using `ws://` instead of `wss://`
**Fix:** In frontend, use `wss://` for secure WebSocket over HTTPS

### Cannot upload/export files
**Cause:** S3 credentials not set
**Fix:** Either add AWS credentials to variables, or ensure PDF export doesn't require external storage

---

## Security Checklist

- [ ] `JWT_SECRET` is strong (48+ characters, random)
- [ ] `SESSION_SECRET` is strong (48+ characters, random)
- [ ] `CORS_ORIGIN` matches your frontend domain exactly
- [ ] No secrets hardcoded in repository
- [ ] All env vars set in Railway (not defaults)
- [ ] Neon SSL mode enabled (`?sslmode=require` in connection string)
- [ ] Redis password set (Neon auto-provides, Railway auto-links)

---

## Cost Estimate (as of May 2026)

| Service | Free Tier | Usage | Est. Cost/Month |
|---------|-----------|-------|-----------------|
| Railway API | First $5 | Typical: ~$10-30 | $10-30 |
| Railway Worker | First $5 | Typical: ~$5-15 | $5-15 |
| Neon PostgreSQL | 100 CU-hrs/month, 0.5 GB | Typical: 50 CU-hrs, 1 GB | $0-10 |
| Railway Redis | First $5 | Typical: ~$3-8 | $3-8 |
| **Total** | | | **~$20-60** |

(Free tier limits + overages scaled by actual usage)

---

## Next Steps After Deployment

1. **Create admin user** via seeding or API
2. **Update frontend** to use production API URL
3. **Set up custom domain** (Railway/Neon support custom domains)
4. **Enable monitoring** (Datadog, Sentry, or platform's built-in metrics)
5. **Test PDF export** (export queue via API)
6. **Load test** if expecting high traffic

---

## Support

- Railway docs: https://docs.railway.app
- Neon docs: https://neon.tech/docs
- Prisma migration docs: https://www.prisma.io/docs/orm/prisma-migrate

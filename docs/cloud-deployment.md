# Cloud Deployment Guide

## Architecture

| Layer | Service | Provider |
|-------|---------|----------|
| Frontend | React/Vite SPA | **Vercel** |
| API | dariyah-core (FastAPI) | **Railway** or **Render** |
| Workers | Celery (dsp/royalty/ai queues) | **Railway** worker service |
| Database | PostgreSQL | **Supabase** or Railway Postgres |
| Cache/Queue | Redis | **Upstash** or Railway Redis |

---

## 1. Database — Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Copy the `DATABASE_URL` from **Settings → Database → Connection string (URI)**
3. Add to Railway/Render environment variables as `DATABASE_URL`
4. Migrations run automatically on deploy (`alembic upgrade head` in `Procfile`)

---

## 2. Redis — Upstash

1. Create database at [upstash.com](https://upstash.com) → Redis
2. Copy the `REDIS_URL` (TLS URL)
3. Set the same URL for:
   - `REDIS_URL`
   - `CELERY_BROKER_URL`
   - `CELERY_RESULT_BACKEND`

---

## 3. Backend API — Railway

1. Connect your GitHub repo at [railway.app](https://railway.app)
2. Select `services/dariyah-core` as the root directory
3. Railway auto-detects `railway.toml` — build + start commands are pre-configured
4. Set environment variables (copy from `.env.example`)
5. Enable **public domain** → copy URL for frontend config

**Worker service:**
- Add a second Railway service from the same repo
- Root dir: `services/dariyah-core`
- Start command: `celery -A app.workers.dsp_sync_worker.celery_app worker --loglevel=info --concurrency=2 --queues=dsp,royalty,ai`

---

## 4. Backend API — Render (alternative)

1. Connect repo at [render.com](https://render.com)
2. Render auto-detects `render.yaml` in the repo root
3. Click **Apply** — it provisions Postgres, Redis, API, and worker automatically
4. Set `ADMIN_TOKEN`, `SECRET_KEY`, `ANTHROPIC_API_KEY` as secret env vars

---

## 5. Frontend — Vercel

1. Import repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `apps/frontend`
3. Vercel auto-detects `vercel.json`
4. Add environment variable:
   - `VITE_API_URL` = your Railway/Render API public URL (no trailing slash)
5. Deploy — Vercel handles CDN, edge caching, and HTTPS automatically

---

## 6. GitHub Secrets (for CI/CD)

Add these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Vercel API token |
| `VERCEL_ORG_ID` | From Vercel project settings |
| `VERCEL_PROJECT_ID` | From Vercel project settings |
| `RAILWAY_TOKEN` | Railway API token (for migration job) |
| `VITE_API_URL` | Production API URL |

Add this as a **variable** (not secret):
| Variable | Value |
|----------|-------|
| `API_URL` | Production API URL (for smoke tests) |

---

## Local Development (no Docker)

```bash
# 1. Start Postgres locally (or use Supabase free tier)
# 2. Start Redis locally (or use Upstash free tier)

# Backend
cd services/dariyah-core
cp ../../.env.example ../../.env
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --port 8001

# Workers (separate terminal)
celery -A app.workers.dsp_sync_worker.celery_app worker --loglevel=info --queues=dsp,royalty,ai

# Frontend (separate terminal)
cd apps/frontend
npm install
npm run dev
```

Open http://localhost:3000

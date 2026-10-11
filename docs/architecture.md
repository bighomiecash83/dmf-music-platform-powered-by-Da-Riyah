# DMF Music Platform — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DMF Music Platform                          │
│                   Fly Hoolie Ent · Columbus, Ohio                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    │
│  │   Frontend   │───▶│   dariyah-core   │───▶│    PostgreSQL     │    │
│  │  React/Vite  │    │   FastAPI API    │    │   (persistent)    │    │
│  │  Port 3000   │    │   Port 8001      │    │   Port 5432       │    │
│  └─────────────┘    └────────┬──────────┘    └──────────────────┘    │
│                              │                                       │
│                              │ dispatch tasks                        │
│                              ▼                                       │
│                     ┌─────────────────┐                              │
│                     │      Redis       │                              │
│                     │  Broker + Cache  │                              │
│                     │   Port 6379      │                              │
│                     └────────┬──────────┘                            │
│                              │                                       │
│              ┌───────────────┼───────────────┐                       │
│              ▼               ▼               ▼                       │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│  │  DSP Worker   │ │Royalty Worker │ │  AI Worker    │              │
│  │  queue: dsp   │ │queue: royalty │ │  queue: ai    │              │
│  └───────────────┘ └───────────────┘ └───────────────┘              │
│                                                                      │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐              │
│  │ Celery Beat   │ │   Flower      │ │  StreamGod    │              │
│  │  Scheduler    │ │  Monitoring   │ │  PresenceOS   │              │
│  │               │ │  Port 5555    │ │  Port 8002    │              │
│  └───────────────┘ └───────────────┘ └───────────────┘              │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Three-Tier Architecture

### Tier 1 — UI Layer (`apps/frontend/`)
- **Stack**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **State**: TanStack React Query (server state), React Context (UI state)
- **API Client**: Axios with automatic API key injection
- **Feature Modules**: Dashboard, Artists, Releases, Royalties, Campaigns, Analytics, AI Tools, Da'Riyah Chat

### Tier 2 — API / Logic Layer (`services/dariyah-core/`)
- **Framework**: FastAPI (Python 3.12)
- **Database ORM**: SQLAlchemy 2.0 (mapped columns, type-safe)
- **Migrations**: Alembic (auto-generated from models)
- **Auth**: API key based (HMAC-SHA256 signature verification)
- **Middleware**: Request tracing (X-Trace-ID), timing, multi-tenant context
- **Background Jobs**: Celery with Redis broker (3 queues: dsp, royalty, ai)
- **Caching**: Redis with structured key namespacing
- **Logging**: structlog (JSON output, trace-aware)

### Tier 3 — Infrastructure (`docker-compose.yml`, `infra/terraform/`)
- **Local Dev**: Docker Compose (postgres, redis, api, worker, beat, flower, frontend)
- **Cloud**: Terraform for AWS (ECS, RDS, ElastiCache, ECR, CloudFront, VPC)
- **CI/CD**: GitHub Actions (lint, test, build, Docker image, deploy)
- **Deployment**: Railway (backend) + Vercel (frontend)

## Background Worker System

All compute-intensive operations run **outside the HTTP request lifecycle** via Celery:

| Queue    | Worker              | Responsibilities                                      |
|----------|---------------------|-------------------------------------------------------|
| `dsp`    | `dsp_sync_worker`   | Pull metrics from Spotify, Apple Music, Amazon, Tidal |
| `royalty`| `royalty_worker`    | Calculate splits, generate settlement records         |
| `ai`     | `ai_worker`         | Description generation, campaign copy, insights       |

### Celery Beat Schedule
- **DSP Bulk Sync**: Every 6 hours — pulls metrics for all orgs/artists
- **Royalty Batch**: Daily — calculates settlements for all releases

### Monitoring
- **Flower**: Web dashboard at port 5555 for real-time task monitoring

## Multi-Tenant Architecture

Every table includes an `org_id` foreign key pointing to the `orgs` table. This enables:
- Data isolation between labels/organizations
- Per-tenant API key scoping
- Org-level billing and plan management

The `TenantMiddleware` extracts `org_id` from the authenticated API key and stores it in a context variable, making it available to all downstream handlers without re-querying.

## Data Flow

```
User opens dashboard
        │
        ▼
React app loads → calls GET /dashboard/stats
        │
        ▼
FastAPI checks API key → middleware sets org_id context
        │
        ▼
Service layer queries DB (filtered by org_id)
        │
        ▼
If DSP metrics are stale → dispatch dsp_sync task to Celery
        │
        ▼
Worker pulls live data from Spotify/Apple APIs → stores in dsp_metrics
        │
        ▼
Cache invalidated → next request returns fresh data
        │
        ▼
Frontend re-renders with updated metrics
```

## Security Model

1. **API Keys**: Generated with `dgk_` prefix, stored as SHA-256 hash
2. **Request Signing**: HMAC-SHA256 with timestamp + nonce (5-min window)
3. **Scope-based Access**: Keys carry scopes like `releases:read`, `royalties:write`
4. **Per-Tenant Secrets**: HKDF-derived secrets per org from master key
5. **CORS**: Locked to frontend origins
6. **Secrets Management**: All credentials via environment variables, never in code

## Directory Structure

```
dmf-music-platform-powered-by-Da-Riyah/
├── apps/
│   └── frontend/              # React + Vite + TypeScript
│       └── src/
│           ├── features/      # Domain-based feature modules
│           │   ├── dashboard/
│           │   ├── artists/
│           │   ├── releases/
│           │   ├── royalties/
│           │   ├── campaigns/
│           │   ├── analytics/
│           │   ├── ai/
│           │   └── dariyah/
│           └── shared/        # Reusable UI, hooks, API client
├── services/
│   ├── dariyah-core/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── core/          # Security, logging, middleware, cache, DB
│   │   │   ├── models/        # SQLAlchemy ORM models
│   │   │   ├── routers/       # API route handlers by domain
│   │   │   ├── workers/       # Celery background tasks
│   │   │   └── tests/         # pytest test suite
│   │   ├── alembic/           # Database migrations
│   │   └── main.py            # FastAPI app entry point
│   ├── payment-service/       # Stripe/payment processing (Node.js)
│   └── streamgod-presenceos/  # StreamGod presence engine
├── infra/terraform/           # AWS infrastructure as code
├── scripts/                   # Automation (launch, seed, etc.)
├── docs/                      # Architecture, schema, deployment docs
├── docker-compose.yml         # Local cloud simulator
└── .github/workflows/         # CI/CD pipelines
```

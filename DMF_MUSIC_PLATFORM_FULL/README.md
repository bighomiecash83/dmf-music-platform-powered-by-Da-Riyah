# DMF Music Platform

DMF RECORDS / FLY HOOLIE ENT command center powered by Next.js + Supabase.

## Runtime

- Node.js `20.x` (recommended for CI, Vercel, and functions)

## Core Notes

- Dashboard route: `/dashboard`
- Home route redirects to `/dashboard`
- Data source: Supabase (`@supabase/supabase-js`)
- Firebase is not required for dashboard operations

## Required Env Vars

### Web (Vercel)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_APP_NAME`

Optional web API proxy vars (required only if using `/api/proxy` and `/api/dariyah/bots`):

- `API_BASE`
- `DMF_API_KEY`
- `DA_RIYAH_MASTER_KEY`
- `DARIYAH_CORE_URL`
- `DARIYAH_API_KEY`

### Backend (`functions`)

- `PORT`
- `MONGO_URI`
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `GOOGLE_AI_API_KEY`

## Launch (Local Production Mode)

1. Build web app:
   - `pnpm build:web`
2. Start web app:
   - `pnpm start:web`
3. Start backend (separate terminal):
   - `pnpm up:backend`
4. Open:
   - `http://localhost:3000/dashboard`

## Dev Mode

- Full stack dev: `pnpm up`
- Web only: `pnpm up:web`

## Vercel Rollout

Use these settings in Vercel:

- Framework: `Next.js`
- Root Directory: `DMF_MUSIC_PLATFORM_FULL/frontend` if your repo root contains this folder
- Install Command: `pnpm install`
- Build Command: `pnpm --filter @dariyah/web build`

Verify after deploy:

1. `/` redirects to `/dashboard`
2. Dashboard sections load (Roster, Campaigns, Pricing, Distribution)
3. Channel matrix includes Spotify, Apple, YouTube, TikTok, Amazon, Facebook, Instagram, Twitter/X

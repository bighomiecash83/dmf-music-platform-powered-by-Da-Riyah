# DMF Music Platform

DMF RECORDS / FLY HOOLIE ENT command center powered by Next.js + Supabase.

## Core Notes

- Dashboard route: `/dashboard`
- Home route redirects to `/dashboard`
- Data source: Supabase (`@supabase/supabase-js`)
- Firebase is not required for dashboard operations

## Required Env Vars

Frontend and server-side Supabase access rely on:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_API_URL` (optional for API rewrites, defaults to `http://localhost:5001`)

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

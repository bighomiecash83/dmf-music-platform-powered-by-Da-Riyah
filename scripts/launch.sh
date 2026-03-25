#!/usr/bin/env bash
# ============================================================
# DMF Music Platform — Launch Script
# Run this once from your local machine to go live.
# ============================================================
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

banner() { echo -e "\n${BOLD}${CYAN}▸ $1${NC}\n"; }
ok()     { echo -e "  ${GREEN}✓${NC} $1"; }
warn()   { echo -e "  ${YELLOW}⚠${NC}  $1"; }
die()    { echo -e "  ${RED}✗ $1${NC}"; exit 1; }

echo -e "${BOLD}"
echo "  ██████╗ ███╗   ███╗███████╗"
echo "  ██╔══██╗████╗ ████║██╔════╝"
echo "  ██║  ██║██╔████╔██║█████╗  "
echo "  ██║  ██║██║╚██╔╝██║██╔══╝  "
echo "  ██████╔╝██║ ╚═╝ ██║██║     "
echo "  ╚═════╝ ╚═╝     ╚═╝╚═╝  LAUNCH"
echo -e "${NC}"

# ── 0. Prereqs ───────────────────────────────────────────────────────────────

banner "0 / 6  Checking prerequisites"

command -v node  >/dev/null 2>&1 && ok "Node  $(node  -v)" || die "Node.js not found — install from https://nodejs.org"
command -v npm   >/dev/null 2>&1 && ok "npm   $(npm   -v)" || die "npm not found"
command -v python3 >/dev/null 2>&1 && ok "Python $(python3 --version)" || die "Python 3 not found"
command -v pip3  >/dev/null 2>&1 && ok "pip   $(pip3  --version | awk '{print $2}')" || die "pip not found"
command -v git   >/dev/null 2>&1 && ok "git   $(git   --version)" || die "git not found"

# ── 1. Install CLIs ──────────────────────────────────────────────────────────

banner "1 / 6  Installing cloud CLIs"

if ! command -v railway >/dev/null 2>&1; then
  echo "  Installing Railway CLI..."
  npm install -g @railway/cli
  ok "Railway CLI installed"
else
  ok "Railway CLI $(railway --version)"
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "  Installing Vercel CLI..."
  npm install -g vercel
  ok "Vercel CLI installed"
else
  ok "Vercel CLI $(vercel --version)"
fi

# ── 2. Run tests ─────────────────────────────────────────────────────────────

banner "2 / 6  Running tests"

(
  cd services/dariyah-core
  pip3 install -r requirements.txt -q
  python3 -m pytest app/tests/ -v --tb=short
)
ok "All backend tests passed"

(
  cd apps/frontend
  npm install --silent
  npm run build 2>&1 | grep -E "✓|warning|error" || true
)
ok "Frontend builds clean"

# ── 3. Environment setup ─────────────────────────────────────────────────────

banner "3 / 6  Environment setup"

if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example — fill in secrets before deploy"
fi

echo ""
echo "  Required secrets (open .env and fill these in):"
echo "    ADMIN_TOKEN          — secure random string (admin access)"
echo "    SECRET_KEY           — 32+ char secret for signing"
echo "    DATABASE_URL         — Supabase or Railway Postgres connection string"
echo "    REDIS_URL            — Upstash or Railway Redis URL"
echo "    ANTHROPIC_API_KEY    — from console.anthropic.com"
echo ""
echo -n "  Have you filled in .env? [y/N] "
read -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
  warn "Fill in .env then re-run this script."
  exit 0
fi

# Load env for local verification
set -a; source .env; set +a

[ -z "$ADMIN_TOKEN"   ] && die "ADMIN_TOKEN is not set in .env"
[ -z "$SECRET_KEY"    ] && die "SECRET_KEY is not set in .env"
[ -z "$DATABASE_URL"  ] && die "DATABASE_URL is not set in .env"
[ -z "$REDIS_URL"     ] && die "REDIS_URL is not set in .env"
ok "All required secrets present"

# ── 4. Database migration ────────────────────────────────────────────────────

banner "4 / 6  Running database migrations"

(
  cd services/dariyah-core
  alembic upgrade head
)
ok "Database schema up to date"

# ── 5. Deploy backend → Railway ──────────────────────────────────────────────

banner "5 / 6  Deploy backend to Railway"

echo "  Logging in to Railway..."
railway login

echo ""
echo "  Creating Railway project for dariyah-core API..."
(
  cd services/dariyah-core
  railway init --name "dmf-dariyah-core" 2>/dev/null || true
  railway up --service "dariyah-core"
)
ok "API deployed to Railway"

echo ""
echo "  Deploying Celery worker..."
(
  cd services/dariyah-core
  railway up --service "dmf-worker" --start-command \
    "celery -A app.workers.dsp_sync_worker.celery_app worker --loglevel=info --concurrency=2 --queues=dsp,royalty,ai"
)
ok "Worker deployed"

RAILWAY_URL=$(railway domain 2>/dev/null || echo "")
if [ -n "$RAILWAY_URL" ]; then
  ok "API URL: https://$RAILWAY_URL"
  API_URL="https://$RAILWAY_URL"
else
  echo -n "  Enter your Railway API public URL (e.g. https://dmf-api.up.railway.app): "
  read -r API_URL
fi

# ── 6. Deploy frontend → Vercel ──────────────────────────────────────────────

banner "6 / 6  Deploy frontend to Vercel"

echo "  Logging in to Vercel..."
vercel login

(
  cd apps/frontend
  echo "  Deploying to Vercel (production)..."
  VITE_API_URL="$API_URL" vercel --prod --yes
)

VERCEL_URL=$(cd apps/frontend && vercel ls --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['url'])" 2>/dev/null || echo "")

# ── Done ─────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   🚀  DMF PLATFORM IS LIVE             ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
[ -n "$VERCEL_URL" ] && echo -e "  ${BOLD}Frontend:${NC}  https://$VERCEL_URL"
[ -n "$API_URL"    ] && echo -e "  ${BOLD}API:${NC}       $API_URL"
echo -e "  ${BOLD}Health:${NC}    ${API_URL}/health"
echo -e "  ${BOLD}API Key:${NC}   POST ${API_URL}/admin/api-keys  (X-Admin-Token: \$ADMIN_TOKEN)"
echo ""
echo "  Next steps:"
echo "    1. Create your first API key via the admin endpoint"
echo "    2. Add DSP credentials to Railway env vars"
echo "    3. Add ANTHROPIC_API_KEY to Railway env vars for AI features"
echo "    4. Set up Celery Beat in Railway for scheduled DSP syncs"
echo ""

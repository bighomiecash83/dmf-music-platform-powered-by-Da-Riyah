# repo/
# ├─ README.md
# ├─ docker-compose.yml
# ├─ .env.example
# ├─ apps/
# │  └─ frontend/...
# ├─ libs/
# │  └─ security/...
# └─ services/
#    ├─ dariyah-core/...
#    └─ streamgod-presenceos/...

# =========================
# README.md
# =========================
"""
# Da'Riyah Monorepo (Scaffold)

## Services
- `services/dariyah-core`: Da'Riyah Core (Strategy/Music/Video/Distribution/Learning/Build stubs)
- `services/streamgod-presenceos`: StreamGod (PresenceOS) (campaign exec/bot runtime/live DSP stubs)
- `libs/security`: API Wall (API key hashing, signature verification, replay guard, scope enforcement)

## Quickstart (Docker)
1) Copy env:
   - `cp .env.example .env`

2) Start:
   - `docker compose up --build`

3) Create admin key:
```bash
curl -s -X POST http://localhost:8001/admin/api-keys \
  -H "X-Admin-Token: dev_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"local-dev","scopes":["campaigns:read","campaigns:write","runtime:exec"]}'
```

## API Wall (Client Requirements)
Every request must include:
- `X-Api-Key`: `dgk_<key_id>_<raw_key_material>`
- `X-Timestamp`: unix seconds (int)
- `X-Nonce`: random unique string (uuid recommended)
- `X-Signature`: hex HMAC-SHA256 signature

Signature input:
`{timestamp}.{nonce}.{method}.{path}.{body_sha256}`

Signature key:
- service-side stored `api_secret` tied to key_id

Body hash:
- SHA256 hex of raw body bytes (empty body => SHA256 of empty bytes)

## Create an API key (dev/admin)
- `POST /admin/api-keys` with header:
  - `X-Admin-Token: <ADMIN_TOKEN>`
- Response includes the raw API key **once**.

## Example curl (Core)
1) Create key:
```bash
curl -s -X POST http://localhost:8001/admin/api-keys \
  -H "X-Admin-Token: dev_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"name":"local-dev","scopes":["campaigns:read","campaigns:write","analytics:read"]}'

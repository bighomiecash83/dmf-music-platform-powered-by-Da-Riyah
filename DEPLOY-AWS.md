# DMF Music Platform — AWS Deployment Guide

**Target AWS Account:** `041875151338`
**Target Region:** `us-east-2` (Ohio — home base)
**Resource Group:** `arn:aws:resource-groups:us-east-2:041875151338:group/DMF_MUSIC_PLATFORM/0279j4x49uuuv4p4d99wfo5blr`

All resources created by Terraform are automatically tagged `Project = DMF_MUSIC_PLATFORM` so they appear in your Resource Group.

---

## Architecture

```
CloudFront CDN  ──→  S3 (React SPA)
      │
      └──→  ALB (port 80/443)
                │
                └──→  ECS Fargate (dariyah-core API  :8001)
                           │
                           ├──→  RDS PostgreSQL 16 (private subnet)
                           └──→  ElastiCache Redis 7 (private subnet)

ECR (Docker images)  ──→  ECS tasks pull from here
Secrets Manager      ──→  All secrets injected at runtime
CloudWatch           ──→  Logs + dashboard
```

---

## Step 1 — Prerequisites

```bash
# Install Terraform ≥ 1.7
brew install terraform   # macOS
# or: https://developer.hashicorp.com/terraform/install

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, region = us-east-2
```

---

## Step 2 — Configure Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — fill in secrets via env vars:
export TF_VAR_admin_token="your-admin-token"
export TF_VAR_secret_key="$(openssl rand -hex 32)"
export TF_VAR_anthropic_api_key="sk-ant-..."
```

---

## Step 3 — Deploy Infrastructure

```bash
cd infra/terraform
terraform init
terraform plan          # Review what will be created
terraform apply         # Type 'yes' to deploy
```

**First apply creates:**
- VPC + subnets (public / private / data) across 3 AZs
- NAT Gateways (3× for HA)
- ALB + target groups + listener
- ECS Cluster (Fargate) + API service + Worker service
- RDS PostgreSQL 16 (Multi-AZ in prod)
- ElastiCache Redis 7 (2-node cluster in prod)
- ECR repositories (dariyah-core, frontend)
- S3 buckets (frontend SPA, ALB access logs)
- CloudFront distribution (SPA + /api/* proxy to ALB)
- Secrets Manager (db password, redis auth, app secrets)
- CloudWatch log groups + dashboard
- All resources tagged into DMF_MUSIC_PLATFORM Resource Group

---

## Step 4 — Build & Push Docker Images

```bash
# Get ECR login
aws ecr get-login-password --region us-east-2 | \
  docker login --username AWS --password-stdin \
  041875151338.dkr.ecr.us-east-2.amazonaws.com

# Build + push API
docker build -t 041875151338.dkr.ecr.us-east-2.amazonaws.com/dmf-prod/dariyah-core:latest \
  ./services/dariyah-core
docker push 041875151338.dkr.ecr.us-east-2.amazonaws.com/dmf-prod/dariyah-core:latest

# Build + push Frontend
docker build -t 041875151338.dkr.ecr.us-east-2.amazonaws.com/dmf-prod/frontend:latest \
  ./apps/frontend
docker push 041875151338.dkr.ecr.us-east-2.amazonaws.com/dmf-prod/frontend:latest
```

---

## Step 5 — Deploy Frontend to S3 + CloudFront

```bash
# Build the React app (get API URL from terraform output)
VITE_API_URL=$(terraform -chdir=infra/terraform output -raw alb_dns_name) \
  npm --prefix apps/frontend run build

# Sync to S3
BUCKET=$(terraform -chdir=infra/terraform output -raw frontend_bucket_name)
aws s3 sync apps/frontend/dist s3://$BUCKET --delete

# Invalidate CloudFront cache
DIST_ID=$(terraform -chdir=infra/terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

---

## Step 6 — Verify Deployment

```bash
# Get outputs
terraform -chdir=infra/terraform output platform_urls

# Test API health
curl https://$(terraform -chdir=infra/terraform output -raw alb_dns_name)/health

# Test roster
curl https://$(terraform -chdir=infra/terraform output -raw alb_dns_name)/artists
```

---

## Connect Spotify API for Live Metrics

Set these in AWS Secrets Manager (or add to `terraform.tfvars`):
- `SPOTIFY_CLIENT_ID` — from [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- `SPOTIFY_CLIENT_SECRET` — from Spotify Developer Dashboard

Then `/dsp/roster-metrics` will return **live** follower counts for:
- Big Homie Cash (`40z5aBKSs2Wtdori0baO1l`)
- Freezzo (`4ksrusI7XnIdyuN6a3LtMj`)
- OBMB DELO (`6yjdymBNWSyr39uuuweOfT`)
- Go Savage (`5qGClg4MZsh2r5ZD88rtEZ`)

---

## Live API Endpoints (after deploy)

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Service health |
| `GET /dashboard/stats` | Total streams, royalties, releases, campaigns |
| `GET /artists` | DMF roster (all 5 artists with Spotify IDs) |
| `GET /artists/{id}` | Single artist profile card |
| `GET /releases` | Full catalog (20 releases from inventory) |
| `GET /campaigns` | Active, draft, completed campaigns |
| `GET /royalties/summary` | Gross/net breakdown |
| `POST /royalties/calculate` | Royalty calculator (2026 DSP rates) |
| `GET /dsp/roster-metrics` | Live Spotify followers for all roster artists |
| `GET /dsp/spotify/{spotify_id}` | Single artist Spotify metrics |
| `GET /analytics/stream-trend` | 30-day stream trend data |
| `POST /ai/generate-description` | AI press release generator |

---

## Estimated Monthly Cost (prod)

| Service | Est. Cost |
|---------|-----------|
| ECS Fargate (2 API + 1 worker) | ~$25–$40 |
| RDS t4g.micro Multi-AZ | ~$30 |
| ElastiCache t4g.micro 2-node | ~$25 |
| ALB | ~$18 |
| CloudFront | ~$2 (free tier likely) |
| NAT Gateways (3) | ~$100 |
| **Total** | **~$200–$215/mo** |

> **Cost tip:** For staging/dev, set `environment = "dev"` — disables Multi-AZ, uses FARGATE_SPOT, drops to ~$50/mo.

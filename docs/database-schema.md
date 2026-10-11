# DMF Music Platform — Database Schema

## Entity Relationship Diagram

```
┌──────────────┐
│     orgs     │  (tenant root)
├──────────────┤
│ id           │──┐
│ name         │  │
│ slug         │  │  1:N relationships
│ plan         │  │
│ is_active    │  │
│ created_at   │  │
│ updated_at   │  │
└──────────────┘  │
                  │
     ┌────────────┼────────────┬──────────────┬──────────────┐
     ▼            ▼            ▼              ▼              ▼
┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐
│ artists  │ │ api_keys │ │ platform_ │ │campaigns │ │dsp_      │
│          │ │          │ │  events   │ │          │ │metrics   │
└────┬─────┘ └──────────┘ └───────────┘ └──────────┘ └──────────┘
     │
     ├────────────────┐
     ▼                ▼
┌──────────┐    ┌──────────┐
│ releases │    │campaigns │
└────┬─────┘    └──────────┘
     │
     ├──────────────┬──────────────┐
     ▼              ▼              ▼
┌──────────┐ ┌───────────┐ ┌───────────┐
│  tracks  │ │ownership_ │ │ royalty_  │
│          │ │  splits   │ │settlements│
└──────────┘ └───────────┘ └───────────┘
```

## Tables

### `orgs` — Multi-Tenant Root
Every other table references `orgs.id` for data isolation.

| Column     | Type         | Description                        |
|------------|--------------|------------------------------------|
| id         | UUID (PK)    | Tenant identifier                  |
| name       | VARCHAR(255) | Organization display name          |
| slug       | VARCHAR(100) | URL-safe unique identifier         |
| plan       | VARCHAR(50)  | `free` / `pro` / `enterprise`      |
| is_active  | BOOLEAN      | Soft-disable tenant                |
| created_at | TIMESTAMPTZ  | Row creation time                  |
| updated_at | TIMESTAMPTZ  | Last modification time             |

### `artists` — Roster Management
| Column            | Type         | Description                      |
|-------------------|--------------|----------------------------------|
| id                | UUID (PK)    | Artist identifier                |
| org_id            | UUID (FK)    | Tenant reference                 |
| name              | VARCHAR(255) | Artist/act name                  |
| bio               | TEXT         | Artist biography                 |
| genre             | VARCHAR(100) | Primary genre                    |
| spotify_artist_id | VARCHAR(100) | Spotify artist ID for API calls  |
| apple_music_id    | VARCHAR(100) | Apple Music artist ID            |
| image_url         | VARCHAR(500) | Profile image URL                |

### `releases` — Catalog
| Column         | Type         | Description                           |
|----------------|--------------|---------------------------------------|
| id             | UUID (PK)    | Release identifier                    |
| org_id         | UUID (FK)    | Tenant reference                      |
| artist_id      | UUID (FK)    | Owning artist                         |
| title          | VARCHAR(255) | Release title                         |
| release_type   | VARCHAR(20)  | `single` / `ep` / `album`             |
| genre          | VARCHAR(100) | Genre classification                  |
| release_date   | DATE         | Official release date                 |
| upc            | VARCHAR(20)  | Universal Product Code (unique)        |
| cover_art_url  | VARCHAR(500) | Cover art image URL                   |
| description    | TEXT         | Manual description                    |
| ai_description | TEXT         | AI-generated press copy               |
| status         | VARCHAR(30)  | `draft` / `submitted` / `live` / `takedown` |

### `tracks` — Individual Tracks
| Column           | Type         | Description                      |
|------------------|--------------|----------------------------------|
| id               | UUID (PK)    | Track identifier                 |
| org_id           | UUID (FK)    | Tenant reference                 |
| release_id       | UUID (FK)    | Parent release                   |
| title            | VARCHAR(255) | Track title                      |
| track_number     | INTEGER      | Position in release              |
| duration_seconds | INTEGER      | Track length                     |
| isrc             | VARCHAR(20)  | International Standard Recording Code (unique) |
| audio_url        | VARCHAR(500) | Audio file URL                   |
| explicit         | BOOLEAN      | Explicit content flag            |

### `ownership_splits` — Royalty Division
Defines how revenue for a release is split among participants.
All splits for a release **must sum to 100%**.

| Column           | Type          | Description                     |
|------------------|---------------|---------------------------------|
| id               | UUID (PK)     | Split record identifier         |
| org_id           | UUID (FK)     | Tenant reference                |
| release_id       | UUID (FK)     | Target release                  |
| participant_id   | UUID          | Artist/label/publisher UUID     |
| participant_name | VARCHAR(255)  | Display name                    |
| role             | VARCHAR(50)   | `artist` / `label` / `publisher` / `distributor` |
| percentage       | NUMERIC(5,2)  | Share percentage (e.g. 85.00)   |

**Constraint**: `UNIQUE(release_id, participant_id)`

### `royalty_settlements` — Payment Records
One row per participant per DSP per settlement period.

| Column              | Type          | Description                      |
|---------------------|---------------|----------------------------------|
| id                  | UUID (PK)     | Settlement identifier            |
| org_id              | UUID (FK)     | Tenant reference                 |
| release_id          | UUID (FK)     | Source release                   |
| participant_id      | UUID          | Recipient identifier             |
| participant_name    | VARCHAR(255)  | Recipient display name           |
| role                | VARCHAR(50)   | Participant role                 |
| dsp                 | VARCHAR(50)   | `spotify` / `apple_music` / etc. |
| period_start        | DATE          | Settlement period start          |
| period_end          | DATE          | Settlement period end            |
| streams             | INTEGER       | Total streams in period          |
| gross_amount        | NUMERIC(12,4) | Pre-deduction amount             |
| platform_commission | NUMERIC(12,4) | Platform fee (15%)               |
| net_amount          | NUMERIC(12,4) | Post-deduction payout            |
| currency            | VARCHAR(3)    | `USD` (default)                  |
| status              | VARCHAR(20)   | `pending` / `paid` / `disputed`  |

### `dsp_metrics` — Raw Streaming Data
Stores daily metrics pulled from DSP APIs by the `dsp_sync_worker`.

| Column          | Type       | Description                        |
|-----------------|------------|------------------------------------|
| id              | UUID (PK)  | Metric record identifier           |
| org_id          | UUID (FK)  | Tenant reference                   |
| artist_id       | UUID (FK)  | Target artist                      |
| dsp             | VARCHAR(50)| DSP source name                    |
| date            | DATE       | Metric date                        |
| streams         | INTEGER    | Daily stream count                 |
| downloads       | INTEGER    | Daily download count               |
| saves           | INTEGER    | Library saves                      |
| playlist_adds   | INTEGER    | Playlist additions                 |
| listeners       | INTEGER    | Unique listeners                   |
| followers_delta | INTEGER    | Net follower change                |

**Indexes**: `(artist_id, date)`, `(org_id, dsp)`

### `campaigns` — Marketing Campaigns
| Column        | Type         | Description                         |
|---------------|--------------|-------------------------------------|
| id            | UUID (PK)    | Campaign identifier                 |
| org_id        | UUID (FK)    | Tenant reference                    |
| artist_id     | UUID (FK)    | Target artist                       |
| release_id    | UUID (FK)    | Associated release (optional)       |
| name          | VARCHAR(255) | Campaign name                       |
| campaign_type | VARCHAR(50)  | `release_promo` / `playlist_pitch` / `social_media` |
| status        | VARCHAR(30)  | `draft` / `active` / `paused` / `completed` |
| start_date    | DATE         | Campaign start                      |
| end_date      | DATE         | Campaign end                        |
| budget_usd    | NUMERIC(12,2)| Budget allocation                   |
| brief         | TEXT         | Campaign brief                      |
| ai_copy       | TEXT         | AI-generated copy (JSON)            |

### `platform_events` — Audit Log
Immutable event log. **Never update or delete rows.**

| Column      | Type          | Description                          |
|-------------|---------------|--------------------------------------|
| id          | UUID (PK)     | Event identifier                     |
| org_id      | UUID (FK)     | Tenant reference                     |
| event_type  | VARCHAR(100)  | Event classification (see below)     |
| entity_type | VARCHAR(50)   | `release` / `artist` / `campaign`    |
| entity_id   | UUID          | Related entity                       |
| actor_id    | UUID          | User or service that triggered event |
| payload     | TEXT (JSON)   | Event-specific data                  |

**Event types**: `dsp.metrics_synced`, `royalty.calculated`, `release.published`, `campaign.launched`, `ai.content_generated`, `api_key.created`, `api_key.revoked`

### `api_keys` — Authentication
| Column       | Type         | Description                        |
|--------------|--------------|------------------------------------|
| id           | UUID (PK)    | Key record identifier              |
| org_id       | UUID (FK)    | Owning tenant                      |
| name         | VARCHAR(255) | Key display name                   |
| key_id       | VARCHAR(50)  | Public key identifier (`dgk_...`)  |
| key_hash     | VARCHAR(64)  | SHA-256 hash of raw key            |
| scopes       | JSON         | Permission scopes array            |
| is_active    | BOOLEAN      | Key enabled/disabled               |
| last_used_at | TIMESTAMPTZ  | Last API call timestamp            |

## Per-Stream Rate Schedule (2026)

| DSP          | Rate/Stream (USD) |
|--------------|-------------------|
| Spotify      | $0.004            |
| Apple Music  | $0.008-0.010      |
| Amazon Music | $0.004            |
| Tidal        | $0.013            |
| Deezer       | $0.0064           |

Platform commission: **15%** (configurable per org)

#!/usr/bin/env python3
"""
Seed the DMF database with the real roster, catalog, and sample campaigns.

Usage:
    cd services/dariyah-core
    python -m scripts.seed_db          # from repo root with PYTHONPATH
    # or
    DATABASE_URL=postgresql+psycopg2://dmf:dmfpass@localhost:5432/dmf python ../../scripts/seed_db.py
"""
import os
import sys

# Ensure the dariyah-core app package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "services", "dariyah-core"))

from app.core.database import db_session
from app.models.org import Org
from app.models.artist import Artist
from app.models.release import Release
from app.models.campaign import Campaign
from app.models.ownership import OwnershipSplit
from app.models.base import new_uuid


def seed():
    with db_session() as db:
        # ── 1. Org ────────────────────────────────────────────────────────
        org = db.query(Org).filter_by(slug="dmf-records").first()
        if not org:
            org = Org(
                id=new_uuid(),
                name="DMF Records Fly Hoolie Ent",
                slug="dmf-records",
                plan="pro",
                is_active=True,
            )
            db.add(org)
            db.flush()
            print(f"  Created org: {org.name} ({org.id})")
        else:
            print(f"  Org already exists: {org.slug}")

        # ── 2. Artists ────────────────────────────────────────────────────
        artist_data = [
            {
                "name": "Big Homie Cash",
                "bio": "Label Owner / Founder / Lead Artist — Columbus, Ohio (West Side). Raw street hustle, motivational anthems.",
                "genre": "Hip-Hop/Rap",
                "spotify_artist_id": "40z5aBKSs2Wtdori0baO1l",
            },
            {
                "name": "Freezzo",
                "bio": "Core workhorse — hard-hitting no-filter bars, trap bangers, consistent drops.",
                "genre": "Hip-Hop/Rap",
                "spotify_artist_id": "4ksrusI7XnIdyuN6a3LtMj",
            },
            {
                "name": "OBMB DELO",
                "bio": "Alternative rap depth — introspective storytelling, unique flows, emotional street depth.",
                "genre": "Alternative Rap",
                "spotify_artist_id": "6yjdymBNWSyr39uuuweOfT",
            },
            {
                "name": "Go Savage",
                "bio": "Gritty street energy — aggressive trap/street anthems, savage delivery.",
                "genre": "Hip-Hop/Rap",
                "spotify_artist_id": "5qGClg4MZsh2r5ZD88rtEZ",
            },
            {
                "name": "Ellumf",
                "bio": "Versatile / experimental — confident bars, unique fusions, genre experiments.",
                "genre": "Hip-Hop/Rap (Experimental)",
                "spotify_artist_id": None,
            },
        ]

        artists = {}
        for ad in artist_data:
            existing = db.query(Artist).filter_by(org_id=org.id, name=ad["name"]).first()
            if existing:
                artists[ad["name"]] = existing
                print(f"  Artist exists: {ad['name']}")
                continue
            a = Artist(id=new_uuid(), org_id=org.id, **ad)
            db.add(a)
            db.flush()
            artists[ad["name"]] = a
            print(f"  Created artist: {a.name}")

        # ── 3. Releases ───────────────────────────────────────────────────
        release_data = [
            ("Big Homie Cash", "Fresh off the banana boat", "album", "Hip-Hop/Rap", "2024-01-01"),
            ("Big Homie Cash", "Stick to the money", "single", "Hip-Hop/Rap", "2024-03-01"),
            ("Big Homie Cash", "The Rise", "single", "Hip-Hop/Rap", "2024-04-01"),
            ("Big Homie Cash", "Flavors", "single", "Hip-Hop/Rap", "2024-05-01"),
            ("Big Homie Cash", "Light It Up (feat. Freezzo & B Hus)", "single", "Hip-Hop/Rap", "2024-06-01"),
            ("Big Homie Cash", "Tatted Up (feat. Freezzo, Yogi Bear, B Hustle)", "single", "Hip-Hop/Rap", "2024-07-01"),
            ("Big Homie Cash", "Never Faking", "single", "Hip-Hop/Rap", "2023-06-01"),
            ("Freezzo", "Calling my cellular", "single", "Hip-Hop/Rap", "2024-02-01"),
            ("Freezzo", "All in a Lexus", "single", "Hip-Hop/Rap", "2024-03-15"),
            ("Freezzo", "I Do My Thang (feat. Big Homie Cash)", "single", "Hip-Hop/Rap", "2024-04-01"),
            ("Freezzo", "IDGAF", "single", "Hip-Hop/Rap", "2024-05-01"),
            ("Freezzo", "Da Boss", "single", "Hip-Hop/Rap", "2024-06-01"),
            ("OBMB DELO", "Standing on my own 10", "ep", "Alternative Rap", "2024-01-01"),
            ("OBMB DELO", "Know who you are", "single", "Alternative Rap", "2024-06-01"),
            ("OBMB DELO", "13 reasons", "single", "Alternative Rap", "2024-08-01"),
            ("Go Savage", "No hook", "ep", "Hip-Hop/Rap", "2024-03-01"),
            ("Go Savage", "Pistol on da dresser (feat. Ellumf)", "single", "Hip-Hop/Rap", "2024-01-01"),
            ("Ellumf", "Is what it is", "single", "Hip-Hop/Rap", "2024-04-01"),
            ("Ellumf", "Shots Fire", "single", "Hip-Hop/Rap", "2024-05-01"),
            ("Ellumf", "October 3", "single", "Experimental/Indian Fusion", "2024-10-03"),
        ]

        releases = {}
        for artist_name, title, rtype, genre, rdate in release_data:
            artist = artists[artist_name]
            existing = db.query(Release).filter_by(org_id=org.id, artist_id=artist.id, title=title).first()
            if existing:
                releases[title] = existing
                continue
            r = Release(
                id=new_uuid(),
                org_id=org.id,
                artist_id=artist.id,
                title=title,
                release_type=rtype,
                genre=genre,
                release_date=rdate,
                status="live",
            )
            db.add(r)
            db.flush()
            releases[title] = r
        print(f"  Seeded {len(release_data)} releases")

        # ── 4. Default ownership splits (85/15 artist/label) ──────────────
        for title, release in releases.items():
            existing = db.query(OwnershipSplit).filter_by(release_id=release.id).first()
            if existing:
                continue
            db.add(OwnershipSplit(
                id=new_uuid(),
                org_id=org.id,
                release_id=release.id,
                participant_id=release.artist_id,
                participant_name=release_data[[rd[1] for rd in release_data].index(title)][0],
                role="artist",
                percentage=85.00,
            ))
            db.add(OwnershipSplit(
                id=new_uuid(),
                org_id=org.id,
                release_id=release.id,
                participant_id=org.id,
                participant_name="DMF Records",
                role="label",
                percentage=15.00,
            ))
        print("  Seeded ownership splits (85/15)")

        # ── 5. Campaigns ──────────────────────────────────────────────────
        campaign_data = [
            ("Big Homie Cash", "Fresh Off The Banana Boat Blitz", "release_promo", "completed", "2024-01-01", "2024-03-01", 500),
            ("Freezzo", "Freezzo - IDGAF Playlist Push", "playlist_pitch", "active", "2026-03-01", "2026-04-15", 300),
            ("OBMB DELO", "OBMB DELO - EP Deep Cut Promo", "social_media", "active", "2026-02-15", "2026-04-01", 200),
            ("Go Savage", "Go Savage TikTok Street Clip", "social_media", "draft", None, None, 250),
            ("Big Homie Cash", "Big Homie Cash 2026 Spring Push", "release_promo", "active", "2026-03-15", "2026-05-01", 750),
        ]
        for artist_name, name, ctype, status, start, end, budget in campaign_data:
            artist = artists[artist_name]
            existing = db.query(Campaign).filter_by(org_id=org.id, name=name).first()
            if existing:
                continue
            db.add(Campaign(
                id=new_uuid(),
                org_id=org.id,
                artist_id=artist.id,
                name=name,
                campaign_type=ctype,
                status=status,
                start_date=start,
                end_date=end,
                budget_usd=budget,
            ))
        print("  Seeded campaigns")

        db.commit()
        print("\n  Seed complete.")


if __name__ == "__main__":
    print("DMF Database Seeder")
    print("=" * 40)
    seed()

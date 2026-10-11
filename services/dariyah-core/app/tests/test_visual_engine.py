"""Integration tests for Da'Riyah Studio (the AI visual engine)."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.models import Base


@pytest.fixture
def client(monkeypatch):
    """TestClient backed by an isolated in-memory SQLite DB, with generation/
    render jobs mocked so tests never touch a real Celery broker."""
    from app.workers import visual_worker

    monkeypatch.setattr(visual_worker.process_generation, "delay", lambda *a, **kw: None)
    monkeypatch.setattr(visual_worker.process_render, "delay", lambda *a, **kw: None)

    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from main import app

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


ORG_ID = "org-1"


def _create_project(client, **overrides):
    payload = {"org_id": ORG_ID, "title": "Fresh Off The Banana Boat — Visual", **overrides}
    resp = client.post("/v2/dariyah-studio/projects", json=payload)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_create_and_get_project(client):
    project = _create_project(client, vision="Street anthem, golden hour, West Side Columbus")
    assert project["title"] == "Fresh Off The Banana Boat — Visual"
    assert project["status"] == "draft"

    resp = client.get(f"/v2/dariyah-studio/projects/{project['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


def test_list_projects_scoped_to_org(client):
    _create_project(client)
    resp = client.get("/v2/dariyah-studio/projects", params={"org_id": ORG_ID})
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    resp = client.get("/v2/dariyah-studio/projects", params={"org_id": "some-other-org"})
    assert resp.status_code == 200
    assert resp.json() == []


def test_scene_builder_splits_lyrics_into_scenes(client):
    project = _create_project(client)
    lyrics = "Verse one on the west side\nstill grinding\n\nChorus hook here\nloyalty forever"

    resp = client.post(
        f"/v2/dariyah-studio/projects/{project['id']}/scenes",
        json={"source_text": lyrics},
    )
    assert resp.status_code == 201, resp.text
    scenes = resp.json()
    assert len(scenes) == 2
    assert scenes[0]["order_index"] == 0
    assert "west side" in scenes[0]["description"]


def test_storyboard_assembles_scenes_and_shots(client):
    project = _create_project(client)
    client.post(
        f"/v2/dariyah-studio/projects/{project['id']}/scenes",
        json={
            "scenes": [
                {
                    "title": "Intro",
                    "description": "Cold open on the block",
                    "shots": [{"camera_movement": "dolly in", "duration_seconds": 3.5}],
                }
            ]
        },
    )

    resp = client.get(f"/v2/dariyah-studio/projects/{project['id']}/storyboard")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["scenes"]) == 1
    assert len(body["scenes"][0]["shots"]) == 1
    assert body["scenes"][0]["shots"][0]["camera_movement"] == "dolly in"


def test_generate_without_provider_queues_job(client):
    project = _create_project(client)
    resp = client.post(
        "/v2/dariyah-studio/generate",
        json={
            "project_id": project["id"],
            "generation_type": "image_to_video",
            "parameters": {"image_asset_id": "asset-1"},
        },
    )
    assert resp.status_code == 202, resp.text
    assert resp.json()["status"] == "queued"


def test_generate_rejects_unknown_type(client):
    project = _create_project(client)
    resp = client.post(
        "/v2/dariyah-studio/generate",
        json={"project_id": project["id"], "generation_type": "not_a_real_type"},
    )
    assert resp.status_code == 400


def test_audio_sync_builds_timeline_tracks(client):
    project = _create_project(client)
    resp = client.post(
        f"/v2/dariyah-studio/projects/{project['id']}/audio-sync",
        json={"shot_ids": ["shot-1", "shot-2"], "beat_markers": [0, 2.5, 5.0]},
    )
    assert resp.status_code == 201, resp.text
    tracks = resp.json()["tracks"]
    assert tracks == [
        {"shot_id": "shot-1", "start_seconds": 0, "end_seconds": 2.5},
        {"shot_id": "shot-2", "start_seconds": 2.5, "end_seconds": 5.0},
    ]


def test_render_creates_version_and_render_record(client):
    project = _create_project(client)
    timeline_resp = client.post(
        f"/v2/dariyah-studio/projects/{project['id']}/audio-sync",
        json={"shot_ids": ["shot-1"], "beat_markers": [0, 3.0]},
    )
    timeline_id = timeline_resp.json()["id"]

    resp = client.post(
        f"/v2/dariyah-studio/projects/{project['id']}/render",
        json={"timeline_id": timeline_id},
    )
    assert resp.status_code == 202, resp.text
    body = resp.json()
    assert body["render"]["status"] == "queued"
    assert body["version"]["version_number"] == 1

"""Integration tests for the FastAPI app."""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from main import app
    return TestClient(app)


def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "running" in resp.json().get("message", "").lower()


def test_create_api_key_unauthorized(client):
    resp = client.post(
        "/admin/api-keys",
        json={"name": "test", "scopes": ["releases:read"]},
        headers={"X-Admin-Token": "wrong_token"},
    )
    assert resp.status_code == 401


def test_create_api_key_authorized(client):
    import os
    token = os.getenv("ADMIN_TOKEN", "dev_admin_token")
    resp = client.post(
        "/admin/api-keys",
        json={"name": "test", "scopes": ["releases:read"]},
        headers={"X-Admin-Token": token},
    )
    assert resp.status_code == 200
    assert "api_key" in resp.json()


def test_health(client):
    resp = client.get("/health")
    assert resp.status_code == 200

"""Basic tests for Da'Riyah Core API"""
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_root():
    """Test the root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Da'Riyah Core running"}


def test_create_api_key_unauthorized():
    """Test API key creation without admin token"""
    response = client.post(
        "/admin/api-keys",
        json={"name": "test-key", "scopes": ["campaigns:read"]}
    )
    assert response.status_code == 401


def test_create_api_key_authorized():
    """Test API key creation with valid admin token"""
    response = client.post(
        "/admin/api-keys",
        json={"name": "test-key", "scopes": ["campaigns:read"]},
        headers={"X-Admin-Token": "dev_admin_token"}
    )
    assert response.status_code == 200
    assert "api_key" in response.json()

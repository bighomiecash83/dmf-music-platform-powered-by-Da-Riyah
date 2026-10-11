"""
Shared test fixtures for the dariyah-core test suite.
"""
import os
import pytest
from fastapi.testclient import TestClient

# Set test environment variables before importing app
os.environ.setdefault("ADMIN_TOKEN", "test_token")
os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture
def client():
    """FastAPI test client backed by the main app."""
    from main import app
    return TestClient(app)


@pytest.fixture
def admin_token():
    """Admin token for authenticated requests."""
    return os.getenv("ADMIN_TOKEN", "test_token")

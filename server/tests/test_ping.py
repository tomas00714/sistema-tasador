"""
Test del endpoint público /ping para monitoreo externo (cron-job.org).
"""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Cliente de test de FastAPI."""
    return TestClient(app)


def test_ping_returns_200_and_status_ok(client):
    """
    GET /ping debe devolver HTTP 200 con JSON {"status": "ok"}.
    No requiere autenticación ni acceso a DB.
    """
    response = client.get("/ping")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert "Authorization" not in response.request.headers  # sin JWT


def test_ping_public_no_auth_required(client):
    """
    /ping es público: funciona sin token de autenticación.
    """
    response = client.get("/ping", headers={})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ping_lightweight_no_external_calls(client):
    """
    /ping no hace llamadas a servicios externos ni DB.
    Si algo fallara en lifespan (DB), el endpoint sigue respondiendo.
    """
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

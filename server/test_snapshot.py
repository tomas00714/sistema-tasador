import requests
import json

BASE_URL = "http://localhost:8000"

# Test: Verificar que el endpoint nuevo esté en el server
try:
    response = requests.get(f"{BASE_URL}/docs")
    print("Servidor corriendo correctamente")
    print(f"Status: {response.status_code}")
except Exception as e:
    print(f"Error conectando al servidor: {e}")

# Test: Verificar endpoint de snapshot (debería dar 401 sin auth)
try:
    response = requests.put(f"{BASE_URL}/api/tasaciones/1/comparables/1", json={})
    print(f"\nPUT /api/tasaciones/1/comparables/1")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")

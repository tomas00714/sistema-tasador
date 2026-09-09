"""
Servicio de autenticación con Google OAuth 2.0 / OpenID Connect.

Este servicio centraliza:
- construcción de URLs de autorización de Google;
- intercambio de authorization code por tokens;
- obtención de información del usuario desde Google;
- generación/validación del state firmado para proteger contra CSRF.
"""

import os
import logging
import urllib.parse
from datetime import timedelta
from typing import Optional, Dict, Any

import httpx

import auth

logger = logging.getLogger(__name__)

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"


def get_google_oauth_config() -> Dict[str, str]:
    """Devuelve la configuración de OAuth de Google desde variables de entorno."""
    return {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uri": os.getenv(
            "GOOGLE_REDIRECT_URI",
            "http://127.0.0.1:8080/api/auth/google/callback"
        ),
    }


def create_oauth_state(mode: str, user_id: Optional[int] = None, expires_minutes: int = 5) -> str:
    """Genera un state firmado (JWT) para un flujo OAuth con Google."""
    data: Dict[str, Any] = {"mode": mode, "nonce": os.urandom(16).hex()}
    if user_id is not None:
        data["uid"] = user_id
    return auth.create_access_token(data, expires_delta=timedelta(minutes=expires_minutes))


def verify_oauth_state(token: str) -> Optional[Dict[str, Any]]:
    """Verifica un state de OAuth y devuelve su payload."""
    return auth.decode_access_token(token)


def build_google_auth_url(state: str, client_id: str, redirect_uri: str) -> str:
    """Construye la URL de autorización de Google."""
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str, client_id: str, client_secret: str, redirect_uri: str) -> Dict[str, Any]:
    """Intercambia un authorization code por tokens de Google."""
    with httpx.Client() as client:
        try:
            response = client.post(
                GOOGLE_TOKEN_ENDPOINT,
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
                timeout=20.0,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error al intercambiar code con Google: {e}")
            raise


def get_google_user_info(access_token: str) -> Dict[str, Any]:
    """Obtiene los datos del usuario autenticado desde el UserInfo endpoint de Google."""
    with httpx.Client() as client:
        try:
            response = client.get(
                GOOGLE_USERINFO_ENDPOINT,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=20.0,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error al obtener userinfo de Google: {e}")
            raise

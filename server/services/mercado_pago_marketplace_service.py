"""
Servicio OAuth del Marketplace de Mercado Pago (Split Payment 1:1).

Centraliza la infraestructura OAuth necesaria para que un Seller (cuenta de
Mercado Pago del socio) autorice a nuestra aplicación Marketplace:

- configuración de la aplicación Marketplace (client_id / client_secret /
  redirect_uri) desde variables de entorno;
- construcción de la URL de autorización del Seller;
- state firmado (JWT) para protección CSRF, reutilizando el mismo mecanismo
  que el OAuth de Google;
- intercambio del authorization code por credenciales del Seller;
- renovación del access token del Seller (grant_type=refresh_token);
- cifrado en reposo (Fernet) de los tokens antes de persistirlos.

Esta infraestructura está pensada exclusivamente para Checkout Pro: una vez
autorizado el Seller, el backend creará Preferences usando el access token
del Seller y configurará ``marketplace_fee`` para el split. NO implementa
Checkout API ni usa ``application_fee``.

Referencias oficiales:
- Authorization URL: https://auth.mercadopago.com/authorization
  (client_id, response_type=code, platform_id=mp, state, redirect_uri)
- Token endpoint: POST https://api.mercadopago.com/oauth/token
"""

import os
import base64
import hashlib
import logging
import urllib.parse
from datetime import timedelta
from typing import Optional, Dict, Any

import httpx
from cryptography.fernet import Fernet

import auth

logger = logging.getLogger(__name__)

MP_AUTHORIZATION_URL = "https://auth.mercadopago.com/authorization"
MP_TOKEN_URL = "https://api.mercadopago.com/oauth/token"

# Identificador interno del flujo, embebido en el state firmado
MP_OAUTH_STATE_MODE = "mp_marketplace_seller"
MP_OAUTH_STATE_EXPIRE_MINUTES = 10


def get_mp_oauth_config() -> Dict[str, str]:
    """Devuelve la configuración OAuth del Marketplace desde variables de entorno."""
    return {
        "client_id": os.getenv("MP_CLIENT_ID", ""),
        "client_secret": os.getenv("MP_CLIENT_SECRET", ""),
        "redirect_uri": os.getenv("MP_OAUTH_REDIRECT_URI", ""),
    }


def create_mp_oauth_state(usuario_id: int, expires_minutes: int = MP_OAUTH_STATE_EXPIRE_MINUTES) -> str:
    """Genera un state firmado (JWT) para el flujo OAuth del Seller.

    Incluye el modo del flujo, un nonce aleatorio y el usuario interno que
    inició la autorización. El callback solo puede validarse con nuestra
    JWT_SECRET_KEY, lo que protege contra CSRF sin almacenamiento extra.
    """
    data: Dict[str, Any] = {
        "mode": MP_OAUTH_STATE_MODE,
        "nonce": os.urandom(16).hex(),
        "uid": usuario_id,
    }
    return auth.create_access_token(data, expires_delta=timedelta(minutes=expires_minutes))


def verify_mp_oauth_state(state: str) -> Optional[Dict[str, Any]]:
    """Verifica un state de OAuth del Marketplace y devuelve su payload.

    Retorna None si la firma es inválida, expiró, o no corresponde a este
    flujo OAuth.
    """
    if not state:
        return None
    payload = auth.decode_access_token(state)
    if not payload:
        return None
    if payload.get("mode") != MP_OAUTH_STATE_MODE:
        return None
    return payload


def build_mp_authorization_url(state: str, client_id: str, redirect_uri: str) -> str:
    """Construye la URL de autorización de Mercado Pago para el Seller.

    Parámetros según documentación oficial de Mercado Pago OAuth para
    Marketplaces / Split Payments.
    """
    params = {
        "client_id": client_id,
        "response_type": "code",
        "platform_id": "mp",
        "state": state,
        "redirect_uri": redirect_uri,
    }
    return f"{MP_AUTHORIZATION_URL}?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
) -> Dict[str, Any]:
    """Intercambia el authorization code por credenciales del Seller.

    POST /oauth/token con grant_type=authorization_code. La respuesta
    incluye access_token, refresh_token, user_id, expires_in, scope,
    token_type, public_key y live_mode del Seller.

    Nunca loguear la respuesta completa: contiene tokens.
    """
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    }
    return _post_token_request(payload)


def refresh_seller_tokens(
    refresh_token: str,
    client_id: str,
    client_secret: str,
) -> Dict[str, Any]:
    """Renueva el access token del Seller usando su refresh_token.

    POST /oauth/token con grant_type=refresh_token. Preparado para cuando
    expire el access token del Seller (Mercado Pago: ~180 días).
    """
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
    }
    return _post_token_request(payload)


def _post_token_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Ejecuta el POST a /oauth/token de Mercado Pago.

    Raises:
        httpx.HTTPStatusError: si Mercado Pago rechaza el intercambio.
        httpx.HTTPError: si hay error de conexión.
    """
    with httpx.Client() as client:
        try:
            response = client.post(
                MP_TOKEN_URL,
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                timeout=20.0,
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            # El body de error de MP no contiene el client_secret ni tokens;
            # se loguea solo para diagnóstico del rechazo.
            logger.error(
                "Error HTTP al intercambiar tokens con Mercado Pago: "
                f"status={e.response.status_code} body={e.response.text[:500]}"
            )
            raise
        except httpx.HTTPError as e:
            logger.error(f"Error de conexión con Mercado Pago OAuth: {e}")
            raise


# =========================
# Cifrado de tokens en reposo
# =========================

def _get_fernet() -> Fernet:
    """Deriva una clave Fernet para cifrar los tokens del Seller.

    Usa MP_OAUTH_ENCRYPTION_KEY si está definida; si no, deriva una clave
    determinística desde JWT_SECRET_KEY. Cambiar la clave invalida los
    tokens ya cifrados (habría que re-autorizar al Seller).
    """
    secret = os.getenv("MP_OAUTH_ENCRYPTION_KEY") or auth.JWT_SECRET_KEY
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode("utf-8")).digest())
    return Fernet(key)


def encrypt_token(token: str) -> str:
    """Cifra un token del Seller para almacenarlo en la base de datos."""
    return _get_fernet().encrypt(token.encode("utf-8")).decode("utf-8")


def decrypt_token(token_enc: str) -> str:
    """Descifra un token del Seller. Uso exclusivo interno del backend."""
    return _get_fernet().decrypt(token_enc.encode("utf-8")).decode("utf-8")

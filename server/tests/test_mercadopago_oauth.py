"""
Tests de la infraestructura OAuth del Marketplace de Mercado Pago.

Estas pruebas NO requieren una cuenta Seller real: validan la generación de
la URL de autorización, el state firmado (anti-CSRF), el rechazo de
callbacks inválidos y que los tokens nunca aparecen en logs ni se guardan
en texto plano. La vinculación real queda pendiente hasta que exista la
cuenta Seller.
"""

import os
import logging
import unittest
from unittest.mock import patch, MagicMock
from urllib.parse import urlparse, parse_qs

os.environ.setdefault("MP_CLIENT_ID", "test-client-id-123")
os.environ.setdefault("MP_CLIENT_SECRET", "test-client-secret")
os.environ.setdefault(
    "MP_OAUTH_REDIRECT_URI",
    "http://127.0.0.1:8080/api/mercadopago/oauth/callback"
)

from fastapi.testclient import TestClient

import middleware
import main
from main import app
from services.mercado_pago_marketplace_service import (
    MP_OAUTH_STATE_MODE,
    get_mp_oauth_config,
    create_mp_oauth_state,
    verify_mp_oauth_state,
    build_mp_authorization_url,
    encrypt_token,
    decrypt_token,
)


class TestMercadoPagoOAuthService(unittest.TestCase):
    """Tests unitarios del servicio OAuth del Marketplace."""

    def test_config_desde_entorno(self):
        config = get_mp_oauth_config()
        self.assertEqual(config["client_id"], "test-client-id-123")
        self.assertEqual(config["client_secret"], "test-client-secret")
        self.assertEqual(
            config["redirect_uri"],
            "http://127.0.0.1:8080/api/mercadopago/oauth/callback"
        )

    def test_authorization_url_parametros_mp(self):
        """La URL debe usar exactamente los parámetros documentados por MP."""
        url = build_mp_authorization_url(
            state="state-123",
            client_id="test-client-id-123",
            redirect_uri="http://127.0.0.1:8080/api/mercadopago/oauth/callback",
        )
        parsed = urlparse(url)
        self.assertEqual(parsed.scheme, "https")
        self.assertEqual(parsed.netloc, "auth.mercadopago.com")
        self.assertEqual(parsed.path, "/authorization")

        params = parse_qs(parsed.query)
        self.assertEqual(params["client_id"], ["test-client-id-123"])
        self.assertEqual(params["response_type"], ["code"])
        self.assertEqual(params["platform_id"], ["mp"])
        self.assertEqual(params["state"], ["state-123"])
        self.assertEqual(
            params["redirect_uri"],
            ["http://127.0.0.1:8080/api/mercadopago/oauth/callback"]
        )
        # No debe incluir parámetros inventados
        self.assertNotIn("code_challenge", params)
        self.assertNotIn("application_fee", params)

    def test_state_firmado_roundtrip(self):
        """El state se firma y se verifica correctamente."""
        state = create_mp_oauth_state(usuario_id=7)
        payload = verify_mp_oauth_state(state)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["mode"], MP_OAUTH_STATE_MODE)
        self.assertEqual(payload["uid"], 7)
        self.assertTrue(payload.get("nonce"))

    def test_state_invalido_rechazado(self):
        self.assertIsNone(verify_mp_oauth_state("state-inventado"))
        self.assertIsNone(verify_mp_oauth_state(""))
        self.assertIsNone(verify_mp_oauth_state(None))

    def test_state_de_otro_flujo_rechazado(self):
        """Un state firmado para Google OAuth no sirve para el callback de MP."""
        from services.google_auth_service import create_oauth_state
        google_state = create_oauth_state(mode="continue")
        self.assertIsNone(verify_mp_oauth_state(google_state))

    def test_cifrado_tokens(self):
        token = "APP_USR-fake-token-para-test"
        enc = encrypt_token(token)
        self.assertNotEqual(enc, token)
        self.assertNotIn(token, enc)
        self.assertEqual(decrypt_token(enc), token)


class TestMercadoPagoOAuthEndpoints(unittest.TestCase):
    """Tests de los endpoints OAuth usando TestClient (sin DB ni MP real)."""

    @classmethod
    def setUpClass(cls):
        # No se usa context manager para no disparar lifespan (pool de DB)
        cls.client = TestClient(app)
        # require_admin depende de la DB; se sobreescribe con un admin ficticio
        app.dependency_overrides[middleware.require_admin] = lambda: 1

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()

    def test_app_arranca_y_home_responde(self):
        """Test 1/7: el backend arranca y las rutas existentes funcionan."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_authorize_genera_url(self):
        """Test 2: la ruta de inicio OAuth existe y genera la URL correcta."""
        response = self.client.get("/api/mercadopago/oauth/authorize")
        self.assertEqual(response.status_code, 200)
        auth_url = response.json()["auth_url"]

        parsed = urlparse(auth_url)
        self.assertEqual(parsed.netloc, "auth.mercadopago.com")
        params = parse_qs(parsed.query)
        self.assertEqual(params["client_id"], ["test-client-id-123"])
        self.assertEqual(params["response_type"], ["code"])
        self.assertEqual(params["platform_id"], ["mp"])
        self.assertIn("state", params)

    def test_authorize_redirect_uri_coincide(self):
        """Test 3: el redirect_uri de la URL coincide con la configuración."""
        response = self.client.get("/api/mercadopago/oauth/authorize")
        params = parse_qs(urlparse(response.json()["auth_url"]).query)
        self.assertEqual(
            params["redirect_uri"],
            ["http://127.0.0.1:8080/api/mercadopago/oauth/callback"]
        )

    def test_authorize_redirect_opcional(self):
        response = self.client.get(
            "/api/mercadopago/oauth/authorize",
            params={"redirect": "true"},
            follow_redirects=False
        )
        self.assertIn(response.status_code, (302, 303, 307))
        self.assertTrue(
            response.headers["location"].startswith(
                "https://auth.mercadopago.com/authorization"
            )
        )

    def test_callback_rechaza_state_invalido(self):
        """Test 4: el callback rechaza un state inválido."""
        response = self.client.get(
            "/api/mercadopago/oauth/callback",
            params={"code": "TG-fake-code", "state": "state-falso"}
        )
        self.assertEqual(response.status_code, 400)

    def test_callback_sin_code(self):
        """Test 5: el callback maneja correctamente la ausencia de code."""
        state = create_mp_oauth_state(usuario_id=1)
        response = self.client.get(
            "/api/mercadopago/oauth/callback",
            params={"state": state}
        )
        self.assertEqual(response.status_code, 400)

        # Sin ningún parámetro también debe rechazarse
        response = self.client.get("/api/mercadopago/oauth/callback")
        self.assertEqual(response.status_code, 400)

    def test_callback_error_de_mp(self):
        """El callback maneja la cancelación/rechazo de la autorización."""
        response = self.client.get(
            "/api/mercadopago/oauth/callback",
            params={"error": "access_denied"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("cancelada", response.text)

    def test_callback_no_loguea_tokens(self):
        """Test 6: los tokens nunca aparecen en logs ni se guardan en claro."""
        fake_access = "APP_USR-FAKE-ACCESS-TOKEN-TEST"
        fake_refresh = "TG-FAKE-REFRESH-TOKEN-TEST"
        state = create_mp_oauth_state(usuario_id=1)

        repo_mock = MagicMock()
        with patch.object(
            main, "mp_exchange_code_for_tokens",
            return_value={
                "access_token": fake_access,
                "refresh_token": fake_refresh,
                "user_id": 999888777,
                "expires_in": 15552000,
                "scope": "offline_access read write",
                "token_type": "Bearer",
                "live_mode": False,
            }
        ), patch.object(
            main, "MercadoPagoSellerRepository", return_value=repo_mock
        ), self.assertLogs(level=logging.INFO) as logs:
            response = self.client.get(
                "/api/mercadopago/oauth/callback",
                params={"code": "TG-fake-code", "state": state}
            )

        self.assertEqual(response.status_code, 200)
        log_output = "\n".join(logs.output)
        self.assertNotIn(fake_access, log_output)
        self.assertNotIn(fake_refresh, log_output)
        self.assertNotIn("test-client-secret", log_output)
        self.assertNotIn(fake_access, response.text)
        self.assertNotIn(fake_refresh, response.text)

        # El repository recibió los tokens cifrados, nunca en texto plano
        data = repo_mock.upsert_por_mp_user_id.call_args[0][1]
        self.assertNotEqual(data["access_token_enc"], fake_access)
        self.assertNotIn(fake_access, str(data))
        self.assertNotIn(fake_refresh, str(data))
        self.assertEqual(data["estado"], "activa")

    def test_callback_falla_sin_config(self):
        """Si falta la config OAuth, el callback responde 503."""
        state = create_mp_oauth_state(usuario_id=1)
        with patch.dict(os.environ, {"MP_CLIENT_ID": "", "MP_CLIENT_SECRET": ""}):
            response = self.client.get(
                "/api/mercadopago/oauth/callback",
                params={"code": "TG-x", "state": state}
            )
        self.assertEqual(response.status_code, 503)


def _db_available() -> bool:
    """Verifica si la base de datos local está disponible."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        import database
        if database.connection_pool is None and not database.init_db_pool():
            return False
        conn = database.get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        database.release_connection(conn)
        return True
    except Exception:
        return False


def _usuario_existente_id():
    """Devuelve el id de un usuario real para cumplir la FK del vínculo."""
    import database
    if database.connection_pool is None:
        database.init_db_pool()
    conn = database.get_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM usuarios ORDER BY id LIMIT 1")
        row = cur.fetchone()
        cur.close()
        return row[0] if row else None
    finally:
        database.release_connection(conn)


@unittest.skipUnless(_db_available(), "PostgreSQL local no disponible")
class TestMercadoPagoOAuthPersistencia(unittest.TestCase):
    """Caso C: callback con exchange mockeado persiste la autorización.

    Usa la base de datos local real para verificar que el ciclo completo
    code -> tokens -> persistencia -> status funciona. No contacta a
    Mercado Pago ni requiere una cuenta Seller real.
    """

    FAKE_MP_USER_ID = 880000777001  # user_id ficticio, solo para este test

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.admin_uid = _usuario_existente_id()
        if cls.admin_uid is None:
            raise unittest.SkipTest("No hay usuarios en la DB local")
        app.dependency_overrides[middleware.require_admin] = lambda: cls.admin_uid

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        # Limpiar el seller ficticio persistido por el test
        try:
            from repositories.mercadopago_seller_repository import MercadoPagoSellerRepository
            repo = MercadoPagoSellerRepository()
            repo.execute_query(
                "DELETE FROM mercadopago_sellers WHERE mp_user_id = %s",
                (cls.FAKE_MP_USER_ID,), fetch=False
            )
        except Exception:
            pass
        import database
        if database.connection_pool is not None:
            database.close_db_pool()

    def test_callback_persiste_autorizacion(self):
        """Caso C: exchange 200 -> persiste -> status reporta seller_vinculado."""
        state = create_mp_oauth_state(usuario_id=self.admin_uid)
        fake_tokens = {
            "access_token": "APP_USR-TEST-NOT-REAL",
            "refresh_token": "TG-TEST-NOT-REAL",
            "user_id": self.FAKE_MP_USER_ID,
            "expires_in": 15552000,
            "scope": "offline_access read write",
            "token_type": "Bearer",
            "public_key": "APP_USR-test-pk",
            "live_mode": False,
        }

        with patch.object(
            main, "mp_exchange_code_for_tokens", return_value=fake_tokens
        ):
            response = self.client.get(
                "/api/mercadopago/oauth/callback",
                params={"code": "TG-test-code", "state": state}
            )
            self.assertEqual(response.status_code, 200)

            status = self.client.get("/api/mercadopago/oauth/status")
            self.assertEqual(status.status_code, 200)
            body = status.json()
            self.assertTrue(body["seller_vinculado"])
            self.assertEqual(body["mp_user_id"], self.FAKE_MP_USER_ID)
            self.assertEqual(body["estado"], "activa")

        # Los tokens no deben quedar en texto plano en la DB
        from repositories.mercadopago_seller_repository import MercadoPagoSellerRepository
        repo = MercadoPagoSellerRepository()
        row = repo.find_by_mp_user_id(self.FAKE_MP_USER_ID)
        self.assertNotEqual(row["access_token_enc"], fake_tokens["access_token"])
        self.assertNotEqual(row["refresh_token_enc"], fake_tokens["refresh_token"])
        self.assertNotIn("APP_USR-TEST-NOT-REAL", row["access_token_enc"])


if __name__ == "__main__":
    unittest.main()

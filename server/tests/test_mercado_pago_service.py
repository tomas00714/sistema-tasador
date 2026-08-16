import os
import unittest
from unittest.mock import patch, MagicMock
from urllib.error import HTTPError, URLError

# Asegurar que MP_ACCESS_TOKEN no esté configurado para probar el error
if "MP_ACCESS_TOKEN" in os.environ:
    del os.environ["MP_ACCESS_TOKEN"]

from services.mercado_pago_service import MercadoPagoService


class TestMercadoPagoService(unittest.TestCase):
    """Tests unitarios para MercadoPagoService."""

    def setUp(self):
        """Configuración inicial para cada test."""
        # Asegurar que no haya token configurado por defecto
        if "MP_ACCESS_TOKEN" in os.environ:
            del os.environ["MP_ACCESS_TOKEN"]

    def test_falla_sin_access_token(self):
        """El servicio debe fallar claramente si falta MP_ACCESS_TOKEN."""
        service = MercadoPagoService()

        with self.assertRaises(ValueError) as context:
            service.crear_suscripcion_mp(
                payer_email="test@example.com",
                card_token_id="card_123",
                external_reference="REF-123",
                back_url="https://example.com/back",
                monto=10.0
            )

        self.assertIn("MP_ACCESS_TOKEN no está configurado", str(context.exception))

    def test_falta_access_token_obtener_suscripcion(self):
        """obtener_suscripcion_mp debe fallar sin MP_ACCESS_TOKEN."""
        service = MercadoPagoService()

        with self.assertRaises(ValueError) as context:
            service.obtener_suscripcion_mp("preapproval_123")

        self.assertIn("MP_ACCESS_TOKEN no está configurado", str(context.exception))

    def test_falta_access_token_cancelar_suscripcion(self):
        """cancelar_suscripcion_mp debe fallar sin MP_ACCESS_TOKEN."""
        service = MercadoPagoService()

        with self.assertRaises(ValueError) as context:
            service.cancelar_suscripcion_mp("preapproval_123")

        self.assertIn("MP_ACCESS_TOKEN no está configurado", str(context.exception))

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    def test_con_access_token_construye_headers(self):
        """Con MP_ACCESS_TOKEN, se construyen headers correctamente."""
        service = MercadoPagoService()
        headers = service._get_headers()

        self.assertEqual(headers["Authorization"], "Bearer test_token_123")
        self.assertEqual(headers["Content-Type"], "application/json")
        self.assertEqual(headers["Accept"], "application/json")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_respuesta_exitosa_crear_suscripcion(self, mock_urlopen):
        """Maneja correctamente una respuesta exitosa de Mercado Pago."""
        # Mock response
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"id": "preapproval_123", "status": "pending"}'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        service = MercadoPagoService()

        result = service.crear_suscripcion_mp(
            payer_email="test@example.com",
            card_token_id="card_123",
            external_reference="REF-123",
            back_url="https://example.com/back",
            monto=10.0
        )

        self.assertEqual(result["id"], "preapproval_123")
        self.assertEqual(result["status"], "pending")

        # Verificar que se llamó urlopen con los parámetros correctos
        call_args = mock_urlopen.call_args
        self.assertIn("Authorization", call_args[0][0].headers)
        self.assertEqual(call_args[0][0].headers["Authorization"], "Bearer test_token_123")
        self.assertEqual(call_args[0][0].method, "POST")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_maneja_error_http_mercado_pago(self, mock_urlopen):
        """Maneja correctamente un error HTTP de Mercado Pago."""
        # Mock HTTPError
        error_response = MagicMock()
        error_response.read.return_value = b'{"error": "invalid_card"}'
        http_error = HTTPError(
            url="https://api.mercadopago.com/preapproval",
            code=400,
            msg="Bad Request",
            hdrs={},
            fp=error_response
        )
        mock_urlopen.side_effect = http_error

        service = MercadoPagoService()

        with self.assertRaises(HTTPError):
            service.crear_suscripcion_mp(
                payer_email="test@example.com",
                card_token_id="card_123",
                external_reference="REF-123",
                back_url="https://example.com/back",
                monto=10.0
            )

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_maneja_error_de_conexion(self, mock_urlopen):
        """Maneja correctamente un error de conexión."""
        mock_urlopen.side_effect = URLError("Connection refused")

        service = MercadoPagoService()

        with self.assertRaises(URLError):
            service.crear_suscripcion_mp(
                payer_email="test@example.com",
                card_token_id="card_123",
                external_reference="REF-123",
                back_url="https://example.com/back",
                monto=10.0
            )

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_obtener_suscripcion_mp_exitoso(self, mock_urlopen):
        """obtener_suscripcion_mp maneja respuesta exitosa."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"id": "preapproval_123", "status": "authorized"}'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        service = MercadoPagoService()
        result = service.obtener_suscripcion_mp("preapproval_123")

        self.assertEqual(result["id"], "preapproval_123")
        self.assertEqual(result["status"], "authorized")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_cancelar_suscripcion_mp_exitoso(self, mock_urlopen):
        """cancelar_suscripcion_mp maneja respuesta exitosa."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"id": "preapproval_123", "status": "canceled"}'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        service = MercadoPagoService()
        result = service.cancelar_suscripcion_mp("preapproval_123")

        self.assertEqual(result["id"], "preapproval_123")
        self.assertEqual(result["status"], "canceled")

    def test_valida_datos_requeridos_crear_suscripcion(self):
        """Valida que falten datos requeridos antes de llamar a MP."""
        with patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"}):
            service = MercadoPagoService()

            with self.assertRaises(ValueError) as context:
                service.crear_suscripcion_mp(
                    payer_email="",  # Vacío
                    card_token_id="card_123",
                    external_reference="REF-123",
                    back_url="https://example.com/back",
                    monto=10.0
                )

            self.assertIn("Faltan datos requeridos", str(context.exception))

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_no_loguea_token_en_request(self, mock_urlopen):
        """Verifica que el token no se loguea en la request."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"id": "preapproval_123"}'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        service = MercadoPagoService()

        # Capturar logs
        import logging
        with self.assertLogs('services.mercado_pago_service', level='INFO') as log:
            service.crear_suscripcion_mp(
                payer_email="test@example.com",
                card_token_id="card_123",
                external_reference="REF-123",
                back_url="https://example.com/back",
                monto=10.0
            )

        # Verificar que el token no aparece en los logs
        log_output = ' '.join(log.output)
        self.assertNotIn("test_token_123", log_output)

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123"})
    @patch("services.mercado_pago_service.urlopen")
    def test_no_loguea_card_token_id(self, mock_urlopen):
        """Verifica que card_token_id no se loguea."""
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"id": "preapproval_123"}'
        mock_response.__enter__ = MagicMock(return_value=mock_response)
        mock_response.__exit__ = MagicMock(return_value=False)
        mock_urlopen.return_value = mock_response

        service = MercadoPagoService()

        with self.assertLogs('services.mercado_pago_service', level='INFO') as log:
            service.crear_suscripcion_mp(
                payer_email="test@example.com",
                card_token_id="card_123",
                external_reference="REF-123",
                back_url="https://example.com/back",
                monto=10.0
            )

        log_output = ' '.join(log.output)
        self.assertNotIn("card_123", log_output)

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123", "MP_ENVIRONMENT": "production"})
    def test_usa_url_base_produccion(self):
        """Usa URL base correcta según entorno."""
        service = MercadoPagoService()
        self.assertEqual(service.base_url, "https://api.mercadopago.com")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token_123", "MP_ENVIRONMENT": "sandbox"})
    def test_usa_url_base_sandbox(self):
        """Usa URL base correcta en sandbox."""
        service = MercadoPagoService()
        self.assertEqual(service.base_url, "https://api.mercadopago.com")


class TestMercadoPagoServiceIntegration(unittest.TestCase):
    """Tests que requieren configuración real de Mercado Pago.

    Estos tests están pensados para ejecutarse manualmente contra sandbox
    cuando se tengan credenciales reales configuradas.
    """

    def setUp(self):
        """Verifica si hay credenciales configuradas."""
        self.has_credentials = bool(os.getenv("MP_ACCESS_TOKEN"))

    @unittest.skipIf(not os.getenv("MP_ACCESS_TOKEN"), "Requiere MP_ACCESS_TOKEN configurado")
    def test_creacion_real_sandbox(self):
        """Test real contra sandbox de Mercado Pago.

        NOTA: Este test requiere:
        1. MP_ACCESS_TOKEN configurado en .env
        2. Un card_token_id válido de sandbox
        3. Ejecución manual

        Se marca como skip por defecto.
        """
        # Este test está diseñado para ejecutarse manualmente
        # cuando se quiera probar la integración real
        self.skipTest("Test manual contra sandbox - requiere configuración")


if __name__ == "__main__":
    unittest.main()

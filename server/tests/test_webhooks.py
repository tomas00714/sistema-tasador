import os
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Asegurar que MP_WEBHOOK_SECRET no esté configurado por defecto
if "MP_WEBHOOK_SECRET" in os.environ:
    del os.environ["MP_WEBHOOK_SECRET"]

from utils.webhook_validator import validate_webhook_signature
from services.suscripcion_service import SuscripcionService
from services.mercado_pago_service import MercadoPagoService
from repositories.suscripcion_repository import SuscripcionRepository
from repositories.pago_repository import PagoRepository


class TestWebhookValidator(unittest.TestCase):
    """Tests para validación de firmas de webhooks."""

    def setUp(self):
        """Configuración inicial."""
        if "MP_WEBHOOK_SECRET" in os.environ:
            del os.environ["MP_WEBHOOK_SECRET"]

    def test_falla_sin_secret(self):
        """Debe fallar si MP_WEBHOOK_SECRET no está configurado."""
        result = validate_webhook_signature(
            x_signature="ts:1234567890;v1:abc123",
            x_request_id="req-123",
            data_id="data-123"
        )
        self.assertFalse(result)

    @patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test_secret"})
    def test_falla_sin_x_signature(self):
        """Debe fallar si x_signature está ausente."""
        result = validate_webhook_signature(
            x_signature=None,
            x_request_id="req-123",
            data_id="data-123"
        )
        self.assertFalse(result)

    @patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test_secret"})
    def test_falla_con_x_signature_mal_formado(self):
        """Debe fallar si x_signature no tiene formato correcto."""
        result = validate_webhook_signature(
            x_signature="invalid_format",
            x_request_id="req-123",
            data_id="data-123"
        )
        self.assertFalse(result)

    @patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test_secret"})
    def test_falta_ts_o_v1(self):
        """Debe fallar si falta ts o v1 en x-signature."""
        result = validate_webhook_signature(
            x_signature="ts:1234567890",
            x_request_id="req-123",
            data_id="data-123"
        )
        self.assertFalse(result)

    @patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test_secret"})
    def test_firma_invalida(self):
        """Debe rechazar firma inválida."""
        result = validate_webhook_signature(
            x_signature="ts:1234567890;v1:wrong_signature",
            x_request_id="req-123",
            data_id="data-123"
        )
        self.assertFalse(result)

    @patch.dict(os.environ, {"MP_WEBHOOK_SECRET": "test_secret"})
    def test_firma_valida(self):
        """Debe aceptar firma válida."""
        import hmac
        import hashlib

        # Generar firma válida
        ts = "1234567890"
        manifest = f"id:data-123;request-id:req-123;ts:{ts}"
        hmac_obj = hmac.new(
            b"test_secret",
            manifest.encode("utf-8"),
            hashlib.sha256
        )
        v1 = hmac_obj.hexdigest()
        x_signature = f"ts:{ts};v1:{v1}"

        result = validate_webhook_signature(
            x_signature=x_signature,
            x_request_id="req-123",
            data_id="data-123"
        )
        self.assertTrue(result)


class TestProcesamientoPreapproval(unittest.TestCase):
    """Tests para procesamiento de subscription_preapproval."""

    def setUp(self):
        """Configuración inicial."""
        self.suscripcion_service = SuscripcionService()
        self.mp_service = MercadoPagoService()

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(MercadoPagoService, 'obtener_suscripcion_mp')
    @patch.object(SuscripcionService, 'cancelar_por_mp')
    def test_procesa_canceled(self, mock_cancelar, mock_obtener):
        """Debe procesar estado canceled correctamente."""
        mock_obtener.return_value = {"status": "canceled"}
        mock_cancelar.return_value = {"id": 1, "estado": "cancelada"}

        # Importar la función privada desde main
        from main import _procesar_preapproval

        result = _procesar_preapproval("preapproval_123", self.mp_service, self.suscripcion_service)

        mock_cancelar.assert_called_once_with("preapproval_123")
        self.assertEqual(result["status"], "processed")
        self.assertEqual(result["preapproval_status"], "canceled")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(MercadoPagoService, 'obtener_suscripcion_mp')
    @patch.object(SuscripcionService, 'cancelar_por_mp')
    def test_procesa_paused(self, mock_cancelar, mock_obtener):
        """Debe procesar estado paused como cancelada."""
        mock_obtener.return_value = {"status": "paused"}
        mock_cancelar.return_value = {"id": 1, "estado": "cancelada"}

        from main import _procesar_preapproval

        result = _procesar_preapproval("preapproval_123", self.mp_service, self.suscripcion_service)

        mock_cancelar.assert_called_once_with("preapproval_123")
        self.assertEqual(result["status"], "processed")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(MercadoPagoService, 'obtener_suscripcion_mp')
    def test_procesa_authorized(self, mock_obtener):
        """Debe procesar authorized sin activar (espera pago)."""
        mock_obtener.return_value = {"status": "authorized"}

        from main import _procesar_preapproval

        result = _procesar_preapproval("preapproval_123", self.mp_service, self.suscripcion_service)

        self.assertEqual(result["status"], "processed")
        self.assertEqual(result["preapproval_status"], "authorized")


class TestProcesamientoAuthorizedPayment(unittest.TestCase):
    """Tests para procesamiento de subscription_authorized_payment."""

    def setUp(self):
        """Configuración inicial."""
        self.suscripcion_service = SuscripcionService()
        self.mp_service = MercadoPagoService()
        self.pago_repo = PagoRepository()

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(PagoRepository, 'find_by_mp_authorized_payment_id')
    def test_idempotencia_pago_duplicado(self, mock_find):
        """No debe procesar el mismo pago dos veces."""
        mock_find.return_value = {"id": 1, "mp_authorized_payment_id": "auth_123"}

        from main import _procesar_authorized_payment

        result = _procesar_authorized_payment(
            "auth_123",
            self.mp_service,
            self.suscripcion_service,
            self.pago_repo
        )

        self.assertEqual(result["status"], "already_processed")
        mock_find.assert_called_once_with("auth_123")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(PagoRepository, 'find_by_mp_authorized_payment_id')
    @patch.object(MercadoPagoService, 'obtener_authorized_payment')
    @patch.object(SuscripcionRepository, 'find_by_mp_preapproval_id')
    def test_pago_aprobado_pending(self, mock_find_sus, mock_obtener_pago, mock_find_pago):
        """Debe activar suscripción pending con pago aprobado."""
        mock_find_pago.return_value = None  # No existe
        mock_obtener_pago.return_value = {
            "status": "approved",
            "status_detail": "accredited",
            "payment_id": "pay_123",
            "preapproval_id": "preapproval_123",
            "transaction_amount": 10.0,
            "currency_id": "USD",
            "date_approved": "2024-01-01T00:00:00Z"
        }
        mock_find_sus.return_value = {
            "id": 1,
            "estado": "pending",
            "fecha_fin_periodo": None
        }

        with patch.object(SuscripcionService, 'registrar_pago_aprobado') as mock_registrar, \
             patch.object(SuscripcionService, 'activar_suscripcion') as mock_activar:

            from main import _procesar_authorized_payment

            result = _procesar_authorized_payment(
                "auth_123",
                self.mp_service,
                self.suscripcion_service,
                self.pago_repo
            )

            mock_registrar.assert_called_once()
            mock_activar.assert_called_once()
            self.assertEqual(result["status"], "processed")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(PagoRepository, 'find_by_mp_authorized_payment_id')
    @patch.object(MercadoPagoService, 'obtener_authorized_payment')
    @patch.object(SuscripcionRepository, 'find_by_mp_preapproval_id')
    def test_pago_aprobado_renovacion(self, mock_find_sus, mock_obtener_pago, mock_find_pago):
        """Debe extender período para suscripción activa."""
        mock_find_pago.return_value = None
        mock_obtener_pago.return_value = {
            "status": "approved",
            "status_detail": "accredited",
            "payment_id": "pay_123",
            "preapproval_id": "preapproval_123",
            "transaction_amount": 10.0,
            "currency_id": "USD",
            "date_approved": "2024-02-01T00:00:00Z"
        }
        mock_find_sus.return_value = {
            "id": 1,
            "estado": "activa",
            "fecha_fin_periodo": datetime(2024, 2, 1)
        }

        with patch.object(SuscripcionService, 'registrar_pago_aprobado') as mock_registrar, \
             patch.object(SuscripcionService, 'extender_periodo') as mock_extender:

            from main import _procesar_authorized_payment

            result = _procesar_authorized_payment(
                "auth_123",
                self.mp_service,
                self.suscripcion_service,
                self.pago_repo
            )

            mock_registrar.assert_called_once()
            mock_extender.assert_called_once()
            self.assertEqual(result["status"], "processed")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(PagoRepository, 'find_by_mp_authorized_payment_id')
    @patch.object(MercadoPagoService, 'obtener_authorized_payment')
    @patch.object(SuscripcionRepository, 'find_by_mp_preapproval_id')
    def test_pago_rechazado(self, mock_find_sus, mock_obtener_pago, mock_find_pago):
        """Debe registrar rechazo sin extender período."""
        mock_find_pago.return_value = None
        mock_obtener_pago.return_value = {
            "status": "rejected",
            "status_detail": "insufficient_funds",
            "payment_id": "pay_123",
            "preapproval_id": "preapproval_123",
            "transaction_amount": 10.0,
            "currency_id": "USD"
        }
        mock_find_sus.return_value = {"id": 1, "estado": "activa"}

        with patch.object(SuscripcionService, 'registrar_rechazo') as mock_rechazo:

            from main import _procesar_authorized_payment

            result = _procesar_authorized_payment(
                "auth_123",
                self.mp_service,
                self.suscripcion_service,
                self.pago_repo
            )

            mock_rechazo.assert_called_once()
            self.assertEqual(result["status"], "processed")

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(PagoRepository, 'find_by_mp_authorized_payment_id')
    @patch.object(MercadoPagoService, 'obtener_authorized_payment')
    @patch.object(SuscripcionRepository, 'find_by_mp_preapproval_id')
    @patch.object(SuscripcionRepository, 'update')
    def test_pago_reembolsado(self, mock_update, mock_find_sus, mock_obtener_pago, mock_find_pago):
        """Debe registrar reembolso."""
        mock_find_pago.return_value = None
        mock_obtener_pago.return_value = {
            "status": "refunded",
            "payment_id": "pay_123",
            "preapproval_id": "preapproval_123",
            "transaction_amount": 10.0,
            "currency_id": "USD"
        }
        mock_find_sus.return_value = {"id": 1, "estado": "activa"}

        with patch.object(PagoRepository, 'create') as mock_create:
            mock_create.return_value = {"id": 1}

            from main import _procesar_authorized_payment

            result = _procesar_authorized_payment(
                "auth_123",
                self.mp_service,
                self.suscripcion_service,
                self.pago_repo
            )

            mock_create.assert_called_once()
            self.assertEqual(result["status"], "processed")


class TestActivacionRenovacion(unittest.TestCase):
    """Tests para activación y renovación de suscripciones."""

    def setUp(self):
        """Configuración inicial."""
        self.suscripcion_service = SuscripcionService()

    @patch.object(SuscripcionRepository, 'find_by_id')
    @patch.object(SuscripcionRepository, 'update')
    def test_activar_suscripcion_pending(self, mock_update, mock_find):
        """Debe activar suscripción pending correctamente."""
        mock_find.return_value = {"id": 1, "estado": "pending"}
        mock_update.return_value = {"id": 1, "estado": "activa"}

        result = self.suscripcion_service.activar_suscripcion(
            suscripcion_id=1,
            fecha_inicio=datetime(2024, 1, 1),
            fecha_fin_periodo=datetime(2024, 2, 1),
            mp_pago_id="auth_123",
            mp_pago_estado="approved",
            mp_pago_fecha=datetime(2024, 1, 1)
        )

        mock_update.assert_called_once()
        self.assertIn("estado", mock_update.call_args[0][1])
        self.assertEqual(mock_update.call_args[0][1]["estado"], "activa")

    @patch.object(SuscripcionRepository, 'find_by_id')
    @patch.object(SuscripcionRepository, 'update')
    def test_extender_periodo(self, mock_update, mock_find):
        """Debe extender período correctamente."""
        mock_find.return_value = {"id": 1, "estado": "activa"}
        mock_update.return_value = {"id": 1, "fecha_fin_periodo": datetime(2024, 3, 1)}

        result = self.suscripcion_service.extender_periodo(
            suscripcion_id=1,
            fecha_fin_nueva=datetime(2024, 3, 1),
            mp_pago_id="auth_456",
            mp_pago_estado="approved",
            mp_pago_fecha=datetime(2024, 2, 1)
        )

        mock_update.assert_called_once()
        self.assertIn("fecha_fin_periodo", mock_update.call_args[0][1])


class TestIdempotencia(unittest.TestCase):
    """Tests para idempotencia de webhooks."""

    @patch.dict(os.environ, {"MP_ACCESS_TOKEN": "test_token"})
    @patch.object(PagoRepository, 'find_by_mp_authorized_payment_id')
    @patch.object(MercadoPagoService, 'obtener_authorized_payment')
    @patch.object(SuscripcionRepository, 'find_by_mp_preapproval_id')
    def test_webhook_duplicado_no_duplica_pago(self, mock_find_sus, mock_obtener_pago, mock_find_pago):
        """Procesar mismo webhook dos veces no debe duplicar pago."""
        # Primera llamada: pago no existe
        mock_find_pago.return_value = None
        mock_obtener_pago.return_value = {
            "status": "approved",
            "payment_id": "pay_123",
            "preapproval_id": "preapproval_123",
            "transaction_amount": 10.0,
            "currency_id": "USD",
            "date_approved": "2024-01-01T00:00:00Z"
        }
        mock_find_sus.return_value = {"id": 1, "estado": "pending"}

        with patch.object(SuscripcionService, 'registrar_pago_aprobado') as mock_registrar, \
             patch.object(SuscripcionService, 'activar_suscripcion') as mock_activar:

            from main import _procesar_authorized_payment

            # Primera llamada
            result1 = _procesar_authorized_payment(
                "auth_123",
                MercadoPagoService(),
                SuscripcionService(),
                PagoRepository()
            )

            # Segunda llamada: pago ya existe
            mock_find_pago.return_value = {"id": 1, "mp_authorized_payment_id": "auth_123"}
            result2 = _procesar_authorized_payment(
                "auth_123",
                MercadoPagoService(),
                SuscripcionService(),
                PagoRepository()
            )

            # Primera llamada procesa, segunda ignora
            self.assertEqual(result1["status"], "processed")
            self.assertEqual(result2["status"], "already_processed")

            # Solo se debe haber llamado una vez
            self.assertEqual(mock_registrar.call_count, 1)
            self.assertEqual(mock_activar.call_count, 1)


if __name__ == "__main__":
    unittest.main()

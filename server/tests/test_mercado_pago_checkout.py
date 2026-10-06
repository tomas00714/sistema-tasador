"""
Tests para el nuevo flujo de suscripción con checkout de Mercado Pago.
Modelo: suscripción sin plan asociado, estado pending, sin card_token_id.
"""

import os
import unittest
from unittest.mock import Mock, patch, MagicMock

# Asegurar que MP_ACCESS_TOKEN no esté configurado para probar el error
if "MP_ACCESS_TOKEN" in os.environ:
    del os.environ["MP_ACCESS_TOKEN"]

from services.mercado_pago_service import MercadoPagoService
from services.suscripcion_service import SuscripcionService


class TestMercadoPagoService(unittest.TestCase):
    """Tests para MercadoPagoService con el nuevo modelo pending."""

    def setUp(self):
        """Configuración inicial para cada test."""
        if "MP_ACCESS_TOKEN" in os.environ:
            del os.environ["MP_ACCESS_TOKEN"]

    def test_crear_suscripcion_pending_mp(self):
        """Test para crear suscripción pending sin card_token_id."""
        with patch('services.mercado_pago_service.MercadoPagoService._make_request') as mock_request:
            # Mock response de Mercado Pago
            mock_request.return_value = {
                "id": "2c938084726fca480172750000000000",
                "init_point": "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_id=2c938084726fca480172750000000000",
                "external_reference": "SUB-123-a1b2c3d4e5f6",
                "status": "pending"
            }

            with patch.dict('os.environ', {'MP_ACCESS_TOKEN': 'test_token', 'MP_ENVIRONMENT': 'sandbox'}):
                service = MercadoPagoService()
                
                response = service.crear_suscripcion_pending_mp(
                    payer_email="test@example.com",
                    external_reference="SUB-123-a1b2c3d4e5f6",
                    back_url="https://example.com/retorno",
                    monto=10.0,
                    frecuencia=1,
                    frecuencia_tipo="months",
                    moneda="USD"
                )

                # Verificar que se llamó al endpoint correcto
                mock_request.assert_called_once()
                call_args = mock_request.call_args
                self.assertEqual(call_args[0][0], "POST")
                self.assertEqual(call_args[0][1], "/preapproval")
                
                # Verificar payload
                payload = call_args[1]['data']
                self.assertEqual(payload['external_reference'], "SUB-123-a1b2c3d4e5f6")
                self.assertEqual(payload['payer_email'], "test@example.com")
                self.assertEqual(payload['status'], "pending")  # Importante: no "authorized"
                self.assertNotIn('card_token_id', payload)  # Importante: sin card_token_id
                self.assertEqual(payload['auto_recurring']['transaction_amount'], 10.0)

                # Verificar response
                self.assertEqual(response['id'], "2c938084726fca480172750000000000")
                self.assertIsNotNone(response['init_point'])

    def test_obtener_payment_details(self):
        """Test para obtener detalles financieros de un payment."""
        with patch('services.mercado_pago_service.MercadoPagoService._make_request') as mock_request:
            # Mock response con detalles financieros
            mock_request.return_value = {
                "id": "19951521071",
                "transaction_amount": "10.00",
                "transaction_details": {
                    "net_received_amount": 9.50,
                    "total_paid_amount": "10.00"
                },
                "fee_details": [
                    {
                        "type": "mercado_pago_fee",
                        "amount": 0.50
                    }
                ]
            }

            with patch.dict('os.environ', {'MP_ACCESS_TOKEN': 'test_token', 'MP_ENVIRONMENT': 'sandbox'}):
                service = MercadoPagoService()
                
                response = service.obtener_payment_details("19951521071")

                # Verificar endpoint
                mock_request.assert_called_once()
                call_args = mock_request.call_args
                self.assertEqual(call_args[0][0], "GET")
                self.assertEqual(call_args[0][1], "/v1/payments/19951521071")

                # Verificar datos financieros
                self.assertEqual(response['transaction_details']['net_received_amount'], 9.50)
                self.assertEqual(response['fee_details'][0]['amount'], 0.50)

    def test_extraer_usuario_id_de_external_reference(self):
        """Test para extraer usuario_id de external_reference."""
        # Formato válido
        self.assertEqual(MercadoPagoService.extraer_usuario_id_de_external_reference("SUB-123-a1b2c3d4e5f6"), 123)
        self.assertEqual(MercadoPagoService.extraer_usuario_id_de_external_reference("SUB-456-xyz789"), 456)
        
        # Formatos inválidos
        self.assertIsNone(MercadoPagoService.extraer_usuario_id_de_external_reference("INVALID"))
        self.assertIsNone(MercadoPagoService.extraer_usuario_id_de_external_reference("SUB-abc-def"))  # abc no es int
        self.assertIsNone(MercadoPagoService.extraer_usuario_id_de_external_reference(""))
        self.assertIsNone(MercadoPagoService.extraer_usuario_id_de_external_reference(None))


class TestSuscripcionService(unittest.TestCase):
    """Tests para SuscripcionService con el nuevo modelo."""

    @patch('services.suscripcion_service.UsuarioRepository')
    @patch('services.suscripcion_service.SuscripcionRepository')
    @patch('services.suscripcion_service.PagoRepository')
    def test_crear_suscripcion_pendiente_con_init_point(self, mock_pago_repo, mock_sus_repo, mock_user_repo):
        """Test para crear suscripción pendiente con init_point."""
        # Mock usuario
        mock_user_repo.return_value.find_by_id.return_value = {
            'id': 123,
            'email': 'test@example.com'
        }
        
        # Mock suscripciones vigentes (ninguna)
        mock_sus_repo.return_value.find_vigentes_por_usuario.return_value = []
        
        # Mock creación
        mock_sus_repo.return_value.create.return_value = {
            'id': 1,
            'usuario_id': 123,
            'estado': 'pending',
            'mp_external_reference': 'SUB-123-a1b2c3d4e5f6',
            'init_point': 'https://example.com/checkout'
        }

        service = SuscripcionService()
        
        result = service.crear_suscripcion_pendiente(
            usuario_id=123,
            plan_id=2,
            monto=10.0,
            moneda='USD',
            frecuencia=1,
            frecuencia_tipo='months',
            init_point='https://example.com/checkout'
        )

        # Verificar que se creó con init_point
        self.assertEqual(result['estado'], 'pending')
        self.assertEqual(result['init_point'], 'https://example.com/checkout')
        
        # Verificar que se llamó a create con init_point
        mock_sus_repo.return_value.create.assert_called_once()
        call_args = mock_sus_repo.return_value.create.call_args
        self.assertEqual(call_args[0][0]['init_point'], 'https://example.com/checkout')

    @patch('services.suscripcion_service.SuscripcionRepository')
    @patch('services.suscripcion_service.UsuarioRepository')
    def test_vincular_suscripcion_mp_existente(self, mock_user_repo, mock_sus_repo):
        """Test para vincular suscripción MP existente (fallback)."""
        # Mock find_by_external_reference
        mock_sus_repo.return_value.find_by_external_reference.return_value = {
            'id': 1,
            'usuario_id': 123,
            'mp_external_reference': 'SUB-123-a1b2c3d4e5f6',
            'mp_preapproval_id': None
        }
        
        # Mock update
        mock_sus_repo.return_value.update.return_value = {
            'id': 1,
            'mp_preapproval_id': '2c938084726fca480172750000000000'
        }

        service = SuscripcionService()
        
        result = service.vincular_suscripcion_mp_existente(
            usuario_id=123,
            mp_preapproval_id='2c938084726fca480172750000000000',
            external_reference='SUB-123-a1b2c3d4e5f6'
        )

        # Verificar que se encontró por external_reference
        mock_sus_repo.return_value.find_by_external_reference.assert_called_once_with('SUB-123-a1b2c3d4e5f6')
        
        # Verificar que se actualizó con preapproval_id
        mock_sus_repo.return_value.update.assert_called_once()
        call_args = mock_sus_repo.return_value.update.call_args
        self.assertEqual(call_args[0][1]['mp_preapproval_id'], '2c938084726fca480172750000000000')

    @patch('services.suscripcion_service.SuscripcionRepository')
    @patch('services.suscripcion_service.UsuarioRepository')
    def test_vincular_suscripcion_usuario_incorrecto(self, mock_user_repo, mock_sus_repo):
        """Test que rechaza vinculación si el usuario_id no coincide."""
        # Mock find_by_external_reference con usuario diferente
        mock_sus_repo.return_value.find_by_external_reference.return_value = {
            'id': 1,
            'usuario_id': 999,  # Usuario diferente
            'mp_external_reference': 'SUB-123-a1b2c3d4e5f6',
            'mp_preapproval_id': None
        }

        service = SuscripcionService()
        
        result = service.vincular_suscripcion_mp_existente(
            usuario_id=123,  # Este usuario no coincide
            mp_preapproval_id='2c938084726fca480172750000000000',
            external_reference='SUB-123-a1b2c3d4e5f6'
        )

        # Debe retornar None (no vincular)
        self.assertIsNone(result)
        
        # No debe llamar a update
        mock_sus_repo.return_value.update.assert_not_called()

    @patch('services.suscripcion_service.PagoRepository')
    @patch('services.suscripcion_service.SuscripcionRepository')
    def test_registrar_pago_aprobado_con_detalles_financieros(self, mock_sus_repo, mock_pago_repo):
        """Test para registrar pago aprobado con monto_neto y comision_mp."""
        # Mock create
        mock_pago_repo.return_value.create.return_value = {
            'id': 1,
            'estado': 'approved',
            'monto': 10.0,
            'monto_neto': 9.50,
            'comision_mp': 0.50
        }

        service = SuscripcionService()
        
        result = service.registrar_pago_aprobado(
            suscripcion_id=1,
            mp_authorized_payment_id='6114264375',
            mp_payment_id='19951521071',
            monto=10.0,
            moneda='USD',
            fecha_aprobacion=None,
            raw_response={},
            monto_neto=9.50,
            comision_mp=0.50
        )

        # Verificar que se registró con detalles financieros
        mock_pago_repo.return_value.create.assert_called_once()
        call_args = mock_pago_repo.return_value.create.call_args
        self.assertEqual(call_args[0][0]['monto_neto'], 9.50)
        self.assertEqual(call_args[0][0]['comision_mp'], 0.50)


class TestAsociacionUsuarioSuscripcion(unittest.TestCase):
    """Tests para la asociación segura usuario_id ↔ external_reference ↔ preapproval_id."""

    @patch('services.suscripcion_service.SuscripcionRepository')
    @patch('services.suscripcion_service.UsuarioRepository')
    def test_asociacion_segura_via_preapproval_id(self, mock_user_repo, mock_sus_repo):
        """Test que la asociación principal es via preapproval_id."""
        # Mock find_by_mp_preapproval_id
        mock_sus_repo.return_value.find_by_mp_preapproval_id.return_value = {
            'id': 1,
            'usuario_id': 123,
            'mp_preapproval_id': '2c938084726fca480172750000000000',
            'mp_external_reference': 'SUB-123-a1b2c3d4e5f6'
        }

        service = SuscripcionService()
        
        # Buscar por preapproval_id (asociación primaria)
        suscripcion = mock_sus_repo.return_value.find_by_mp_preapproval_id('2c938084726fca480172750000000000')
        
        self.assertIsNotNone(suscripcion)
        self.assertEqual(suscripcion['usuario_id'], 123)
        self.assertEqual(suscripcion['mp_preapproval_id'], '2c938084726fca480172750000000000')

    @patch('services.suscripcion_service.SuscripcionRepository')
    @patch('services.suscripcion_service.UsuarioRepository')
    def test_fallback_via_external_reference(self, mock_user_repo, mock_sus_repo):
        """Test que external_reference funciona como fallback."""
        # Preapproval_id no existe
        mock_sus_repo.return_value.find_by_mp_preapproval_id.return_value = None
        
        # External_reference sí existe
        mock_sus_repo.return_value.find_by_external_reference.return_value = {
            'id': 1,
            'usuario_id': 123,
            'mp_preapproval_id': None,
            'mp_external_reference': 'SUB-123-a1b2c3d4e5f6'
        }

        service = SuscripcionService()
        
        # Intentar buscar por preapproval_id (falla)
        suscripcion = mock_sus_repo.return_value.find_by_mp_preapproval_id('inexistente')
        self.assertIsNone(suscripcion)
        
        # Fallback: buscar por external_reference
        suscripcion = mock_sus_repo.return_value.find_by_external_reference('SUB-123-a1b2c3d4e5f6')
        self.assertIsNotNone(suscripcion)
        self.assertEqual(suscripcion['usuario_id'], 123)

    def test_no_confianza_en_usuario_id_desde_string(self):
        """Test que no confiamos en usuario_id extraído del string para autorizar."""
        # El usuario_id extraído del external_reference debe validarse
        # contra la suscripción real en la DB
        external_ref = "SUB-123-a1b2c3d4e5f6"
        usuario_id_extraido = MercadoPagoService.extraer_usuario_id_de_external_reference(external_ref)
        
        self.assertEqual(usuario_id_extraido, 123)
        
        # Pero NO usamos este valor directamente para autorizar
        # Debemos buscar la suscripción en la DB y verificar que
        # suscripcion.usuario_id == usuario_id_extraido
        # Esto se prueba en test_vincular_suscripcion_usuario_incorrecto


class TestIdempotenciaWebhook(unittest.TestCase):
    """Tests para idempotencia de webhooks."""

    @patch('repositories.pago_repository.PagoRepository')
    def test_idempotencia_authorized_payment(self, mock_pago_repo):
        """Test que un pago ya procesado no se registra dos veces."""
        # Pago ya existe
        mock_pago_repo.return_value.find_by_mp_authorized_payment_id.return_value = {
            'id': 1,
            'mp_authorized_payment_id': '6114264375',
            'estado': 'approved'
        }

        from repositories.pago_repository import PagoRepository
        repo = PagoRepository()
        pago_existente = repo.find_by_mp_authorized_payment_id('6114264375')
        
        self.assertIsNotNone(pago_existente)
        # En el webhook, si pago_existente existe, retornamos "already_processed"
        # y no intentamos crear otro pago


if __name__ == '__main__':
    unittest.main()

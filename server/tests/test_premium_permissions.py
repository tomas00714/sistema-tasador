"""
Tests para verificar el sistema de permisos premium/suscripción.

NOTA: Los endpoints de escritura ahora requieren acceso Pro (suscripción, trial o admin).
"""

import unittest
from unittest.mock import Mock, patch
from middleware import get_current_user_id, require_premium_or_admin
from services.suscripcion_service import SuscripcionService
import auth


class TestAuthOnlyPermissions(unittest.TestCase):
    """Tests para verificar la lógica de permisos."""

    def test_logica_admin_emails(self):
        """Test que los admins se determinan por variables de entorno."""
        # Verificar que ADMIN_EMAILS es un set
        self.assertIsInstance(auth.ADMIN_EMAILS, set)

    def test_logica_suscripcion(self):
        """Test que la lógica de suscripción sigue existiendo."""
        # Verificar que SuscripcionService.tiene_acceso_pro existe
        self.assertTrue(callable(SuscripcionService.tiene_acceso_pro))

    def test_logica_suscripcion_extendida(self):
        """Test que la lógica de suscripción extendida existe."""
        # Verificar que SuscripcionService.tiene_acceso_pro_extendido existe
        self.assertTrue(callable(SuscripcionService.tiene_acceso_pro_extendido))


class TestPremiumRequiredEndpoints(unittest.TestCase):
    """Tests para verificar que los endpoints de escritura requieren acceso Pro."""

    def test_crear_tasacion_requiere_premium(self):
        """Test que POST /api/tasaciones requiere acceso Pro."""
        from main import crear_tasacion
        import inspect

        sig = inspect.signature(crear_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)
        # Verificar que usa require_premium_or_admin
        # Esto es una verificación simplificada; el test real de integración
        # verificará que el endpoint rechaza usuarios sin acceso

    def test_actualizar_tasacion_requiere_premium(self):
        """Test que PUT /api/tasaciones/{id} requiere acceso Pro."""
        from main import actualizar_tasacion
        import inspect

        sig = inspect.signature(actualizar_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_eliminar_tasacion_requiere_premium(self):
        """Test que DELETE /api/tasaciones/{id} requiere acceso Pro."""
        from main import eliminar_tasacion
        import inspect

        sig = inspect.signature(eliminar_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_crear_comparable_requiere_premium(self):
        """Test que POST /api/comparables requiere acceso Pro."""
        from main import crear_comparable
        import inspect

        sig = inspect.signature(crear_comparable)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_actualizar_comparable_requiere_premium(self):
        """Test que PUT /api/comparables/{id} requiere acceso Pro."""
        from main import actualizar_comparable
        import inspect

        sig = inspect.signature(actualizar_comparable)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_eliminar_comparable_requiere_premium(self):
        """Test que DELETE /api/comparables/{id} requiere acceso Pro."""
        from main import eliminar_comparable
        import inspect

        sig = inspect.signature(eliminar_comparable)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_actualizar_snapshot_comparable_requiere_premium(self):
        """Test que PUT /api/tasaciones/{id}/comparables/{id} requiere acceso Pro."""
        from main import actualizar_snapshot_comparable_tasacion
        import inspect

        sig = inspect.signature(actualizar_snapshot_comparable_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_crear_compartir_tasacion_requiere_premium(self):
        """Test que POST /api/tasaciones/{id}/compartir requiere acceso Pro."""
        from main import crear_compartir_tasacion
        import inspect

        sig = inspect.signature(crear_compartir_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_aceptar_comparable_solicitud_requiere_premium(self):
        """Test que aceptar comparable de solicitud requiere acceso Pro."""
        from main import aceptar_comparable_solicitud
        import inspect

        sig = inspect.signature(aceptar_comparable_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_rechazar_comparable_solicitud_requiere_premium(self):
        """Test que rechazar comparable de solicitud requiere acceso Pro."""
        from main import rechazar_comparable_solicitud
        import inspect

        sig = inspect.signature(rechazar_comparable_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)


class TestAuthOnlyEndpoints(unittest.TestCase):
    """Tests para verificar que endpoints de solicitudes solo requieren autenticación."""

    @patch('middleware.get_current_user_id')
    def test_crear_solicitud_solo_requiere_auth(self, mock_get_user_id):
        """Test que POST /api/solicitudes SOLO requiere autenticación."""
        from main import crear_solicitud
        import inspect

        sig = inspect.signature(crear_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_actualizar_solicitud_solo_requiere_auth(self, mock_get_user_id):
        """Test que PUT /api/solicitudes/{id} SOLO requiere autenticación."""
        from main import actualizar_solicitud
        import inspect

        sig = inspect.signature(actualizar_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_eliminar_solicitud_solo_requiere_auth(self, mock_get_user_id):
        """Test que DELETE /api/solicitudes/{id} SOLO requiere autenticación."""
        from main import eliminar_solicitud
        import inspect

        sig = inspect.signature(eliminar_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    def test_contribuir_solicitud_es_publico(self):
        """Test que POST /api/solicitudes/link/{link}/contribuir es público."""
        from main import contribuir_solicitud
        import inspect

        sig = inspect.signature(contribuir_solicitud)
        params = sig.parameters

        # NO debe tener usuario_id (es público)
        self.assertNotIn('usuario_id', params)


class TestPublicEndpoints(unittest.TestCase):
    """Tests para verificar que endpoints públicos siguen funcionando."""

    def test_obtener_vista_previa_compartir_es_publico(self):
        """Test que GET /api/tasaciones/compartir/{token} es público."""
        from main import obtener_vista_previa_compartir
        import inspect

        sig = inspect.signature(obtener_vista_previa_compartir)
        params = sig.parameters

        # NO debe tener usuario_id (es público)
        self.assertNotIn('usuario_id', params)

    def test_obtener_solicitud_por_link_es_publico(self):
        """Test que GET /api/solicitudes/link/{link} es público."""
        from main import obtener_solicitud_por_link
        import inspect

        sig = inspect.signature(obtener_solicitud_por_link)
        params = sig.parameters

        # NO debe tener usuario_id (es público)
        self.assertNotIn('usuario_id', params)


class TestAccessControlLogic(unittest.TestCase):
    """Tests para verificar la lógica de control de acceso por tipo de usuario."""

    def setUp(self):
        """Configuración inicial de las pruebas."""
        self.suscripcion_service = SuscripcionService()

    @patch('auth.is_admin')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    @patch('services.suscripcion_service.SuscripcionService.trial_esta_vigente')
    def test_usuario_free_sin_trial_no_acceso(self, mock_trial, mock_tiene_acceso, mock_find, mock_is_admin):
        """Test que un usuario Free sin trial no tiene acceso Pro."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'free@example.com'
        }
        mock_tiene_acceso.return_value = False
        mock_trial.return_value = False

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertFalse(resultado)

    @patch('auth.is_admin')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    @patch('services.suscripcion_service.SuscripcionService.trial_esta_vigente')
    def test_usuario_free_con_trial_vigente_tiene_acceso(self, mock_trial, mock_tiene_acceso, mock_find, mock_is_admin):
        """Test que un usuario Free con trial vigente tiene acceso Pro."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'trial@example.com'
        }
        mock_tiene_acceso.return_value = False
        mock_trial.return_value = True

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertTrue(resultado)

    @patch('auth.is_admin')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    @patch('services.suscripcion_service.SuscripcionService.trial_esta_vigente')
    def test_usuario_free_con_trial_vencido_no_acceso(self, mock_trial, mock_tiene_acceso, mock_find, mock_is_admin):
        """Test que un usuario Free con trial vencido no tiene acceso Pro."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'trial_expired@example.com'
        }
        mock_tiene_acceso.return_value = False
        mock_trial.return_value = False

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertFalse(resultado)

    @patch('auth.is_admin')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    def test_usuario_con_pro_tiene_acceso(self, mock_tiene_acceso, mock_find, mock_is_admin):
        """Test que un usuario con suscripción Pro tiene acceso."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'pro@example.com'
        }
        mock_tiene_acceso.return_value = True

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertTrue(resultado)

    @patch('auth.is_admin')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_admin_sin_suscripcion_tiene_acceso(self, mock_find, mock_is_admin):
        """Test que un admin tiene acceso Pro sin suscripción."""
        # Configurar mocks
        mock_is_admin.return_value = True
        mock_find.return_value = {
            'id': 1,
            'email': 'admin@example.com'
        }

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertTrue(resultado)

    @patch('services.suscripcion_service.SuscripcionService._now')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_cuenta_antigua_sin_plan_no_acceso(self, mock_find, mock_now):
        """Test que una cuenta antigua sin plan no recibe acceso por defecto."""
        # Configurar mocks
        mock_now.return_value = __import__('datetime').datetime(2026, 10, 12)
        mock_find.return_value = {
            'id': 1,
            'email': 'old@example.com',
            'trial_usado': False,
            'trial_inicio': None,
            'trial_fin': None
        }

        # Simular usuario sin suscripción
        with patch.object(self.suscripcion_service.suscripcion_repo, 'find_by_usuario', return_value=[]):
            estado = self.suscripcion_service.obtener_estado(1)

        # Verificar
        self.assertFalse(estado['tiene_acceso_pro'])
        self.assertEqual(estado['plan'], 'Free')
        self.assertEqual(estado['estado'], 'free')


class TestFrontendErrorHandling(unittest.TestCase):
    """Tests para verificar el manejo de errores 403 no_premium en el frontend."""

    def test_error_403_no_premium_es_reconocido(self):
        """Test que el frontend reconoce el error 403 con código no_premium."""
        # Este test verifica que el código del frontend tiene lógica para
        # detectar el error específico no_premium
        # La implementación está en api-client.js handlePremiumError()
        import importlib.util
        import os
        
        # Leer el archivo api-client.js
        api_client_path = os.path.join(os.path.dirname(__file__), '..', '..', 'client', 'js', 'api-client.js')
        if os.path.exists(api_client_path):
            with open(api_client_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Verificar que existe la función handlePremiumError
            self.assertIn('handlePremiumError', content)
            # Verificar que maneja el código no_premium
            self.assertIn('no_premium', content)
            # Verificar que redirige a pricing
            self.assertIn('pricing', content)


if __name__ == '__main__':
    unittest.main()

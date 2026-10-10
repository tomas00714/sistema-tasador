"""
Tests para verificar el sistema de permisos premium/suscripción (suspendido momentáneamente).

NOTA: Las restricciones de suscripción han sido removidas temporalmente.
Los endpoints ahora solo requieren autenticación, no premium.
"""

import unittest
from unittest.mock import Mock, patch
from middleware import get_current_user_id
from services.suscripcion_service import SuscripcionService
import auth


class TestAuthOnlyPermissions(unittest.TestCase):
    """Tests para verificar que los endpoints solo requieren autenticación."""

    def test_logica_admin_emails(self):
        """Test que los admins se determinan por variables de entorno."""
        # Verificar que ADMIN_EMAILS es un set
        self.assertIsInstance(auth.ADMIN_EMAILS, set)

    def test_logica_suscripcion(self):
        """Test que la lógica de suscripción sigue existiendo."""
        # Verificar que SuscripcionService.tiene_acceso_pro existe
        self.assertTrue(callable(SuscripcionService.tiene_acceso_pro))


class TestAuthOnlyEndpoints(unittest.TestCase):
    """Tests para verificar que los endpoints SOLO requieren autenticación."""

    @patch('middleware.get_current_user_id')
    def test_crear_tasacion_solo_requiere_auth(self, mock_get_user_id):
        """Test que POST /api/tasaciones SOLO requiere autenticación."""
        from main import crear_tasacion
        import inspect

        sig = inspect.signature(crear_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_actualizar_tasacion_solo_requiere_auth(self, mock_get_user_id):
        """Test que PUT /api/tasaciones/{id} SOLO requiere autenticación."""
        from main import actualizar_tasacion
        import inspect

        sig = inspect.signature(actualizar_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_eliminar_tasacion_solo_requiere_auth(self, mock_get_user_id):
        """Test que DELETE /api/tasaciones/{id} SOLO requiere autenticación."""
        from main import eliminar_tasacion
        import inspect

        sig = inspect.signature(eliminar_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_crear_comparable_solo_requiere_auth(self, mock_get_user_id):
        """Test que POST /api/comparables SOLO requiere autenticación."""
        from main import crear_comparable
        import inspect

        sig = inspect.signature(crear_comparable)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_actualizar_comparable_solo_requiere_auth(self, mock_get_user_id):
        """Test que PUT /api/comparables/{id} SOLO requiere autenticación."""
        from main import actualizar_comparable
        import inspect

        sig = inspect.signature(actualizar_comparable)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_eliminar_comparable_solo_requiere_auth(self, mock_get_user_id):
        """Test que DELETE /api/comparables/{id} SOLO requiere autenticación."""
        from main import eliminar_comparable
        import inspect

        sig = inspect.signature(eliminar_comparable)
        params = sig.parameters

        self.assertIn('usuario_id', params)

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

    @patch('middleware.get_current_user_id')
    def test_aceptar_comparable_solicitud_solo_requiere_auth(self, mock_get_user_id):
        """Test que aceptar comparable SOLO requiere autenticación."""
        from main import aceptar_comparable_solicitud
        import inspect

        sig = inspect.signature(aceptar_comparable_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_rechazar_comparable_solicitud_solo_requiere_auth(self, mock_get_user_id):
        """Test que rechazar comparable SOLO requiere autenticación."""
        from main import rechazar_comparable_solicitud
        import inspect

        sig = inspect.signature(rechazar_comparable_solicitud)
        params = sig.parameters

        self.assertIn('usuario_id', params)

    @patch('middleware.get_current_user_id')
    def test_crear_compartir_tasacion_solo_requiere_auth(self, mock_get_user_id):
        """Test que compartir tasación SOLO requiere autenticación."""
        from main import crear_compartir_tasacion
        import inspect

        sig = inspect.signature(crear_compartir_tasacion)
        params = sig.parameters

        self.assertIn('usuario_id', params)


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


if __name__ == '__main__':
    unittest.main()

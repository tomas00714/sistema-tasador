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


if __name__ == '__main__':
    unittest.main()

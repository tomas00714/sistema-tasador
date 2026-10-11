import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from services.suscripcion_service import SuscripcionService
from repositories.usuario_repository import UsuarioRepository
from repositories.suscripcion_repository import SuscripcionRepository
import auth


class TestTrialActivation(unittest.TestCase):
    """Pruebas para la activación de trial."""

    def setUp(self):
        """Configuración inicial de las pruebas."""
        self.suscripcion_service = SuscripcionService()
        self.usuario_repo = UsuarioRepository()
        self.suscripcion_repo = SuscripcionRepository()

    @patch('services.suscripcion_service.SuscripcionService._now')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    @patch('repositories.usuario_repository.UsuarioRepository.update')
    def test_activar_trial_usuario_sin_trial_previo(self, mock_update, mock_find, mock_now):
        """Test que un usuario sin trial previo puede activar su trial."""
        # Configurar mocks
        mock_now.return_value = datetime(2026, 10, 11, 12, 0, 0)
        mock_find.return_value = {
            'id': 1,
            'email': 'test@example.com',
            'trial_usado': False,
            'trial_inicio': None,
            'trial_fin': None
        }
        mock_update.return_value = {'id': 1}

        # Ejecutar
        resultado = self.suscripcion_service.activar_trial(1)

        # Verificar
        self.assertIsNotNone(resultado)
        self.assertIn('trial_inicio', resultado)
        self.assertIn('trial_fin', resultado)

        # Verificar que se llamó a update con los parámetros correctos
        mock_update.assert_called_once()
        call_args = mock_update.call_args
        self.assertEqual(call_args[0][0], 1)
        self.assertEqual(call_args[0][1]['trial_usado'], True)
        self.assertIsNotNone(call_args[0][1]['trial_inicio'])
        self.assertIsNotNone(call_args[0][1]['trial_fin'])

        # Verificar que el período es de 15 días
        inicio = call_args[0][1]['trial_inicio']
        fin = call_args[0][1]['trial_fin']
        diferencia = fin - inicio
        self.assertEqual(diferencia.days, 15)

    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_activar_trial_usuario_con_trial_previo_falla(self, mock_find):
        """Test que un usuario con trial previo no puede activar otro trial."""
        # Configurar mock
        mock_find.return_value = {
            'id': 1,
            'email': 'test@example.com',
            'trial_usado': True,
            'trial_inicio': datetime(2026, 10, 1),
            'trial_fin': datetime(2026, 10, 16)
        }

        # Ejecutar y verificar que lanza excepción
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as context:
            self.suscripcion_service.activar_trial(1)

        self.assertEqual(context.exception.status_code, 409)
        self.assertIn('ya utilizó', context.exception.detail)

    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_activar_trial_usuario_no_existente_falla(self, mock_find):
        """Test que activar trial falla si el usuario no existe."""
        # Configurar mock
        mock_find.return_value = None

        # Ejecutar y verificar que lanza excepción
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as context:
            self.suscripcion_service.activar_trial(1)

        self.assertEqual(context.exception.status_code, 404)


class TestTrialVigencia(unittest.TestCase):
    """Pruebas para la vigencia del trial."""

    def setUp(self):
        """Configuración inicial de las pruebas."""
        self.suscripcion_service = SuscripcionService()

    @patch('services.suscripcion_service.SuscripcionService._now')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_trial_vigente(self, mock_find, mock_now):
        """Test que un trial está vigente si la fecha fin es futura."""
        # Configurar mocks
        ahora = datetime(2026, 10, 11, 12, 0, 0)
        mock_now.return_value = ahora
        mock_find.return_value = {
            'id': 1,
            'trial_usado': True,
            'trial_inicio': datetime(2026, 10, 1),
            'trial_fin': datetime(2026, 10, 26)  # 15 días después
        }

        # Ejecutar
        resultado = self.suscripcion_service.trial_esta_vigente(1)

        # Verificar
        self.assertTrue(resultado)

    @patch('services.suscripcion_service.SuscripcionService._now')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_trial_vencido(self, mock_find, mock_now):
        """Test que un trial no está vigente si la fecha fin es pasada."""
        # Configurar mocks
        ahora = datetime(2026, 10, 20, 12, 0, 0)
        mock_now.return_value = ahora
        mock_find.return_value = {
            'id': 1,
            'trial_usado': True,
            'trial_inicio': datetime(2026, 10, 1),
            'trial_fin': datetime(2026, 10, 16)  # 15 días después, pero pasado
        }

        # Ejecutar
        resultado = self.suscripcion_service.trial_esta_vigente(1)

        # Verificar
        self.assertFalse(resultado)

    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_trial_no_usado_no_vigente(self, mock_find):
        """Test que un usuario sin trial no tiene trial vigente."""
        # Configurar mock
        mock_find.return_value = {
            'id': 1,
            'trial_usado': False,
            'trial_inicio': None,
            'trial_fin': None
        }

        # Ejecutar
        resultado = self.suscripcion_service.trial_esta_vigente(1)

        # Verificar
        self.assertFalse(resultado)


class TestAccesoProExtendido(unittest.TestCase):
    """Pruebas para el acceso Pro extendido (suscripción + trial + admin)."""

    def setUp(self):
        """Configuración inicial de las pruebas."""
        self.suscripcion_service = SuscripcionService()

    @patch('auth.is_admin')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_admin_tiene_acceso_sin_suscripcion(self, mock_find, mock_is_admin):
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

    @patch('auth.is_admin')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_usuario_con_suscripcion_tiene_acceso(self, mock_find, mock_tiene_acceso, mock_is_admin):
        """Test que un usuario con suscripción Pro tiene acceso."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'user@example.com'
        }
        mock_tiene_acceso.return_value = True

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertTrue(resultado)

    @patch('auth.is_admin')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    @patch('services.suscripcion_service.SuscripcionService.trial_esta_vigente')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_usuario_con_trial_tiene_acceso(self, mock_find, mock_trial_vigente, mock_tiene_acceso, mock_is_admin):
        """Test que un usuario con trial vigente tiene acceso."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'user@example.com'
        }
        mock_tiene_acceso.return_value = False
        mock_trial_vigente.return_value = True

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertTrue(resultado)

    @patch('auth.is_admin')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro')
    @patch('services.suscripcion_service.SuscripcionService.trial_esta_vigente')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_usuario_sin_acceso_no_tiene_acceso(self, mock_find, mock_trial_vigente, mock_tiene_acceso, mock_is_admin):
        """Test que un usuario sin suscripción ni trial no tiene acceso."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'user@example.com'
        }
        mock_tiene_acceso.return_value = False
        mock_trial_vigente.return_value = False

        # Ejecutar
        resultado = self.suscripcion_service.tiene_acceso_pro_extendido(1)

        # Verificar
        self.assertFalse(resultado)


class TestEstadoExtendido(unittest.TestCase):
    """Pruebas para el estado extendido de suscripción."""

    def setUp(self):
        """Configuración inicial de las pruebas."""
        self.suscripcion_service = SuscripcionService()

    @patch('auth.is_admin')
    @patch('services.suscripcion_service.SuscripcionService.tiene_acceso_pro_extendido')
    @patch('services.suscripcion_service.SuscripcionService.obtener_estado')
    @patch('services.suscripcion_service.SuscripcionService._obtener_info_trial')
    @patch('repositories.usuario_repository.UsuarioRepository.find_by_id')
    def test_estado_extendido_incluye_trial_info(self, mock_find, mock_trial_info, mock_estado, mock_acceso, mock_is_admin):
        """Test que el estado extendido incluye información del trial."""
        # Configurar mocks
        mock_is_admin.return_value = False
        mock_find.return_value = {
            'id': 1,
            'email': 'user@example.com'
        }
        mock_acceso.return_value = True
        mock_estado.return_value = {
            'tiene_acceso_pro': True,
            'plan': 'Pro',
            'estado': 'activa'
        }
        mock_trial_info.return_value = {
            'trial_inicio': datetime(2026, 10, 1),
            'trial_fin': datetime(2026, 10, 16),
            'trial_usado': True
        }

        # Ejecutar
        resultado = self.suscripcion_service.obtener_estado_extendido(1)

        # Verificar
        self.assertTrue(resultado['tiene_acceso_pro'])
        self.assertEqual(resultado['plan'], 'Pro')
        self.assertIsNotNone(resultado['trial_info'])
        self.assertIn('esta_vigente', resultado['trial_info'])


if __name__ == '__main__':
    unittest.main()

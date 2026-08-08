from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class UsuarioRepository(BaseRepository):
    """Repositorio para operaciones con usuarios."""
    
    def __init__(self):
        super().__init__("usuarios")
    
    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Busca un usuario por email."""
        return self.find_where({"email": email}, limit=1)[0] if self.find_where({"email": email}, limit=1) else None
    
    def find_by_google_id(self, google_id: str) -> Optional[Dict[str, Any]]:
        """Busca un usuario por Google ID."""
        return self.find_where({"google_id": google_id}, limit=1)[0] if self.find_where({"google_id": google_id}, limit=1) else None
    
    def create_usuario(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo usuario."""
        return self.create(data)
    
    def update_ultimo_acceso(self, usuario_id: int) -> bool:
        """Actualiza el último acceso del usuario."""
        return self.update(usuario_id, {"ultimo_acceso": "now()"}) is not None
    
    def update_token_verificacion_email(self, usuario_id: int, token: str) -> bool:
        """Actualiza el token de verificación de email."""
        return self.update(usuario_id, {"token_verificacion_email": token}) is not None
    
    def marcar_email_verificado(self, usuario_id: int) -> bool:
        """Marca el email como verificado."""
        return self.update(usuario_id, {
            "email_verificado": True,
            "fecha_verificacion_email": "now()",
            "token_verificacion_email": None
        }) is not None
    
    def update_token_recuperacion_password(self, usuario_id: int, token: str, expiracion: str) -> bool:
        """Actualiza el token de recuperación de contraseña."""
        return self.update(usuario_id, {
            "token_recuperacion_password": token,
            "fecha_expiracion_recuperacion": expiracion
        }) is not None
    
    def clear_token_recuperacion_password(self, usuario_id: int) -> bool:
        """Limpia el token de recuperación de contraseña."""
        return self.update(usuario_id, {
            "token_recuperacion_password": None,
            "fecha_expiracion_recuperacion": None
        }) is not None
    
    def get_plan_limit_compartidos(self, usuario_id: int) -> Optional[int]:
        """Obtiene el límite mensual de compartidos del plan del usuario."""
        query = """
            SELECT p.limite_compartidos_mensuales
            FROM usuarios u
            JOIN planes p ON u.plan_id = p.id
            WHERE u.id = %s
        """
        try:
            results = self.execute_query(query, (usuario_id,))
            if not results:
                return None
            return results[0].get('limite_compartidos_mensuales')
        except Exception as e:
            logger.error(f"Error al obtener límite de compartidos: {e}")
            return None

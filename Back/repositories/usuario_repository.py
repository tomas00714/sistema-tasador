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
    
    def find_by_uuid(self, uuid: str) -> Optional[Dict[str, Any]]:
        """Busca un usuario por UUID."""
        return self.find_where({"uuid": uuid}, limit=1)[0] if self.find_where({"uuid": uuid}, limit=1) else None
    
    def create_usuario(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo usuario."""
        return self.create(data)
    
    def update_ultimo_acceso(self, usuario_id: int) -> bool:
        """Actualiza el último acceso del usuario."""
        return self.update(usuario_id, {"ultimo_acceso": "CURRENT_TIMESTAMP"}) is not None

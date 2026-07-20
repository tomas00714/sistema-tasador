from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class SolicitudRepository(BaseRepository):
    """Repositorio para operaciones con solicitudes."""
    
    def __init__(self):
        super().__init__("solicitudes")
    
    def find_by_uuid(self, uuid: str) -> Optional[Dict[str, Any]]:
        """Busca una solicitud por UUID."""
        return self.find_where({"uuid": uuid}, limit=1)[0] if self.find_where({"uuid": uuid}, limit=1) else None
    
    def find_by_link_publico(self, link_publico: str) -> Optional[Dict[str, Any]]:
        """Busca una solicitud por link público."""
        return self.find_where({"link_publico": link_publico}, limit=1)[0] if self.find_where({"link_publico": link_publico}, limit=1) else None
    
    def find_by_usuario(self, usuario_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca solicitudes de un usuario."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit)
    
    def get_by_usuario(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Obtiene todas las solicitudes de un usuario."""
        return self.find_where({"usuario_id": usuario_id})
    
    def get_by_usuario_and_estado(self, usuario_id: int, estado: str) -> List[Dict[str, Any]]:
        """Obtiene solicitudes de un usuario filtradas por estado."""
        return self.find_where({"usuario_id": usuario_id, "estado": estado})
    
    def find_by_estado(self, estado: str, limit: int = None) -> List[Dict[str, Any]]:
        """Busca solicitudes por estado."""
        return self.find_where({"estado": estado}, limit=limit)
    
    def find_expiradas(self) -> List[Dict[str, Any]]:
        """Busca solicitudes expiradas."""
        query = "SELECT * FROM solicitudes WHERE estado = 'pendiente' AND fecha_expiracion < CURRENT_TIMESTAMP"
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query)
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al buscar solicitudes expiradas: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)
    
    def create_solicitud(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea una nueva solicitud."""
        return self.create(data)
    
    def update_solicitud(self, solicitud_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza una solicitud."""
        return self.update(solicitud_id, data)

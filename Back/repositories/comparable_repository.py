from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging

logger = logging.getLogger(__name__)


class ComparableRepository(BaseRepository):
    """Repositorio para operaciones con comparables."""
    
    def __init__(self):
        super().__init__("comparables")
    
    def find_by_uuid(self, uuid: str) -> Optional[Dict[str, Any]]:
        """Busca un comparable por UUID."""
        return self.find_where({"uuid": uuid}, limit=1)[0] if self.find_where({"uuid": uuid}, limit=1) else None
    
    def find_by_usuario(self, usuario_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca comparables de un usuario."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit)
    
    def get_by_usuario(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Obtiene todos los comparables de un usuario."""
        return self.find_where({"usuario_id": usuario_id})
    
    def get_by_usuario_tipo(self, usuario_id: int, tipo_inmueble: str) -> List[Dict[str, Any]]:
        """Obtiene comparables de un usuario filtrados por tipo de inmueble."""
        return self.find_where({"usuario_id": usuario_id, "tipo_inmueble": tipo_inmueble})
    
    def get_by_usuario_tipo_origen(self, usuario_id: int, tipo_inmueble: str, origen: str) -> List[Dict[str, Any]]:
        """Obtiene comparables de un usuario filtrados por tipo y origen."""
        return self.find_where({"usuario_id": usuario_id, "tipo_inmueble": tipo_inmueble, "origen": origen})
    
    def find_by_tasacion_origen(self, tasacion_origen_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca comparables derivados de una tasación."""
        return self.find_where({"tasacion_origen_id": tasacion_origen_id}, limit=limit)
    
    def find_by_tipo_inmueble(self, tipo_inmueble: str, limit: int = None) -> List[Dict[str, Any]]:
        """Busca comparables por tipo de inmueble."""
        return self.find_where({"tipo_inmueble": tipo_inmueble}, limit=limit)
    
    def find_compartidos(self, usuario_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca comparables compartidos con un usuario."""
        query = """
            SELECT * FROM comparables 
            WHERE id_enviador = %s OR id_creador = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (usuario_id, usuario_id))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al buscar comparables compartidos: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)
    
    def find_by_public_ids(self, ids: List[str]) -> List[Dict[str, Any]]:
        """Busca comparables por sus IDs públicos."""
        if not ids:
            return []

        query = f"""
            SELECT * FROM {self.table_name}
            WHERE id_publico = ANY(%s)
        """
        conn = get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(query, (ids,))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al buscar comparables por IDs: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)

    def find_by_solicitud_origen(self, solicitud_id: int) -> List[Dict[str, Any]]:
        """Busca comparables creados como respuesta a una solicitud."""
        return self.find_where({"solicitud_origen_id": solicitud_id})

    def find_by_link_publico(self, link_publico: str) -> List[Dict[str, Any]]:
        """Busca comparables creados como respuesta a una solicitud a partir de su link público."""
        query = """
            SELECT c.*
            FROM comparables c
            INNER JOIN solicitudes s ON c.solicitud_origen_id = s.id
            WHERE s.link_publico = %s
        """
        conn = get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(query, (link_publico,))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al buscar comparables por link público: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)

    def create_comparable(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo comparable."""
        return self.create(data)
    
    def update_comparable(self, comparable_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza un comparable."""
        return self.update(comparable_id, data)

from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging

logger = logging.getLogger(__name__)


class TasacionRepository(BaseRepository):
    """Repositorio para operaciones con tasaciones."""
    
    def __init__(self):
        super().__init__("tasaciones")
    
    def find_by_uuid(self, uuid: str) -> Optional[Dict[str, Any]]:
        """Busca una tasación por UUID."""
        return self.find_where({"uuid": uuid}, limit=1)[0] if self.find_where({"uuid": uuid}, limit=1) else None
    
    def find_by_usuario(self, usuario_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca tasaciones de un usuario."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit)
    
    def get_by_usuario(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Obtiene todas las tasaciones de un usuario."""
        return self.find_where({"usuario_id": usuario_id})
    
    def get_by_usuario_and_estado(self, usuario_id: int, estado: str) -> List[Dict[str, Any]]:
        """Obtiene tasaciones de un usuario filtradas por estado."""
        return self.find_where({"usuario_id": usuario_id, "estado": estado})
    
    def find_by_tipo_inmueble(self, tipo_inmueble: str, limit: int = None) -> List[Dict[str, Any]]:
        """Busca tasaciones por tipo de inmueble."""
        return self.find_where({"tipo_inmueble": tipo_inmueble}, limit=limit)
    
    def find_by_estado(self, estado: str, limit: int = None) -> List[Dict[str, Any]]:
        """Busca tasaciones por estado."""
        return self.find_where({"estado": estado}, limit=limit)
    
    def find_by_ubicacion(self, provincia: str = None, localidad: str = None, limit: int = None) -> List[Dict[str, Any]]:
        """Busca tasaciones por ubicación."""
        conditions = {}
        if provincia:
            conditions["provincia"] = provincia
        if localidad:
            conditions["localidad"] = localidad
        
        return self.find_where(conditions, limit=limit) if conditions else self.find_all(limit=limit)
    
    def find_by_ids(self, ids: List[int]) -> List[Dict[str, Any]]:
        """Busca tasaciones por sus IDs internos."""
        if not ids:
            return []
        
        query = f"""
            SELECT * FROM {self.table_name}
            WHERE id = ANY(%s)
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (ids,))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al buscar tasaciones por IDs: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)

    def create_tasacion(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea una nueva tasación."""
        return self.create(data)
    
    def update_tasacion(self, tasacion_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza una tasación."""
        return self.update(tasacion_id, data)
    
    def agregar_comparable(self, tasacion_id: int, comparable_id: int, orden: int = 0) -> bool:
        """Agrega un comparable a una tasación."""
        query = """
            INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden)
            VALUES (%s, %s, %s)
            ON CONFLICT (tasacion_id, comparable_id) DO UPDATE SET orden = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (tasacion_id, comparable_id, orden, orden))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al agregar comparable: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def limpiar_comparables(self, tasacion_id: int) -> bool:
        """Elimina todas las relaciones de comparables de una tasación."""
        query = "DELETE FROM tasacion_comparable WHERE tasacion_id = %s"
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (tasacion_id,))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al limpiar comparables: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def eliminar_comparable(self, tasacion_id: int, comparable_id: int) -> bool:
        """Elimina un comparable de una tasación."""
        query = "DELETE FROM tasacion_comparable WHERE tasacion_id = %s AND comparable_id = %s"
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (tasacion_id, comparable_id))
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al eliminar comparable: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def obtener_comparables(self, tasacion_id: int) -> List[Dict[str, Any]]:
        """Obtiene los comparables de una tasación."""
        query = """
            SELECT c.* 
            FROM comparables c
            INNER JOIN tasacion_comparable tc ON c.id = tc.comparable_id
            WHERE tc.tasacion_id = %s
            ORDER BY tc.orden
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (tasacion_id,))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al obtener comparables: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)

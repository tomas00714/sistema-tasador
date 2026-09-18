from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging

logger = logging.getLogger(__name__)


class ComparableRepository(BaseRepository):
    """Repositorio para operaciones con comparables."""
    
    def __init__(self):
        super().__init__("comparables")
    
    def find_by_usuario(self, usuario_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """
        Busca comparables de un usuario.
        
        DEPRECATED: Este método NO filtra por utilidad (aceptación de solicitud).
        Para obtener comparables disponibles para usar en tasaciones, usar get_by_usuario_utilizables().
        Este método puede retornar comparables pendientes/rechazados de solicitudes que no deberían usarse.
        """
        return self.find_where({"usuario_id": usuario_id}, limit=limit, offset=offset)
    
    def get_by_usuario(self, usuario_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """
        Obtiene comparables de un usuario, opcionalmente paginados.
        
        DEPRECATED: Este método NO filtra por utilidad (aceptación de solicitud).
        Para obtener comparables disponibles para usar en tasaciones, usar get_by_usuario_utilizables().
        Este método puede retornar comparables pendientes/rechazados de solicitudes que no deberían usarse.
        """
        return self.find_where({"usuario_id": usuario_id}, limit=limit, offset=offset)
    
    def get_by_usuario_tipo(self, usuario_id: int, tipo_inmueble: str, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """
        Obtiene comparables de un usuario filtrados por tipo de inmueble, opcionalmente paginados.
        
        DEPRECATED: Este método NO filtra por utilidad (aceptación de solicitud).
        Para obtener comparables disponibles para usar en tasaciones, usar get_by_usuario_utilizables().
        Este método puede retornar comparables pendientes/rechazados de solicitudes que no deberían usarse.
        """
        return self.find_where({"usuario_id": usuario_id, "tipo_inmueble": tipo_inmueble}, limit=limit, offset=offset)
    
    def get_by_usuario_tipo_origen(self, usuario_id: int, tipo_inmueble: str, origen: str, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """
        Obtiene comparables de un usuario filtrados por tipo y origen, opcionalmente paginados.
        
        DEPRECATED: Este método NO filtra por utilidad (aceptación de solicitud).
        Para obtener comparables disponibles para usar en tasaciones, usar get_by_usuario_utilizables().
        Este método puede retornar comparables pendientes/rechazados de solicitudes que no deberían usarse.
        """
        return self.find_where({"usuario_id": usuario_id, "tipo_inmueble": tipo_inmueble, "origen": origen}, limit=limit, offset=offset)
    
    def find_by_tasacion_origen(self, tasacion_origen_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca comparables derivados de una tasación."""
        return self.find_where({"tasacion_origen_id": tasacion_origen_id}, limit=limit, offset=offset)
    
    def find_by_tipo_inmueble(self, tipo_inmueble: str, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca comparables por tipo de inmueble."""
        return self.find_where({"tipo_inmueble": tipo_inmueble}, limit=limit, offset=offset)
    
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
    
    def find_by_ids(self, ids: List[int]) -> List[Dict[str, Any]]:
        """
        Busca comparables por sus IDs internos.
        
        DEPRECATED: Este método NO filtra por utilidad (aceptación de solicitud).
        Para obtener comparables disponibles para usar en tasaciones, usar get_by_usuario_utilizables().
        Este método puede retornar comparables pendientes/rechazados de solicitudes que no deberían usarse.
        """
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
            logger.error(f"Error al buscar comparables por IDs: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)
    
    def find_by_solicitud_origen(self, solicitud_id: int) -> List[Dict[str, Any]]:
        """Busca comparables creados como respuesta a una solicitud."""
        return self.find_where({"solicitud_origen_id": solicitud_id})

    def find_by_link_publico(self, link_publico: str) -> List[Dict[str, Any]]:
        """Busca comparables creados como respuesta a una solicitud a partir de su link público.

        La columna solicitudes.link_publico fue eliminada (migración 015): la
        solicitud se resuelve decodificando el código público y luego se busca
        por solicitud_origen_id.
        """
        from repositories.solicitud_repository import SolicitudRepository

        solicitud = SolicitudRepository().find_by_link_publico(link_publico)
        if not solicitud:
            return []
        return self.find_by_solicitud_origen(solicitud['id'])

    def create_comparable(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo comparable."""
        return self.create(data)
    
    def update_comparable(self, comparable_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza un comparable."""
        return self.update(comparable_id, data)
    
    def es_utilizable(self, comparable_id: int) -> bool:
        """
        Verifica si un comparable es utilizable en tasaciones.
        
        Regla:
        - Si el comparable no existe → False
        - Si solicitud_origen_id IS NULL → True (manual, de tasación, compartido)
        - Si solicitud_origen_id IS NOT NULL:
          - Si estado = 'aceptado' → True
          - Si no existe registro → False (pendiente)
          - Si estado = 'rechazado' → False
        """
        query = """
            SELECT c.solicitud_origen_id, sca.estado
            FROM comparables c
            LEFT JOIN solicitud_comparable_aceptacion sca 
                ON c.solicitud_origen_id = sca.solicitud_id AND c.id = sca.comparable_id
            WHERE c.id = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (comparable_id,))
            result = cursor.fetchone()
            if not result:
                return False
            
            solicitud_origen_id, estado = result
            if solicitud_origen_id is None:
                return True  # No viene de solicitud, es utilizable
            return estado == 'aceptado'  # Viene de solicitud, debe estar aceptado
        except Exception as e:
            logger.error(f"Error al verificar si comparable es utilizable: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def get_by_usuario_utilizables(
        self, 
        usuario_id: int, 
        tipo_inmueble: str = None, 
        fuente: str = None,
        limit: int = None, 
        offset: int = None
    ) -> List[Dict[str, Any]]:
        """
        Obtiene comparables de un usuario filtrando solo los utilizables.
        
        Incluye:
        - Comparables sin solicitud_origen_id (manual, de tasación, compartido)
        - Comparables con solicitud_origen_id solo si estado = 'aceptado'
        
        Excluye:
        - Comparables con solicitud_origen_id y estado = 'rechazado'
        - Comparables con solicitud_origen_id sin registro (pendiente)
        """
        query = """
            SELECT c.*
            FROM comparables c
            LEFT JOIN solicitud_comparable_aceptacion sca 
                ON c.solicitud_origen_id = sca.solicitud_id AND c.id = sca.comparable_id
            WHERE c.usuario_id = %s
            AND (
                c.solicitud_origen_id IS NULL  -- No viene de solicitud
                OR sca.estado = 'aceptado'  -- Viene de solicitud y está aceptado
            )
        """
        params = [usuario_id]
        
        if tipo_inmueble:
            query += " AND c.tipo_inmueble = %s"
            params.append(tipo_inmueble)
        
        if fuente:
            query += " AND c.fuente = %s"
            params.append(fuente)
        
        query += " ORDER BY c.fecha_creacion DESC"
        
        if limit:
            query += " LIMIT %s"
            params.append(limit)
        if offset:
            query += " OFFSET %s"
            params.append(offset)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, tuple(params))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al obtener comparables utilizables: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)

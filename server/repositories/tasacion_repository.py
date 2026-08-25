from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging

logger = logging.getLogger(__name__)


class TasacionRepository(BaseRepository):
    """Repositorio para operaciones con tasaciones."""
    
    def __init__(self):
        super().__init__("tasaciones")
    
    def find_by_usuario(self, usuario_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca tasaciones de un usuario."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit)
    
    def get_by_usuario(self, usuario_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Obtiene tasaciones de un usuario, opcionalmente paginadas."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit, offset=offset)
    
    def get_by_usuario_and_estado(self, usuario_id: int, estado: str, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Obtiene tasaciones de un usuario filtradas por estado, opcionalmente paginadas."""
        return self.find_where({"usuario_id": usuario_id, "estado": estado}, limit=limit, offset=offset)
    
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
    
    def agregar_comparable(self, tasacion_id: int, comparable_id: int, orden: int = 0, snapshot: Dict[str, Any] = None) -> bool:
        """Agrega un comparable a una tasación con su snapshot histórico."""
        # Import dentro del método para evitar circular import
        from repositories.comparable_repository import ComparableRepository
        
        # Verificar si el comparable es utilizable
        comp_repo = ComparableRepository()
        if not comp_repo.es_utilizable(comparable_id):
            logger.warning(f"Intento de agregar comparable no utilizable: {comparable_id}")
            return False
        
        # Verificar que el comparable pertenezca al usuario de la tasación
        tasacion = self.find_by_id(tasacion_id)
        if not tasacion:
            logger.warning(f"Tasación {tasacion_id} no encontrada")
            return False
        
        comparable = comp_repo.find_by_id(comparable_id)
        if not comparable:
            logger.warning(f"Comparable {comparable_id} no encontrado")
            return False
        
        if comparable['usuario_id'] != tasacion['usuario_id']:
            logger.warning(f"Comparable {comparable_id} pertenece a usuario {comparable['usuario_id']}, tasación pertenece a {tasacion['usuario_id']}")
            return False
        
        # Si no se proporciona snapshot, construirlo desde el comparable actual
        if snapshot is None:
            snapshot = self._construir_snapshot_comparable(comparable)
        
        # Insertar la relación con snapshot
        query = """
            INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (tasacion_id, comparable_id) 
            DO UPDATE SET orden = %s, snapshot = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (tasacion_id, comparable_id, orden, snapshot, orden, snapshot))
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al agregar comparable: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def _construir_snapshot_comparable(self, comparable: Dict[str, Any]) -> Dict[str, Any]:
        """Construye un snapshot histórico desde un comparable."""
        return {
            'direccion': comparable.get('direccion'),
            'lat': comparable.get('lat'),
            'lon': comparable.get('lon'),
            'tipo_inmueble': comparable.get('tipo_inmueble'),
            'tipo_valor': comparable.get('tipo_valor'),
            'valor': comparable.get('valor'),
            'valor_m2': comparable.get('valor_m2'),
            'superficie': comparable.get('superficie'),
            'frente': comparable.get('frente'),
            'fondo': comparable.get('fondo'),
            'tipo_lote': comparable.get('tipo_lote'),
            'ambientes': comparable.get('ambientes'),
            'dormitorios': comparable.get('dormitorios'),
            'banos': comparable.get('banos'),
            'cochera': comparable.get('cochera'),
            'tiene_ascensor': comparable.get('tiene_ascensor'),
            'tiene_pileta': comparable.get('tiene_pileta'),
            'tiene_jardin': comparable.get('tiene_jardin'),
            'datos': comparable.get('datos', {})
        }
    
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
    
    def eliminar_comparable(self, tasacion_id: int, comparable_id: int = None) -> bool:
        """Elimina un comparable de una tasación.
        
        Args:
            tasacion_id: ID de la tasación
            comparable_id: ID del comparable (opcional, si es None elimina todos)
        """
        if comparable_id is not None:
            query = "DELETE FROM tasacion_comparable WHERE tasacion_id = %s AND comparable_id = %s"
            params = (tasacion_id, comparable_id)
        else:
            query = "DELETE FROM tasacion_comparable WHERE tasacion_id = %s"
            params = (tasacion_id,)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al eliminar comparable: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def actualizar_snapshot_comparable(self, tasacion_id: int, comparable_id: int, snapshot: Dict[str, Any]) -> bool:
        """Actualiza el snapshot de un comparable en una tasación."""
        query = """
            UPDATE tasacion_comparable
            SET snapshot = %s
            WHERE tasacion_id = %s AND comparable_id = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (snapshot, tasacion_id, comparable_id))
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al actualizar snapshot: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def actualizar_comparables_upsert(self, tasacion_id: int, comparables_data: List[Dict[str, Any]]) -> bool:
        """Actualiza los comparables de una tasación usando upsert.
        
        Para cada comparable:
        - Si existe la relación → UPDATE snapshot + orden
        - Si no existe → INSERT relación + snapshot
        
        Luego elimina las relaciones que ya no están presentes.
        
        Args:
            tasacion_id: ID de la tasación
            comparables_data: Lista de dicts con {comparable_id, orden, snapshot}
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Obtener relaciones actuales
            cursor.execute(
                "SELECT comparable_id FROM tasacion_comparable WHERE tasacion_id = %s",
                (tasacion_id,)
            )
            actuales = {row[0] for row in cursor.fetchall()}
            
            # IDs nuevos
            nuevos = {c['comparable_id'] for c in comparables_data if c.get('comparable_id')}
            
            # Upsert para cada comparable
            for comp_data in comparables_data:
                comp_id = comp_data.get('comparable_id')
                if not comp_id:
                    continue
                
                orden = comp_data.get('orden', 0)
                snapshot = comp_data.get('snapshot', {})
                
                query = """
                    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (tasacion_id, comparable_id) 
                    DO UPDATE SET orden = %s, snapshot = %s
                """
                cursor.execute(query, (tasacion_id, comp_id, orden, snapshot, orden, snapshot))
            
            # Eliminar relaciones que ya no están
            a_eliminar = actuales - nuevos
            if a_eliminar:
                placeholders = ','.join(['%s'] * len(a_eliminar))
                cursor.execute(
                    f"DELETE FROM tasacion_comparable WHERE tasacion_id = %s AND comparable_id IN ({placeholders})",
                    (tasacion_id,) + tuple(a_eliminar)
                )
            
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al actualizar comparables upsert: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def obtener_comparables(self, tasacion_id: int) -> List[Dict[str, Any]]:
        """Obtiene los snapshots de comparables de una tasación."""
        query = """
            SELECT tc.snapshot, tc.comparable_id, tc.orden
            FROM tasacion_comparable tc
            WHERE tc.tasacion_id = %s
            ORDER BY tc.orden
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (tasacion_id,))
            columns = [desc[0] for desc in cursor.description]
            results = []
            for row in cursor.fetchall():
                row_dict = dict(zip(columns, row))
                # El snapshot es un JSONB, devolverlo como dict
                snapshot = row_dict.get('snapshot', {})
                if isinstance(snapshot, dict):
                    # Agregar el ID del comparable al snapshot para referencia
                    snapshot['id'] = row_dict.get('comparable_id')
                    results.append(snapshot)
                else:
                    logger.warning(f"Snapshot inválido para tasación {tasacion_id}")
            return results
        except Exception as e:
            logger.error(f"Error al obtener comparables: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)

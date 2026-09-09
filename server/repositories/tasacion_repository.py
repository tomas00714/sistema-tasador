from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging
import psycopg2.extras
from utils.id_encoder import generar_codigo_publico

logger = logging.getLogger(__name__)

# Constants for ID generation
TIPO_COMPARABLE = 'C'


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
        def to_native(value):
            """Convierte Decimal a tipos nativos de Python para JSON serialización"""
            if value is None:
                return None
            try:
                from decimal import Decimal
                if isinstance(value, Decimal):
                    return float(value)
            except:
                pass
            return value

        # Extraer ubicación (puede venir como objeto anidado o campos directos)
        ubicacion = comparable.get('ubicacion', {})
        if not isinstance(ubicacion, dict):
            ubicacion = {}

        # Construir snapshot con la estructura que espera el frontend (ubicacion anidada)
        # IMPORTANTE: Guardar ID público (string) no ID interno (número)
        id_interno = comparable.get('id')
        id_publico = generar_codigo_publico(TIPO_COMPARABLE, id_interno) if id_interno else None
        
        return {
            'ubicacion': {
                'direccion': ubicacion.get('direccion') or comparable.get('direccion'),
                'lat': to_native(ubicacion.get('lat') or comparable.get('lat')),
                'lon': to_native(ubicacion.get('lon') or comparable.get('lon')),
                'provincia': ubicacion.get('provincia') or comparable.get('provincia'),
                'localidad': ubicacion.get('localidad') or comparable.get('localidad')
            },
            'tipoInmueble': comparable.get('tipo_inmueble') or comparable.get('tipoInmueble'),
            'tipoValor': comparable.get('tipo_valor') or comparable.get('tipoValor'),
            'valor': to_native(comparable.get('valor')),
            'valorM2': to_native(comparable.get('valor_m2') or comparable.get('valorM2')),
            'superficie': to_native(comparable.get('superficie')),
            'frente': to_native(comparable.get('frente')),
            'fondo': to_native(comparable.get('fondo')),
            'tipoLote': comparable.get('tipo_lote') or comparable.get('tipoLote'),
            'ambientes': to_native(comparable.get('ambientes')),
            'dormitorios': to_native(comparable.get('dormitorios')),
            'banos': to_native(comparable.get('banos')),
            'cochera': comparable.get('cochera'),
            'tieneAscensor': comparable.get('tiene_ascensor') or comparable.get('tieneAscensor'),
            'tienePileta': comparable.get('tiene_pileta') or comparable.get('tienePileta'),
            'tieneJardin': comparable.get('tiene_jardin') or comparable.get('tieneJardin'),
            'datos': comparable.get('datos', {}),
            'fuente': comparable.get('fuente'),
            'id': id_publico,  # ID público, no interno
            'lote': comparable.get('lote'),
            'departamento': comparable.get('departamento'),
            'casa': comparable.get('casa'),
            'observaciones': comparable.get('observaciones', '')
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
        # Convertir snapshot a JSONB para PostgreSQL
        snapshot_jsonb = psycopg2.extras.Json(snapshot)
        
        query = """
            UPDATE tasacion_comparable
            SET snapshot = %s
            WHERE tasacion_id = %s AND comparable_id = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (snapshot_jsonb, tasacion_id, comparable_id))
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
        logger.info(f"[DEBUG actualizar_comparables_upsert] tasacion_id={tasacion_id}, comparables_data={len(comparables_data)}")
        for i, cd in enumerate(comparables_data):
            logger.info(f"[DEBUG actualizar_comparables_upsert]   Comparable {i}: {cd}")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Obtener relaciones actuales (incluyendo IDs NULL)
            cursor.execute(
                "SELECT id, comparable_id FROM tasacion_comparable WHERE tasacion_id = %s",
                (tasacion_id,)
            )
            actuales = {row[0]: row[1] for row in cursor.fetchall()}  # {row_id: comparable_id}
            logger.info(f"[DEBUG actualizar_comparables_upsert] Relaciones actuales: {actuales}")
            
            # Upsert para cada comparable
            for comp_data in comparables_data:
                comp_id = comp_data.get('comparable_id')
                orden = comp_data.get('orden', 0)
                snapshot = comp_data.get('snapshot', {})
                logger.info(f"[DEBUG actualizar_comparables_upsert] Procesando comp_id={comp_id}, orden={orden}")
                
                # Convertir snapshot a JSONB para PostgreSQL
                snapshot_jsonb = psycopg2.extras.Json(snapshot)
                
                if comp_id is not None:
                    # Caso normal: comparable existe en biblioteca
                    # Verificar si ya existe relación con este comparable_id
                    cursor.execute(
                        "SELECT id FROM tasacion_comparable WHERE tasacion_id = %s AND comparable_id = %s",
                        (tasacion_id, comp_id)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        # UPDATE existente
                        row_id = existing[0]
                        cursor.execute(
                            "UPDATE tasacion_comparable SET orden = %s, snapshot = %s WHERE id = %s",
                            (orden, snapshot_jsonb, row_id)
                        )
                        logger.info(f"[DEBUG actualizar_comparables_upsert] UPDATE row_id={row_id}")
                    else:
                        # INSERT nuevo
                        cursor.execute(
                            "INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot) VALUES (%s, %s, %s, %s)",
                            (tasacion_id, comp_id, orden, snapshot_jsonb)
                        )
                        logger.info(f"[DEBUG actualizar_comparables_upsert] INSERT comp_id={comp_id}")
                else:
                    # Caso especial: comparable eliminado (comparable_id = NULL)
                    # Buscar snapshot existente por orden o crear nuevo
                    cursor.execute(
                        "SELECT id FROM tasacion_comparable WHERE tasacion_id = %s AND comparable_id IS NULL AND orden = %s",
                        (tasacion_id, orden)
                    )
                    existing = cursor.fetchone()
                    
                    if existing:
                        # UPDATE existente
                        row_id = existing[0]
                        cursor.execute(
                            "UPDATE tasacion_comparable SET snapshot = %s WHERE id = %s",
                            (snapshot_jsonb, row_id)
                        )
                        logger.info(f"[DEBUG actualizar_comparables_upsert] UPDATE row_id={row_id} (comparable_id NULL)")
                    else:
                        # INSERT nuevo con comparable_id NULL
                        cursor.execute(
                            "INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot) VALUES (%s, NULL, %s, %s)",
                            (tasacion_id, orden, snapshot_jsonb)
                        )
                        logger.info(f"[DEBUG actualizar_comparables_upsert] INSERT (comparable_id NULL)")
            
            # Eliminar relaciones que ya no están
            # Para esto, necesitamos saber qué IDs fueron proporcionados
            ids_proveidos = {c['comparable_id'] for c in comparables_data if c.get('comparable_id') is not None}
            # Para NULLs, usamos orden como referencia
            ordenes_null = {c['orden'] for c in comparables_data if c.get('comparable_id') is None}
            
            cursor.execute(
                "SELECT id, comparable_id, orden FROM tasacion_comparable WHERE tasacion_id = %s",
                (tasacion_id,)
            )
            for row_id, comp_id, orden in cursor.fetchall():
                if comp_id is not None:
                    if comp_id not in ids_proveidos:
                        cursor.execute("DELETE FROM tasacion_comparable WHERE id = %s", (row_id,))
                        logger.info(f"[DEBUG actualizar_comparables_upsert] DELETE row_id={row_id} (comp_id={comp_id})")
                else:
                    if orden not in ordenes_null:
                        cursor.execute("DELETE FROM tasacion_comparable WHERE id = %s", (row_id,))
                        logger.info(f"[DEBUG actualizar_comparables_upsert] DELETE row_id={row_id} (comparable_id NULL, orden={orden})")
            
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
                    # Garantizar que el snapshot siempre tenga ID público (string)
                    # comparable_id en la tabla es ID interno, necesitamos ID público para el frontend
                    comparable_id_interno = row_dict.get('comparable_id')
                    if comparable_id_interno:
                        # Si comparable_id existe, generar el ID público
                        snapshot['id'] = generar_codigo_publico(TIPO_COMPARABLE, comparable_id_interno)
                    else:
                        # Si comparable_id es NULL (comparable eliminado de biblioteca),
                        # verificar si el snapshot ya tiene un ID público válido
                        current_id = snapshot.get('id')
                        if current_id is None:
                            # Si no hay ID, generar uno temporal para referencia
                            snapshot['id'] = f"deleted_{tasacion_id}_{len(results)}"
                        elif isinstance(current_id, int):
                            # Si el snapshot tiene ID interno (bug histórico), dejarlo así
                            # pero esto causará error 422 si el frontend lo envía
                            logger.warning(f"Snapshot con ID interno en tasación {tasacion_id}: {current_id}")
                        # Si es string, asumir que es ID público válido
                    
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

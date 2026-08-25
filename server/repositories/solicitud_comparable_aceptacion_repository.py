from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging

logger = logging.getLogger(__name__)


class SolicitudComparableAceptacionRepository(BaseRepository):
    """Repositorio para operaciones con aceptación/rechazo de comparables en solicitudes."""
    
    def __init__(self):
        super().__init__("solicitud_comparable_aceptacion")
    
    def obtener_decision(self, solicitud_id: int, comparable_id: int) -> Optional[Dict[str, Any]]:
        """Obtiene la decisión de un comparable dentro de una solicitud."""
        query = """
            SELECT * FROM solicitud_comparable_aceptacion
            WHERE solicitud_id = %s AND comparable_id = %s
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (solicitud_id, comparable_id))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results[0] if results else None
        except Exception as e:
            logger.error(f"Error al obtener decisión: {e}")
            return None
        finally:
            cursor.close()
            release_connection(conn)
    
    def listar_decisiones_solicitud(self, solicitud_id: int) -> List[Dict[str, Any]]:
        """Lista todas las decisiones de una solicitud."""
        query = """
            SELECT * FROM solicitud_comparable_aceptacion
            WHERE solicitud_id = %s
            ORDER BY fecha DESC
        """
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, (solicitud_id,))
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al listar decisiones de solicitud: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)
    
    def crear_decision(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea una nueva decisión de aceptación/rechazo."""
        return self.create(data)
    
    def actualizar_decision(self, solicitud_id: int, comparable_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza una decisión existente."""
        query = """
            UPDATE solicitud_comparable_aceptacion
            SET estado = %s, usuario_id = %s, fecha = CURRENT_TIMESTAMP
        """
        params = []
        
        if 'estado' in data:
            query += ", estado = %s"
            params.append(data['estado'])
        if 'usuario_id' in data:
            query += ", usuario_id = %s"
            params.append(data['usuario_id'])
        if 'observaciones' in data:
            query += ", observaciones = %s"
            params.append(data['observaciones'])
        
        query += " WHERE solicitud_id = %s AND comparable_id = %s RETURNING *"
        params.extend([solicitud_id, comparable_id])
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, tuple(params))
            conn.commit()
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results[0] if results else None
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al actualizar decisión: {e}")
            return None
        finally:
            cursor.close()
            release_connection(conn)
    
    def aceptar(self, solicitud_id: int, comparable_id: int, usuario_id: int, observaciones: str = None) -> Optional[Dict[str, Any]]:
        """Acepta un comparable para una solicitud."""
        data = {
            'solicitud_id': solicitud_id,
            'comparable_id': comparable_id,
            'usuario_id': usuario_id,
            'estado': 'aceptado'
        }
        if observaciones:
            data['observaciones'] = observaciones
        
        # Usar INSERT ... ON CONFLICT para actualizar si ya existe
        query = """
            INSERT INTO solicitud_comparable_aceptacion
            (solicitud_id, comparable_id, usuario_id, estado, observaciones)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (solicitud_id, comparable_id)
            DO UPDATE SET estado = %s, usuario_id = %s, fecha = CURRENT_TIMESTAMP, observaciones = %s
            RETURNING *
        """
        params = (solicitud_id, comparable_id, usuario_id, 'aceptado', observaciones,
                   'aceptado', usuario_id, observaciones)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, params)
            conn.commit()
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results[0] if results else None
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al aceptar comparable: {e}")
            return None
        finally:
            cursor.close()
            release_connection(conn)
    
    def rechazar(self, solicitud_id: int, comparable_id: int, usuario_id: int, observaciones: str = None) -> Optional[Dict[str, Any]]:
        """Rechaza un comparable para una solicitud."""
        query = """
            INSERT INTO solicitud_comparable_aceptacion
            (solicitud_id, comparable_id, usuario_id, estado, observaciones)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (solicitud_id, comparable_id)
            DO UPDATE SET estado = %s, usuario_id = %s, fecha = CURRENT_TIMESTAMP, observaciones = %s
            RETURNING *
        """
        params = (solicitud_id, comparable_id, usuario_id, 'rechazado', observaciones,
                   'rechazado', usuario_id, observaciones)
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, params)
            conn.commit()
            columns = [desc[0] for desc in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
            return results[0] if results else None
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al rechazar comparable: {e}")
            return None
        finally:
            cursor.close()
            release_connection(conn)

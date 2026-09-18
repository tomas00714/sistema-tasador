from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class SolicitudRepository(BaseRepository):
    """Repositorio para operaciones con solicitudes."""
    
    def __init__(self):
        super().__init__("solicitudes")
    
    def find_by_link_publico(self, link_publico: str) -> Optional[Dict[str, Any]]:
        """
        Busca una solicitud por link público.

        Acepta el código público puro, el path corto ".../s/{codigo}" o la
        URL completa de la página pública ".../solicitud.html?link={codigo}".
        """
        from utils.id_encoder import obtener_id_desde_codigo, obtener_tipo_codigo, TIPO_SOLICITUD
        from utils.public_links import extraer_codigo_de_link

        codigo_publico = extraer_codigo_de_link(link_publico)
        if not codigo_publico:
            return None

        # Decodificar código público a ID interno
        id_interno = obtener_id_desde_codigo(codigo_publico)
        if not id_interno:
            return None

        # Validar que sea una solicitud
        if obtener_tipo_codigo(codigo_publico) != TIPO_SOLICITUD:
            return None

        # Buscar por ID interno
        return self.find_by_id(id_interno)
    
    def find_by_usuario(self, usuario_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca solicitudes de un usuario."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit, offset=offset)
    
    def get_by_usuario(self, usuario_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Obtiene solicitudes de un usuario, opcionalmente paginadas."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit, offset=offset)
    
    def get_by_usuario_and_estado(self, usuario_id: int, estado: str, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Obtiene solicitudes de un usuario filtradas por estado, opcionalmente paginadas."""
        return self.find_where({"usuario_id": usuario_id, "estado": estado}, limit=limit, offset=offset)
    
    def find_by_estado(self, estado: str, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca solicitudes por estado."""
        return self.find_where({"estado": estado}, limit=limit, offset=offset)
    
    def find_expiradas(self, usuario_id: int = None) -> List[Dict[str, Any]]:
        """Busca solicitudes pendientes cuya fecha_expiracion ya pasó."""
        query = """
            SELECT * FROM solicitudes
            WHERE estado = 'pendiente'
              AND fecha_expiracion < CURRENT_TIMESTAMP
        """
        params = ()
        if usuario_id is not None:
            query += " AND usuario_id = %s"
            params = (usuario_id,)
        return self.execute_query(query, params)

    def materializar_expiradas(self, usuario_id: int = None) -> int:
        """
        Marca como 'expirada' toda solicitud 'pendiente' cuya fecha_expiracion
        ya pasó. Misma condición que find_expiradas. Devuelve filas afectadas.
        """
        query = """
            UPDATE solicitudes
            SET estado = 'expirada', fecha_modificacion = CURRENT_TIMESTAMP
            WHERE estado = 'pendiente'
              AND fecha_expiracion < CURRENT_TIMESTAMP
        """
        params = ()
        if usuario_id is not None:
            query += " AND usuario_id = %s"
            params = (usuario_id,)
        return self.execute_query(query, params, fetch=False)

    def conteo_comparables(self, solicitud_ids: List[int]) -> Dict[int, Dict[str, int]]:
        """
        Cuenta comparables recibidos por solicitud y su estado de decisión en
        solicitud_comparable_aceptacion. Un comparable sin fila en aceptación
        cuenta como 'pendiente'.
        """
        if not solicitud_ids:
            return {}
        query = """
            SELECT c.solicitud_origen_id AS solicitud_id,
                   COUNT(*) AS recibidos,
                   COUNT(a.comparable_id) FILTER (WHERE a.estado = 'aceptado') AS aceptados,
                   COUNT(a.comparable_id) FILTER (WHERE a.estado = 'rechazado') AS rechazados,
                   COUNT(*) - COUNT(a.comparable_id) AS pendientes
            FROM comparables c
            LEFT JOIN solicitud_comparable_aceptacion a
                   ON a.solicitud_id = c.solicitud_origen_id
                  AND a.comparable_id = c.id
            WHERE c.solicitud_origen_id = ANY(%s)
            GROUP BY c.solicitud_origen_id
        """
        rows = self.execute_query(query, (list(solicitud_ids),))
        return {
            r['solicitud_id']: {
                'recibidos': r['recibidos'],
                'aceptados': r['aceptados'],
                'rechazados': r['rechazados'],
                'pendientes': r['pendientes']
            }
            for r in rows
        }
    
    def create_solicitud(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea una nueva solicitud."""
        return self.create(data)
    
    def update_solicitud(self, solicitud_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza una solicitud."""
        return self.update(solicitud_id, data)

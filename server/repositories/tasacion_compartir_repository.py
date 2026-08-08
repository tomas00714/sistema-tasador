from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import logging

logger = logging.getLogger(__name__)


class TasacionCompartirRepository(BaseRepository):
    """Repositorio para operaciones con enlaces de compartir tasaciones."""

    def __init__(self):
        super().__init__("tasaciones_compartir")

    def find_by_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Busca un enlace de compartir por su token."""
        query = f"SELECT * FROM {self.table_name} WHERE token = %s"
        results = self.execute_query(query, (token,))
        return results[0] if results else None

    def find_by_tasacion(self, tasacion_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca enlaces de compartir de una tasación."""
        query = f"SELECT * FROM {self.table_name} WHERE tasacion_id = %s ORDER BY fecha_creacion DESC"
        if limit:
            query += f" LIMIT {limit}"
        return self.execute_query(query, (tasacion_id,))

    def find_activos_by_tasacion(self, tasacion_id: int, limit: int = None) -> List[Dict[str, Any]]:
        """Busca enlaces activos de compartir de una tasación."""
        query = f"SELECT * FROM {self.table_name} WHERE tasacion_id = %s AND estado = 'activo' ORDER BY fecha_creacion DESC"
        if limit:
            query += f" LIMIT {limit}"
        return self.execute_query(query, (tasacion_id,))

    def create_compartir(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un nuevo enlace de compartir."""
        return self.create(data)

    def registrar_uso(self, compartir_id: int, usos_realizados: int, estado: str) -> Optional[Dict[str, Any]]:
        """Actualiza los usos y estado de un enlace."""
        return self.update(compartir_id, {
            'usos_realizados': usos_realizados,
            'estado': estado,
            'fecha_ultimo_uso': 'now()'
        })

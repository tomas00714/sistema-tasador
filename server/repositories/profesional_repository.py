from typing import Optional, Dict, Any
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class ProfesionalRepository(BaseRepository):
    """Repositorio para los datos profesionales de un usuario."""

    def __init__(self):
        super().__init__("profesionales")

    def find_by_usuario_id(self, usuario_id: int) -> Optional[Dict[str, Any]]:
        """Busca los datos profesionales de un usuario."""
        results = self.find_where({"usuario_id": usuario_id}, limit=1)
        return results[0] if results else None

    def create_for_usuario(self, usuario_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea un registro profesional para un usuario."""
        payload = dict(data)
        payload["usuario_id"] = usuario_id
        return self.create(payload)

    def update_for_usuario(self, usuario_id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Actualiza los datos profesionales de un usuario."""
        if not data:
            return self.find_by_usuario_id(usuario_id)

        columns = data.keys()
        values = []
        for value in data.values():
            if isinstance(value, dict):
                import json
                values.append(json.dumps(value))
            else:
                values.append(value)

        set_clause = ', '.join([f"{col} = %s" for col in columns])

        query = f"""
            UPDATE {self.table_name}
            SET {set_clause}
            WHERE usuario_id = %s
            RETURNING *
        """

        params = tuple(values) + (usuario_id,)
        results = self.execute_query(query, params)
        return results[0] if results else None

    def upsert(self, usuario_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea o actualiza los datos profesionales de un usuario."""
        existing = self.find_by_usuario_id(usuario_id)
        if existing:
            return self.update_for_usuario(usuario_id, data)
        return self.create_for_usuario(usuario_id, data)

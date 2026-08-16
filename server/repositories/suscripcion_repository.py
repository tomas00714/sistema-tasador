from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class SuscripcionRepository(BaseRepository):
    """Repositorio para operaciones con suscripciones."""

    def __init__(self):
        super().__init__("suscripciones")

    def find_by_usuario(self, usuario_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca suscripciones de un usuario, opcionalmente paginadas."""
        return self.find_where({"usuario_id": usuario_id}, limit=limit, offset=offset)

    def find_by_mp_preapproval_id(self, mp_preapproval_id: str) -> Optional[Dict[str, Any]]:
        """Busca una suscripción por su ID de preapproval de Mercado Pago."""
        return self.find_where({"mp_preapproval_id": mp_preapproval_id}, limit=1)[0] if self.find_where({"mp_preapproval_id": mp_preapproval_id}, limit=1) else None

    def find_vigentes_por_usuario(self, usuario_id: int) -> List[Dict[str, Any]]:
        """Busca suscripciones vigentes de un usuario (pending, activa, en_gracia, cancelada)."""
        query = """
            SELECT * FROM suscripciones
            WHERE usuario_id = %s
              AND estado IN ('pending', 'activa', 'en_gracia', 'cancelada')
            ORDER BY creada_en DESC
        """
        return self.execute_query(query, (usuario_id,))

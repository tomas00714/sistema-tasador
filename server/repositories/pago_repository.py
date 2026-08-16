from typing import List, Optional, Dict, Any
from repositories.base_repository import BaseRepository
import logging

logger = logging.getLogger(__name__)


class PagoRepository(BaseRepository):
    """Repositorio para operaciones con pagos."""

    def __init__(self):
        super().__init__("pagos")

    def find_by_suscripcion(self, suscripcion_id: int, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca pagos asociados a una suscripción, opcionalmente paginados."""
        return self.find_where({"suscripcion_id": suscripcion_id}, limit=limit, offset=offset)

    def find_by_mp_authorized_payment_id(self, mp_authorized_payment_id: str) -> Optional[Dict[str, Any]]:
        """Busca un pago por su ID de authorized_payment de Mercado Pago."""
        return self.find_where({"mp_authorized_payment_id": mp_authorized_payment_id}, limit=1)[0] if self.find_where({"mp_authorized_payment_id": mp_authorized_payment_id}, limit=1) else None

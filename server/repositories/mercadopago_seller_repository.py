from datetime import datetime
from typing import Optional, Dict, Any
from repositories.base_repository import BaseRepository


class MercadoPagoSellerRepository(BaseRepository):
    """Repositorio para la tabla mercadopago_sellers.

    Persiste la autorización OAuth que el Seller (cuenta de Mercado Pago del
    socio) otorga a nuestra aplicación Marketplace. Los tokens llegan ya
    cifrados desde la capa de servicio; el repositorio nunca ve texto plano.
    """

    def __init__(self):
        super().__init__("mercadopago_sellers")

    def find_by_mp_user_id(self, mp_user_id: int) -> Optional[Dict[str, Any]]:
        """Busca una autorización por el user_id de Mercado Pago del Seller."""
        results = self.find_where({"mp_user_id": mp_user_id})
        return results[0] if results else None

    def find_activo(self) -> Optional[Dict[str, Any]]:
        """Devuelve la autorización activa más reciente del Seller."""
        query = (
            f"SELECT * FROM {self.table_name} "
            "WHERE estado = 'activa' ORDER BY actualizada_en DESC LIMIT 1"
        )
        results = self.execute_query(query)
        return results[0] if results else None

    def upsert_por_mp_user_id(self, mp_user_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
        """Crea o actualiza la autorización de un Seller por su mp_user_id."""
        data = dict(data)
        data["actualizada_en"] = datetime.utcnow()
        existente = self.find_by_mp_user_id(mp_user_id)
        if existente:
            return self.update(existente["id"], data)
        data["mp_user_id"] = mp_user_id
        return self.create(data)

    def marcar_revocado(self, seller_auth_id: int) -> Optional[Dict[str, Any]]:
        """Marca una autorización como revocada (no borra el registro)."""
        return self.update(seller_auth_id, {"estado": "revocada"})

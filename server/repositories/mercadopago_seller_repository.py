import json
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
        """Crea o actualiza la autorización de un Seller por su mp_user_id.

        Es una única sentencia INSERT ... ON CONFLICT: atómica e
        idempotente. Aunque la operación se repita (reintento, doble
        callback, etc.), nunca produce filas duplicadas: el UNIQUE de
        mp_user_id garantiza una sola autorización por Seller.
        """
        data = dict(data)
        data["mp_user_id"] = mp_user_id
        data["actualizada_en"] = datetime.utcnow()

        columns = list(data.keys())
        values = tuple(
            json.dumps(v) if isinstance(v, dict) else v
            for v in data.values()
        )
        columns_str = ", ".join(columns)
        placeholders = ", ".join(["%s"] * len(values))
        updates = ", ".join(
            f"{col} = EXCLUDED.{col}" for col in columns if col != "mp_user_id"
        )

        query = f"""
            INSERT INTO {self.table_name} ({columns_str})
            VALUES ({placeholders})
            ON CONFLICT (mp_user_id) DO UPDATE SET {updates}
            RETURNING *
        """

        results = self.execute_query(query, values)
        return results[0] if results else None

    def marcar_revocado(self, seller_auth_id: int) -> Optional[Dict[str, Any]]:
        """Marca una autorización como revocada (no borra el registro)."""
        return self.update(seller_auth_id, {"estado": "revocada"})

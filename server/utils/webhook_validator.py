import os
import hmac
import hashlib
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def validate_webhook_signature(
    x_signature: Optional[str],
    x_request_id: Optional[str],
    data_id: str
) -> bool:
    """Valida la firma x-signature de un webhook de Mercado Pago.

    Según la documentación de Mercado Pago, el manifest se construye como:
    id:[data.id];request-id:[x-request-id];ts:[ts]

    El header x-signature tiene el formato: ts:[ts];v1:[hmac_sha256]

    Args:
        x_signature: Header x-signature del webhook
        x_request_id: Header x-request-id del webhook
        data_id: ID del recurso en el payload (data.id)

    Returns:
        True si la firma es válida, False en caso contrario
    """
    webhook_secret = os.getenv("MP_WEBHOOK_SECRET")
    if not webhook_secret:
        logger.warning("MP_WEBHOOK_SECRET no configurado. No se pueden validar webhooks.")
        return False

    if not x_signature:
        logger.warning("x-signature header ausente")
        return False

    # Parsear x-signature: formato "ts:1234567890;v1:abc123..."
    try:
        signature_parts = {}
        for part in x_signature.split(";"):
            key, value = part.split(":", 1)
            signature_parts[key] = value

        ts = signature_parts.get("ts")
        v1 = signature_parts.get("v1")

        if not ts or not v1:
            logger.warning("x-signature no contiene ts o v1")
            return False
    except Exception as e:
        logger.error(f"Error al parsear x-signature: {e}")
        return False

    # Construir el manifest según documentación de MP
    # manifest = "id:[data.id];request-id:[x-request-id];ts:[ts]"
    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts}"

    # Calcular HMAC SHA256
    hmac_obj = hmac.new(
        webhook_secret.encode("utf-8"),
        manifest.encode("utf-8"),
        hashlib.sha256
    )
    calculated_hmac = hmac_obj.hexdigest()

    # Comparar con v1
    is_valid = hmac.compare_digest(calculated_hmac, v1)

    if not is_valid:
        logger.warning("Firma de webhook inválida")

    return is_valid

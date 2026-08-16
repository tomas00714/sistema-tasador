import os
import json
import logging
from typing import Dict, Any, Optional
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

logger = logging.getLogger(__name__)


class MercadoPagoService:
    """Servicio exclusivo para comunicación HTTP con Mercado Pago."""

    # URLs base según entorno
    SANDBOX_BASE_URL = "https://api.mercadopago.com"
    PRODUCTION_BASE_URL = "https://api.mercadopago.com"

    def __init__(self):
        self.access_token = os.getenv("MP_ACCESS_TOKEN")
        self.environment = os.getenv("MP_ENVIRONMENT", "sandbox").lower()

        if not self.access_token:
            logger.warning("MP_ACCESS_TOKEN no configurado. El servicio no funcionará correctamente.")

        self.base_url = self._get_base_url()

    def _get_base_url(self) -> str:
        """Devuelve la URL base según el entorno configurado."""
        if self.environment == "production":
            return self.PRODUCTION_BASE_URL
        return self.SANDBOX_BASE_URL

    def _get_headers(self) -> Dict[str, str]:
        """Construye los headers para las requests a Mercado Pago."""
        if not self.access_token:
            raise ValueError("MP_ACCESS_TOKEN no está configurado")

        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Ejecuta una request HTTP a Mercado Pago.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: Path del endpoint (ej. "/preapproval")
            data: Body JSON para POST/PUT
            params: Query params

        Returns:
            Respuesta JSON parseada

        Raises:
            ValueError: Si falta MP_ACCESS_TOKEN
            HTTPError: Si Mercado Pago devuelve error HTTP
            URLError: Si hay error de conexión
        """
        if not self.access_token:
            raise ValueError(
                "MP_ACCESS_TOKEN no está configurado. "
                "Configura la variable de entorno para usar Mercado Pago."
            )

        url = f"{self.base_url}{endpoint}"

        # Agregar query params si existen
        if params:
            from urllib.parse import urlencode
            url = f"{url}?{urlencode(params)}"

        headers = self._get_headers()

        if data is not None:
            body = json.dumps(data).encode("utf-8")
        else:
            body = None

        request = Request(url, data=body, headers=headers, method=method)

        try:
            with urlopen(request, timeout=30) as response:
                response_data = response.read().decode("utf-8")
                return json.loads(response_data) if response_data else {}
        except HTTPError as e:
            error_body = e.read().decode("utf-8")
            logger.error(
                f"Error HTTP de Mercado Pago: {e.code} - {error_body}"
            )
            raise
        except URLError as e:
            logger.error(f"Error de conexión a Mercado Pago: {e.reason}")
            raise

    def crear_suscripcion_mp(
        self,
        payer_email: str,
        card_token_id: str,
        external_reference: str,
        back_url: str,
        monto: float,
        frecuencia: int = 1,
        frecuencia_tipo: str = "months",
        moneda: str = "USD",
        reason: str = "Suscripción Pro Tasador",
    ) -> Dict[str, Any]:
        """Crea una suscripción/preapproval en Mercado Pago.

        NOTA: La moneda es configurable. Se recomienda probar en sandbox
        para confirmar si USD está soportado en Argentina.

        Args:
            payer_email: Email del pagador
            card_token_id: Token de la tarjeta (del frontend)
            external_reference: Nuestra referencia interna
            back_url: URL de retorno
            monto: Monto a cobrar
            frecuencia: Frecuencia numérica (default 1)
            frecuencia_tipo: Tipo de frecuencia (default "months")
            moneda: Moneda (default "USD", probar en sandbox)
            reason: Descripción visible para el usuario

        Returns:
            Respuesta de Mercado Pago con el preapproval_id

        Raises:
            ValueError: Si faltan datos requeridos o MP_ACCESS_TOKEN
            HTTPError: Si Mercado Pago rechaza la creación
        """
        if not all([payer_email, card_token_id, external_reference, back_url]):
            raise ValueError("Faltan datos requeridos: payer_email, card_token_id, external_reference, back_url")

        payload = {
            "reason": reason,
            "external_reference": external_reference,
            "payer_email": payer_email,
            "card_token_id": card_token_id,
            "back_url": back_url,
            "auto_recurring": {
                "frequency": frecuencia,
                "frequency_type": frecuencia_tipo,
                "transaction_amount": monto,
                "currency_id": moneda,
            },
            "status": "authorized",  # CRÍTICO: sin esto no cobra
        }

        logger.info(f"Creando suscripción en Mercado Pago para {payer_email}, monto={monto} {moneda}")

        response = self._make_request("POST", "/preapproval", data=payload)

        preapproval_id = response.get("id")
        if preapproval_id:
            logger.info(f"Suscripción creada en MP: preapproval_id={preapproval_id}")
        else:
            logger.warning("Suscripción creada pero sin ID en respuesta")

        return response

    def obtener_suscripcion_mp(self, preapproval_id: str) -> Dict[str, Any]:
        """Consulta una suscripción/preapproval por ID en Mercado Pago.

        Args:
            preapproval_id: ID de la suscripción en Mercado Pago

        Returns:
            Datos de la suscripción desde Mercado Pago

        Raises:
            ValueError: Si falta MP_ACCESS_TOKEN
            HTTPError: Si no existe o hay error HTTP
        """
        if not preapproval_id:
            raise ValueError("preapproval_id es requerido")

        logger.info(f"Consultando suscripción en MP: preapproval_id={preapproval_id}")

        response = self._make_request("GET", f"/preapproval/{preapproval_id}")

        return response

    def cancelar_suscripcion_mp(self, preapproval_id: str) -> Dict[str, Any]:
        """Cancela una suscripción/preapproval en Mercado Pago.

        Args:
            preapproval_id: ID de la suscripción en Mercado Pago

        Returns:
            Respuesta de Mercado Pago tras la cancelación

        Raises:
            ValueError: Si falta MP_ACCESS_TOKEN
            HTTPError: Si no existe o hay error HTTP
        """
        if not preapproval_id:
            raise ValueError("preapproval_id es requerido")

        logger.info(f"Cancelando suscripción en MP: preapproval_id={preapproval_id}")

        payload = {"status": "canceled"}

        response = self._make_request("PUT", f"/preapproval/{preapproval_id}", data=payload)

        logger.info(f"Suscripción cancelada en MP: preapproval_id={preapproval_id}")

        return response

    def obtener_authorized_payment(self, authorized_payment_id: str) -> Dict[str, Any]:
        """Consulta un authorized_payment por ID en Mercado Pago.

        Args:
            authorized_payment_id: ID del authorized_payment en Mercado Pago

        Returns:
            Datos del authorized_payment desde Mercado Pago

        Raises:
            ValueError: Si falta MP_ACCESS_TOKEN
            HTTPError: Si no existe o hay error HTTP
        """
        if not authorized_payment_id:
            raise ValueError("authorized_payment_id es requerido")

        logger.info(f"Consultando authorized_payment en MP: id={authorized_payment_id}")

        response = self._make_request("GET", f"/authorized_payments/{authorized_payment_id}")

        return response

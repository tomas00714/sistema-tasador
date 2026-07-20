import logging
from tablas.fitto_cervini import (
    coeficiente_medial
)

from tablas.valvano import (
    coeficiente_valvano
)

logger = logging.getLogger(__name__)


def calcular_medial(
    superficie,
    valor_promedio_m2
):
    try:
        return (
            superficie
            * coeficiente_medial()
            * valor_promedio_m2
        )
    except Exception as e:
        logger.error(f"Error al calcular medial: {e}")
        raise ValueError(f"Error al calcular medial: {e}")


def calcular_irregular(
    frente,
    superficie,
    valor_promedio_m2
):
    try:
        if frente == 0:
            raise ValueError("El frente no puede ser cero")

        fondo_ficticio = round(
            superficie / frente
        )

        valor = calcular_medial(
            superficie,
            valor_promedio_m2
        )

        return {
            "fondo_ficticio": fondo_ficticio,
            "valor": valor
        }
    except Exception as e:
        logger.error(f"Error al calcular irregular: {e}")
        raise ValueError(f"Error al calcular irregular: {e}")


def calcular_esquina(
    datos,
    superficie,
    valor_promedio_m2
):
    try:
        if not datos.frente or not datos.fondo:
            raise ValueError("Frente y fondo son requeridos")

        if not datos.zona:
            raise ValueError("La zona es requerida para calcular esquina")

        frente_menor = min(
            datos.frente,
            datos.fondo
        )

        if frente_menor == 0:
            raise ValueError("El frente menor no puede ser cero")

        relacion = (
            (datos.frente + datos.fondo)
            / frente_menor
        )

        coef_esquina = (
            coeficiente_valvano(
                relacion,
                datos.zona
            )
        )

        valor = (
            superficie
            * coeficiente_medial()
            * coef_esquina
            * valor_promedio_m2
        )

        return {

            "coef_esquina": round(
                coef_esquina,
                4
            ),

            "relacion_frentes": round(
                relacion,
                2
            ),

            "valor": valor
        }
    except Exception as e:
        logger.error(f"Error al calcular esquina: {e}")
        raise ValueError(f"Error al calcular esquina: {e}")
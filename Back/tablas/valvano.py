import logging

TABLA_VALVANO = {
    1: {
        1.00: 0.15,
        1.25: 0.17,
        1.50: 0.19,
        1.75: 0.20,
        2.00: 0.22,
        2.25: 0.24,
        2.50: 0.26,
        2.75: 0.27,
        3.00: 0.29
    },

    2: {
        1.00: 0.10,
        1.25: 0.11,
        1.50: 0.12,
        1.75: 0.13,
        2.00: 0.14,
        2.25: 0.15,
        2.50: 0.16,
        2.75: 0.17,
        3.00: 0.18
    },

    3: {
        1.00: 0.05,
        1.25: 0.06,
        1.50: 0.07,
        1.75: 0.07,
        2.00: 0.08,
        2.25: 0.09,
        2.50: 0.10,
        2.75: 0.10,
        3.00: 0.11
    },

    4: {
        1.00: 0.00,
        1.25: 0.01,
        1.50: 0.02,
        1.75: 0.02,
        2.00: 0.03,
        2.25: 0.04,
        2.50: 0.05,
        2.75: 0.05,
        3.00: 0.06
    }
}

logger = logging.getLogger(__name__)


def coeficiente_valvano(
    relacion,
    zona
):
    try:
        tabla_zona = TABLA_VALVANO.get(
            zona
        )

        if tabla_zona is None:
            logger.warning(f"Zona {zona} no encontrada en tabla Valvano, usando coeficiente 1.0")
            return 1.00

        relaciones = list(
            tabla_zona.keys()
        )

        if not relaciones:
            logger.warning(f"Tabla Valvano para zona {zona} está vacía, usando coeficiente 1.0")
            return 1.00

        relacion_cercana = min(
            relaciones,
            key=lambda x: abs(x - relacion)
        )

        porcentaje = tabla_zona[
            relacion_cercana
        ]

        return 1 + porcentaje
    except Exception as e:
        logger.error(f"Error al calcular coeficiente Valvano: {e}")
        return 1.00
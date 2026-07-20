import logging
from tablas.fitto_cervini import (
    coeficiente_fitto_cervini,
    coeficiente_tipologia,
    normalizar_tipologia,
)

logger = logging.getLogger(__name__)


def calcular_superficie(frente, fondo):

    return frente * fondo


def obtener_superficie_lote(datos):

    if datos.superficie is not None:
        return datos.superficie

    if datos.fondo is not None:

        return calcular_superficie(
            datos.frente,
            datos.fondo
        )

    return 0


def calcular_valor_m2(
    valor_total,
    superficie
):

    if superficie == 0:
        return 0

    return valor_total / superficie


def obtener_fondo(datos):

    # Si el fondo fue proporcionado y es válible, usarlo
    if datos.fondo is not None and datos.fondo > 0:
        return datos.fondo

    # Si no hay fondo pero hay superficie y frente, calcular fondo
    if (
        datos.superficie is not None
        and datos.frente > 0
    ):
        return datos.superficie / datos.frente

    return 0


def homogeneizar_comparable(
    comparable,
    lote_objetivo
):

    logger.debug(f"Iniciando homogeneizar_comparable para {comparable.direccion}")

    # Primero obtener el fondo que se usará para el coeficiente Fitto-Cervini
    fondo_comp = obtener_fondo(comparable)

    # Determinar la superficie: usar la proporcionada si es válida, sino calcularla
    superficie_comp = comparable.superficie
    if superficie_comp is None or superficie_comp <= 0:
        if comparable.fondo is not None and comparable.fondo > 0 and comparable.frente > 0:
            superficie_comp = calcular_superficie(comparable.frente, comparable.fondo)
        elif fondo_comp > 0 and comparable.frente > 0:
            superficie_comp = calcular_superficie(comparable.frente, fondo_comp)
        else:
            superficie_comp = 0

    logger.debug(f"superficie_comp={superficie_comp}, frente={comparable.frente}, fondo_comp={fondo_comp}")

    # Get coefficient from fitto_cervini table for the comparable
    logger.debug("Obteniendo coeficiente del comparable")
    coeficiente = (
        coeficiente_fitto_cervini(
            comparable.frente,
            fondo_comp
        )
    )

    logger.debug(f"coeficiente={coeficiente}")

    # Validar que la superficie sea válida
    if superficie_comp <= 0:
        raise ValueError(f"Superficie inválida para comparable {comparable.direccion}: {superficie_comp}")

    # Store exact values for calculations
    valor_m2 = comparable.valor_total / superficie_comp
    valor_m2_exacto = valor_m2
    
    # Fórmula para valor_m2_homogeneizado: valor_m2 / coeficiente
    logger.debug(f"Calculando valor_m2_homogeneizado = {valor_m2} / {coeficiente}")
    valor_m2_homogeneizado_exacto = valor_m2 / coeficiente
    debug_formula = f"{round(valor_m2, 2)} / {round(coeficiente, 4)} = {round(valor_m2_homogeneizado_exacto, 2)}"
    logger.debug(debug_formula)

    return {

        "direccion": comparable.direccion,

        "tipo_valor": comparable.tipo_valor,

        "tipologia": comparable.tipologia,

        "superficie": round(
            superficie_comp,
            2
        ),

        "valor_total": comparable.valor_total,

        "valor_lote": comparable.valor_total,

        "valor_m2": round(
            valor_m2_exacto,
            2
        ),

        "frente": comparable.frente,

        "fondo": fondo_comp,

        "coef_fitto_comparable": round(
            coeficiente,
            4
        ),

        "coef_fitto_objetivo": None,

        "coef_tipologia": None,

        "ajuste_manual_porcentaje": 0,

        "valor_m2_homogeneizado": round(
            valor_m2_homogeneizado_exacto,
            2
        ),

        "debug_formula": debug_formula
    }

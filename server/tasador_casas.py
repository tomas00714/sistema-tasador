import logging
from typing import List

from tablas.ross_heidecke import coeficiente_depreciacion_ross_heidecke
from models import Comparable

logger = logging.getLogger(__name__)


def _calcular_valor_m2_referencia(comparables: List[Comparable], superficie_cubierta: float) -> float:
    """Calcula el valor m2 promedio a partir de los comparables."""

    if not comparables:
        raise ValueError("Se requiere al menos un comparable")

    valores_m2 = []
    for comp in comparables:
        superficie = getattr(comp, "superficie", None) or superficie_cubierta
        valor = getattr(comp, "valor_total", None) or getattr(comp, "valor", 0)
        if superficie and valor:
            valores_m2.append(valor / superficie)

    if not valores_m2:
        raise ValueError("Los comparables deben tener superficie y valor")

    return sum(valores_m2) / len(valores_m2)


def tasar_casa(datos):
    """
    Calcula el valor de una casa usando Ross-Heidecke en el backend.
    """
    logger.info(f"Iniciando tasar_casa - Dirección: {datos.direccion}")

    if not datos.comparables:
        raise ValueError("Se requiere al menos un comparable")

    superficie_cubierta = datos.superficie_cubierta
    if superficie_cubierta <= 0:
        raise ValueError("La superficie cubierta debe ser mayor a 0")

    vida_util = getattr(datos, "vida_util", 80) or 80

    advertencias = []
    if datos.antiguedad > vida_util:
        advertencias.append(
            f"La antigüedad ingresada ({datos.antiguedad} años) supera la vida útil "
            f"establecida ({vida_util} años). El inmueble alcanzaría el 100% de depreciación "
            "según Ross-Heidecke. Podés revisar o modificar la vida útil para recalcular."
        )

    coeficiente_ross = coeficiente_depreciacion_ross_heidecke(
        datos.antiguedad,
        datos.estado_conservacion,
        vida_util
    )
    caracteristica_constructiva = getattr(datos, "caracteristica_constructiva", 1) or 1

    if getattr(datos, "valor_m2_referencia", None) is None or datos.valor_m2_referencia is None:
        datos.valor_m2_referencia = _calcular_valor_m2_referencia(datos.comparables, superficie_cubierta)

    valor_m2 = datos.valor_m2_referencia
    valor_base = superficie_cubierta * valor_m2
    valor_final = valor_base * coeficiente_ross * caracteristica_constructiva

    ajuste_final = datos.ajuste_final_porcentaje or 0
    if ajuste_final:
        valor_final *= (1 + ajuste_final / 100)

    if datos.valor_final_manual is not None:
        valor_final = datos.valor_final_manual

    valor_minimo = valor_final * 0.9
    valor_maximo = valor_final * 1.1

    # Normalizar comparables para el frontend
    comparables_salida = []
    for comp in datos.comparables:
        superficie = getattr(comp, "superficie", None) or superficie_cubierta
        valor = getattr(comp, "valor_total", None) or getattr(comp, "valor", 0)
        ross_comp = coeficiente_depreciacion_ross_heidecke(
            getattr(comp, "antiguedad", 0),
            getattr(comp, "estado_conservacion", "") or getattr(comp, "estadoConservacion", ""),
            getattr(comp, "vida_util", vida_util) or vida_util
        )
        comparables_salida.append({
            "direccion": getattr(comp, "direccion", ""),
            "valor": valor,
            "valor_total": valor,
            "valor_m2": round(valor / superficie, 2) if superficie and valor else 0,
            "superficie": superficie,
            "rossHeidecke": round(ross_comp, 4),
            **comp.model_dump(exclude={"direccion", "valor_total", "superficie"})
        })

    return {
        "direccion": datos.direccion,
        "tipo": datos.tipo,
        "superficie": round(superficie_cubierta, 2),
        "superficie_cubierta": round(superficie_cubierta, 2),
        "valor_m2_referencia": round(valor_m2, 2),
        "rossHeidecke": round(coeficiente_ross, 4),
        "caracteristica_constructiva": round(caracteristica_constructiva, 2),
        "valor_final": round(valor_final, 2),
        "valor_m2": round(valor_final / superficie_cubierta, 2),
        "valor_minimo": round(valor_minimo, 2),
        "valor_maximo": round(valor_maximo, 2),
        "ajuste_final_porcentaje": ajuste_final,
        "advertencias": advertencias,
        "comparables": comparables_salida,
    }

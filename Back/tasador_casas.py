import logging
from typing import List

from models import Comparable

logger = logging.getLogger(__name__)


def _coeficiente_estado(estado_conservacion: str) -> float:
    """Mapea el texto de estado de conservación al coeficiente de valor."""

    # Normalizar a minúsculas para comparar de forma robusta
    estado = (estado_conservacion or "").lower().strip()

    # Si el texto empieza con un número (formato del frontend), usar mapeo numérico
    import re
    match = re.match(r"\s*(\d+)", estado)
    if match:
        nivel = int(match.group(1))
        mapeo_numerico = {
            1: 1.0,  # Nuevo / Muy bueno
            2: 0.9,  # Bueno / Conservación normal
            3: 0.8,  # Regular / Reparaciones sencillas
            4: 0.7,  # A reciclar / Reparaciones importantes
            5: 0.7,  # Demolición
        }
        return mapeo_numerico.get(nivel, 1.0)

    mapeo = {
        "a reciclar": 0.7,
        "regular": 0.8,
        "bueno": 0.9,
        "muy bueno": 1.0,
        "excelente": 1.1,
        "a estrenar": 1.2,
    }

    for clave, coef in mapeo.items():
        if clave in estado:
            return coef

    return 1.0


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
    Calcula el valor de una casa usando la misma lógica que el frontend,
    pero recibiendo los comparables y devolviendo el resultado completo.
    """

    logger.info(f"Iniciando tasar_casa - Dirección: {datos.direccion}")

    if not datos.comparables:
        raise ValueError("Se requiere al menos un comparable")

    superficie_cubierta = datos.superficie_cubierta
    if superficie_cubierta <= 0:
        raise ValueError("La superficie cubierta debe ser mayor a 0")

    coeficiente_estado = _coeficiente_estado(datos.estado_conservacion)
    coeficiente_calidad = getattr(datos, "calidad_construccion", 1) or 1

    if getattr(datos, "valor_m2_referencia", None) is None or datos.valor_m2_referencia is None:
        datos.valor_m2_referencia = _calcular_valor_m2_referencia(datos.comparables, superficie_cubierta)

    valor_m2 = datos.valor_m2_referencia
    valor_base = superficie_cubierta * valor_m2
    valor_final = valor_base * coeficiente_estado * coeficiente_calidad

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
        comparables_salida.append({
            "direccion": getattr(comp, "direccion", ""),
            "valor": valor,
            "valor_m2": round(valor / superficie, 2) if superficie and valor else 0,
            "superficie": superficie,
        })

    return {
        "direccion": datos.direccion,
        "tipo": datos.tipo,
        "superficie": round(superficie_cubierta, 2),
        "superficie_cubierta": round(superficie_cubierta, 2),
        "valor_m2_referencia": round(valor_m2, 2),
        "coeficiente_estado": round(coeficiente_estado, 2),
        "calidad_construccion": round(coeficiente_calidad, 2),
        "valor_final": round(valor_final, 2),
        "valor_m2": round(valor_final / superficie_cubierta, 2),
        "valor_minimo": round(valor_minimo, 2),
        "valor_maximo": round(valor_maximo, 2),
        "ajuste_final_porcentaje": ajuste_final,
        "comparables": comparables_salida,
    }

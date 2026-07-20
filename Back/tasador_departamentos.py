import logging
from tablas.ross_heidecke import coeficiente_ross_heidecke

logger = logging.getLogger(__name__)


def tasar_departamento(datos):
    """
    Calcula el valor de un departamento/PH usando la fórmula de depreciación de Ross y Heidecke.
    
    Args:
        datos: TasacionDepartamentoRequest con:
            - direccion: str
            - tipo: str (departamento o ph)
            - superficie_cubierta: float
            - antiguedad: int (años, máximo 80)
            - estado_conservacion: int (1-9)
            - valor_m2_referencia: float
            - ajuste_final_porcentaje: float (opcional)
            - valor_final_manual: float (opcional)
    
    Returns:
        dict con el resultado de la tasación
    """
    logger.info(f"Iniciando tasar_departamento - Dirección: {datos.direccion}")
    logger.debug(f"Superficie: {datos.superficie_cubierta}, Antigüedad: {datos.antiguedad}, Estado: {datos.estado_conservacion}")

    # Si no viene valor_m2_referencia pero hay comparables, calcularlo como promedio
    if getattr(datos, "valor_m2_referencia", None) is None or datos.valor_m2_referencia is None:
        if not datos.comparables:
            raise ValueError("Se requiere valor_m2_referencia o al menos un comparable")

        valores_m2 = []
        for comp in datos.comparables:
            superficie = getattr(comp, "superficie", None) or datos.superficie_cubierta
            valor = getattr(comp, "valor_total", None) or getattr(comp, "valor", 0)
            if superficie and valor:
                valores_m2.append(valor / superficie)

        if not valores_m2:
            raise ValueError("Los comparables deben tener superficie y valor")

        datos.valor_m2_referencia = sum(valores_m2) / len(valores_m2)
        logger.debug(f"valor_m2_referencia calculado desde comparables: {datos.valor_m2_referencia}")

    # Validar antigüedad máxima
    antiguedad = min(datos.antiguedad, 80)
    if antiguedad != datos.antiguedad:
        logger.warning(f"Antigüedad limitada a 80 años (era {datos.antiguedad})")
    
    # Calcular porcentaje de vida transcurrida usando regla de tres simple
    # 80 años = 100% de vida
    porcentaje_vida = round((antiguedad / 80) * 100)
    logger.debug(f"Porcentaje de vida transcurrida: {porcentaje_vida}%")
    
    # Obtener coeficiente K de la tabla Ross y Heidecke
    coeficiente_k = coeficiente_ross_heidecke(porcentaje_vida, datos.estado_conservacion)
    logger.debug(f"Coeficiente K: {coeficiente_k}")
    
    # Calcular coeficiente de depreciación C = 1 - k/2
    coeficiente_depreciacion = 1 - (coeficiente_k / 2)
    logger.debug(f"Coeficiente de depreciación C: {coeficiente_depreciacion}")
    
    # Calcular valor inicial
    valor_inicial = datos.superficie_cubierta * datos.valor_m2_referencia
    logger.debug(f"Valor inicial: {valor_inicial}")
    
    # Aplicar coeficiente de depreciación
    valor_depreciado = valor_inicial * coeficiente_depreciacion
    logger.debug(f"Valor depreciado: {valor_depreciado}")
    
    # Aplicar ajuste final si existe
    valor_final = valor_depreciado
    ajuste_final = datos.ajuste_final_porcentaje or 0
    if ajuste_final:
        valor_final *= (1 + ajuste_final / 100)
        logger.debug(f"Valor después de ajuste final ({ajuste_final}%): {valor_final}")
    
    # Usar valor manual si se proporciona
    if datos.valor_final_manual is not None:
        valor_final = datos.valor_final_manual
        logger.debug(f"Valor manual aplicado: {valor_final}")
    
    # Construir comparables normalizados para el frontend
    comparables_salida = []
    for comp in datos.comparables:
        superficie_comp = getattr(comp, "superficie", None) or datos.superficie_cubierta
        valor_comp = getattr(comp, "valor_total", None) or getattr(comp, "valor", 0)
        comparables_salida.append({
            "direccion": getattr(comp, "direccion", ""),
            "valor": valor_comp,
            "valor_m2": round(valor_comp / superficie_comp, 2) if superficie_comp and valor_comp else 0,
            "superficie": superficie_comp,
            "valor_total": valor_comp,
            **comp.model_dump(exclude={"direccion", "valor_total", "superficie"})
        })

    return {
        "direccion": datos.direccion,
        "tipo": datos.tipo,
        "superficie_cubierta": datos.superficie_cubierta,
        "superficie": datos.superficie_cubierta,
        "antiguedad": datos.antiguedad,
        "estado_conservacion": datos.estado_conservacion,
        "valor_m2_referencia": datos.valor_m2_referencia,
        "porcentaje_vida": porcentaje_vida,
        "coeficiente_k": round(coeficiente_k, 4),
        "coeficiente_depreciacion": round(coeficiente_depreciacion, 4),
        "valor_inicial": round(valor_inicial, 2),
        "valor_depreciado": round(valor_depreciado, 2),
        "valor_final": round(valor_final, 2),
        "valor_m2": round(valor_final / datos.superficie_cubierta, 2) if datos.superficie_cubierta > 0 else 0,
        "ajuste_final_porcentaje": ajuste_final,
        "rossHeidecke": round(coeficiente_k, 4),
        "comparables": comparables_salida,
    }

from tablas.ross_heidecke import coeficiente_ross_heidecke


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
    print(f"DEBUG: Iniciando tasar_departamento - Dirección: {datos.direccion}")
    print(f"DEBUG: Superficie: {datos.superficie_cubierta}, Antigüedad: {datos.antiguedad}, Estado: {datos.estado_conservacion}")
    
    # Validar antigüedad máxima
    antiguedad = min(datos.antiguedad, 80)
    if antiguedad != datos.antiguedad:
        print(f"DEBUG: Antigüedad limitada a 80 años (era {datos.antiguedad})")
    
    # Calcular porcentaje de vida transcurrida usando regla de tres simple
    # 80 años = 100% de vida
    porcentaje_vida = round((antiguedad / 80) * 100)
    print(f"DEBUG: Porcentaje de vida transcurrida: {porcentaje_vida}%")
    
    # Obtener coeficiente K de la tabla Ross y Heidecke
    coeficiente_k = coeficiente_ross_heidecke(porcentaje_vida, datos.estado_conservacion)
    print(f"DEBUG: Coeficiente K: {coeficiente_k}")
    
    # Calcular coeficiente de depreciación C = 1 - k/2
    coeficiente_depreciacion = 1 - (coeficiente_k / 2)
    print(f"DEBUG: Coeficiente de depreciación C: {coeficiente_depreciacion}")
    
    # Calcular valor inicial
    valor_inicial = datos.superficie_cubierta * datos.valor_m2_referencia
    print(f"DEBUG: Valor inicial: {valor_inicial}")
    
    # Aplicar coeficiente de depreciación
    valor_depreciado = valor_inicial * coeficiente_depreciacion
    print(f"DEBUG: Valor depreciado: {valor_depreciado}")
    
    # Aplicar ajuste final si existe
    valor_final = valor_depreciado
    ajuste_final = datos.ajuste_final_porcentaje or 0
    if ajuste_final:
        valor_final *= (1 + ajuste_final / 100)
        print(f"DEBUG: Valor después de ajuste final ({ajuste_final}%): {valor_final}")
    
    # Usar valor manual si se proporciona
    if datos.valor_final_manual is not None:
        valor_final = datos.valor_final_manual
        print(f"DEBUG: Valor manual aplicado: {valor_final}")
    
    return {
        "direccion": datos.direccion,
        "tipo": datos.tipo,
        "superficie_cubierta": datos.superficie_cubierta,
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
    }

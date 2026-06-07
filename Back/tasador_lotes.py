from services.homogeneizacion import (
    homogeneizar_comparable,
    obtener_superficie_lote,
)

from tablas.fitto_cervini import (
    coeficiente_fitto_cervini,
    normalizar_tipologia,
)
from tablas.valvano import coeficiente_valvano
from dataclasses import dataclass


@dataclass
class DatosLote:
    direccion: str
    tipologia: str
    zona: int
    frente: float
    fondo: float
    superficie: float
    comparables: list
    ajuste_final_porcentaje: float = None
    valor_final_manual: float = None


def _tasar_parte_lote(datos_parte):
    """Función auxiliar para tasar una parte del lote (esquina o medial)"""
    print(f"DEBUG: Tasando parte del lote - Frente: {datos_parte.frente}, Fondo: {datos_parte.fondo}, Superficie: {datos_parte.superficie}, Tipología: {datos_parte.tipologia}")

    superficie = datos_parte.superficie

    if superficie <= 0:
        raise ValueError("La superficie del lote debe ser mayor a 0")

    comparables_homogeneizados = []
    suma_valores_m2 = 0

    for comparable in datos_parte.comparables:
        resultado = homogeneizar_comparable(comparable, datos_parte)
        comparables_homogeneizados.append(resultado)
        suma_valores_m2 += resultado["valor_m2_homogeneizado"]

    valor_promedio_m2 = suma_valores_m2 / len(comparables_homogeneizados)
    valor_final = superficie * valor_promedio_m2

    # Calcular coeficiente Fitto y Cervini para el lote objetivo
    fondo_objetivo = datos_parte.fondo
    if fondo_objetivo is None and datos_parte.superficie and datos_parte.frente:
        fondo_objetivo = datos_parte.superficie / datos_parte.frente

    coeficiente_fitto_lote = 1.0
    if fondo_objetivo and datos_parte.frente:
        try:
            coeficiente_fitto_lote = coeficiente_fitto_cervini(datos_parte.frente, fondo_objetivo)
            print(f"DEBUG: Coeficiente Fitto-Cervini del lote objetivo: {coeficiente_fitto_lote}")
        except Exception as e:
            print(f"DEBUG: Error al calcular coeficiente Fitto-Cervini del lote objetivo: {e}")
            coeficiente_fitto_lote = 1.0

    # Aplicar coeficiente Fitto del lote objetivo al valor final
    valor_final *= coeficiente_fitto_lote

    # Aplicar coeficiente Valvano si es esquina
    coef_valvano, relacion_frentes = _coeficiente_esquina_valvano(datos_parte)
    if coef_valvano != 1.0:
        print(f"DEBUG: Aplicando coeficiente Valvano: {coef_valvano}")
        valor_final *= coef_valvano

    ajuste_final = datos_parte.ajuste_final_porcentaje or 0
    if ajuste_final:
        valor_final *= (1 + ajuste_final / 100)

    if datos_parte.valor_final_manual is not None:
        valor_final = datos_parte.valor_final_manual

    extras = {}
    if coef_valvano != 1.0:
        extras["coef_valvano"] = round(coef_valvano, 4)
        extras["relacion_frentes"] = relacion_frentes

    return {
        "direccion": datos_parte.direccion,
        "tipologia": normalizar_tipologia(datos_parte.tipologia),
        "frente": datos_parte.frente,
        "fondo": datos_parte.fondo,
        "superficie": round(superficie, 2),
        "valor_promedio_m2": round(valor_promedio_m2, 2),
        "valor_final": round(valor_final, 2),
        "valor_m2": round(valor_promedio_m2, 2),
        "ajuste_final_porcentaje": ajuste_final,
        "comparables": comparables_homogeneizados,
        "extras": extras,
        "coeficiente_fitto_lote": round(coeficiente_fitto_lote, 4),
        "coeficiente_ubicacion": 1.0,
        "coeficiente_actividad": 1.0,
    }


def _coeficiente_esquina_valvano(datos):

    if not datos.zona:
        return 1.0, None

    tipologia = normalizar_tipologia(datos.tipologia)

    if tipologia not in (
        "esquina",
        "esquina_larga",
    ):
        return 1.0, None

    fondo = datos.fondo
    if fondo is None and datos.superficie and datos.frente:
        fondo = datos.superficie / datos.frente

    if not fondo:
        return 1.0, None

    frente_menor = min(datos.frente, fondo)
    relacion = (datos.frente + fondo) / frente_menor

    coef = coeficiente_valvano(relacion, datos.zona)

    return coef, round(relacion, 2)


def tasar_lote(datos):

    print("DEBUG: Iniciando tasar_lote")

    if not datos.comparables:
        raise ValueError(
            "Se requiere al menos un comparable"
        )

    print(f"DEBUG: Cantidad de comparables: {len(datos.comparables)}")

    # Detectar si es esquina +30m
    tipologia = normalizar_tipologia(datos.tipologia)
    es_esquina_larga = tipologia == "esquina_larga"

    if es_esquina_larga:
        print("DEBUG: Detectado esquina +30m, dividiendo tasación en 2 partes")
        return _tasar_esquina_larga(datos)
    else:
        return _tasar_lote_normal(datos)


def _tasar_lote_normal(datos):
    """Tasación normal para lotes que no son esquina +30m"""
    print("DEBUG: Tasación normal")

    superficie = obtener_superficie_lote(datos)
    print(f"DEBUG: Superficie: {superficie}")

    if superficie <= 0:
        raise ValueError("La superficie del lote debe ser mayor a 0")

    comparables_homogeneizados = []
    suma_valores_m2 = 0

    print("DEBUG: Iniciando loop de comparables")

    for i, comparable in enumerate(datos.comparables):
        print(f"DEBUG: Procesando comparable {i+1}/{len(datos.comparables)}")
        resultado = homogeneizar_comparable(comparable, datos)
        print(f"DEBUG: Comparable {i+1} procesado")
        comparables_homogeneizados.append(resultado)
        suma_valores_m2 += resultado["valor_m2_homogeneizado"]

    valor_promedio_m2 = suma_valores_m2 / len(comparables_homogeneizados)
    valor_final = superficie * valor_promedio_m2

    # Calcular coeficiente Fitto y Cervini para el lote objetivo
    # Para salida a dos calles, no se usa coeficiente Fitto-Cervini
    tipologia = normalizar_tipologia(datos.tipologia)
    if tipologia == "dos_calles":
        coeficiente_fitto_lote = 1.0
        print(f"DEBUG: Salida a dos calles - no se aplica coeficiente Fitto-Cervini")
    else:
        fondo_objetivo = datos.fondo
        if fondo_objetivo is None and datos.superficie and datos.frente:
            fondo_objetivo = datos.superficie / datos.frente

        coeficiente_fitto_lote = 1.0
        if fondo_objetivo and datos.frente:
            try:
                coeficiente_fitto_lote = coeficiente_fitto_cervini(datos.frente, fondo_objetivo)
                print(f"DEBUG: Coeficiente Fitto-Cervini del lote objetivo: {coeficiente_fitto_lote}")
            except Exception as e:
                print(f"DEBUG: Error al calcular coeficiente Fitto-Cervini del lote objetivo: {e}")
                coeficiente_fitto_lote = 1.0

    # Aplicar coeficiente Fitto del lote objetivo al valor final (solo si no es dos_calles)
    if tipologia != "dos_calles":
        print(f"DEBUG: Valor final antes de aplicar coeficiente Fitto: {valor_final}")
        valor_final *= coeficiente_fitto_lote
        print(f"DEBUG: Valor final después de aplicar coeficiente Fitto ({coeficiente_fitto_lote}): {valor_final}")

    coef_valvano, relacion_frentes = _coeficiente_esquina_valvano(datos)
    if coef_valvano != 1.0:
        print(f"DEBUG: Aplicando coeficiente Valvano: {coef_valvano}")
        valor_final *= coef_valvano
        print(f"DEBUG: Valor final después de aplicar Valvano: {valor_final}")

    ajuste_final = datos.ajuste_final_porcentaje or 0
    if ajuste_final:
        valor_final *= (1 + ajuste_final / 100)

    if datos.valor_final_manual is not None:
        valor_final = datos.valor_final_manual

    extras = {}
    if coef_valvano != 1.0:
        extras["coef_valvano"] = round(coef_valvano, 4)
        extras["relacion_frentes"] = relacion_frentes

    return {
        "direccion": datos.direccion,
        "tipologia": normalizar_tipologia(datos.tipologia),
        "superficie": round(superficie, 2),
        "valor_promedio_m2": round(valor_promedio_m2, 2),
        "valor_final": round(valor_final, 2),
        "valor_m2": round(valor_promedio_m2, 2),
        "ajuste_final_porcentaje": ajuste_final,
        "comparables": comparables_homogeneizados,
        "extras": extras,
        "coeficiente_fitto_lote": round(coeficiente_fitto_lote, 4) if tipologia != "dos_calles" else None,
        "coeficiente_ubicacion": 1.0,
        "coeficiente_actividad": 1.0,
    }


def _tasar_esquina_larga(datos):
    """Tasación para esquina +30m: divide en esquina hasta 30m y medial del excedente"""
    print("DEBUG: Tasación esquina +30m")

    frente = datos.frente
    fondo = datos.fondo
    if fondo is None and datos.superficie and datos.frente:
        fondo = datos.superficie / datos.frente

    # Determinar qué lado excede 30m
    if fondo > 30:
        # El fondo excede, se tasa esquina hasta 30m de fondo
        print(f"DEBUG: Fondo excede 30m ({fondo}m), dividiendo en esquina (30m) y medial ({fondo - 30}m)")
        frente_esquina = frente
        fondo_esquina = 30
        frente_medial = fondo - 30
        fondo_medial = frente
    elif frente > 30:
        # El frente excede, se tasa esquina hasta 30m de frente
        print(f"DEBUG: Frente excede 30m ({frente}m), dividiendo en esquina (30m) y medial ({frente - 30}m)")
        frente_esquina = 30
        fondo_esquina = fondo
        frente_medial = frente - 30
        fondo_medial = fondo
    else:
        # Ningún lado excede 30m, esto no debería pasar por la validación del frontend
        raise ValueError("Para esquina +30m, uno de los lados debe ser mayor a 30m")

    # HOMOGENEIZACIÓN ÚNICA con los datos originales
    print("DEBUG: Homogeneizando comparables una sola vez")
    comparables_homogeneizados = []
    suma_valores_m2 = 0

    for comparable in datos.comparables:
        resultado = homogeneizar_comparable(comparable, datos)
        comparables_homogeneizados.append(resultado)
        suma_valores_m2 += resultado["valor_m2_homogeneizado"]

    valor_promedio_m2 = suma_valores_m2 / len(comparables_homogeneizados)
    print(f"DEBUG: Valor promedio m2 homogeneizado: {valor_promedio_m2}")

    # Calcular valores para la parte de esquina
    superficie_esquina = frente_esquina * fondo_esquina
    valor_inicial_esquina = superficie_esquina * valor_promedio_m2

    # Coeficiente Fitto-Cervini para esquina
    coef_fitto_esquina = 1.0
    if fondo_esquina and frente_esquina:
        try:
            coef_fitto_esquina = coeficiente_fitto_cervini(frente_esquina, fondo_esquina)
            print(f"DEBUG: Coeficiente Fitto-Cervini esquina: {coef_fitto_esquina}")
        except Exception as e:
            print(f"DEBUG: Error al calcular coeficiente Fitto-Cervini esquina: {e}")
            coef_fitto_esquina = 1.0

    valor_esquina = valor_inicial_esquina * coef_fitto_esquina

    # Coeficiente Valvano para esquina
    datos_esquina_valvano = DatosLote(
        direccion=datos.direccion,
        tipologia="esquina",
        zona=datos.zona,
        frente=frente_esquina,
        fondo=fondo_esquina,
        superficie=superficie_esquina,
        comparables=datos.comparables,
        ajuste_final_porcentaje=datos.ajuste_final_porcentaje,
        valor_final_manual=None,
    )
    coef_valvano, relacion_frentes = _coeficiente_esquina_valvano(datos_esquina_valvano)
    if coef_valvano != 1.0:
        print(f"DEBUG: Aplicando coeficiente Valvano esquina: {coef_valvano}")
        valor_esquina *= coef_valvano

    # Ajuste final para esquina
    ajuste_final = datos.ajuste_final_porcentaje or 0
    if ajuste_final:
        valor_esquina *= (1 + ajuste_final / 100)

    extras_esquina = {}
    if coef_valvano != 1.0:
        extras_esquina["coef_valvano"] = round(coef_valvano, 4)
        extras_esquina["relacion_frentes"] = relacion_frentes

    # Calcular valores para la parte medial
    superficie_medial = frente_medial * fondo_medial
    valor_inicial_medial = superficie_medial * valor_promedio_m2

    # Coeficiente Fitto-Cervini para medial
    coef_fitto_medial = 1.0
    if fondo_medial and frente_medial:
        try:
            coef_fitto_medial = coeficiente_fitto_cervini(frente_medial, fondo_medial)
            print(f"DEBUG: Coeficiente Fitto-Cervini medial: {coef_fitto_medial}")
        except Exception as e:
            print(f"DEBUG: Error al calcular coeficiente Fitto-Cervini medial: {e}")
            coef_fitto_medial = 1.0

    valor_medial = valor_inicial_medial * coef_fitto_medial

    # Ajuste final para medial
    if ajuste_final:
        valor_medial *= (1 + ajuste_final / 100)

    extras_medial = {}

    # Calcular valores totales
    superficie_total = superficie_esquina + superficie_medial
    valor_final_total = valor_esquina + valor_medial
    valor_m2_total = valor_final_total / superficie_total if superficie_total > 0 else 0

    print(f"DEBUG: Resultado esquina - Superficie: {superficie_esquina}, Valor: {valor_esquina}")
    print(f"DEBUG: Resultado medial - Superficie: {superficie_medial}, Valor: {valor_medial}")
    print(f"DEBUG: Total - Superficie: {superficie_total}, Valor: {valor_final_total}, Valor/m2: {valor_m2_total}")

    # Construir resultados parciales para el frontend
    resultado_esquina = {
        "direccion": datos.direccion,
        "tipologia": "Esquina",
        "frente": frente_esquina,
        "fondo": fondo_esquina,
        "superficie": round(superficie_esquina, 2),
        "valor_promedio_m2": round(valor_promedio_m2, 2),
        "valor_final": round(valor_esquina, 2),
        "valor_m2": round(valor_esquina / superficie_esquina, 2) if superficie_esquina > 0 else 0,
        "ajuste_final_porcentaje": ajuste_final,
        "comparables": comparables_homogeneizados,
        "extras": extras_esquina,
        "coeficiente_fitto_lote": round(coef_fitto_esquina, 4),
        "coeficiente_ubicacion": 1.0,
        "coeficiente_actividad": 1.0,
    }

    resultado_medial = {
        "direccion": datos.direccion,
        "tipologia": "Medial",
        "frente": frente_medial,
        "fondo": fondo_medial,
        "superficie": round(superficie_medial, 2),
        "valor_promedio_m2": round(valor_promedio_m2, 2),
        "valor_final": round(valor_medial, 2),
        "valor_m2": round(valor_medial / superficie_medial, 2) if superficie_medial > 0 else 0,
        "ajuste_final_porcentaje": ajuste_final,
        "comparables": comparables_homogeneizados,
        "extras": extras_medial,
        "coeficiente_fitto_lote": round(coef_fitto_medial, 4),
        "coeficiente_ubicacion": 1.0,
        "coeficiente_actividad": 1.0,
    }

    return {
        "direccion": datos.direccion,
        "tipologia": normalizar_tipologia(datos.tipologia),
        "superficie": round(superficie_total, 2),
        "valor_promedio_m2": round(valor_m2_total, 2),
        "valor_final": round(valor_final_total, 2),
        "valor_m2": round(valor_m2_total, 2),
        "ajuste_final_porcentaje": datos.ajuste_final_porcentaje or 0,
        "comparables": comparables_homogeneizados,
        "extras": {},
        "coeficiente_fitto_lote": 1.0,  # No aplica para esquina +30m
        "coeficiente_ubicacion": 1.0,
        "coeficiente_actividad": 1.0,
        # Resultados parciales para mostrar en el frontend
        "resultado_esquina": resultado_esquina,
        "resultado_medial": resultado_medial,
    }

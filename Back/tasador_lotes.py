from services.homogeneizacion import (
    homogeneizar_comparable,
    obtener_superficie_lote,
)

from tablas.fitto_cervini import normalizar_tipologia
from tablas.valvano import coeficiente_valvano


def _coeficiente_esquina_valvano(datos):

    if not datos.zona:
        return 1.0, None

    tipologia = normalizar_tipologia(datos.tipologia)

    if tipologia not in (
        "esquina",
        "esquina_larga",
        "dos_calles",
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

    superficie = obtener_superficie_lote(
        datos
    )

    print(f"DEBUG: Superficie: {superficie}")

    if superficie <= 0:
        raise ValueError(
            "La superficie del lote debe ser mayor a 0"
        )

    comparables_homogeneizados = []
    suma_valores_m2 = 0

    print("DEBUG: Iniciando loop de comparables")

    for i, comparable in enumerate(datos.comparables):

        print(f"DEBUG: Procesando comparable {i+1}/{len(datos.comparables)}")

        resultado = homogeneizar_comparable(
            comparable,
            datos
        )

        print(f"DEBUG: Comparable {i+1} procesado")

        comparables_homogeneizados.append(
            resultado
        )

        suma_valores_m2 += resultado[
            "valor_m2_homogeneizado"
        ]

    valor_promedio_m2 = (
        suma_valores_m2
        / len(comparables_homogeneizados)
    )

    valor_final = (
        superficie
        * valor_promedio_m2
    )

    coef_valvano, relacion_frentes = (
        _coeficiente_esquina_valvano(datos)
    )

    valor_final *= coef_valvano

    ajuste_final = datos.ajuste_final_porcentaje or 0

    if ajuste_final:
        valor_final *= (1 + ajuste_final / 100)

    if datos.valor_final_manual is not None:
        valor_final = datos.valor_final_manual

    extras = {}

    if coef_valvano != 1.0:
        extras["coef_valvano"] = round(
            coef_valvano, 4
        )
        extras["relacion_frentes"] = relacion_frentes

    return {

        "direccion": datos.direccion,

        "tipologia": normalizar_tipologia(
            datos.tipologia
        ),

        "superficie": round(
            superficie,
            2
        ),

        "valor_promedio_m2": round(
            valor_promedio_m2,
            2
        ),

        "valor_final": round(
            valor_final,
            2
        ),

        "ajuste_final_porcentaje": ajuste_final,

        "comparables": (
            comparables_homogeneizados
        ),

        "extras": extras,
    }

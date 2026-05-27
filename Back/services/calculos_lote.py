from tablas.fitto_cervini import (
    coeficiente_medial
)

from tablas.valvano import (
    coeficiente_valvano
)


def calcular_medial(
    superficie,
    valor_promedio_m2
):

    return (
        superficie
        * coeficiente_medial()
        * valor_promedio_m2
    )


def calcular_irregular(
    frente,
    superficie,
    valor_promedio_m2
):

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


def calcular_esquina(
    datos,
    superficie,
    valor_promedio_m2
):

    frente_menor = min(
        datos.frente,
        datos.fondo
    )

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
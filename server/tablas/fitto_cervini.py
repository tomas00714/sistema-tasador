import json
import logging
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent / "fitto_cervini_data.json"

try:
    with open(_DATA_PATH, encoding="utf-8") as f:
        _DATOS = json.load(f)["tablas"]
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Error al cargar datos de Fitto-Cervini: {e}")
    _DATOS = []

logger = logging.getLogger(__name__)


def interpolar(x, x1, x2, q1, q2):
    if x1 == x2:
        return q1
    return q1 + (x - x1) * (q2 - q1) / (x2 - x1)


def _clamp(valor, lista):
    # Protege los límites de la lista evitando desbordamientos
    if valor <= lista[0]:
        return lista[0], lista[0]
    if valor >= lista[-1]:
        return lista[-1], lista[-1]

    menores = [x for x in lista if x <= valor]
    mayores = [x for x in lista if x >= valor]

    return max(menores), min(mayores)


def obtener_indices(valor, lista):
    return _clamp(valor, sorted(lista))


def _elegir_tabla(frente):
    """
    Selecciona la tabla correspondiente según el frente.
    Si el frente se pasa del límite, selecciona la última tabla disponible
    en lugar de reiniciar a la primera de forma errónea.
    """
    for tabla in _DATOS:
        fmin = tabla["frente_min"]
        fmax = tabla["frente_max"]

        if fmin is not None and fmax is not None:
            if fmin <= frente <= fmax:
                return tabla
            
    # Si el frente supera el máximo de todas las tablas, usamos la última (23.50 a 30m)
    if frente > _DATOS[-1]["frente_max"]:
        return _DATOS[-1]

    return _DATOS[0]


def coeficiente_fitto_cervini(frente, fondo):
    try:
        # Asegurar que las entradas sean numéricas
        frente = float(frente)
        fondo = float(fondo)

        if not _DATOS:
            logger.error("Datos de Fitto-Cervini no cargados correctamente")
            raise ValueError("Datos de Fitto-Cervini no disponibles")

        tabla = _elegir_tabla(frente)

        frentes = [float(f) for f in tabla["frentes"]]
        fondos = [float(f) for f in tabla["fondos"]]
        valores = tabla["valores"]

        f1, f2 = obtener_indices(frente, frentes)
        d1, d2 = obtener_indices(fondo, fondos)

        def celda(ff, dd):
            row = valores.get(str(int(dd)))
            if row is None:
                row = valores.get(str(dd))
            if row is None:
                raise KeyError(f"Fondo {dd} no se encuentra registrado en las tablas de datos.")
            
            clave = str(ff)
            return float(row[clave])

        try:
            q11 = celda(f1, d1)
            q12 = celda(f1, d2)
            q21 = celda(f2, d1)
            q22 = celda(f2, d2)
        except KeyError as e:
            logger.error(f"Error al buscar celda en tabla Fitto-Cervini: {e}")
            raise ValueError(f"Error en tabla Fitto-Cervini: {e}")

        r1 = interpolar(fondo, d1, d2, q11, q12)
        r2 = interpolar(fondo, d1, d2, q21, q22)

        valor_final = interpolar(frente, f1, f2, r1, r2)

        # Convertir el índice de la tabla a coeficiente (dividir por 100)
        coeficiente = valor_final / 100

        return round(coeficiente, 4)
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error inesperado al calcular coeficiente Fitto-Cervini: {e}")
        raise ValueError(f"Error al calcular coeficiente Fitto-Cervini: {e}")


def coeficiente_tipologia(tipologia):
    if not tipologia:
        return 1.0

    t = str(tipologia).lower().strip()

    # Simplificado y limpio eliminando redundancias
    tabla = {
        "medial": 1.00,
        "esquina": 1.10,
        "esquina_larga": 1.15,
        "esquina larga (+30m)": 1.15,
        "dos_calles": 1.08,
        "salida a dos calles": 1.08,
        "irregular": 0.95,
    }

    return tabla.get(t, 1.0)


def normalizar_tipologia(tipologia_lote):
    if not tipologia_lote:
        return "medial"

    t = str(tipologia_lote).lower().strip()

    mapa = {
        "medial": "medial",
        "esquina": "esquina",
        "esquina larga (+30m)": "esquina_larga",
        "esquina_larga": "esquina_larga",
        "salida a dos calles": "dos_calles",
        "dos_calles": "dos_calles",
        "irregular": "irregular",
    }

    return mapa.get(t, "medial")
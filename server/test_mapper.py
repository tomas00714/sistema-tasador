"""
Script para testear el mapper de comparables.
"""

import sys
sys.path.insert(0, '.')

from utils.hybrid_mapper import mapear_comparable_a_columnas
import json

# Payload simulado (lo que llega al mapper)
datos = {
    "fuente": "manual",
    "tipoInmueble": "departamento",
    "ubicacion": {
        "direccion": "Calle Test 123",
        "provincia": "Buenos Aires",
        "localidad": "Mar del Plata",
        "lat": -38.0,
        "lon": -57.5
    },
    "valor": 70000,
    "tipoValor": "venta",
    "tasacionOrigenId": None,
    "tipoLote": None,
    "frente": None,
    "fondo": None,
    "superficie": 40,
    "superficieCubierta": "40",  # ← No es columna en BD
    "superficieTerreno": None,
    "superficieTotal": "40",  # ← No es columna en BD
    "antiguedad": 10,
    "estadoConservacion": "Bueno",
    "ambientes": "Monoambiente",  # ← Nivel superior
    "dormitorios": None,
    "banos": "1",
    "cochera": False,
    "tieneAscensor": True,
    "tienePileta": None,
    "tieneJardin": None,
    "idEnviador": None,
    "idCreador": None,
    "nombreCreador": None,
    "fuenteInformacion": {
        "tipo": "inmobiliaria",
        "detalle": "Test Inmobiliaria"
    },
    "lote": None,
    "departamento": {
        "ambientes": "Monoambiente",
        "dormitorios": None,
        "banos": "1",
        "cochera": False,
        "tieneAscensor": True,
        "ubicacionPlanta": "Baja",  # ← No es columna en BD
        "ubicacionPiso": "1",  # ← No es columna en BD
        "caracteristicaConstructiva": "Hormigón",  # ← No es columna en BD
        "superficieCubierta": "40",
        "superficieTotal": "40",
        "antiguedad": 10,
        "estadoConservacion": "Bueno"
    },
    "casa": None,
    "observaciones": "",
    "fechaCreacion": "2024-01-01T00:00:00Z"
}

print("=== Input al mapper ===")
print(json.dumps(datos, indent=2))

columnas = mapear_comparable_a_columnas(datos)

print("\n=== Output del mapper (columnas a insertar) ===")
print(json.dumps(columnas, indent=2))

print("\n=== Campos que NO son columnas de la tabla ===")
columnas_validas = {
    'id', 'uuid', 'usuario_id', 'tasacion_origen_id',
    'direccion', 'provincia', 'localidad', 'codigo_postal', 'lat', 'lon',
    'tipo_inmueble', 'fuente', 'tipo_valor',
    'valor', 'valor_m2', 'superficie', 'frente', 'fondo',
    'tipo_lote',
    'ambientes', 'dormitorios', 'banos', 'cochera', 'tiene_ascensor',
    'tiene_pileta', 'tiene_jardin',
    'fecha_creacion', 'fecha_modificacion', 'datos', 'observaciones',
    'id_enviador', 'id_creador', 'nombre_creador'
}

invalidos = set(columnas.keys()) - columnas_validas
if invalidos:
    print(f"Campos inválidos: {invalidos}")
else:
    print("Todos los campos son válidos")

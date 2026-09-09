"""
Test del mapper para departamento.
"""

import sys
sys.path.insert(0, '.')

from utils.hybrid_mapper import mapear_comparable_a_columnas
import json

# Payload desde entidades.js (nivel superior + nivel anidado)
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
    "superficieCubierta": "40",
    "superficieTerreno": None,
    "superficieTotal": "40",
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
        "ubicacionPlanta": "Baja",
        "ubicacionPiso": "1",
        "caracteristicaConstructiva": "Hormigon",
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
print(f"ambientes (nivel superior): {datos.get('ambientes')}")
print(f"departamento.ambientes (nivel anidado): {datos.get('departamento', {}).get('ambientes')}")

columnas = mapear_comparable_a_columnas(datos)

print("\n=== Output del mapper ===")
print(json.dumps(columnas, indent=2))

print("\n=== Campos que NO deberian estar ===")
campos_invalidos = ['ambientes', 'dormitorios', 'banos', 'cochera', 'tieneAscensor']
for campo in campos_invalidos:
    if campo in columnas:
        print(f"{campo}: {columnas[campo]}")

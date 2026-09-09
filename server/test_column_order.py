"""
Script para verificar el orden de columnas en el INSERT.
"""

import json

# Columnas en el orden que devuelve el mapper
columnas_mapper = {
    "direccion": "Calle Test 123",
    "provincia": "Buenos Aires",
    "localidad": "Mar del Plata",
    "lat": -38.0,
    "lon": -57.5,
    "tipo_inmueble": "departamento",
    "valor": 70000.0,
    "superficie": 40.0,
    "tipo_valor": "venta",
    "ambientes": "Monoambiente",
    "banos": "1",
    "cochera": False,
    "tiene_ascensor": True
}

# Columnas que se agregan en main.py
columnas_main = {
    "usuario_id": 1,
    "tipo_inmueble": "departamento",
    "fuente": "manual",
    "datos": {"test": "data"}
}

# Columnas combinadas (como se hace con .update())
columnas_combinadas = {**columnas_main, **columnas_mapper}

print("=== Orden de columnas después de .update() ===")
for i, (col, val) in enumerate(columnas_combinadas.items(), 1):
    print(f"{i}. {col}: {val}")

print("\n=== Columnas duplicadas ===")
from collections import Counter
conteo = Counter(columnas_combinadas.keys())
duplicados = {k: v for k, v in conteo.items() if v > 1}
if duplicados:
    print(f"Columnas duplicadas: {duplicados}")
else:
    print("No hay duplicados")

print("\n=== Orden esperado en la tabla (según schema) ===")
orden_esperado = [
    "id", "usuario_id", "tasacion_origen_id",
    "direccion", "provincia", "localidad", "codigo_postal", "lat", "lon",
    "tipo_inmueble", "fuente", "tipo_valor",
    "valor", "valor_m2", "superficie", "frente", "fondo",
    "tipo_lote",
    "ambientes", "dormitorios", "banos", "cochera", "tiene_ascensor",
    "tiene_pileta", "tiene_jardin",
    "fecha_creacion", "fecha_modificacion", "datos", "observaciones",
    "id_enviador", "id_creador", "nombre_creador"
]

for i, col in enumerate(orden_esperado, 1):
    valor = columnas_combinadas.get(col, "NO ENVIADO")
    print(f"{i}. {col}: {valor}")

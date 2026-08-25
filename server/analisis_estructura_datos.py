"""
ANÁLISIS DE ESTRUCTURA DE DATOS - INCONSISTENCIA DETECTADA

Investigación de la línea en main.py:
comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables if c.get('id')]

Necesito determinar:
1. Qué estructura devuelve repo.obtener_comparables()
2. Qué estructura espera el frontend en entidades.js
3. Qué estructura usa tasacion-datos.js
4. Qué estructura usa tasacion-navegacion.js
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

print("=" * 80)
print("ANÁLISIS DE ESTRUCTURA DE DATOS - BACKEND")
print("=" * 80)

# Simular lo que hace obtener_comparables()
print("\n--- SIMULACIÓN DE obtener_comparables() ---")
print("Query: SELECT tc.snapshot, tc.comparable_id, tc.orden FROM tasacion_comparable tc WHERE tc.tasacion_id = %s ORDER BY tc.orden")

# Como no hay datos, voy a mostrar la estructura esperada
print("\nEstructura que devuelve obtener_comparables():")
print("  Array de objetos con:")
print("    - snapshot: JSONB (objeto completo del comparable)")
print("    - comparable_id: integer (ID del comparable)")
print("    - orden: integer")

print("\nEstructura actual de cada snapshot:")
print("  snapshot contiene:")
print("    - direccion")
print("    - lat")
print("    - lon")
print("    - tipo_inmueble")
print("    - tipo_valor")
print("    - valor")
print("    - valor_m2")
print("    - superficie")
print("    - frente")
print("    - fondo")
print("    - tipo_lote")
print("    - ambientes")
print("    - dormitorios")
print("    - banos")
print("    - cochera")
print("    - tiene_ascensor")
print("    - tiene_pileta")
print("    - tiene_jardin")
print("    - datos (objeto)")

print("\n--- LO QUE HACE main.py línea 647 ---")
print("comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables if c.get('id')]")
print("\nEsto asume que:")
print("  - comparables es un array de objetos")
print("  - cada objeto tiene un campo 'id'")
print("  - ese 'id' se convierte a código público")

print("\nPERO obtener_comparables() devuelve:")
print("  - snapshot (JSONB completo)")
print("  - comparable_id (integer)")
print("  - orden (integer)")

print("\nEl problema es que obtener_comparables() devuelve:")
print("  - snapshot: {direccion, lat, lon, ...}")
print("  - comparable_id: 123")
print("  - orden: 0")

print("Y luego en el código hace:")
print("  snapshot['id'] = row_dict.get('comparable_id')")
print("  results.append(snapshot)")

print("Así que 'c['id']' es el comparable_id integer")
print("Y se genera código público desde ese ID")

print("\n--- LO QUE ESPERA EL FRONTEND ---")
print("entidades.js línea 28:")
print("  comparables: t.comparables_ids || []")
print("\nEsto espera que t.comparables_ids sea un array de IDs públicos")

print("\ntasacion-datos.js línea 190-192:")
print("  if (datosCompletos.comparables && datosCompletos.comparables.length > 0) {")
print("    datosTasacion.comparables = JSON.parse(JSON.stringify(datosCompletos.comparables));")
print("  }")
print("\nEsto espera que datosCompletos.comparables sea un array de objetos completos")

print("\n--- INCONSISTENCIA DETECTADA ---")
print("Backend devuelve en TasacionResponse:")
print("  - comparables_ids: array de códigos públicos (generados desde snapshots)")
print("  - datos: objeto con datos.datos.comparables (que viene de la base)")

print("Frontend entidades.js:")
print("  - Mapea t.comparables_ids a comparables (array de IDs)")
print("  - Mapea t.datos a datosCompletos")

print("Frontend tasacion-datos.js:")
print("  - Usa datosCompletos.comparables (objeto de datos)")
print("  - NO usa comparables (array de IDs)")

print("Posible conflicto:")
print("  - El frontend usa datos.datos.comparables")
print("  - Pero el modelo snapshot dice que la fuente de verdad es tasacion_comparable.snapshot")
print("  - Puede haber inconsistencia entre datos.datos.comparables y snapshots")

cursor.close()
conn.close()

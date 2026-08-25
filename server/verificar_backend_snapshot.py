import os
import psycopg2
from dotenv import load_dotenv
import json

load_dotenv()

# IDs de prueba
C1_ID = 143
T1_ID = 50
T2_ID = 51

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

print("=" * 80)
print("VERIFICACIÓN DEL BACKEND - MODELO SNAPSHOT")
print("=" * 80)

# Simular lo que hace obtener_comparables()
print(f"\n--- TEST: obtener_comparables() para T1 (ID: {T1_ID}) ---")

cursor.execute("""
    SELECT tc.snapshot, tc.comparable_id, tc.orden
    FROM tasacion_comparable tc
    WHERE tc.tasacion_id = %s
    ORDER BY tc.orden
""", (T1_ID,))

results = cursor.fetchall()
print(f"Resultados crudos de la query:")
for row in results:
    snapshot = row[0]
    comparable_id = row[1]
    orden = row[2]
    print(f"  snapshot: {snapshot}")
    print(f"  comparable_id: {comparable_id}")
    print(f"  orden: {orden}")

# Simular el procesamiento que hace el repo
print(f"\n--- Procesamiento del repositorio ---")
comparables = []
for row in results:
    row_dict = {
        'snapshot': row[0],
        'comparable_id': row[1],
        'orden': row[2]
    }
    snapshot = row_dict.get('snapshot', {})
    if isinstance(snapshot, dict):
        snapshot['id'] = row_dict.get('comparable_id')
        comparables.append(snapshot)

print(f"Comparables procesados (array de snapshots con ID agregado):")
for comp in comparables:
    print(f"  ID: {comp.get('id')}")
    print(f"  Dirección: {comp.get('direccion')}")
    print(f"  Valor: {comp.get('valor')}")

# Simular lo que hace main.py
print(f"\n--- Generación de comparables_ids en main.py ---")
# from utils.id_encoder import generar_codigo_publico, TIPO_COMPARABLE
# Simular generar_codigo_publico
def generar_codigo_publico(tipo, id_int):
    # Simulación simple del encoder
    return f"TEST{id_int}"

comparables_ids = [generar_codigo_publico("COMP", c['id']) for c in comparables if c.get('id')]
print(f"comparables_ids generados: {comparables_ids}")

# Verificar qué está en datos.comparables
print(f"\n--- Verificación de datos.comparables en T1 ---")
cursor.execute("""
    SELECT datos->'comparables' as datos_comparables
    FROM tasaciones
    WHERE id = %s
""", (T1_ID,))

datos_comparables = cursor.fetchone()[0]
print(f"datos.comparables en T1: {datos_comparables}")

print(f"\n--- ANÁLISIS DE INCONSISTENCIA ---")
print(f"Backend tendría que devolver:")
print(f"  - comparables_ids: {comparables_ids} (códigos públicos)")
print(f"  - datos: {{..., comparables: {datos_comparables}}} (de la base)")

print(f"\nFrontend entidades.js hace:")
print(f"  comparables: t.comparables_ids || []")
print(f"  datosCompletos: t.datos")

print(f"\nFrontend tasacion-datos.js hace:")
print(f"  if (datosCompletos.comparables && datosCompletos.comparables.length > 0) {{")
print(f"    datosTasacion.comparables = JSON.parse(JSON.stringify(datosCompletos.comparables));")
print(f"  }}")

print(f"\n--- PROBLEMA DETECTADO ---")
print(f"El frontend usa datosCompletos.comparables que viene de:")
print(f"  - datos.datos.comparables de la base (que está vacío o desactualizado)")
print(f"  - NO usa los snapshots que vienen de tasacion_comparable.snapshot")

print(f"Esto crea una inconsistencia porque:")
print(f"  - La fuente de verdad debería ser tasacion_comparable.snapshot")
print(f"  - Pero el frontend todavía usa datos.datos.comparables")

cursor.close()
conn.close()

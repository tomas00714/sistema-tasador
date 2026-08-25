import os
import psycopg2
import json
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
print("DETALLE DE RELACIONES SIN datos.comparables")
print("=" * 80)

cursor.execute("""
    SELECT 
        tc.id as relation_id,
        tc.tasacion_id,
        tc.comparable_id,
        t.datos->'comparables' as datos_comparables,
        t.datos
    FROM tasacion_comparable tc
    LEFT JOIN tasaciones t ON tc.tasacion_id = t.id
    WHERE t.datos->'comparables' IS NULL
    OR jsonb_typeof(t.datos->'comparables') != 'array'
    OR jsonb_array_length(t.datos->'comparables') = 0
""")

relations = cursor.fetchall()
print(f"\nTotal de relaciones sin datos.comparables: {len(relations)}\n")

for rel in relations:
    print(f"Relación ID: {rel[0]}")
    print(f"  Tasación ID: {rel[1]}")
    print(f"  Comparable ID: {rel[2]}")
    print(f"  datos.comparables: {rel[3]}")
    if rel[4]:
        datos_dict = dict(rel[4])
        print(f"  datos completo tiene {len(datos_dict)} campos")
    print()

print("=" * 80)
print("DETALLE DE TASACIONES CON objetos completos")
print("=" * 80)

cursor.execute("""
    SELECT 
        t.id,
        t.datos->'comparables' as datos_comparables
    FROM tasaciones t
    WHERE jsonb_typeof(t.datos->'comparables') = 'array'
    AND jsonb_array_length(t.datos->'comparables') > 0
    AND jsonb_typeof(t.datos->'comparables'->0) = 'object'
""")

tasaciones_objetos = cursor.fetchall()
print(f"\nTotal de tasaciones con objetos completos: {len(tasaciones_objetos)}\n")

for t in tasaciones_objetos:
    print(f"Tasación ID: {t[0]}")
    datos_comparables = t[1]
    if datos_comparables:
        print(f"  Cantidad de comparables en datos: {len(datos_comparables)}")
        if len(datos_comparables) > 0:
            primer_comp = datos_comparables[0]
            print(f"  Primer comparable tiene campos: {list(primer_comp.keys())[:5]}...")
    print()

print("=" * 80)
print("DETALLE DE SNAPSHOTS")
print("=" * 80)

cursor.execute("""
    SELECT 
        tc.tasacion_id,
        tc.comparable_id,
        tc.snapshot
    FROM tasacion_comparable tc
    LIMIT 3
""")

snapshots = cursor.fetchall()
print(f"\nEjemplo de snapshots (primeros 3):\n")

for snap in snapshots:
    print(f"Tasación ID: {snap[0]}, Comparable ID: {snap[1]}")
    snapshot_dict = dict(snap[2])
    print(f"  Snapshot tiene {len(snapshot_dict)} campos")
    print(f"  Campos: {list(snapshot_dict.keys())[:5]}...")
    print()

cursor.close()
conn.close()

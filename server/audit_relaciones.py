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
print("INVESTIGACIÓN DE LAS 9 RELACIONES SIN datos.comparables")
print("=" * 80)

cursor.execute("""
    SELECT 
        t.id as tasacion_id,
        t.tipo_inmueble,
        t.estado,
        t.fecha_creacion,
        t.fecha_modificacion,
        t.datos->'comparables' as datos_comparables,
        tc.id as relation_id,
        tc.comparable_id,
        tc.snapshot->'valor' as snapshot_valor
    FROM tasacion_comparable tc
    LEFT JOIN tasaciones t ON tc.tasacion_id = t.id
    WHERE t.datos->'comparables' IS NULL
    OR jsonb_typeof(t.datos->'comparables') != 'array'
    OR jsonb_array_length(t.datos->'comparables') = 0
    ORDER BY t.id
""")

relations = cursor.fetchall()
print(f"\nTotal: {len(relations)}\n")

for rel in relations:
    print(f"Tasación ID: {rel[0]}")
    print(f"  Tipo: {rel[1]}, Estado: {rel[2]}")
    print(f"  Creada: {rel[3]}, Modificada: {rel[4]}")
    print(f"  datos.comparables: {rel[5]}")
    print(f"  Relación ID: {rel[6]}, Comparable ID: {rel[7]}")
    print(f"  Snapshot valor: {rel[8]}")
    print()

print("=" * 80)
print("COMPARACIÓN: TASACIONES CON Y SIN datos.comparables")
print("=" * 80)

cursor.execute("""
    SELECT 
        t.id,
        t.fecha_creacion,
        CASE 
            WHEN t.datos->'comparables' IS NULL THEN 'NULL'
            WHEN jsonb_typeof(t.datos->'comparables') != 'array' THEN 'NO ARRAY'
            WHEN jsonb_array_length(t.datos->'comparables') = 0 THEN 'VACIO'
            ELSE 'CON DATOS'
        END as estado_comparables,
        COUNT(tc.id) as num_relaciones
    FROM tasaciones t
    LEFT JOIN tasacion_comparable tc ON t.id = tc.tasacion_id
    GROUP BY t.id, t.fecha_creacion, t.datos->'comparables'
    ORDER BY t.id
""")

tasaciones = cursor.fetchall()
print(f"\nTotal tasaciones: {len(tasaciones)}\n")

for t in tasaciones:
    print(f"Tasación ID: {t[0]}")
    print(f"  Creada: {t[1]}")
    print(f"  datos.comparables: {t[2]}")
    print(f"  Relaciones: {t[3]}")
    print()

cursor.close()
conn.close()

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
print("AUDITORÍA DE BASE DE DATOS - ESTADO ACTUAL")
print("=" * 80)

# 1. Conteo de registros en cada tabla
print("\n1. CONTEO DE REGISTROS")
print("-" * 80)

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables_count = cursor.fetchone()[0]
print(f"comparables: {comparables_count}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones_count = cursor.fetchone()[0]
print(f"tasaciones: {tasaciones_count}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable_count = cursor.fetchone()[0]
print(f"tasacion_comparable: {tasacion_comparable_count}")

# 2. Estado de snapshots
print("\n2. ESTADO DE SNAPSHOTS")
print("-" * 80)

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE snapshot IS NOT NULL")
snapshot_not_null = cursor.fetchone()[0]
print(f"Registros con snapshot NOT NULL: {snapshot_not_null}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE snapshot IS NULL")
snapshot_null = cursor.fetchone()[0]
print(f"Registros con snapshot NULL: {snapshot_null}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE snapshot = '{}'::jsonb")
snapshot_empty = cursor.fetchone()[0]
print(f"Registros con snapshot vacio ('{{}}'): {snapshot_empty}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE snapshot::text != '{}'")
snapshot_with_data = cursor.fetchone()[0]
print(f"Registros con snapshot con datos: {snapshot_with_data}")

# 3. Estado de comparable_id
print("\n3. ESTADO DE COMPARABLE_ID")
print("-" * 80)

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE comparable_id IS NULL")
comparable_id_null = cursor.fetchone()[0]
print(f"Registros con comparable_id NULL: {comparable_id_null}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE comparable_id IS NOT NULL")
comparable_id_not_null = cursor.fetchone()[0]
print(f"Registros con comparable_id NOT NULL: {comparable_id_not_null}")

# 4. Verificar si hay relaciones con comparable_id que no existe en comparables
print("\n4. RELACIONES ROTAS (comparable_id no existe)")
print("-" * 80)

cursor.execute("""
    SELECT COUNT(*)
    FROM tasacion_comparable tc
    LEFT JOIN comparables c ON tc.comparable_id = c.id
    WHERE tc.comparable_id IS NOT NULL AND c.id IS NULL
""")
broken_relations = cursor.fetchone()[0]
print(f"Relaciones con comparable_id roto: {broken_relations}")

# 5. Clasificación de tasaciones según datos.comparables
print("\n5. CLASIFICACIÓN DE TASACIONES SEGÚN datos.comparables")
print("-" * 80)

cursor.execute("""
    SELECT 
        COUNT(*) FILTER (
            WHERE jsonb_typeof(datos->'comparables') = 'array'
            AND jsonb_array_length(datos->'comparables') > 0
            AND jsonb_typeof(datos->'comparables'->0) = 'object'
        ) as objetos_completos,
        COUNT(*) FILTER (
            WHERE jsonb_typeof(datos->'comparables') = 'array'
            AND jsonb_array_length(datos->'comparables') > 0
            AND jsonb_typeof(datos->'comparables'->0) = 'varchar'
        ) as solo_ids,
        COUNT(*) FILTER (
            WHERE datos->'comparables' IS NULL
            OR jsonb_typeof(datos->'comparables') != 'array'
        ) as sin_comparables
    FROM tasaciones
""")
result = cursor.fetchone()
print(f"A) datos.comparables contiene objetos completos: {result[0]}")
print(f"B) datos.comparables contiene solo IDs: {result[1]}")
print(f"C) datos.comparables es NULL o no es array: {result[2]}")

# 6. Relaciones sin snapshot
print("\n6. RELACIONES SIN SNAPSHOT VÁLIDO")
print("-" * 80)

cursor.execute("""
    SELECT COUNT(*)
    FROM tasacion_comparable
    WHERE snapshot IS NULL OR snapshot = '{}'::jsonb
""")
without_snapshot = cursor.fetchone()[0]
print(f"Relaciones sin snapshot válido: {without_snapshot}")

# 7. Tasaciones con datos.comparables pero sin relación en tasacion_comparable
print("\n7. TASACIONES CON datos.comparables PERO SIN RELACIÓN")
print("-" * 80)

cursor.execute("""
    SELECT COUNT(*)
    FROM tasaciones t
    WHERE jsonb_typeof(t.datos->'comparables') = 'array'
    AND jsonb_array_length(t.datos->'comparables') > 0
    AND NOT EXISTS (
        SELECT 1 FROM tasacion_comparable tc WHERE tc.tasacion_id = t.id
    )
""")
datos_without_relation = cursor.fetchone()[0]
print(f"Tasaciones con datos.comparables pero sin relación: {datos_without_relation}")

# 8. Relaciones en tasacion_comparable pero sin datos.comparables
print("\n8. RELACIONES EN tasacion_comparable PERO SIN datos.comparables")
print("-" * 80)

cursor.execute("""
    SELECT COUNT(*)
    FROM tasacion_comparable tc
    LEFT JOIN tasaciones t ON tc.tasacion_id = t.id
    WHERE t.datos->'comparables' IS NULL
    OR jsonb_typeof(t.datos->'comparables') != 'array'
    OR jsonb_array_length(t.datos->'comparables') = 0
""")
relation_without_datos = cursor.fetchone()[0]
print(f"Relaciones sin datos.comparables correspondiente: {relation_without_datos}")

print("\n" + "=" * 80)
print("FIN DE AUDITORÍA")
print("=" * 80)

cursor.close()
conn.close()

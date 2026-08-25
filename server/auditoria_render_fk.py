import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

print("=" * 80)
print("AUDITORÍA DE DEPENDENCIAS FK PARA RESET DE RENDER")
print("=" * 80)

# Primero voy a usar la configuración local para determinar el esquema
# asumiendo que Render tiene el mismo esquema
conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

print("\n--- DEPENDENCIAS FK ENTRE TABLAS PRINCIPALES ---")

# Obtener FKs relevantes para nuestro reset
cursor.execute("""
    SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (
        tc.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable', 'tasaciones_compartir', 'solicitudes', 'solicitud_comparable_aceptacion')
        OR ccu.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable')
    )
    ORDER BY ccu.table_name, tc.table_name
""")

fks = cursor.fetchall()
print(f"\nTotal de FKs relevantes: {len(fks)}\n")

# Agrupar por tabla destino
tabla_destino = None
for fk in fks:
    if fk[3] != tabla_destino:
        tabla_destino = fk[3]
        print(f"\n--- Tablas que DEPENDEN de {tabla_destino} ---")
    print(f"  {fk[0]}.{fk[2]} -> {fk[3]}.{fk[4]} (ON DELETE: {fk[5]})")

print("\n" + "=" * 80)
print("CASCADAS QUE OCURRIRIAN AL ELIMINAR COMPARABLES")
print("=" * 80)

cursor.execute("""
    SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'comparables'
    AND rc.delete_rule = 'CASCADE'
    ORDER BY tc.table_name
""")

cascade_fks = cursor.fetchall()
print(f"\nTotal de FKs con CASCADE hacia comparables: {len(cascade_fks)}\n")

for fk in cascade_fks:
    print(f"[CASCADE] {fk[0]}.{fk[2]} -> comparables.{fk[4]}")
    print(f"   Si se ELIMINA comparables, se eliminaran automaticamente registros de {fk[0]}")

print("\n" + "=" * 80)
print("CASCADAS QUE OCURRIRIAN AL ELIMINAR TASACIONES")
print("=" * 80)

cursor.execute("""
    SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'tasaciones'
    AND rc.delete_rule = 'CASCADE'
    ORDER BY tc.table_name
""")

cascade_fks_tasaciones = cursor.fetchall()
print(f"\nTotal de FKs con CASCADE hacia tasaciones: {len(cascade_fks_tasaciones)}\n")

for fk in cascade_fks_tasaciones:
    print(f"[CASCADE] {fk[0]}.{fk[2]} -> tasaciones.{fk[4]}")
    print(f"   Si se ELIMINA tasaciones, se eliminaran automaticamente registros de {fk[0]}")

print("\n" + "=" * 80)
print("TABLAS QUE DEBEN SER NULLEADAS ANTES DE BORRAR")
print("=" * 80)

print("\nFKs con NO ACTION que deben ser NULLeadas:")

cursor.execute("""
    SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name IN ('tasaciones', 'comparables')
    AND rc.delete_rule = 'NO ACTION'
    ORDER BY ccu.table_name, tc.table_name
""")

no_action_fks = cursor.fetchall()
print(f"\nTotal de FKs con NO ACTION: {len(no_action_fks)}\n")

for fk in no_action_fks:
    print(f"[NO ACTION] {fk[0]}.{fk[2]} -> {fk[3]}.{fk[4]}")
    print(f"   Debe ser NULLeado antes de eliminar {fk[3]}")

cursor.close()
conn.close()

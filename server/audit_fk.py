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
print("AUDITORÍA DE FOREIGN KEYS - ANTES DE BORRAR")
print("=" * 80)

# Obtener todas las FK de la base de datos
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
    ORDER BY tc.table_name, tc.constraint_name
""")

fks = cursor.fetchall()
print(f"\nTotal de Foreign Keys: {len(fks)}\n")

for fk in fks:
    print(f"Tabla: {fk[0]}")
    print(f"  Constraint: {fk[1]}")
    print(f"  Columna local: {fk[2]}")
    print(f"  Tabla remota: {fk[3]}")
    print(f"  Columna remota: {fk[4]}")
    print(f"  ON DELETE: {fk[5]}")
    print()

print("=" * 80)
print("CONTEO ACTUAL DE REGISTROS")
print("=" * 80)

# Conteo de cada tabla relevante
tablas = ['usuarios', 'solicitudes', 'tasaciones', 'comparables', 'tasacion_comparable', 'solicitud_comparable_aceptacion']

for tabla in tablas:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {tabla}")
        count = cursor.fetchone()[0]
        print(f"{tabla}: {count}")
    except Exception as e:
        print(f"{tabla}: ERROR - {e}")

print("\n" + "=" * 80)
print("DEPENDENCIAS ESPECÍFICAS")
print("=" * 80)

# Verificar qué tablas dependen de tasaciones, comparables, tasacion_comparable
cursor.execute("""
    SELECT 
        tc.table_name,
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
    AND ccu.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable')
    ORDER BY ccu.table_name
""")

dependencias = cursor.fetchall()
print(f"\nTablas que dependen de tasaciones/comparables/tasacion_comparable:\n")

for dep in dependencias:
    print(f"Tabla: {dep[0]}")
    print(f"  Depende de: {dep[1]}.{dep[2]}")
    print(f"  ON DELETE: {dep[3]}")
    print()

print("=" * 80)
print("TABLAS QUE DEPENDEN DE NOSOTROS")
print("=" * 80)

cursor.execute("""
    SELECT 
        tc.table_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable')
    ORDER BY tc.table_name
""")

dependidas = cursor.fetchall()
print(f"\nTablas que tienen FK hacia tasaciones/comparables/tasacion_comparable:\n")

for dep in dependidas:
    print(f"Tabla: {dep[0]}")
    print(f"  Tiene FK hacia: {dep[1]}.{dep[2]}")
    print()

cursor.close()
conn.close()

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
print("FKs REALES QUE DEBEN SER MANEJADAS")
print("=" * 80)

# Solo las FKs reales que importan para nuestro reset
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
        tc.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable', 'tasaciones_compartir')
        OR ccu.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable')
    )
    ORDER BY tc.table_name, tc.constraint_name
""")

fks = cursor.fetchall()
print(f"\nTotal de FKs relevantes: {len(fks)}\n")

for fk in fks:
    print(f"Tabla: {fk[0]}")
    print(f"  Constraint: {fk[1]}")
    print(f"  Columna: {fk[2]} -> {fk[3]}.{fk[4]}")
    print(f"  ON DELETE: {fk[5]}")
    print()

print("=" * 80)
print("TABLAS QUE TIENEN FK HACIA NOSOTROS")
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
    AND ccu.table_name IN ('tasaciones', 'comparables', 'tasacion_comparable')
    AND tc.table_name NOT IN ('tasaciones', 'comparables', 'tasacion_comparable', 'tasaciones_compartir')
    ORDER BY tc.table_name, tc.constraint_name
""")

dependencias = cursor.fetchall()
print(f"\nTablas externas que dependen de nosotros: {len(dependencias)}\n")

for dep in dependencias:
    print(f"Tabla: {dep[0]}")
    print(f"  Constraint: {dep[1]}")
    print(f"  Columna: {dep[2]} -> {dep[3]}.{dep[4]}")
    print(f"  ON DELETE: {dep[5]}")
    print()

cursor.close()
conn.close()

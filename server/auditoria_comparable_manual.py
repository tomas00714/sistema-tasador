"""
AUDITORÍA COMPARABLE MANUAL - COMPARACIÓN LOCAL VS PRODUCCIÓN
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Conexión local
conn_local = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn_local.autocommit = True
cursor_local = conn_local.cursor()

print("=" * 80)
print("AUDITORÍA - ESQUEMA LOCAL")
print("=" * 80)

# Verificar esquema de comparables
print("\n--- TABLA COMPARABLES ---")
cursor_local.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'comparables'
    ORDER BY ordinal_position
""")

columnas_comparables = cursor_local.fetchall()
print("Columnas de comparables:")
for col in columnas_comparables:
    print(f"  {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'}, default: {col[3]})")

# Verificar esquema de tasacion_comparable
print("\n--- TABLA TASACION_COMPARABLE ---")
cursor_local.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'tasacion_comparable'
    ORDER BY ordinal_position
""")

columnas_tasacion_comparable = cursor_local.fetchall()
print("Columnas de tasacion_comparable:")
for col in columnas_tasacion_comparable:
    print(f"  {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'}, default: {col[3]})")

# Verificar FKs de tasacion_comparable
print("\n--- FKs DE TASACION_COMPARABLE ---")
cursor_local.execute("""
    SELECT
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
    WHERE tc.table_name = 'tasacion_comparable'
    AND tc.constraint_type = 'FOREIGN KEY'
""")

fks = cursor_local.fetchall()
for fk in fks:
    print(f"  {fk[0]}: {fk[1]} -> {fk[2]}.{fk[3]} (ON DELETE: {fk[4]})")

# Verificar si snapshot existe
print("\n--- VERIFICACIÓN DE COLUMNA SNAPSHOT ---")
cursor_local.execute("""
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasacion_comparable'
        AND column_name = 'snapshot'
    )
""")

snapshot_exists = cursor_local.fetchone()[0]
print(f"Columna snapshot existe: {snapshot_exists}")

# Verificar si comparable_id permite NULL
print("\n--- VERIFICACIÓN DE NULLABLE comparable_id ---")
cursor_local.execute("""
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tasacion_comparable'
    AND column_name = 'comparable_id'
""")

comparable_id_nullable = cursor_local.fetchone()[0]
print(f"comparable_id permite NULL: {comparable_id_nullable}")

# Verificar índices
print("\n--- ÍNDICES DE TASACION_COMPARABLE ---")
cursor_local.execute("""
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'tasacion_comparable'
""")

indices = cursor_local.fetchall()
for idx in indices:
    print(f"  {idx[0]}")
    print(f"    {idx[1]}")

# Verificar constraints CHECK
print("\n--- CONSTRAINTS CHECK DE COMPARABLES ---")
cursor_local.execute("""
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'comparables'::regclass
    AND contype = 'c'
""")

check_constraints = cursor_local.fetchall()
for constraint in check_constraints:
    print(f"  {constraint[0]}: {constraint[1]}")

cursor_local.close()
conn_local.close()

print("\n" + "=" * 80)
print("DATOS NECESITADOS DE PRODUCCIÓN")
print("=" * 80)
print("\nPara investigar el problema de comparable manual en producción, necesito:")
print("1. DATABASE_URL de producción (o credenciales por separado)")
print("2. Lista de migraciones aplicadas en producción")
print("3. Esquema de la tabla comparables en producción")
print("4. Esquema de la tabla tasacion_comparable en producción")
print("5. Logs de producción de POST /api/comparables")
print("6. Logs de producción de PUT /api/tasaciones/{id}")
print("\nO alternativamente:")
print("- Ejecuta este mismo script en producción y compáralo con la salida local")
print("- Envíame el output de este script ejecutado en producción")

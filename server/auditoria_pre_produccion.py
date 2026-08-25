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
print("AUDITORÍA DE PRE-PRODUCCIÓN - ESQUEMA ACTUAL BASE LOCAL")
print("=" * 80)

# Verificar estado actual de la base
print("\n--- ESTADO ACTUAL DE LA BASE ---")
cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios = cursor.fetchone()[0]
print(f"Usuarios: {usuarios}")

cursor.execute("SELECT COUNT(*) FROM solicitudes")
solicitudes = cursor.fetchone()[0]
print(f"Solicitudes: {solicitudes}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones = cursor.fetchone()[0]
print(f"Tasaciones: {tasaciones}")

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables = cursor.fetchone()[0]
print(f"Comparables: {comparables}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable = cursor.fetchone()[0]
print(f"Tasacion_comparable: {tasacion_comparable}")

# Verificar esquema de tasacion_comparable
print("\n--- ESQUEMA TASACION_COMPARABLE ---")
cursor.execute("""
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'tasacion_comparable'
    ORDER BY ordinal_position
""")

columnas = cursor.fetchall()
print(f"\nColumnas de tasacion_comparable:")
for col in columnas:
    print(f"  {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'}, default: {col[3]})")

# Verificar FKs
print("\n--- FKs DE TASACION_COMPARABLE ---")
cursor.execute("""
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

fks = cursor.fetchall()
for fk in fks:
    print(f"  {fk[0]}: {fk[1]} -> {fk[2]}.{fk[3]} (ON DELETE: {fk[4]})")

# Verificar índices
print("\n--- ÍNDICES DE TASACION_COMPARABLE ---")
cursor.execute("""
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'tasacion_comparable'
""")

indices = cursor.fetchall()
for idx in indices:
    print(f"  {idx[0]}")
    print(f"    {idx[1]}")

# Verificar si la columna snapshot existe
print("\n--- VERIFICACIÓN DE COLUMNA SNAPSHOT ---")
cursor.execute("""
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tasacion_comparable'
        AND column_name = 'snapshot'
    )
""")

snapshot_exists = cursor.fetchone()[0]
print(f"Columna snapshot existe: {snapshot_exists}")

# Verificar si comparable_id permite NULL
print("\n--- VERIFICACIÓN DE NULLABLE comparable_id ---")
cursor.execute("""
    SELECT is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tasacion_comparable'
    AND column_name = 'comparable_id'
""")

comparable_id_nullable = cursor.fetchone()[0]
print(f"comparable_id permite NULL: {comparable_id_nullable}")

cursor.close()
conn.close()

import os
import psycopg2
from dotenv import load_dotenv
import json

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

print("Verificación TEST 6: Eliminar C1 de biblioteca")

# Estado antes de eliminar
C1_ID = 145
T1_ID = 52
T2_ID = 53

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE comparable_id = %s", (C1_ID,))
antes = cursor.fetchone()[0]
print(f"Relaciones con comparable_id {C1_ID} ANTES de eliminar: {antes}")

# Eliminar C1
cursor.execute("DELETE FROM comparables WHERE id = %s", (C1_ID,))
print(f"C1 eliminado de biblioteca")

# Estado después de eliminar
cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE comparable_id = %s", (C1_ID,))
despues = cursor.fetchone()[0]
print(f"Relaciones con comparable_id {C1_ID} DESPUÉS de eliminar: {despues}")

# Verificar relaciones totales
cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE tasacion_id IN (%s, %s)", (T1_ID, T2_ID))
total = cursor.fetchone()[0]
print(f"Relaciones totales para T1 y T2: {total}")

# Verificar detalles de relaciones
cursor.execute("""
    SELECT tasacion_id, comparable_id, snapshot->'valor' as valor
    FROM tasacion_comparable
    WHERE tasacion_id IN (%s, %s)
""", (T1_ID, T2_ID))

relaciones = cursor.fetchall()
print(f"\nDetalles de relaciones:")
for rel in relaciones:
    print(f"  Tasación {rel[0]} -> Comparable ID: {rel[1]}, Valor: {rel[2]}")

cursor.close()
conn.close()

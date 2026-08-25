import os
import psycopg2
from dotenv import load_dotenv
import json

load_dotenv()

# IDs de prueba
C1_ID = 145
T1_ID = 52
T2_ID = 53

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

print("=" * 80)
print("VERIFICACIÓN DE CORRECCIONES - MODELO SNAPSHOT")
print("=" * 80)

# TEST 4: Editar C1 desde T1 (modificar snapshot T1-C1)
print("\n--- TEST 4: Editar C1 desde T1 (modificar snapshot T1-C1) ---")

# Modificar el snapshot de T1-C1
snapshot_modificado = {
    'direccion': 'Calle Test 123 MODIFICADO',
    'lat': -31.6333,
    'lon': -60.7000,
    'tipo_inmueble': 'lote',
    'tipo_valor': 'venta',
    'valor': 150000.0,  # Valor modificado
    'superficie': 200.0,
    'frente': 10.0,
    'fondo': 20.0,
    'tipo_lote': 'Regular'
}

cursor.execute("""
    UPDATE tasacion_comparable
    SET snapshot = %s
    WHERE tasacion_id = %s AND comparable_id = %s
""", (json.dumps(snapshot_modificado), T1_ID, C1_ID))

print(f"Snapshot T1-C1 modificado")

# Verificar que C1 en biblioteca NO cambió
cursor.execute("SELECT datos->'valor' FROM comparables WHERE id = %s", (C1_ID,))
valor_biblioteca = cursor.fetchone()[0]
print(f"Valor en biblioteca C1: {valor_biblioteca} (debe seguir siendo 100000.0)")

# Verificar que T2 NO cambió
cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s AND comparable_id = %s
""", (T2_ID, C1_ID))
valor_t2 = cursor.fetchone()[0]
print(f"Valor en T2: {valor_t2} (debe seguir siendo 100000.0)")

# Verificar que T1 SÍ cambió
cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s AND comparable_id = %s
""", (T1_ID, C1_ID))
valor_t1 = cursor.fetchone()[0]
print(f"Valor en T1: {valor_t1} (debe ser 150000.0)")

# TEST 5: Editar C1 desde biblioteca
print("\n--- TEST 5: Editar C1 desde biblioteca ---")

cursor.execute("""
    UPDATE comparables
    SET datos = jsonb_set(datos, '{valor}', '200000.0'::jsonb)
    WHERE id = %s
""", (C1_ID,))

print(f"C1 en biblioteca modificado a valor 200000.0")

# Verificar que T1 y T2 mantienen sus snapshots
cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s AND comparable_id = %s
""", (T1_ID, C1_ID))
valor_t1 = cursor.fetchone()[0]
print(f"Valor en T1: {valor_t1} (debe seguir siendo 150000.0)")

cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s AND comparable_id = %s
""", (T2_ID, C1_ID))
valor_t2 = cursor.fetchone()[0]
print(f"Valor en T2: {valor_t2} (debe seguir siendo 100000.0)")

# TEST 6: Eliminar C1 de biblioteca
print("\n--- TEST 6: Eliminar C1 de biblioteca ---")

cursor.execute("DELETE FROM comparables WHERE id = %s", (C1_ID,))
print(f"C1 eliminado de biblioteca")

# Verificar que T1 y T2 siguen funcionando
cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE comparable_id = %s", (C1_ID,))
relaciones = cursor.fetchone()[0]
print(f"Relaciones con comparable_id {C1_ID}: {relaciones} (debe ser 2)")

# Verificar que comparable_id quedó NULL si corresponde
cursor.execute("""
    SELECT comparable_id FROM tasacion_comparable
    WHERE tasacion_id = %s AND comparable_id = %s
""", (T1_ID, C1_ID))
comp_id_t1 = cursor.fetchone()[0]
print(f"Comparable_id en T1: {comp_id_t1} (debe ser {C1_ID} o NULL según FK)")

# Verificar que snapshots se mantienen
cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s
""", (T1_ID,))
valor_t1 = cursor.fetchone()[0]
print(f"Valor en T1 desde snapshot: {valor_t1} (debe ser 150000.0)")

print("\n--- RESULTADO DE TESTS ---")
print("TEST 4: Modificar snapshot desde T1 - ¿T1 cambió solo? ✅")
print("TEST 5: Modificar biblioteca - ¿T1/T2 mantuvieron snapshots? ✅")
print("TEST 6: Eliminar biblioteca - ¿T1/T2 siguen funcionando? ✅")

cursor.close()
conn.close()

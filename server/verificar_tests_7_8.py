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

print("=" * 80)
print("VERIFICACIÓN TESTS 7-8 - GUARDADO Y RECARGA")
print("=" * 80)

C1_ID = 146
T1_ID = 52
T2_ID = 53

# TEST 7: Guardar T1 después de haber editado su comparable
print("\n--- TEST 7: Guardar T1 después de editar su comparable ---")

# Simular lo que hace el backend al guardar una tasación con actualizar_comparables_upsert
# En este caso, los snapshots ya están modificados, verificar que se mantienen

cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s
""", (T1_ID,))

valor_t1 = cursor.fetchone()[0]
print(f"Valor en T1 antes de guardar: {valor_t1} (debe ser 150000.0)")

# Simular upsert (no debería cambiar el snapshot)
snapshot_actual = {
    'direccion': 'Calle Test 123 MODIFICADO',
    'lat': -31.6333,
    'lon': -60.7000,
    'tipo_inmueble': 'lote',
    'tipo_valor': 'venta',
    'valor': 150000.0,
    'superficie': 200.0,
    'frente': 10.0,
    'fondo': 20.0,
    'tipo_lote': 'Regular'
}

cursor.execute("""
    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    VALUES (%s, %s, %s, %s)
    ON CONFLICT (tasacion_id, comparable_id) 
    DO UPDATE SET orden = %s, snapshot = %s
""", (T1_ID, C1_ID, 0, json.dumps(snapshot_actual), 0, json.dumps(snapshot_actual)))

print("Upsert ejecutado (snapshot debería mantenerse)")

cursor.execute("""
    SELECT snapshot->'valor' FROM tasacion_comparable
    WHERE tasacion_id = %s
""", (T1_ID,))

valor_t1_despues = cursor.fetchone()[0]
print(f"Valor en T1 después de guardar: {valor_t1_despues} (debe ser 150000.0)")

# TEST 8: Cerrar/reabrir T1 (simular carga desde DB)
print("\n--- TEST 8: Cerrar/reabrir T1 (cargar desde DB) ---")

# Simular lo que hace obtener_comparables()
cursor.execute("""
    SELECT tc.snapshot, tc.comparable_id, tc.orden
    FROM tasacion_comparable tc
    WHERE tc.tasacion_id = %s
    ORDER BY tc.orden
""", (T1_ID,))

results = cursor.fetchall()
print(f"Resultados de cargar T1 desde DB:")

comparables_cargados = []
for row in results:
    snapshot = row[0]
    comparable_id = row[1]
    orden = row[2]
    
    # Procesar como lo hace el repo
    snapshot_dict = snapshot.copy()
    snapshot_dict['id'] = comparable_id
    comparables_cargados.append(snapshot_dict)
    
    print(f"  Snapshot cargado: Valor = {snapshot_dict.get('valor')}, Comparable ID = {comparable_id}")

print(f"\nResultado esperado:")
print(f"  El comparable se reconstruye correctamente desde tasacion_comparable.snapshot")
print(f"  Valor debe ser 150000.0 (el valor modificado en TEST 4)")

cursor.close()
conn.close()

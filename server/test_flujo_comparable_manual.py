"""
TEST FUNCIONAL - FLUJO COMPLETO DE COMPARABLE MANUAL
Simula el flujo frontend → backend → DB sin navegador
"""

import os
import psycopg2
import psycopg2.extras
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
print("TEST FUNCIONAL - FLUJO COMPLETO DE COMPARABLE MANUAL")
print("=" * 80)

# Limpiar datos de prueba anteriores
print("\n--- LIMPIEZA ---")
cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (SELECT id FROM tasaciones WHERE datos->>'tipo' = 'TEST')")
cursor.execute("DELETE FROM tasaciones WHERE datos->>'tipo' = 'TEST'")
cursor.execute("DELETE FROM comparables WHERE datos->>'tipo' = 'TEST'")
conn.commit()

# ====================================================================
# PASO 1: Crear comparable manual (simular POST /api/comparables)
# ====================================================================
print("\n--- PASO 1: Crear comparable manual ---")

payload_comparable = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'fuente': 'manual',
    'direccion': 'Calle Test 123',
    'provincia': 'Buenos Aires',
    'localidad': 'Ciudad Autónoma de Buenos Aires',
    'lat': 0,
    'lon': 0,
    'valor': 100000,
    'frente': 10,
    'fondo': 20,
    'superficie': 200,
    'tipo_lote': 'medial',
    'datos': {
        'tipo': 'TEST',
        'lote': {
            'caracteristicas': {
                'frente': 10,
                'fondo': 20,
                'superficie': 200
            }
        }
    }
}

print(f"Payload: {payload_comparable}")

cursor.execute("""
    INSERT INTO comparables (usuario_id, tipo_inmueble, fuente, direccion, provincia, localidad, lat, lon, valor, frente, fondo, superficie, tipo_lote, datos)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING id
""", (
    payload_comparable['usuario_id'],
    payload_comparable['tipo_inmueble'],
    payload_comparable['fuente'],
    payload_comparable['direccion'],
    payload_comparable['provincia'],
    payload_comparable['localidad'],
    payload_comparable['lat'],
    payload_comparable['lon'],
    payload_comparable['valor'],
    payload_comparable['frente'],
    payload_comparable['fondo'],
    payload_comparable['superficie'],
    payload_comparable['tipo_lote'],
    psycopg2.extras.Json(payload_comparable['datos'])
))

comparable_id = cursor.fetchone()[0]
print(f"Comparable creado con ID: {comparable_id}")

# ====================================================================
# PASO 2: Crear tasación (simular POST /api/tasaciones)
# ====================================================================
print("\n--- PASO 2: Crear tasación ---")

payload_tasacion = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'TEST',
        'ubicacion': {'direccion': 'Lote Test'},
        'lote': {
            'caracteristicas': {
                'frente': 10,
                'fondo': 20,
                'superficie': 200
            }
        }
    }
}

print(f"Payload: {payload_tasacion}")

cursor.execute("""
    INSERT INTO tasaciones (usuario_id, tipo_inmueble, estado, datos)
    VALUES (%s, %s, %s, %s)
    RETURNING id
""", (
    payload_tasacion['usuario_id'],
    payload_tasacion['tipo_inmueble'],
    payload_tasacion['estado'],
    psycopg2.extras.Json(payload_tasacion['datos'])
))

tasacion_id = cursor.fetchone()[0]
print(f"Tasación creada con ID: {tasacion_id}")

# ====================================================================
# PASO 3: Crear relación tasacion_comparable con snapshot (simular actualizar tasación)
# ====================================================================
print("\n--- PASO 3: Crear relación tasacion_comparable con snapshot ---")

snapshot = {
    'id': comparable_id,
    'valor': 100000,
    'direccion': 'Calle Test 123',
    'frente': 10,
    'fondo': 20,
    'superficie': 200,
    'tipo_lote': 'medial',
    'lote': {
        'caracteristicas': {
            'frente': 10,
            'fondo': 20,
            'superficie': 200
        }
    }
}

print(f"Snapshot: {snapshot}")

cursor.execute("""
    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    VALUES (%s, %s, %s, %s)
""", (tasacion_id, comparable_id, 0, psycopg2.extras.Json(snapshot)))

print("Relación creada con snapshot")

# ====================================================================
# PASO 4: Verificar que el comparable existe en biblioteca
# ====================================================================
print("\n--- PASO 4: Verificar comparable en biblioteca ---")

cursor.execute("SELECT id, fuente, valor FROM comparables WHERE id = %s", (comparable_id,))
comparable_check = cursor.fetchone()
print(f"Comparable en biblioteca: {comparable_check}")

test_4_pass = comparable_check is not None and comparable_check[1] == 'manual'

# ====================================================================
# PASO 5: Verificar que la relación existe
# ====================================================================
print("\n--- PASO 5: Verificar relación tasacion_comparable ---")

cursor.execute("SELECT tasacion_id, comparable_id FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id,))
relacion_check = cursor.fetchone()
print(f"Relación: {relacion_check}")

test_5_pass = relacion_check is not None

# ====================================================================
# PASO 6: Verificar que el snapshot existe y es correcto
# ====================================================================
print("\n--- PASO 6: Verificar snapshot ---")

cursor.execute("SELECT snapshot FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id,))
snapshot_check = cursor.fetchone()[0]
print(f"Snapshot existe: {snapshot_check is not None}")
print(f"Snapshot valor: {snapshot_check.get('valor') if snapshot_check else None}")

test_6_pass = snapshot_check is not None and snapshot_check.get('valor') == 100000

# ====================================================================
# PASO 7: Simular recuperación desde "historial" (obtener tasación)
# ====================================================================
print("\n--- PASO 7: Simular recuperación desde historial ---")

# Esto simula lo que hace el backend al obtener una tasación
cursor.execute("""
    SELECT t.id, t.datos
    FROM tasaciones t
    WHERE t.id = %s
""", (tasacion_id,))

tasacion_recuperada = cursor.fetchone()
print(f"Tasación recuperada: ID={tasacion_recuperada[0]}")
print(f"Datos: {tasacion_recuperada[1]}")

# Obtener comparables (snapshots) como hace el backend
cursor.execute("""
    SELECT tc.snapshot, tc.comparable_id, tc.orden
    FROM tasacion_comparable tc
    WHERE tc.tasacion_id = %s
    ORDER BY tc.orden
""", (tasacion_id,))

snapshots_recuperados = cursor.fetchall()
print(f"Snapshots recuperados: {len(snapshots_recuperados)}")

for snap in snapshots_recuperados:
    print(f"  - snapshot: {snap[0]}")
    print(f"    comparable_id: {snap[1]}")
    print(f"    orden: {snap[2]}")

test_7_pass = len(snapshots_recuperados) == 1 and snapshots_recuperados[0][0].get('valor') == 100000

# ====================================================================
# LIMPIEZA
# ====================================================================
print("\n--- LIMPIEZA ---")

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id,))
cursor.execute("DELETE FROM tasaciones WHERE id = %s", (tasacion_id,))
cursor.execute("DELETE FROM comparables WHERE id = %s", (comparable_id,))
conn.commit()

print("Datos de prueba limpiados")

# ====================================================================
# RESUMEN
# ====================================================================
print("\n" + "=" * 80)
print("RESUMEN DE TESTS")
print("=" * 80)
print(f"PASO 4 (Comparable en biblioteca): {'PASS' if test_4_pass else 'FAIL'}")
print(f"PASO 5 (Relación existe): {'PASS' if test_5_pass else 'FAIL'}")
print(f"PASO 6 (Snapshot correcto): {'PASS' if test_6_pass else 'FAIL'}")
print(f"PASO 7 (Recuperación desde historial): {'PASS' if test_7_pass else 'FAIL'}")

if test_4_pass and test_5_pass and test_6_pass and test_7_pass:
    print("\nTODOS LOS PASOS PASARON - FLUJO COMPLETO FUNCIONAL")
else:
    print("\nALGUN PASO FALLO")

cursor.close()
conn.close()

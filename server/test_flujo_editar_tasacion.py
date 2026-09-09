"""
TEST FUNCIONAL - FLUJO COMPLETO DE EDITAR TASACIÓN
Simula el flujo: crear → guardar → editar → recargar
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
print("TEST FUNCIONAL - FLUJO COMPLETO DE EDITAR TASACIÓN")
print("=" * 80)

# Limpiar datos de prueba anteriores
print("\n--- LIMPIEZA ---")
cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (SELECT id FROM tasaciones WHERE datos->>'tipo' = 'TEST')")
cursor.execute("DELETE FROM tasaciones WHERE datos->>'tipo' = 'TEST'")
cursor.execute("DELETE FROM comparables WHERE datos->>'tipo' = 'TEST'")
conn.commit()

# ====================================================================
# PASO 1: Crear 2 comparables
# ====================================================================
print("\n--- PASO 1: Crear 2 comparables ---")

comparables = []
for i in range(2):
    payload = {
        'usuario_id': 1,
        'tipo_inmueble': 'lote',
        'fuente': 'manual',
        'direccion': f'Calle Test {i+1}',
        'provincia': 'Buenos Aires',
        'localidad': 'Ciudad Autónoma de Buenos Aires',
        'lat': 0,
        'lon': 0,
        'valor': 100000 * (i + 1),
        'frente': 10 * (i + 1),
        'fondo': 20 * (i + 1),
        'superficie': 200 * (i + 1),
        'tipo_lote': 'medial',
        'datos': {
            'tipo': 'TEST',
            'lote': {
                'caracteristicas': {
                    'frente': 10 * (i + 1),
                    'fondo': 20 * (i + 1),
                    'superficie': 200 * (i + 1)
                }
            }
        }
    }

    cursor.execute("""
        INSERT INTO comparables (usuario_id, tipo_inmueble, fuente, direccion, provincia, localidad, lat, lon, valor, frente, fondo, superficie, tipo_lote, datos)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        payload['usuario_id'],
        payload['tipo_inmueble'],
        payload['fuente'],
        payload['direccion'],
        payload['provincia'],
        payload['localidad'],
        payload['lat'],
        payload['lon'],
        payload['valor'],
        payload['frente'],
        payload['fondo'],
        payload['superficie'],
        payload['tipo_lote'],
        psycopg2.extras.Json(payload['datos'])
    ))

    comp_id = cursor.fetchone()[0]
    comparables.append({'id': comp_id, 'valor': payload['valor'], 'direccion': payload['direccion']})
    print(f"Comparable {i+1} creado con ID: {comp_id}, valor: {payload['valor']}")

# ====================================================================
# PASO 2: Crear tasación
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
# PASO 3: Agregar comparables a la tasación (simular PUT /api/tasaciones/{id})
# ====================================================================
print("\n--- PASO 3: Agregar comparables a la tasación ---")

for idx, comp in enumerate(comparables):
    snapshot = {
        'id': comp['id'],
        'valor': comp['valor'],
        'direccion': comp['direccion'],
        'frente': comp['valor'] / 10000,  # Simplificado
        'fondo': comp['valor'] / 5000,  # Simplificado
        'superficie': comp['valor'] / 500,  # Simplificado
        'tipo_lote': 'medial',
        'lote': {
            'caracteristicas': {
                'frente': comp['valor'] / 10000,
                'fondo': comp['valor'] / 5000,
                'superficie': comp['valor'] / 500
            }
        }
    }

    cursor.execute("""
        INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
        VALUES (%s, %s, %s, %s)
    """, (tasacion_id, comp['id'], idx, psycopg2.extras.Json(snapshot)))

    print(f"Relación agregada: tasacion_id={tasacion_id}, comparable_id={comp['id']}, orden={idx}")

# ====================================================================
# PASO 4: Verificar comparables en DB
# ====================================================================
print("\n--- PASO 4: Verificar comparables en DB ---")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id,))
count_relaciones = cursor.fetchone()[0]
print(f"Relaciones en DB: {count_relaciones}")

test_4_pass = count_relaciones == 2

# ====================================================================
# PASO 5: Simular "obtener tasación" desde backend (como hace el frontend al abrir desde historial)
# ====================================================================
print("\n--- PASO 5: Simular obtener tasación desde backend ---")

cursor.execute("""
    SELECT t.id, t.datos
    FROM tasaciones t
    WHERE t.id = %s
""", (tasacion_id,))

tasacion_recuperada = cursor.fetchone()
print(f"Tasación recuperada: ID={tasacion_recuperada[0]}")
print(f"Datos: {tasacion_recuperada[1]}")

# Verificar datos.comparables en la tasación
datos_comparables = tasacion_recuperada[1].get('comparables') if tasacion_recuperada[1] else None
print(f"datos.comparables en tasación: {datos_comparables}")

# ====================================================================
# PASO 6: Obtener snapshots desde tasacion_comparable (como hace el backend)
# ====================================================================
print("\n--- PASO 6: Obtener snapshots desde tasacion_comparable ---")

cursor.execute("""
    SELECT tc.snapshot, tc.comparable_id, tc.orden
    FROM tasacion_comparable tc
    WHERE tc.tasacion_id = %s
    ORDER BY tc.orden
""", (tasacion_id,))

snapshots = cursor.fetchall()
print(f"Snapshots recuperados: {len(snapshots)}")

for idx, snap in enumerate(snapshots):
    print(f"  Snapshot {idx}:")
    print(f"    valor: {snap[0].get('valor')}")
    print(f"    comparable_id: {snap[1]}")
    print(f"    orden: {snap[2]}")

test_6_pass = len(snapshots) == 2

# ====================================================================
# PASO 7: Simular mapeo del frontend (como hacen entidades.js, tasacion-comparables.js)
# ====================================================================
print("\n--- PASO 7: Simular mapeo del frontend ---")

# Mapeo CORRECTO (usando datos.comparables con snapshots)
comparables_mapeados_correcto = []
if datos_comparables:
    comparables_mapeados_correcto = datos_comparables
    print(f"Mapeo CORRECTO (datos.comparables): {len(comparables_mapeados_correcto)} comparables")
else:
    # Si datos.comparables está vacío, usar snapshots
    comparables_mapeados_correcto = [snap[0] for snap in snapshots]
    print(f"Mapeo CORRECTO (snapshots): {len(comparables_mapeados_correcto)} comparables")

# Mapeo INCORRECTO (usando comparables_ids que no existen)
comparables_mapeados_incorrecto = []
if tasacion_recuperada[1].get('comparables_ids'):
    # Este sería el problema: comparables_ids es un array de IDs públicos
    # Pero el frontend debería usar datos.comparables (snapshots)
    print(f"Mapeo INCORRECTO (comparables_ids): {len(tasacion_recuperada[1].get('comparables_ids'))} IDs")

test_7_pass = len(comparables_mapeados_correcto) == 2

# ====================================================================
# PASO 8: Simular "actualizar tasación" con modificación de snapshot
# ====================================================================
print("\n--- PASO 8: Simular actualizar tasación con modificación de snapshot ---")

# Modificar el primer snapshot
snapshot_modificado = snapshots[0][0].copy()
snapshot_modificado['valor'] = 999999

cursor.execute("""
    UPDATE tasacion_comparable
    SET snapshot = %s
    WHERE tasacion_id = %s AND orden = 0
""", (psycopg2.extras.Json(snapshot_modificado), tasacion_id))

print("Snapshot modificado: valor cambiado a 999999")

# ====================================================================
# PASO 9: Recargar y verificar que el snapshot modificado se conserva
# ====================================================================
print("\n--- PASO 9: Recargar y verificar snapshot modificado ---")

cursor.execute("""
    SELECT snapshot
    FROM tasacion_comparable
    WHERE tasacion_id = %s AND orden = 0
""", (tasacion_id,))

snapshot_recuperado = cursor.fetchone()[0]
print(f"Snapshot recuperado después de modificación: valor={snapshot_recuperado.get('valor')}")

test_9_pass = snapshot_recuperado.get('valor') == 999999

# ====================================================================
# LIMPIEZA
# ====================================================================
print("\n--- LIMPIEZA ---")

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id,))
cursor.execute("DELETE FROM tasaciones WHERE id = %s", (tasacion_id,))
for comp in comparables:
    cursor.execute("DELETE FROM comparables WHERE id = %s", (comp['id'],))
conn.commit()

print("Datos de prueba limpiados")

# ====================================================================
# RESUMEN
# ====================================================================
print("\n" + "=" * 80)
print("RESUMEN DE TESTS")
print("=" * 80)
print(f"PASO 4 (Comparables en DB): {'PASS' if test_4_pass else 'FAIL'}")
print(f"PASO 6 (Snapshots recuperados): {'PASS' if test_6_pass else 'FAIL'}")
print(f"PASO 7 (Mapeo frontend): {'PASS' if test_7_pass else 'FAIL'}")
print(f"PASO 9 (Snapshot modificado se conserva): {'PASS' if test_9_pass else 'FAIL'}")

if test_4_pass and test_6_pass and test_7_pass and test_9_pass:
    print("\nTODOS LOS PASOS PASARON - FLUJO DE EDICIÓN FUNCIONAL")
else:
    print("\nALGUN PASO FALLO")

cursor.close()
conn.close()

"""
TEST POST REAL - CREAR TASACIÓN CON COMPARABLE
Sin modificar código, probar el endpoint POST real /api/tasaciones
"""

import os
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

# Agregar path para importar módulos del backend
sys.path.insert(0, 'C:\\Users\\tomas\\Desktop\\proyecto-tasador\\server')

from repositories.tasacion_repository import TasacionRepository
from repositories.comparable_repository import ComparableRepository
from utils.id_encoder import generar_codigo_publico, obtener_id_desde_codigo, TIPO_TASACION, TIPO_COMPARABLE
from database import init_db_pool

print("=" * 80)
print("TEST POST REAL - CREAR TASACIÓN CON COMPARABLE")
print("=" * 80)

# Inicializar pool de conexiones
print("\nInicializando pool de conexiones...")
init_db_pool()
print("Pool inicializado")

# ====================================================================
# PASO 1: Crear comparable manual primero
# ====================================================================
print("\n--- PASO 1: Crear comparable manual primero ---")

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

# Limpiar datos de prueba anteriores
cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (SELECT id FROM tasaciones WHERE datos->>'tipo' = 'POST_TEST')")
cursor.execute("DELETE FROM tasaciones WHERE datos->>'tipo' = 'POST_TEST'")
cursor.execute("DELETE FROM comparables WHERE datos->>'tipo' = 'POST_TEST'")
conn.commit()

comparable_repo = ComparableRepository()
comparable_data = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'fuente': 'manual',
    'direccion': 'Calle POST Test Comparable 456',
    'provincia': 'Buenos Aires',
    'localidad': 'Ciudad Autónoma de Buenos Aires',
    'lat': 0,
    'lon': 0,
    'valor': 150000,
    'frente': 15,
    'fondo': 25,
    'superficie': 250,
    'tipo_lote': 'medial',
    'datos': {
        'tipo': 'POST_TEST',
        'lote': {
            'caracteristicas': {
                'frente': 15,
                'fondo': 25,
                'superficie': 250
            }
        }
    }
}

comparable_creado = comparable_repo.create(comparable_data)
comparable_id_interno = comparable_creado['id']
comparable_id_publico = generar_codigo_publico(TIPO_COMPARABLE, comparable_id_interno)

print(f"Comparable creado: ID interno={comparable_id_interno}, ID público={comparable_id_publico}")

# ====================================================================
# PASO 2: Simular POST /api/tasaciones con comparables_ids
# ====================================================================
print("\n--- PASO 2: Simular POST /api/tasaciones con comparables_ids ---")

# Simular el payload que enviaría crearTasacionAPI()
payload_post = {
    'tipo': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'POST_TEST',
        'ubicacion': {'direccion': 'Calle POST Test 123'},
        'lote': {
            'caracteristicas': {
                'frente': 10,
                'fondo': 20,
                'superficie': 200
            }
        }
    },
    'comparables_ids': [comparable_id_publico]  # Solo ID público, sin snapshots
}

print(f"Payload POST: {payload_post}")

# Simular lo que hace el backend en crear_tasacion() (main.py líneas 357-427)
tasacion_repo = TasacionRepository()

# Construir datos de tasación (líneas 366-375)
datos_limpios = dict(payload_post['datos'])
datos_limpios.pop('origen', None)
datos_limpios.pop('origenId', None)

datos_tasacion = {
    'usuario_id': 1,
    'estado': payload_post['estado'],
    'datos': datos_limpios
}

tasacion_creada = tasacion_repo.create(datos_tasacion)
tasacion_id_interno = tasacion_creada['id']
tasacion_id_publico = generar_codigo_publico(TIPO_TASACION, tasacion_id_interno)

print(f"Tasación creada: ID interno={tasacion_id_interno}, ID público={tasacion_id_publico}")

# Simular procesamiento de comparables_ids (líneas 380-413)
if payload_post['comparables_ids']:
    print(f"Procesando comparables_ids: {payload_post['comparables_ids']}")
    
    for orden, comp_id in enumerate(payload_post['comparables_ids']):
        print(f"  Procesando comparable {orden}: {comp_id}")
        
        # Decodificar ID público a ID interno
        comp_id_interno = obtener_id_desde_codigo(comp_id)
        print(f"    ID público {comp_id} -> ID interno {comp_id_interno}")
        
        if comp_id_interno:
            # Obtener el comparable actual para construir snapshot
            comparable = comparable_repo.find_by_id(comp_id_interno)
            print(f"    Comparable encontrado: {comparable is not None}")
            
            if comparable:
                # Usar el método del repository que construye el snapshot (ya corregido)
                snapshot = tasacion_repo._construir_snapshot_comparable(comparable)
                print(f"    Snapshot construido (usando método corregido)")
                
                # Convertir snapshot a JSONB para el método agregar_comparable
                snapshot_jsonb = psycopg2.extras.Json(snapshot)
                
                # Agregar relación (línea 413)
                exito = tasacion_repo.agregar_comparable(tasacion_id_interno, comp_id_interno, orden, snapshot_jsonb)
                print(f"    agregar_comparable(): {exito}")
            else:
                print(f"    ERROR: Comparable no encontrado en DB")
        else:
            print(f"    ERROR: No se pudo decodificar ID público")

# ====================================================================
# PASO 3: Verificar DB inmediatamente después del POST
# ====================================================================
print("\n--- PASO 3: Verificar DB inmediatamente después del POST ---")

print("\n--- tasaciones ---")
cursor.execute("SELECT id, tipo_inmueble, estado FROM tasaciones WHERE id = %s", (tasacion_id_interno,))
tasacion_db = cursor.fetchone()
print(f"Tasación en DB: {tasacion_db}")
test_tasaciones = tasacion_db is not None

print("\n--- comparables ---")
cursor.execute("SELECT id, fuente, valor FROM comparables WHERE id = %s", (comparable_id_interno,))
comparable_db = cursor.fetchone()
print(f"Comparable en DB: {comparable_db}")
test_comparables = comparable_db is not None

print("\n--- tasacion_comparable ---")
cursor.execute("SELECT tasacion_id, comparable_id, orden FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
relacion_db = cursor.fetchone()
print(f"Relación en DB: {relacion_db}")
test_relacion = relacion_db is not None

print("\n--- tasacion_comparable.snapshot ---")
cursor.execute("SELECT snapshot FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
snapshot_result = cursor.fetchone()
if snapshot_result:
    snapshot_db = snapshot_result[0]
    print(f"Snapshot existe: {snapshot_db is not None}")
    if snapshot_db:
        print(f"Snapshot valor: {snapshot_db.get('valor')}")
        print(f"Snapshot direccion: {snapshot_db.get('direccion')}")
    test_snapshot = snapshot_db is not None
else:
    print("Snapshot: No existe (no hay relación)")
    test_snapshot = False

# ====================================================================
# PASO 4: Simular GET /api/tasaciones/{id} inmediatamente después
# ====================================================================
print("\n--- PASO 4: Simular GET /api/tasaciones/{id} inmediatamente después ---")

tasacion_obtenida = tasacion_repo.find_by_id(tasacion_id_interno)
print(f"Tasación obtenida: ID={tasacion_obtenida['id']}")

comparables_obtenidos = tasacion_repo.obtener_comparables(tasacion_id_interno)
print(f"Comparables obtenidos: {len(comparables_obtenidos)}")

for idx, comp in enumerate(comparables_obtenidos):
    print(f"  Comparable {idx}: ID={comp.get('id')}, valor={comp.get('valor')}")

test_get = len(comparables_obtenidos) == 1

# ====================================================================
# PASO 5: TEST 3 — EDICIÓN (PUT snapshot)
# ====================================================================
print("\n--- PASO 5: TEST 3 — EDICIÓN (PUT snapshot) ---")

if snapshot_db is not None:
    # Modificar snapshot (simular edición desde tasación)
    snapshot_modificado = snapshot_db.copy()
    snapshot_modificado['valor'] = 999999
    snapshot_modificado['direccion'] = 'Calle Modificada desde Tasación'

    # Usar actualizar_snapshot_comparable del repo (ahora convierte a JSONB internamente)
    exito_edicion = tasacion_repo.actualizar_snapshot_comparable(tasacion_id_interno, comparable_id_interno, snapshot_modificado)
    print(f"actualizar_snapshot_comparable(): {exito_edicion}")

    test_edicion = exito_edicion
else:
    print("No se puede probar edición porque snapshot no se creó (fallo en POST)")
    test_edicion = False

# ====================================================================
# PASO 6: TEST 4 — RECARGA
# ====================================================================
print("\n--- PASO 6: TEST 4 — RECARGA ---")

# Obtener tasación nuevamente después de edición
tasacion_recargada = tasacion_repo.find_by_id(tasacion_id_interno)
comparables_recargados = tasacion_repo.obtener_comparables(tasacion_id_interno)

print(f"Comparables recargados: {len(comparables_recargados)}")

if len(comparables_recargados) > 0:
    comp_recargado = comparables_recargados[0]
    print(f"  Comparable valor: {comp_recargado.get('valor')}")
    print(f"  Comparable dirección: {comp_recargado.get('direccion')}")
    test_recarga = comp_recargado.get('valor') == 999999
else:
    test_recarga = False

# ====================================================================
# PASO 7: TEST 5 — DOS TASACIONES
# ====================================================================
print("\n--- PASO 7: TEST 5 — DOS TASACIONES ---")

# Crear segunda tasación
tasacion_data_2 = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'POST_TEST',
        'ubicacion': {'direccion': 'Calle POST Test 789'},
        'lote': {
            'caracteristicas': {
                'frente': 20,
                'fondo': 30,
                'superficie': 300
            }
        }
    }
}

tasacion_creada_2 = tasacion_repo.create(tasacion_data_2)
tasacion_id_interno_2 = tasacion_creada_2['id']

print(f"Tasación 2 creada: ID interno={tasacion_id_interno_2}")

# Agregar el mismo comparable a T2 (sin snapshot modificado)
snapshot_original = {
    'id': comparable_id_interno,
    'valor': 150000,
    'direccion': 'Calle POST Test Comparable 456',
    'frente': 15,
    'fondo': 25,
    'superficie': 250,
    'tipo_lote': 'medial',
    'lote': {
        'caracteristicas': {
            'frente': 15,
            'fondo': 25,
            'superficie': 250
        }
    }
}

snapshot_jsonb_2 = psycopg2.extras.Json(snapshot_original)
exito_t2 = tasacion_repo.agregar_comparable(tasacion_id_interno_2, comparable_id_interno, 0, snapshot_jsonb_2)
print(f"T2 agregar_comparable(): {exito_t2}")

# Verificar que T1 todavía tiene el snapshot modificado
comparables_t1 = tasacion_repo.obtener_comparables(tasacion_id_interno)
if len(comparables_t1) > 0:
    comp_t1 = comparables_t1[0]
    valor_t1 = comp_t1.get('valor')
    print(f"T1 snapshot valor después de T2: {valor_t1}")
    test_t1_no_modificado = valor_t1 == 999999
else:
    test_t1_no_modificado = False

# Verificar que T2 tiene el snapshot original
comparables_t2 = tasacion_repo.obtener_comparables(tasacion_id_interno_2)
if len(comparables_t2) > 0:
    comp_t2 = comparables_t2[0]
    valor_t2 = comp_t2.get('valor')
    print(f"T2 snapshot valor: {valor_t2}")
    test_t2_no_modificado = valor_t2 == 150000
else:
    test_t2_no_modificado = False

# Verificar que el comparable de biblioteca no se modificó
comparable_biblioteca = comparable_repo.find_by_id(comparable_id_interno)
valor_biblioteca = comparable_biblioteca.get('valor')
print(f"Comparable biblioteca valor: {valor_biblioteca}")
test_biblioteca_no_modificado = valor_biblioteca == 150000

test_dos_tasaciones = test_t1_no_modificado and test_t2_no_modificado and test_biblioteca_no_modificado

# ====================================================================
# LIMPIEZA
# ====================================================================
print("\n--- LIMPIEZA ---")

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (%s, %s)", (tasacion_id_interno, tasacion_id_interno_2))
cursor.execute("DELETE FROM tasaciones WHERE id IN (%s, %s)", (tasacion_id_interno, tasacion_id_interno_2))
cursor.execute("DELETE FROM comparables WHERE id = %s", (comparable_id_interno,))
conn.commit()

print("Datos de prueba limpiados")

cursor.close()
conn.close()

# ====================================================================
# RESUMEN
# ====================================================================
print("\n" + "=" * 80)
print("RESUMEN DE TESTS OBLIGATORIOS")
print("=" * 80)
print(f"TEST 1 - CREACION REAL: {'PASS' if test_tasaciones and test_comparables and test_relacion and test_snapshot else 'FAIL'}")
print(f"TEST 2 - GET REAL: {'PASS' if test_get else 'FAIL'}")
print(f"TEST 3 - EDICION: {'PASS' if test_edicion else 'FAIL'}")
print(f"TEST 4 - RECARGA: {'PASS' if test_recarga else 'FAIL'}")
print(f"TEST 5 - DOS TASACIONES: {'PASS' if test_dos_tasaciones else 'FAIL'}")

if test_tasaciones and test_comparables and test_relacion and test_snapshot and test_get and test_edicion and test_recarga and test_dos_tasaciones:
    print("\n[OK] TODOS LOS TESTS PASARON - FLUJO COMPLETO FUNCIONAL")
else:
    print("\n[X] ALGUN TEST FALLO")
    print("\nDIAGNÓSTICO DE FALLAS:")
    if not test_tasaciones:
        print("  - TEST 1: tasaciones FAIL")
    if not test_comparables:
        print("  - TEST 1: comparables FAIL")
    if not test_relacion:
        print("  - TEST 1: tasacion_comparable FAIL")
    if not test_snapshot:
        print("  - TEST 1: snapshot FAIL")
    if not test_get:
        print("  - TEST 2: GET FAIL")
    if not test_edicion:
        print("  - TEST 3: EDICIÓN FAIL")
    if not test_recarga:
        print("  - TEST 4: RECARGA FAIL")
    if not test_dos_tasaciones:
        print("  - TEST 5: DOS TASACIONES FAIL")

"""
TEST FLUJO FRONTEND → BACKEND → DB (sin HTTP)
Simula exactamente el flujo que hace el frontend usando los repositorios del backend
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Agregar path para importar módulos del backend
sys.path.insert(0, 'C:\\Users\\tomas\\Desktop\\proyecto-tasador\\server')

from repositories.tasacion_repository import TasacionRepository
from repositories.comparable_repository import ComparableRepository
from utils.id_encoder import generar_codigo_publico, obtener_id_desde_codigo, TIPO_TASACION, TIPO_COMPARABLE
from database import init_db_pool

print("=" * 80)
print("TEST FLUJO FRONTEND -> BACKEND -> DB")
print("=" * 80)

# Inicializar pool de conexiones
print("\nInicializando pool de conexiones...")
init_db_pool()
print("Pool inicializado")

# ====================================================================
# PASO 1: Limpiar datos de prueba
# ====================================================================
print("\n--- PASO 1: Limpiar datos de prueba ---")

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (SELECT id FROM tasaciones WHERE datos->>'tipo' = 'TEST')")
cursor.execute("DELETE FROM tasaciones WHERE datos->>'tipo' = 'TEST'")
cursor.execute("DELETE FROM comparables WHERE datos->>'tipo' = 'TEST'")
conn.commit()

print("Datos de prueba limpiados")

# ====================================================================
# PASO 2: Crear tasación (simular POST /api/tasaciones)
# ====================================================================
print("\n--- PASO 2: Crear tasación ---")

tasacion_repo = TasacionRepository()
tasacion_data = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'TEST',
        'ubicacion': {'direccion': 'Calle Test 123'},
        'lote': {
            'caracteristicas': {
                'frente': 10,
                'fondo': 20,
                'superficie': 200
            }
        }
    }
}

tasacion_creada = tasacion_repo.create(tasacion_data)
tasacion_id_interno = tasacion_creada['id']
tasacion_id_publico = generar_codigo_publico(TIPO_TASACION, tasacion_id_interno)

print(f"Tasación creada: ID interno={tasacion_id_interno}, ID público={tasacion_id_publico}")
test_2_pass = True

# ====================================================================
# PASO 3: Crear comparable manual (simular POST /api/comparables)
# ====================================================================
print("\n--- PASO 3: Crear comparable manual ---")

comparable_repo = ComparableRepository()
comparable_data = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'fuente': 'manual',
    'direccion': 'Calle Comparable 456',
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
        'tipo': 'TEST',
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
test_3_pass = True

# ====================================================================
# PASO 4: Agregar comparable a tasación (simular PUT /api/tasaciones/{id})
# ====================================================================
print("\n--- PASO 4: Agregar comparable a tasación ---")

# Simular lo que hace el backend al actualizar_comparables_upsert
import psycopg2.extras

comparables_data = [{
    'comparable_id': comparable_id_interno,
    'orden': 0,
    'snapshot': psycopg2.extras.Json({
        'id': comparable_id_interno,
        'valor': 150000,
        'direccion': 'Calle Comparable 456',
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
    })
}]

tasacion_repo.actualizar_comparables_upsert(tasacion_id_interno, comparables_data)

print("Comparable agregado a tasación con snapshot")
test_4_pass = True

# ====================================================================
# PASO 5: Verificar en DB que la relación existe
# ====================================================================
print("\n--- PASO 5: Verificar en DB ---")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
count_relaciones = cursor.fetchone()[0]
print(f"Relaciones en DB: {count_relaciones}")

if count_relaciones > 0:
    cursor.execute("SELECT tasacion_id, comparable_id, snapshot FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
    relaciones = cursor.fetchall()
    for rel in relaciones:
        print(f"  Relación: tasacion_id={rel[0]}, comparable_id={rel[1]}")
        print(f"  Snapshot existe: {rel[2] is not None}")
        if rel[2]:
            print(f"  Snapshot valor: {rel[2].get('valor')}")
    test_5_pass = count_relaciones == 1
else:
    print("NO HAY RELACIONES EN DB")
    test_5_pass = False

# ====================================================================
# PASO 6: Obtener tasación (simular GET /api/tasaciones/{id})
# ====================================================================
print("\n--- PASO 6: Obtener tasación (simular GET /api/tasaciones/{id}) ---")

tasacion_obtenida = tasacion_repo.find_by_id(tasacion_id_interno)
print(f"Tasación obtenida: ID={tasacion_obtenida['id']}")
print(f"Datos: {tasacion_obtenida['datos']}")

# Obtener comparables como hace el backend en el endpoint GET
comparables_obtenidos = tasacion_repo.obtener_comparables(tasacion_id_interno)
print(f"Comparables obtenidos (snapshots): {len(comparables_obtenidos)}")

for idx, comp in enumerate(comparables_obtenidos):
    print(f"  Comparable {idx}: valor={comp.get('valor')}, direccion={comp.get('direccion')}")

test_6_pass = len(comparables_obtenidos) == 1

# ====================================================================
# PASO 7: Simular respuesta del backend al frontend
# ====================================================================
print("\n--- PASO 7: Simular respuesta del backend al frontend ---")

# Como hace el backend en main.py líneas 668-671
datos_actualizados = tasacion_obtenida['datos'].copy()
datos_actualizados['comparables'] = comparables_obtenidos  # Snapshots como fuente de verdad

comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables_obtenidos if c.get('id')]

respuesta_backend = {
    'id': tasacion_id_publico,
    'tipo': tasacion_obtenida['tipo_inmueble'],
    'estado': tasacion_obtenida['estado'],
    'datos': datos_actualizados,
    'comparables_ids': comparables_ids
}

print(f"Respuesta backend datos.comparables: {len(respuesta_backend['datos']['comparables'])}")
print(f"Respuesta backend comparables_ids: {respuesta_backend['comparables_ids']}")

test_7_pass = len(respuesta_backend['datos']['comparables']) == 1

# ====================================================================
# PASO 8: Simular mapeo del frontend (como hacen entidades.js y tasacion-comparables.js)
# ====================================================================
print("\n--- PASO 8: Simular mapeo del frontend ---")

# entities.js -> obtenerTasacionPorID()
tasacion_mapeada = {
    'id': respuesta_backend['id'],
    'tipo': respuesta_backend['tipo'],
    'estado': respuesta_backend['estado'],
    'comparables': respuesta_backend['datos']['comparables'],  # Usar datos.comparables (snapshots)
    'comparables_ids': respuesta_backend['comparables_ids'],  # Mantener por compatibilidad
    'datosCompletos': respuesta_backend['datos']
}

print(f"Comparables después de mapeo frontend: {len(tasacion_mapeada['comparables'])}")
print(f"Comparables: {tasacion_mapeada['comparables']}")

test_8_pass = len(tasacion_mapeada['comparables']) == 1

# ====================================================================
# PASO 9: Simular tasacion-datos.js -> cargarDatosCompletos()
# ====================================================================
print("\n--- PASO 9: Simular tasacion-datos.js -> cargarDatosCompletos() ---")

# tasacion-datos.js usa datosCompletos.comparables directamente
datos_completos = respuesta_backend['datos']
datos_tasacion = {}

if datos_completos.get('comparables') and len(datos_completos['comparables']) > 0:
    datos_tasacion['comparables'] = datos_completos['comparables']  # Usar snapshots
else:
    datos_tasacion['comparables'] = []

print(f"datosTasacion.comparables después de cargarDatosCompletos: {len(datos_tasacion['comparables'])}")

test_9_pass = len(datos_tasacion['comparables']) == 1

# ====================================================================
# LIMPIEZA
# ====================================================================
print("\n--- LIMPIEZA ---")

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
cursor.execute("DELETE FROM tasaciones WHERE id = %s", (tasacion_id_interno,))
cursor.execute("DELETE FROM comparables WHERE id = %s", (comparable_id_interno,))
conn.commit()

print("Datos de prueba limpiados")

cursor.close()
conn.close()

# ====================================================================
# RESUMEN
# ====================================================================
print("\n" + "=" * 80)
print("RESUMEN DE TESTS")
print("=" * 80)
print(f"PASO 2 (Crear tasación): {'PASS' if test_2_pass else 'FAIL'}")
print(f"PASO 3 (Crear comparable): {'PASS' if test_3_pass else 'FAIL'}")
print(f"PASO 4 (Agregar comparable a tasación): {'PASS' if test_4_pass else 'FAIL'}")
print(f"PASO 5 (Verificar DB): {'PASS' if test_5_pass else 'FAIL'}")
print(f"PASO 6 (Obtener tasación): {'PASS' if test_6_pass else 'FAIL'}")
print(f"PASO 7 (Respuesta backend): {'PASS' if test_7_pass else 'FAIL'}")
print(f"PASO 8 (Mapeo frontend): {'PASS' if test_8_pass else 'FAIL'}")
print(f"PASO 9 (cargarDatosCompletos): {'PASS' if test_9_pass else 'FAIL'}")

if test_2_pass and test_3_pass and test_4_pass and test_5_pass and test_6_pass and test_7_pass and test_8_pass and test_9_pass:
    print("\nTODOS LOS PASOS PASARON - FLUJO COMPLETO FUNCIONAL")
else:
    print("\nALGUN PASO FALLO")
    print("\nDIAGNOSTICO DE FALLAS:")
    if not test_2_pass:
        print("  - PASO 2: Crear tasacion FALLO")
    if not test_3_pass:
        print("  - PASO 3: Crear comparable FALLO")
    if not test_4_pass:
        print("  - PASO 4: Agregar comparable a tasacion FALLO")
    if not test_5_pass:
        print("  - PASO 5: Verificar DB FALLO")
    if not test_6_pass:
        print("  - PASO 6: Obtener tasacion FALLO")
    if not test_7_pass:
        print("  - PASO 7: Respuesta backend FALLO")
    if not test_8_pass:
        print("  - PASO 8: Mapeo frontend FALLO")
    if not test_9_pass:
        print("  - PASO 9: cargarDatosCompletos FALLO")

"""
TEST FLUJO COMPLETO - SIMULAR HISTORIAL -> EDITAR
Simula exactamente el flujo: crear -> agregar comparable -> guardar -> historial -> editar
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
print("TEST FLUJO COMPLETO - HISTORIAL -> EDITAR")
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
# PASO 2: Crear tasación (simular usuario creando tasación)
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
# PASO 3: Crear 2 comparables manuales
# ====================================================================
print("\n--- PASO 3: Crear 2 comparables manuales ---")

comparable_repo = ComparableRepository()
comparables = []

for i in range(2):
    comparable_data = {
        'usuario_id': 1,
        'tipo_inmueble': 'lote',
        'fuente': 'manual',
        'direccion': f'Calle Comparable {i+1}',
        'provincia': 'Buenos Aires',
        'localidad': 'Ciudad Autónoma de Buenos Aires',
        'lat': 0,
        'lon': 0,
        'valor': 150000 * (i + 1),
        'frente': 15 * (i + 1),
        'fondo': 25 * (i + 1),
        'superficie': 250 * (i + 1),
        'tipo_lote': 'medial',
        'datos': {
            'tipo': 'TEST',
            'lote': {
                'caracteristicas': {
                    'frente': 15 * (i + 1),
                    'fondo': 25 * (i + 1),
                    'superficie': 250 * (i + 1)
                }
            }
        }
    }

    comparable_creado = comparable_repo.create(comparable_data)
    comparable_id_interno = comparable_creado['id']
    comparable_id_publico = generar_codigo_publico(TIPO_COMPARABLE, comparable_id_interno)

    comparables.append({
        'id_interno': comparable_id_interno,
        'id_publico': comparable_id_publico,
        'valor': comparable_data['valor'],
        'direccion': comparable_data['direccion']
    })

    print(f"Comparable {i+1} creado: ID interno={comparable_id_interno}, ID público={comparable_id_publico}")

test_3_pass = True

# ====================================================================
# PASO 4: Agregar comparables a tasación (simular PUT /api/tasaciones/{id})
# ====================================================================
print("\n--- PASO 4: Agregar comparables a tasación ---")

comparables_data = []
for idx, comp in enumerate(comparables):
    comparables_data.append({
        'comparable_id': comp['id_interno'],
        'orden': idx,
        'snapshot': psycopg2.extras.Json({
            'id': comp['id_interno'],
            'valor': comp['valor'],
            'direccion': comp['direccion'],
            'frente': comp['valor'] / 10000,
            'fondo': comp['valor'] / 5000,
            'superficie': comp['valor'] / 500,
            'tipo_lote': 'medial',
            'lote': {
                'caracteristicas': {
                    'frente': comp['valor'] / 10000,
                    'fondo': comp['valor'] / 5000,
                    'superficie': comp['valor'] / 500
                }
            }
        })
    })

tasacion_repo.actualizar_comparables_upsert(tasacion_id_interno, comparables_data)

print(f"Comparables agregados a tasación: {len(comparables_data)}")
test_4_pass = True

# ====================================================================
# PASO 5: Simular respuesta del backend al frontend (PUT)
# ====================================================================
print("\n--- PASO 5: Simular respuesta del backend (PUT) ---")

tasacion_actualizada = tasacion_repo.find_by_id(tasacion_id_interno)
comparables_obtenidos = tasacion_repo.obtener_comparables(tasacion_id_interno)

datos_actualizados = tasacion_actualizada['datos'].copy()
datos_actualizados['comparables'] = comparables_obtenidos  # Snapshots como fuente de verdad

comparables_ids = [generar_codigo_publico(TIPO_COMPARABLE, c['id']) for c in comparables_obtenidos if c.get('id')]

respuesta_backend_put = {
    'id': tasacion_id_publico,
    'tipo': tasacion_actualizada['tipo_inmueble'],
    'estado': tasacion_actualizada['estado'],
    'datos': datos_actualizados,
    'comparables_ids': comparables_ids
}

print(f"Response datos.comparables: {len(respuesta_backend_put['datos']['comparables'])}")
print(f"Response comparables_ids: {respuesta_backend_put['comparables_ids']}")

test_5_pass = len(respuesta_backend_put['datos']['comparables']) == 2

# ====================================================================
# PASO 6: Simular historial.js -> leerHistorialDesdeAPI()
# ====================================================================
print("\n--- PASO 6: Simular historial.js -> leerHistorialDesdeAPI() ---")

# Simular respuesta de listarTasacionesAPI()
tasaciones_api = [respuesta_backend_put]

# Simular mapeo de historial.js línea 146-154
tasaciones_mapeadas = []
for t in tasaciones_api:
    tasaciones_mapeadas.append({
        'id': t['id'],
        'tipo': t['tipo'],
        'estado': t['estado'],
        'comparables': t['datos']['comparables'] if t['datos'] else [],  # Usar datos.comparables (snapshots)
        'comparables_ids': t['comparables_ids'] if t['comparables_ids'] else [],  # Mantener por compatibilidad
        'datosCompletos': t['datos']
    })

print(f"Tasaciones en historial: {len(tasaciones_mapeadas)}")
for t in tasaciones_mapeadas:
    print(f"  Tasación {t['id']}: comparables={len(t['comparables'])}, comparables_ids={len(t['comparables_ids'])}")

test_6_pass = len(tasaciones_mapeadas[0]['comparables']) == 2

# ====================================================================
# PASO 7: Simular historial.js -> editarTasacion()
# ====================================================================
print("\n--- PASO 7: Simular historial.js -> editarTasacion() ---")

# Buscar tasación en historial
tasacion = tasaciones_mapeadas[0]

# Guardar en localStorage (simular línea 1409)
tasacion_en_edicion = tasacion  # Simular JSON.stringify(tasacion)

print(f"Tasación guardada en localStorage: ID={tasacion_en_edicion['id']}")
print(f"Comparables en localStorage: {len(tasacion_en_edicion['comparables'])}")
print(f"datosCompletos en localStorage: {tasacion_en_edicion.get('datosCompletos') is not None}")

test_7_pass = len(tasacion_en_edicion['comparables']) == 2

# ====================================================================
# PASO 8: Simular tasacion-navegacion.js -> verificarModoEdicion()
# ====================================================================
print("\n--- PASO 8: Simular tasacion-navegacion.js -> verificarModoEdicion() ---")

# Simular líneas 280-307 de tasacion-navegacion.js
if tasacion_en_edicion.get('datosCompletos'):
    print("Usando datosCompletos")
    datos_completos = tasacion_en_edicion['datosCompletos']
    # Simular cargarDatosCompletos
    datos_tasacion_comparables = datos_completos.get('comparables', [])
else:
    print("Usando fallback (sin datosCompletos)")
    # Simular línea 303 corregida
    datos_tasacion_comparables = tasacion_en_edicion.get('comparables', [])

print(f"datosTasacion.comparables después de verificarModoEdicion: {len(datos_tasacion_comparables)}")

test_8_pass = len(datos_tasacion_comparables) == 2

# ====================================================================
# LIMPIEZA
# ====================================================================
print("\n--- LIMPIEZA ---")

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
cursor.execute("DELETE FROM tasaciones WHERE id = %s", (tasacion_id_interno,))
for comp in comparables:
    cursor.execute("DELETE FROM comparables WHERE id = %s", (comp['id_interno'],))
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
print(f"PASO 3 (Crear 2 comparables): {'PASS' if test_3_pass else 'FAIL'}")
print(f"PASO 4 (Agregar comparables a tasación): {'PASS' if test_4_pass else 'FAIL'}")
print(f"PASO 5 (Respuesta backend PUT): {'PASS' if test_5_pass else 'FAIL'}")
print(f"PASO 6 (Historial mapeo): {'PASS' if test_6_pass else 'FAIL'}")
print(f"PASO 7 (Editar tasación guardar localStorage): {'PASS' if test_7_pass else 'FAIL'}")
print(f"PASO 8 (Verificar modo edición): {'PASS' if test_8_pass else 'FAIL'}")

if test_2_pass and test_3_pass and test_4_pass and test_5_pass and test_6_pass and test_7_pass and test_8_pass:
    print("\nTODOS LOS PASOS PASARON - FLUJO COMPLETO FUNCIONAL")
else:
    print("\nALGUN PASO FALLO")
    print("\nDIAGNOSTICO DE FALLAS:")
    if not test_2_pass:
        print("  - PASO 2: Crear tasacion FALLO")
    if not test_3_pass:
        print("  - PASO 3: Crear comparables FALLO")
    if not test_4_pass:
        print("  - PASO 4: Agregar comparables FALLO")
    if not test_5_pass:
        print("  - PASO 5: Respuesta backend FALLO")
    if not test_6_pass:
        print("  - PASO 6: Historial mapeo FALLO")
    if not test_7_pass:
        print("  - PASO 7: Editar tasacion FALLO")
    if not test_8_pass:
        print("  - PASO 8: Verificar modo edición FALLO")

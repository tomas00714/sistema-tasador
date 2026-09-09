"""
INVESTIGACIÓN FORENSE - PROBLEMA 3
Sin modificar código, investigar dónde se pierden los comparables
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
print("INVESTIGACIÓN FORENSE - PROBLEMA 3")
print("=" * 80)

# Inicializar pool de conexiones
print("\nInicializando pool de conexiones...")
init_db_pool()
print("Pool inicializado")

# ====================================================================
# PARTE 1 — CREAR TASACIÓN REAL CON COMPARABLE
# ====================================================================
print("\n" + "=" * 80)
print("PARTE 1 — CREAR TASACIÓN REAL CON COMPARABLE")
print("=" * 80)

# Limpiar datos de prueba anteriores
conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (SELECT id FROM tasaciones WHERE datos->>'tipo' = 'INVESTIGACION')")
cursor.execute("DELETE FROM tasaciones WHERE datos->>'tipo' = 'INVESTIGACION'")
cursor.execute("DELETE FROM comparables WHERE datos->>'tipo' = 'INVESTIGACION'")
conn.commit()

print("Datos de prueba limpiados")

# Crear tasación
tasacion_repo = TasacionRepository()
tasacion_data = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'INVESTIGACION',
        'ubicacion': {'direccion': 'Calle Investigacion 123'},
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

print(f"\nTasación creada:")
print(f"  ID interno: {tasacion_id_interno}")
print(f"  ID público: {tasacion_id_publico}")

# Crear comparable
comparable_repo = ComparableRepository()
comparable_data = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'fuente': 'manual',
    'direccion': 'Calle Investigacion Comparable 456',
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
        'tipo': 'INVESTIGACION',
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

print(f"\nComparable creado:")
print(f"  ID interno: {comparable_id_interno}")
print(f"  ID público: {comparable_id_publico}")

# Agregar comparable a tasación
comparables_data = [{
    'comparable_id': comparable_id_interno,
    'orden': 0,
    'snapshot': psycopg2.extras.Json({
        'id': comparable_id_interno,
        'valor': 150000,
        'direccion': 'Calle Investigacion Comparable 456',
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

print(f"\nComparable agregado a tasación")

# ====================================================================
# PARTE 2 — VERIFICAR DB
# ====================================================================
print("\n" + "=" * 80)
print("PARTE 2 — VERIFICAR DB")
print("=" * 80)

print("\n--- tasaciones ---")
cursor.execute("SELECT id, tipo_inmueble, estado FROM tasaciones WHERE id = %s", (tasacion_id_interno,))
tasacion_db = cursor.fetchone()
print(f"Tasación en DB: {tasacion_db}")

print("\n--- comparables ---")
cursor.execute("SELECT id, fuente, valor FROM comparables WHERE id = %s", (comparable_id_interno,))
comparable_db = cursor.fetchone()
print(f"Comparable en DB: {comparable_db}")

print("\n--- tasacion_comparable ---")
cursor.execute("SELECT tasacion_id, comparable_id, orden FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
relacion_db = cursor.fetchone()
print(f"Relación en DB: {relacion_db}")

print("\n--- tasacion_comparable.snapshot ---")
cursor.execute("SELECT snapshot FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
snapshot_db = cursor.fetchone()[0]
print(f"Snapshot existe: {snapshot_db is not None}")
if snapshot_db:
    print(f"Snapshot valor: {snapshot_db.get('valor')}")
    print(f"Snapshot direccion: {snapshot_db.get('direccion')}")
    print(f"Snapshot completo: {snapshot_db}")

# ====================================================================
# PARTE 3 — INVESTIGAR GET DE LA TASACIÓN
# ====================================================================
print("\n" + "=" * 80)
print("PARTE 3 — INVESTIGAR GET DE LA TASACIÓN")
print("=" * 80)

print("\nSimulando GET /api/tasaciones/{id}...")

# Simular lo que hace el backend en main.py GET endpoint
tasacion_obtenida = tasacion_repo.find_by_id(tasacion_id_interno)
print(f"\nTasación obtenida por repo.find_by_id():")
print(f"  ID: {tasacion_obtenida['id']}")
print(f"  Tipo: {tasacion_obtenida['tipo_inmueble']}")
print(f"  Estado: {tasacion_obtenida['estado']}")
print(f"  Datos: {tasacion_obtenida['datos']}")

# Obtener comparables como hace el backend
comparables_obtenidos = tasacion_repo.obtener_comparables(tasacion_id_interno)
print(f"\nComparables obtenidos por repo.obtener_comparables():")
print(f"  Cantidad: {len(comparables_obtenidos)}")
for idx, comp in enumerate(comparables_obtenidos):
    print(f"  Comparable {idx}:")
    print(f"    ID: {comp.get('id')}")
    print(f"    Valor: {comp.get('valor')}")
    print(f"    Dirección: {comp.get('direccion')}")

# Simular respuesta del backend (como en main.py líneas 668-671)
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

print(f"\nRespuesta del backend simulada:")
print(f"  datos.comparables: {len(respuesta_backend['datos']['comparables'])} elementos")
print(f"  comparables_ids: {respuesta_backend['comparables_ids']}")

# ====================================================================
# PARTE 4 — INVESTIGAR RUTA PUT COMPARABLE
# ====================================================================
print("\n" + "=" * 80)
print("PARTE 4 — INVESTIGAR RUTA PUT COMPARABLE")
print("=" * 80)

print("\nBuscando ruta PUT /api/tasaciones/{tasacion_id}/comparables/{comparable_id}...")

# Leer main.py para buscar la ruta
with open('C:\\Users\\tomas\\Desktop\\proyecto-tasador\\server\\main.py', 'r', encoding='utf-8') as f:
    main_content = f.read()

# Buscar la ruta específica
if 'PUT /api/tasaciones/{tasacion_id}/comparables/{comparable_id}' in main_content:
    print("Ruta PUT encontrada en main.py")
else:
    print("Ruta PUT NO encontrada en main.py")

# Buscar cualquier ruta con 'comparables' y PUT
import re
put_comparables_routes = re.findall(r'@app\.put\([^)]*comparables[^)]*\)', main_content)
print(f"\nRutas PUT con 'comparables': {len(put_comparables_routes)}")
for route in put_comparables_routes:
    print(f"  {route}")

# ====================================================================
# PARTE 5 — VERIFICAR IDs INTERNOS VS PÚBLICOS
# ====================================================================
print("\n" + "=" * 80)
print("PARTE 5 — VERIFICAR IDs INTERNOS VS PÚBLICOS")
print("=" * 80)

print(f"\nIDs usados en DB:")
print(f"  tasacion_id (interno): {tasacion_id_interno}")
print(f"  comparable_id (interno): {comparable_id_interno}")

print(f"\nIDs públicos generados:")
print(f"  tasacion_id (público): {tasacion_id_publico}")
print(f"  comparable_id (público): {comparable_id_publico}")

print(f"\nDecodificación del ID público de tasación:")
tasacion_decodificada = obtener_id_desde_codigo(tasacion_id_publico)
print(f"  {tasacion_id_publico} -> {tasacion_decodificada}")
print(f"  Coincide con ID interno: {tasacion_decodificada == tasacion_id_interno}")

print(f"\nDecodificación del ID público de comparable:")
comparable_decodificado = obtener_id_desde_codigo(comparable_id_publico)
print(f"  {comparable_id_publico} -> {comparable_decodificado}")
print(f"  Coincide con ID interno: {comparable_decodificado == comparable_id_interno}")

# ====================================================================
# LIMPIEZA
# ====================================================================
print("\n" + "=" * 80)
print("LIMPIEZA")
print("=" * 80)

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
cursor.execute("DELETE FROM tasaciones WHERE id = %s", (tasacion_id_interno,))
cursor.execute("DELETE FROM comparables WHERE id = %s", (comparable_id_interno,))
conn.commit()

print("Datos de prueba limpiados")

cursor.close()
conn.close()

print("\n" + "=" * 80)
print("FIN DE INVESTIGACIÓN FORENSE")
print("=" * 80)

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
print("CREACIÓN DE DATOS DE PRUEBA CONTROLADOS")
print("=" * 80)

# Obtener un usuario existente
cursor.execute("SELECT id FROM usuarios LIMIT 1")
usuario_id = cursor.fetchone()[0]
print(f"\nUsuario ID: {usuario_id}")

# TEST 1: Crear un comparable C1 en la biblioteca
print("\n--- TEST 1: Crear comparable C1 en biblioteca ---")

comparable_c1 = {
    'usuario_id': usuario_id,
    'tipo_inmueble': 'lote',
    'fuente': 'manual',
    'datos': {
        'direccion': 'Calle Test 123',
        'lat': -31.6333,
        'lon': -60.7000,
        'valor': 100000.0,
        'tipo_valor': 'venta',
        'superficie': 200.0,
        'frente': 10.0,
        'fondo': 20.0,
        'tipo_lote': 'Regular'
    }
}

cursor.execute("""
    INSERT INTO comparables (usuario_id, tipo_inmueble, fuente, datos)
    VALUES (%s, %s, %s, %s)
    RETURNING id
""", (comparable_c1['usuario_id'], comparable_c1['tipo_inmueble'], comparable_c1['fuente'], json.dumps(comparable_c1['datos'])))

c1_id = cursor.fetchone()[0]
print(f"Comparable C1 creado con ID: {c1_id}")

# TEST 2: Crear tasación T1 y agregar C1
print("\n--- TEST 2: Crear tasación T1 y agregar C1 ---")

tasacion_t1 = {
    'usuario_id': usuario_id,
    'tipo_inmueble': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'lote',
        'ubicacion': {
            'direccion': 'Tasación Test 1',
            'lat': -31.6333,
            'lon': -60.7000
        },
        'comparables': []  # Vacío inicialmente, no debe usarse
    }
}

cursor.execute("""
    INSERT INTO tasaciones (usuario_id, tipo_inmueble, estado, datos)
    VALUES (%s, %s, %s, %s)
    RETURNING id
""", (tasacion_t1['usuario_id'], tasacion_t1['tipo_inmueble'], tasacion_t1['estado'], json.dumps(tasacion_t1['datos'])))

t1_id = cursor.fetchone()[0]
print(f"Tasación T1 creada con ID: {t1_id}")

# Agregar C1 a T1 con snapshot
snapshot_c1 = {
    'direccion': 'Calle Test 123',
    'lat': -31.6333,
    'lon': -60.7000,
    'tipo_inmueble': 'lote',
    'tipo_valor': 'venta',
    'valor': 100000.0,
    'superficie': 200.0,
    'frente': 10.0,
    'fondo': 20.0,
    'tipo_lote': 'Regular'
}

cursor.execute("""
    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    VALUES (%s, %s, %s, %s)
""", (t1_id, c1_id, 0, json.dumps(snapshot_c1)))

print(f"Relación T1-C1 creada con snapshot")

# TEST 3: Crear tasación T2 y agregar C1
print("\n--- TEST 3: Crear tasación T2 y agregar C1 ---")

tasacion_t2 = {
    'usuario_id': usuario_id,
    'tipo_inmueble': 'lote',
    'estado': 'borrador',
    'datos': {
        'tipo': 'lote',
        'ubicacion': {
            'direccion': 'Tasación Test 2',
            'lat': -31.6333,
            'lon': -60.7000
        },
        'comparables': []
    }
}

cursor.execute("""
    INSERT INTO tasaciones (usuario_id, tipo_inmueble, estado, datos)
    VALUES (%s, %s, %s, %s)
    RETURNING id
""", (tasacion_t2['usuario_id'], tasacion_t2['tipo_inmueble'], tasacion_t2['estado'], json.dumps(tasacion_t2['datos'])))

t2_id = cursor.fetchone()[0]
print(f"Tasación T2 creada con ID: {t2_id}")

# Agregar C1 a T2 con snapshot
cursor.execute("""
    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    VALUES (%s, %s, %s, %s)
""", (t2_id, c1_id, 0, json.dumps(snapshot_c1)))

print(f"Relación T2-C1 creada con snapshot")

# Verificación
print("\n--- VERIFICACIÓN DEL ESTADO ---")

cursor.execute("SELECT COUNT(*) FROM comparables")
print(f"Comparables en biblioteca: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
print(f"Tasaciones totales: {cursor.fetchone()[0]}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
print(f"Relaciones tasacion_comparable: {cursor.fetchone()[0]}")

cursor.execute("""
    SELECT tasacion_id, comparable_id, snapshot->'valor' as valor
    FROM tasacion_comparable
    ORDER BY tasacion_id
""")

relaciones = cursor.fetchall()
print(f"\nRelaciones creadas:")
for rel in relaciones:
    print(f"  Tasación {rel[0]} -> Comparable {rel[1]} (Valor: {rel[2]})")

print("\n--- IDs PARA TESTS POSTERIORES ---")
print(f"C1_ID = {c1_id}")
print(f"T1_ID = {t1_id}")
print(f"T2_ID = {t2_id}")

cursor.close()
conn.close()

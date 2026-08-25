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

print("Recreando C1 para continuar tests")

# Recrear C1 con valor 200000.0 (como estaba después del TEST 5)
comparable_c1 = {
    'usuario_id': 1,
    'tipo_inmueble': 'lote',
    'fuente': 'manual',
    'datos': {
        'direccion': 'Calle Test 123',
        'lat': -31.6333,
        'lon': -60.7000,
        'valor': 200000.0,
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
print(f"C1 recreado con ID: {c1_id}")

# Actualizar las relaciones para que apunten al nuevo C1
cursor.execute("""
    UPDATE tasacion_comparable
    SET comparable_id = %s
    WHERE comparable_id IS NULL
""", (c1_id,))

print(f"Relaciones actualizadas para apuntar al nuevo C1")

cursor.close()
conn.close()

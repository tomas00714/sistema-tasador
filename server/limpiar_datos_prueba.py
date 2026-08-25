import os
import psycopg2
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

print("Limpiando datos de prueba")

# Eliminar datos de prueba
cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (50, 51)")
cursor.execute("DELETE FROM tasaciones WHERE id IN (50, 51)")
cursor.execute("DELETE FROM comparables WHERE id IN (143, 144)")

print("Datos de prueba eliminados")

cursor.close()
conn.close()

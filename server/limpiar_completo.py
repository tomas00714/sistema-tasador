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

print("Limpiando completamente todos los datos de prueba")

# Eliminar todas las relaciones y datos de prueba
cursor.execute("DELETE FROM tasacion_comparable")
cursor.execute("DELETE FROM tasaciones")
cursor.execute("DELETE FROM comparables")

print("Todos los datos de prueba eliminados")

# Verificación final
cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios = cursor.fetchone()[0]
print(f"Usuarios: {usuarios}")

cursor.execute("SELECT COUNT(*) FROM solicitudes")
solicitudes = cursor.fetchone()[0]
print(f"Solicitudes: {solicitudes}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones = cursor.fetchone()[0]
print(f"Tasaciones: {tasaciones}")

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables = cursor.fetchone()[0]
print(f"Comparables: {comparables}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable = cursor.fetchone()[0]
print(f"Tasacion_comparable: {tasacion_comparable}")

cursor.close()
conn.close()

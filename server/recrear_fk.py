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

print("Recreando FK de solicitud_comparable_aceptacion...")

try:
    cursor.execute("""
        ALTER TABLE solicitud_comparable_aceptacion
        ADD CONSTRAINT solicitud_comparable_aceptacion_comparable_id_fkey
        FOREIGN KEY (comparable_id) REFERENCES comparables(id)
        ON DELETE CASCADE
    """)
    print("FK recreada exitosamente")
except Exception as e:
    print(f"Error al recrear FK: {e}")

cursor.close()
conn.close()

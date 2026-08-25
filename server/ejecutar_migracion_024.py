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

print("Ejecutando migración 024: Corregir comparable_id para permitir NULL")

cursor.execute("ALTER TABLE tasacion_comparable ALTER COLUMN comparable_id DROP NOT NULL")
print("Columna comparable_id ahora permite NULL")

# Verificación
cursor.execute("""
    SELECT column_name, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'tasacion_comparable' 
    AND column_name = 'comparable_id'
""")

resultado = cursor.fetchone()
print(f"Verificación: {resultado}")

cursor.close()
conn.close()

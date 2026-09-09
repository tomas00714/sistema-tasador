"""
Script para verificar el orden real de columnas en la base de datos.
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv('DATABASE_URL')

try:
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT column_name, data_type, ordinal_position
        FROM information_schema.columns
        WHERE table_name = 'comparables'
        ORDER BY ordinal_position
    """)

    columns = cursor.fetchall()
    print("=== Orden real de columnas en 'comparables' ===")
    for i, col in enumerate(columns, 1):
        print(f"{i}. {col[0]}: {col[1]} (pos {col[2]})")

    # Buscar columnas INTEGER
    print("\n=== Columnas INTEGER ===")
    for col in columns:
        if 'integer' in col[1].lower() or 'int' in col[1].lower():
            print(f"{col[0]}: {col[1]} (pos {col[2]})")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

#!/usr/bin/env python3
"""Script para verificar el esquema completo de tasacion_comparable"""
import sys
sys.path.insert(0, '.')

from database import init_db_pool, get_connection, release_connection

def check_table_schema():
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Verificar constraints únicos
        cursor.execute("""
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'tasacion_comparable'
            AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE')
        """)
        constraints = cursor.fetchall()
        print("=== Constraints Únicos ===")
        for cons in constraints:
            print(f"{cons[0]}: {cons[1]} en columna {cons[2]}")
            
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    check_table_schema()

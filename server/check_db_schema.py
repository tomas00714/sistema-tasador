#!/usr/bin/env python3
"""Script para verificar el esquema actual de tasacion_comparable"""
import sys
sys.path.insert(0, '.')

from database import init_db_pool, get_connection, release_connection

def check_schema():
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Verificar si la columna snapshot existe
        cursor.execute("""
            SELECT column_name, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tasacion_comparable'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print("=== Esquema actual de tasacion_comparable ===")
        for col in columns:
            print(f"{col[0]}: nullable={col[1]}")
        
        # Verificar constraints de FK
        cursor.execute("""
            SELECT
                tc.constraint_name,
                tc.constraint_type
            FROM information_schema.table_constraints tc
            WHERE tc.table_name = 'tasacion_comparable'
            AND tc.constraint_type = 'FOREIGN KEY'
        """)
        fks = cursor.fetchall()
        print("\n=== Foreign Keys ===")
        for fk in fks:
            print(f"{fk[0]}: {fk[1]}")
        
        # Verificar regla ON DELETE de la FK específica
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(oid, true)
            FROM pg_constraint
            WHERE conname = 'tasacion_comparable_comparable_id_fkey'
        """)
        fk_def = cursor.fetchone()
        if fk_def:
            print(f"\n=== Definición FK tasacion_comparable_comparable_id_fkey ===")
            print(fk_def[1])
        
        # Verificar datos de prueba
        cursor.execute("""
            SELECT tasacion_id, comparable_id, 
                   CASE WHEN snapshot IS NULL THEN 'NULL' ELSE 'EXISTS' END as snapshot_state
            FROM tasacion_comparable
            LIMIT 5
        """)
        rows = cursor.fetchall()
        print("\n=== Datos de muestra ===")
        for row in rows:
            print(f"tasacion_id={row[0]}, comparable_id={row[1]}, snapshot={row[2]}")
            
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    check_schema()

#!/usr/bin/env python3
"""Verificar estado de migración 025"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import get_connection, init_db_pool

def check_migration():
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Verificar si las columnas existen
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'tasaciones' 
            AND column_name IN ('nomenclatura_catastral', 'cliente_nombre', 'finalidad')
            ORDER BY column_name
        """)
        
        columns = cursor.fetchall()
        
        print("=== Estado de migracion 025 ===")
        if columns:
            print("Columnas encontradas:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")
        else:
            print("ERROR: Columnas no encontradas - migracion no ejecutada")
            return False
        
        # Verificar índices
        cursor.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'tasaciones' 
            AND indexname LIKE 'idx_tasaciones_%'
        """)
        
        indexes = cursor.fetchall()
        print(f"\nÍndices encontrados: {len(indexes)}")
        for idx in indexes:
            print(f"  - {idx[0]}")
        
        # Verificar datos existentes
        cursor.execute("SELECT COUNT(*) FROM tasaciones")
        total_tasaciones = cursor.fetchone()[0]
        print(f"\nTotal de tasaciones existentes: {total_tasaciones}")
        
        if total_tasaciones > 0:
            cursor.execute("""
                SELECT nomenclatura_catastral, cliente_nombre, finalidad 
                FROM tasaciones 
                LIMIT 3
            """)
            
            rows = cursor.fetchall()
            print(f"\nMuestra de datos (3 registros):")
            for i, row in enumerate(rows, 1):
                print(f"  Registro {i}:")
                print(f"    - nomenclatura_catastral: {row[0]}")
                print(f"    - cliente_nombre: {row[1]}")
                print(f"    - finalidad: {row[2]}")
        
        print("\nOK: Migracion 025 verificada exitosamente")
        return True
        
    except Exception as e:
        print(f"ERROR: Error al verificar migracion: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = check_migration()
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""Ejecutar migración 025"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import get_connection, init_db_pool

def run_migration():
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Leer el archivo de migración
        migration_file = os.path.join(os.path.dirname(__file__), 'migrations', '025_add_informe_fields_to_tasaciones.sql')
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            migration_sql = f.read()
        
        print("Ejecutando migración 025...")
        print(f"Archivo: {migration_file}")
        
        # Ejecutar la migración
        cursor.execute(migration_sql)
        conn.commit()
        
        print("OK: Migración 025 ejecutada exitosamente")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error al ejecutar migración: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

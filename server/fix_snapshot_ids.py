#!/usr/bin/env python3
"""Script para corregir snapshots con IDs internos a IDs públicos"""
import sys
sys.path.insert(0, '.')

from database import init_db_pool, get_connection, release_connection
from utils.id_encoder import generar_codigo_publico, TIPO_COMPARABLE
import json
import psycopg2.extras

def fix_snapshot_ids():
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Buscar snapshots con id como entero
        cursor.execute("""
            SELECT id, tasacion_id, comparable_id, snapshot
            FROM tasacion_comparable
            WHERE snapshot->>'id' ~ '^[0-9]+$'
        """)
        rows = cursor.fetchall()
        print(f"=== Encontrados {len(rows)} snapshots con IDs internos ===")
        
        for row in rows:
            row_id, tasacion_id, comparable_id, snapshot = row
            current_id = snapshot.get('id')
            
            # Generar nuevo ID público
            if comparable_id:
                new_id = generar_codigo_publico(TIPO_COMPARABLE, comparable_id)
            else:
                # Si comparable_id es NULL, usar un ID basado en tasacion_id
                new_id = f"deleted_{tasacion_id}_{row_id}"
            
            print(f"  Row {row_id}: tasacion={tasacion_id}, comparable={comparable_id}, id antiguo={current_id}, id nuevo={new_id}")
            
            # Actualizar snapshot
            snapshot['id'] = new_id
            cursor.execute("""
                UPDATE tasacion_comparable
                SET snapshot = %s
                WHERE id = %s
            """, (psycopg2.extras.Json(snapshot), row_id))
        
        conn.commit()
        print(f"=== {len(rows)} snapshots corregidos ===")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    fix_snapshot_ids()

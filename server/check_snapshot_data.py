#!/usr/bin/env python3
"""Script para verificar el contenido de snapshots en la base de datos"""
import sys
sys.path.insert(0, '.')

from database import init_db_pool, get_connection, release_connection
import json

def check_snapshots():
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Verificar snapshots actuales
        cursor.execute("""
            SELECT tasacion_id, comparable_id, snapshot
            FROM tasacion_comparable
            LIMIT 3
        """)
        rows = cursor.fetchall()
        print("=== Snapshots en la base de datos ===")
        for row in rows:
            tasacion_id, comparable_id, snapshot = row
            print(f"\ntasacion_id={tasacion_id}, comparable_id={comparable_id}")
            if snapshot:
                if isinstance(snapshot, dict):
                    print(f"  snapshot['id'] = {snapshot.get('id')} (type: {type(snapshot.get('id')).__name__})")
                    print(f"  snapshot completo: {json.dumps(snapshot, indent=2, default=str)[:500]}...")
                else:
                    print(f"  snapshot (raw): {snapshot}")
            else:
                print("  snapshot: NULL")
                
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    check_snapshots()

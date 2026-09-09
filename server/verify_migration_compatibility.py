"""
Script para verificar compatibilidad de la migración 002 con datos existentes.
"""

import sys
sys.path.insert(0, 'C:\\Users\\tomas\\Desktop\\proyecto-tasador\\server')

from database import get_connection, release_connection, init_db_pool

def verify_migration_compatibility():
    """Verifica que la conversión INTEGER → VARCHAR sea compatible con datos existentes."""
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()

    try:
        print("=== Verificación de compatibilidad de migración 002 ===")
        print("")

        # Verificar valores actuales en comparables
        cursor.execute("""
            SELECT id, ambientes, dormitorios, banos, tipo_inmueble
            FROM comparables
        """)
        rows = cursor.fetchall()

        print(f"Total de comparables: {len(rows)}")
        print("")

        print("=== Datos actuales en ambientes, dormitorios, banos ===")
        print("")
        for row in rows:
            id_val, amb, dorm, banos, tipo = row
            print(f"ID: {id_val}, tipo: {tipo}, ambientes: {amb}, dormitorios: {dorm}, banos: {banos}")
        print("")

        # Verificar si hay valores NULL
        null_ambientes = sum(1 for r in rows if r[1] is None)
        null_dormitorios = sum(1 for r in rows if r[2] is None)
        null_banos = sum(1 for r in rows if r[3] is None)

        print("=== Valores NULL ===")
        print(f"ambientes NULL: {null_ambientes}")
        print(f"dormitorios NULL: {null_dormitorios}")
        print(f"banos NULL: {null_banos}")
        print("")

        # Verificar si todos los valores son numéricos o NULL
        all_numeric_or_null = True
        for row in rows:
            for col_idx in [1, 2, 3]:  # ambientes, dormitorios, banos
                val = row[col_idx]
                if val is not None:
                    if not isinstance(val, int):
                        all_numeric_or_null = False
                        print(f"WARNING: ID {row[0]} tiene valor no entero: {val}")
                        break

        if all_numeric_or_null:
            print("[OK] Todos los valores son INTEGER o NULL")
            print("[OK] La conversion INTEGER -> VARCHAR es segura (no habra perdida de datos)")
        else:
            print("[ERROR] Hay valores no enteros - revisar antes de migrar")
        print("")

        # Verificar valores maximos para asegurar que quepan en VARCHAR(20)
        cursor.execute("""
            SELECT MAX(LENGTH(ambientes::text)) as max_amb,
                   MAX(LENGTH(dormitorios::text)) as max_dorm,
                   MAX(LENGTH(banos::text)) as max_banos
            FROM comparables
        """)
        max_lengths = cursor.fetchone()

        print("=== Longitud maxima de valores actuales ===")
        print(f"ambientes: {max_lengths[0]} caracteres")
        print(f"dormitorios: {max_lengths[1]} caracteres")
        print(f"banos: {max_lengths[2]} caracteres")
        print("")

        if max_lengths[0] <= 20 and max_lengths[1] <= 20 and max_lengths[2] <= 20:
            print("[OK] Todos los valores caben en VARCHAR(20)")
        else:
            print("[ERROR] Algunos valores exceden VARCHAR(20)")

    except Exception as e:
        print(f"Error al verificar compatibilidad: {e}")
        raise
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    verify_migration_compatibility()

"""
Script para obtener el schema actual de la tabla comparables.
"""

import sys
sys.path.insert(0, 'C:\\Users\\tomas\\Desktop\\proyecto-tasador\\server')

from database import get_connection, release_connection, init_db_pool

def get_comparables_schema():
    """Obtiene el schema actual de la tabla comparables."""
    init_db_pool()
    conn = get_connection()
    cursor = conn.cursor()

    try:
        query = """
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'comparables'
            ORDER BY ordinal_position;
        """
        cursor.execute(query)
        columns = cursor.fetchall()

        print("=== Schema actual de la tabla comparables ===")
        print("")
        print(f"{'Columna':<30} {'Tipo':<20} {'Max Length':<10} {'Nullable':<10}")
        print("-" * 70)
        for col in columns:
            column_name, data_type, max_length, is_nullable = col
            max_len_str = str(max_length) if max_length else ""
            print(f"{column_name:<30} {data_type:<20} {max_len_str:<10} {is_nullable:<10}")
        print("")
        print(f"Total de columnas: {len(columns)}")
    except Exception as e:
        print(f"Error al obtener schema: {e}")
    finally:
        cursor.close()
        release_connection(conn)

if __name__ == "__main__":
    get_comparables_schema()

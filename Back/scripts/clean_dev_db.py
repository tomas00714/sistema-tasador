import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_connection, release_connection, init_db_pool

TABLES = ['tasacion_comparable', 'solicitudes', 'comparables', 'tasaciones']

init_db_pool()
conn = get_connection()
conn.autocommit = False
cursor = conn.cursor()

try:
    # Borrar datos de las tablas de negocio y reiniciar sus secuencias
    for table in TABLES:
        print(f'Truncando {table}...')
        cursor.execute(f'TRUNCATE TABLE {table} RESTART IDENTITY CASCADE')

    # Reiniciar contadores de IDs publicos al valor inicial definido por el proyecto
    cursor.execute("UPDATE contadores SET valor = 100")

    conn.commit()
    print('Base de datos limpiada y contadores reiniciados.')
except Exception as e:
    conn.rollback()
    print(f'Error: {e}')
    raise
finally:
    cursor.close()
    release_connection(conn)

import os
from dotenv import load_dotenv
import psycopg2
from psycopg2 import pool
from typing import Optional
import logging

# Cargar variables de entorno
load_dotenv()

logger = logging.getLogger(__name__)

# Configuración de la base de datos
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'tasador'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}

# Agregar sslmode sólo si la variable de entorno está definida
if os.getenv('DB_SSLMODE'):
    DB_CONFIG['sslmode'] = os.getenv('DB_SSLMODE')

# Pool de conexiones
connection_pool: Optional[pool.SimpleConnectionPool] = None


def init_db_pool():
    """Inicializa el pool de conexiones a PostgreSQL."""
    global connection_pool
    
    try:
        connection_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            **DB_CONFIG
        )
        logger.info("Pool de conexiones a PostgreSQL inicializado correctamente")
        return True
    except Exception as e:
        logger.error(f"Error al inicializar pool de conexiones: {e}")
        return False


def get_connection():
    """Obtiene una conexión del pool."""
    global connection_pool
    
    if connection_pool is None:
        raise RuntimeError("El pool de conexiones no está inicializado. Llama init_db_pool() primero.")
    
    try:
        return connection_pool.getconn()
    except Exception as e:
        logger.error(f"Error al obtener conexión del pool: {e}")
        raise


def release_connection(conn):
    """Libera una conexión al pool."""
    global connection_pool
    
    if connection_pool and conn:
        connection_pool.putconn(conn)


def close_db_pool():
    """Cierra el pool de conexiones."""
    global connection_pool
    
    if connection_pool:
        connection_pool.closeall()
        connection_pool = None
        logger.info("Pool de conexiones cerrado")


def test_connection():
    """Prueba la conexión a la base de datos."""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        cursor.close()
        release_connection(conn)
        
        logger.info(f"Conexión exitosa a PostgreSQL. Versión: {version[0]}")
        return True
    except Exception as e:
        logger.error(f"Error al probar conexión: {e}")
        return False

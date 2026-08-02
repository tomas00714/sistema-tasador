import os
import logging
from urllib.parse import urlparse
from dotenv import load_dotenv
import psycopg2
from psycopg2 import pool
from typing import Optional

# Cargar variables de entorno
load_dotenv()

logger = logging.getLogger(__name__)


def _mask_database_url(url: str) -> str:
    """Oculta la contraseña de una DATABASE_URL para loguearla de forma segura."""
    try:
        parsed = urlparse(url)
        if parsed.password is not None:
            user_part = f"{parsed.username}:****"
            host_part = parsed.hostname or ''
            port_part = f":{parsed.port}" if parsed.port else ""
            netloc = f"{user_part}@{host_part}{port_part}"
            return parsed._replace(netloc=netloc).geturl()
    except Exception:
        pass
    return url


def _build_db_config():
    """Construye la configuración de la base de datos priorizando DATABASE_URL."""
    database_url = os.getenv('DATABASE_URL')

    if database_url:
        try:
            config = psycopg2.extensions.parse_dsn(database_url)
            # parse_dsn devuelve 'dbname'; normalizamos a 'database' para mantener consistencia
            if 'dbname' in config:
                config['database'] = config.pop('dbname')
            if 'port' in config:
                config['port'] = int(config['port'])

            # Permitir que DB_SSLMODE sobrescriba el sslmode de la URL si está definida
            if os.getenv('DB_SSLMODE'):
                config['sslmode'] = os.getenv('DB_SSLMODE')

            logger.info(
                f"Conexión configurada desde DATABASE_URL: host={config.get('host')}, "
                f"database={config.get('database')}, user={config.get('user')}, "
                f"dsn={_mask_database_url(database_url)}"
            )
            return config
        except Exception as e:
            logger.error(f"DATABASE_URL presente pero no se pudo parsear: {e}. Se usarán DB_* como fallback.")

    config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 5432)),
        'database': os.getenv('DB_NAME', 'tasador'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }

    if os.getenv('DB_SSLMODE'):
        config['sslmode'] = os.getenv('DB_SSLMODE')

    logger.info(
        f"Conexión configurada desde variables DB_*: host={config['host']}, "
        f"database={config['database']}, user={config['user']}"
    )
    return config


# Configuración de la base de datos
DB_CONFIG = _build_db_config()

# Pool de conexiones
connection_pool: Optional[pool.SimpleConnectionPool] = None


def init_db_pool():
    """Inicializa el pool de conexiones a PostgreSQL."""
    global connection_pool

    database_url = os.getenv('DATABASE_URL')
    if database_url:
        logger.info(
            f"Inicializando pool desde DATABASE_URL: "
            f"{_mask_database_url(database_url)} -> "
            f"host={DB_CONFIG.get('host')}, database={DB_CONFIG.get('database')}, user={DB_CONFIG.get('user')}"
        )
    else:
        logger.info(
            f"Inicializando pool desde variables DB_*: "
            f"host={DB_CONFIG.get('host')}, database={DB_CONFIG.get('database')}, user={DB_CONFIG.get('user')}"
        )

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
        cursor.execute("SELECT current_database(), current_user, version();")
        db_name, db_user, version = cursor.fetchone()
        cursor.close()
        release_connection(conn)

        logger.info(
            f"Conexión exitosa a PostgreSQL. "
            f"Base={db_name}, usuario={db_user}, host={DB_CONFIG.get('host')}, "
            f"versión={version}"
        )
        return True
    except Exception as e:
        logger.error(f"Error al probar conexión: {e}")
        return False

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


# TCP keepalives: evita que Neon/Render cierren silenciosamente las
# conexiones SSL idle del pool, causa de "SSL connection has been closed
# unexpectedly" y "connection already closed".
_KEEPALIVE_PARAMS = {
    'keepalives': 1,
    'keepalives_idle': 60,
    'keepalives_interval': 30,
    'keepalives_count': 5,
}


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

            for key, value in _KEEPALIVE_PARAMS.items():
                config.setdefault(key, value)

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

    for key, value in _KEEPALIVE_PARAMS.items():
        config.setdefault(key, value)

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


def _conn_is_dead(conn) -> bool:
    """Detecta conexiones PostgreSQL inválidas o cerradas.

    Además del flag ``conn.closed``, revisa ``transaction_status``: libpq lo
    marca TRANSACTION_STATUS_UNKNOWN cuando el servidor (o el SSL de Neon)
    cerró la conexión por debajo, antes de que psycopg2 actualice ``closed``.
    """
    try:
        if conn is None or conn.closed:
            return True
        info = getattr(conn, "info", None)
        if info is not None:
            status = info.transaction_status
        else:
            status = conn.get_transaction_status()
        return status == psycopg2.extensions.TRANSACTION_STATUS_UNKNOWN
    except Exception:
        return True


_STALE_CONN_ERROR_MARKERS = (
    "connection already closed",
    "SSL connection has been closed",
    "server closed the connection",
    "terminating connection",
    "connection not open",
)


def is_stale_connection_error(e: Exception) -> bool:
    """Indica si el error corresponde a una conexión muerta del pool.

    Estos errores ocurren antes de ejecutar la query en el servidor, por lo
    que la operación puede reintentarse de forma segura con otra conexión.
    """
    if not isinstance(e, (psycopg2.InterfaceError, psycopg2.OperationalError)):
        return False
    return any(marker in str(e) for marker in _STALE_CONN_ERROR_MARKERS)


def get_connection():
    """Obtiene una conexión válida del pool.

    Si el pool entrega una conexión muerta (cerrada por Neon/SSL o por el
    propio driver), la descarta y busca otra, hasta agotar los intentos.
    """
    global connection_pool

    if connection_pool is None:
        raise RuntimeError("El pool de conexiones no está inicializado. Llama init_db_pool() primero.")

    for _ in range(5):
        try:
            conn = connection_pool.getconn()
        except Exception as e:
            logger.error(f"Error al obtener conexión del pool: {e}")
            raise
        if _conn_is_dead(conn):
            logger.warning("El pool entregó una conexión muerta; se descarta y se busca otra")
            discard_connection(conn)
            continue
        return conn

    raise RuntimeError("No se pudo obtener una conexión PostgreSQL válida del pool")


def discard_connection(conn):
    """Descarta una conexión inválida: el pool la olvida y se cierra."""
    global connection_pool

    if conn is None:
        return
    if connection_pool is not None:
        try:
            connection_pool.putconn(conn, close=True)
            return
        except Exception:
            pass
    try:
        conn.close()
    except Exception:
        pass


def release_connection(conn):
    """Libera una conexión al pool; si está muerta, la descarta."""
    global connection_pool

    if connection_pool is None or conn is None:
        return

    try:
        connection_pool.putconn(conn, close=_conn_is_dead(conn))
    except Exception as e:
        logger.warning(f"Error al devolver conexión al pool: {e}")
        try:
            conn.close()
        except Exception:
            pass


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

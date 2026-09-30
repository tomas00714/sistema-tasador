from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import logging
import json
import psycopg2
from database import (
    get_connection, release_connection, discard_connection,
    is_stale_connection_error,
)

logger = logging.getLogger(__name__)


# Marca que indica que psycopg2 rechazó la llamada del lado del CLIENTE:
# el flag `closed` ya estaba seteado al entrar, por lo que la query jamás
# fue transmitida al servidor.
_CLIENT_SIDE_REJECT_MARKERS = ("already closed", "connection not open")

# Palabras que convierten a un SELECT en una operación con efectos
# secundarios (bloqueos, avance de secuencias, advisory locks).
_SELECT_SIDE_EFFECT_MARKERS = ("FOR UPDATE", "FOR SHARE", "NEXTVAL", "ADVISORY")


def _es_rechazo_del_cliente(e: Exception) -> bool:
    """True si psycopg2 rechazó la llamada sin enviar nada al servidor.

    Cuando ``conn.closed`` ya está seteado, ``cursor()``/``execute()``/
    ``commit()`` lanzan InterfaceError ANTES de tocar el socket: la query
    nunca fue transmitida. Y si la conexión murió a mitad de una
    transacción implícita, el servidor aborta el tx al caer la conexión,
    por lo que nada persistió. Reintentar es seguro para cualquier query.
    """
    return isinstance(e, psycopg2.InterfaceError) and any(
        m in str(e) for m in _CLIENT_SIDE_REJECT_MARKERS
    )


def _es_consulta_lectura(query: str) -> bool:
    """True si la query es un SELECT sin efectos secundarios.

    Un SELECT puro es idempotente: re-ejecutarlo no tiene efectos
    observables, por lo que puede reintentarse aunque el error deje
    ambiguo si llegó al servidor. SELECT FOR UPDATE/SHARE, nextval y
    advisory locks tienen efectos y se tratan como escrituras.
    """
    q = query.lstrip().upper()
    if not q.startswith("SELECT"):
        return False
    return not any(m in q for m in _SELECT_SIDE_EFFECT_MARKERS)


class BaseRepository(ABC):
    """Repositorio base con operaciones comunes de CRUD."""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = True, conn=None):
        """Ejecuta una query y retorna los resultados.

        Si se pasa ``conn``, la query se ejecuta dentro de esa transacción:
        no se hace commit/rollback ni se libera la conexión (responsabilidad
        del llamador). Sin ``conn`` se obtiene una conexión del pool y se
        commitea automáticamente, como siempre.

        Resiliencia ante conexiones muertas del pool (Neon/Render cierra
        conexiones SSL idle): se descarta la conexión y se reintenta UNA
        vez, pero SOLO cuando es demostrable que la query no pudo quedar
        ejecutada en el servidor:

        - error al crear el cursor: nada se envió jamás;
        - InterfaceError "already closed"/"not open": psycopg2 rechazó la
          llamada del lado del cliente, nada fue transmitido;
        - SELECT sin efectos secundarios: re-ejecutarlo es idempotente.

        Un INSERT/UPDATE/DELETE que falla durante execute()/commit() con
        un OperationalError (el socket murió a mitad del envío o de la
        respuesta) NO se reintenta: el servidor pudo haberlo ejecutado y
        reintentar duplicaría la escritura. El error se propaga.
        """
        own_conn = conn is None
        attempts = 2 if own_conn else 1

        for attempt in range(attempts):
            if own_conn:
                conn = get_connection()
            cursor = None
            enviado = False  # True desde execute(): la query puede haber llegado al server

            try:
                cursor = conn.cursor()
                enviado = True
                cursor.execute(query, params or ())

                if fetch:
                    columns = [desc[0] for desc in cursor.description]
                    rows = cursor.fetchall()
                    if own_conn:
                        conn.commit()  # Commit después de leer para no cerrar el portal antes de fetchall
                    results = [dict(zip(columns, row)) for row in rows]
                    return results
                else:
                    if own_conn:
                        conn.commit()
                    return cursor.rowcount
            except Exception as e:
                retryable = (
                    own_conn
                    and attempt < attempts - 1
                    and is_stale_connection_error(e)
                    and (
                        not enviado
                        or _es_rechazo_del_cliente(e)
                        or _es_consulta_lectura(query)
                    )
                )
                if retryable:
                    # Conexión muerta entregada por el pool: se descarta y
                    # se reintenta con una nueva, sabiendo que la query no
                    # pudo quedar ejecutada en el servidor.
                    logger.warning(
                        "Conexión PostgreSQL muerta detectada; se descarta y "
                        "se reintenta la query con una conexión nueva"
                    )
                    discard_connection(conn)
                    conn = None
                    continue
                if own_conn and conn is not None:
                    try:
                        conn.rollback()
                    except Exception:
                        # rollback sobre conexión muerta: no enmascarar el
                        # error original
                        pass
                logger.error(f"Error en query: {e}")
                raise
            finally:
                if cursor is not None:
                    try:
                        cursor.close()
                    except Exception:
                        pass
                if own_conn and conn is not None:
                    release_connection(conn)
    
    def find_by_id(self, id: int) -> Optional[Dict[str, Any]]:
        """Busca un registro por ID."""
        query = f"SELECT * FROM {self.table_name} WHERE id = %s"
        results = self.execute_query(query, (id,))
        return results[0] if results else None
    
    def find_all(self, limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca todos los registros."""
        query = f"SELECT * FROM {self.table_name}"
        
        if limit:
            query += f" LIMIT {limit}"
        if offset:
            query += f" OFFSET {offset}"
        
        return self.execute_query(query)
    
    def create(self, data: Dict[str, Any], conn=None) -> Dict[str, Any]:
        """Crea un nuevo registro."""
        columns = data.keys()
        values = []
        for value in data.values():
            if isinstance(value, dict):
                values.append(json.dumps(value))
            else:
                values.append(value)

        placeholders = ', '.join(['%s'] * len(values))
        columns_str = ', '.join(columns)

        query = f"""
            INSERT INTO {self.table_name} ({columns_str})
            VALUES ({placeholders})
            RETURNING *
        """

        results = self.execute_query(query, tuple(values), conn=conn)
        return results[0] if results else None

    def update(self, id: int, data: Dict[str, Any], conn=None) -> Optional[Dict[str, Any]]:
        """Actualiza un registro."""
        columns = data.keys()
        values = []
        for value in data.values():
            if isinstance(value, dict):
                values.append(json.dumps(value))
            else:
                values.append(value)

        set_clause = ', '.join([f"{col} = %s" for col in columns])

        query = f"""
            UPDATE {self.table_name}
            SET {set_clause}
            WHERE id = %s
            RETURNING *
        """

        params = tuple(values) + (id,)
        results = self.execute_query(query, params, conn=conn)
        return results[0] if results else None
    
    def delete(self, id: int) -> bool:
        """Elimina un registro."""
        query = f"DELETE FROM {self.table_name} WHERE id = %s"
        rowcount = self.execute_query(query, (id,), fetch=False)
        return rowcount > 0
    
    def find_where(self, conditions: Dict[str, Any], limit: int = None, offset: int = None) -> List[Dict[str, Any]]:
        """Busca registros con condiciones WHERE, opcionalmente paginados."""
        where_clauses = []
        params = []

        for column, value in conditions.items():
            where_clauses.append(f"{column} = %s")
            params.append(value)

        where_str = ' AND '.join(where_clauses)
        query = f"SELECT * FROM {self.table_name} WHERE {where_str}"

        if limit is not None:
            query += " LIMIT %s"
            params.append(limit)
        if limit is not None and offset is not None:
            query += " OFFSET %s"
            params.append(offset)

        return self.execute_query(query, tuple(params))

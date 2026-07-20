from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
import logging
import json
from database import get_connection, release_connection

logger = logging.getLogger(__name__)


class BaseRepository(ABC):
    """Repositorio base con operaciones comunes de CRUD."""
    
    def __init__(self, table_name: str):
        self.table_name = table_name
    
    def execute_query(self, query: str, params: tuple = None, fetch: bool = True):
        """Ejecuta una query y retorna los resultados."""
        logger.info(f"[EXECUTE_QUERY] query={query} params={params} fetch={fetch}")
        conn = get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(query, params or ())

            if fetch:
                logger.info("[EXECUTE_QUERY] commit antes de fetchall (fetch=True)")
                conn.commit()  # Commit para asegurar que los cambios se guarden
                columns = [desc[0] for desc in cursor.description]
                logger.info(f"[EXECUTE_QUERY] columns={columns}")
                rows = cursor.fetchall()
                logger.info(f"[EXECUTE_QUERY] row_count={len(rows)}")
                for i, row in enumerate(rows):
                    logger.info(f"[EXECUTE_QUERY] row[{i}] types={[type(v).__name__ for v in row]}")
                results = [dict(zip(columns, row)) for row in rows]
                return results
            else:
                conn.commit()
                return cursor.rowcount
        except Exception as e:
            conn.rollback()
            logger.error(f"[EXECUTE_QUERY] Error en query: {e}", exc_info=True)
            raise
        finally:
            cursor.close()
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
    
    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
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
        
        results = self.execute_query(query, tuple(values))
        return results[0] if results else None
    
    def update(self, id: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
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
        results = self.execute_query(query, params)
        return results[0] if results else None
    
    def delete(self, id: int) -> bool:
        """Elimina un registro."""
        query = f"DELETE FROM {self.table_name} WHERE id = %s"
        rowcount = self.execute_query(query, (id,), fetch=False)
        return rowcount > 0
    
    def find_where(self, conditions: Dict[str, Any], limit: int = None) -> List[Dict[str, Any]]:
        """Busca registros con condiciones WHERE."""
        where_clauses = []
        params = []

        for column, value in conditions.items():
            where_clauses.append(f"{column} = %s")
            params.append(value)

        where_str = ' AND '.join(where_clauses)
        query = f"SELECT * FROM {self.table_name} WHERE {where_str}"

        if limit:
            query += f" LIMIT {limit}"

        logger.info(f"[FIND_WHERE] table={self.table_name} query={query} params={tuple(params)}")
        return self.execute_query(query, tuple(params))

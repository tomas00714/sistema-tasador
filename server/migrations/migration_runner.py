import os
import logging
from typing import List, Optional
from database import get_connection, release_connection

logger = logging.getLogger(__name__)


class MigrationRunner:
    """Ejecuta migraciones de base de datos de forma versionada."""
    
    def __init__(self, migrations_dir: str):
        self.migrations_dir = migrations_dir
        self.migrations_table = "schema_migrations"
    
    def ensure_migrations_table(self):
        """Crea la tabla de migraciones si no existe."""
        query = f"""
            CREATE TABLE IF NOT EXISTS {self.migrations_table} (
                id SERIAL PRIMARY KEY,
                version VARCHAR(50) UNIQUE NOT NULL,
                nombre VARCHAR(255) NOT NULL,
                fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query)
            conn.commit()
            logger.info(f"Tabla {self.migrations_table} verificada/creada")
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al crear tabla de migraciones: {e}")
            raise
        finally:
            cursor.close()
            release_connection(conn)
    
    def get_executed_migrations(self) -> List[str]:
        """Obtiene la lista de migraciones ya ejecutadas."""
        query = f"SELECT version FROM {self.migrations_table} ORDER BY version"
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query)
            results = [row[0] for row in cursor.fetchall()]
            return results
        except Exception as e:
            logger.error(f"Error al obtener migraciones ejecutadas: {e}")
            return []
        finally:
            cursor.close()
            release_connection(conn)
    
    def get_pending_migrations(self) -> List[tuple]:
        """Obtiene las migraciones pendientes de ejecutar."""
        executed = set(self.get_executed_migrations())
        pending = []
        
        # Leer archivos de migración del directorio
        if os.path.exists(self.migrations_dir):
            for filename in sorted(os.listdir(self.migrations_dir)):
                if filename.endswith('.sql') and filename != '__init__.py':
                    version = filename.split('_')[0]  # Ej: 001 de 001_create_initial_tables.sql
                    
                    if version not in executed:
                        filepath = os.path.join(self.migrations_dir, filename)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            sql_content = f.read()
                        
                        pending.append((version, filename, sql_content))
        
        return pending
    
    def execute_migration(self, version: str, filename: str, sql_content: str) -> bool:
        """Ejecuta una migración específica."""
        logger.info(f"Ejecutando migración {version}: {filename}")
        
        conn = get_connection()
        cursor = conn.cursor()
        
        try:
            # Ejecutar el SQL de la migración
            cursor.execute(sql_content)
            
            # Registrar la migración
            insert_query = f"""
                INSERT INTO {self.migrations_table} (version, nombre)
                VALUES (%s, %s)
            """
            cursor.execute(insert_query, (version, filename))
            
            conn.commit()
            logger.info(f"Migración {version} ejecutada exitosamente")
            return True
        except Exception as e:
            conn.rollback()
            logger.error(f"Error al ejecutar migración {version}: {e}")
            return False
        finally:
            cursor.close()
            release_connection(conn)
    
    def run_migrations(self) -> bool:
        """Ejecuta todas las migraciones pendientes."""
        logger.info("Iniciando ejecución de migraciones...")
        
        try:
            # Asegurar que la tabla de migraciones existe
            self.ensure_migrations_table()
            
            # Obtener migraciones pendientes
            pending = self.get_pending_migrations()
            
            if not pending:
                logger.info("No hay migraciones pendientes")
                return True
            
            logger.info(f"Se encontraron {len(pending)} migraciones pendientes")
            
            # Ejecutar cada migración
            for version, filename, sql_content in pending:
                success = self.execute_migration(version, filename, sql_content)
                if not success:
                    logger.error(f"Fallo al ejecutar migración {version}. Deteniendo ejecución.")
                    return False
            
            logger.info("Todas las migraciones ejecutadas exitosamente")
            return True
        except Exception as e:
            logger.error(f"Error durante ejecución de migraciones: {e}")
            return False
    
    def rollback_migration(self, version: str) -> bool:
        """Rollback de una migración específica (manual)."""
        logger.warning(f"Rollback manual de migración {version} no implementado automáticamente")
        logger.warning("Para hacer rollback, debes ejecutar manualmente el SQL inverso y eliminar el registro de la tabla")
        return False

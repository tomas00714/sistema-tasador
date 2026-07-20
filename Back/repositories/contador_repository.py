from typing import Optional, List
from repositories.base_repository import BaseRepository


class ContadorRepository(BaseRepository):
    """Repositorio para gestionar contadores de IDs."""
    
    def __init__(self):
        super().__init__(table_name='contadores')
    
    def get_by_tipo(self, tipo: str) -> Optional[dict]:
        """Obtiene un contador por su tipo."""
        query = "SELECT * FROM contadores WHERE tipo = %s"
        results = self.execute_query(query, (tipo,))
        return results[0] if results else None
    
    def get_all(self) -> List[dict]:
        """Obtiene todos los contadores."""
        query = "SELECT * FROM contadores ORDER BY tipo"
        return self.execute_query(query)
    
    def incrementar(self, tipo: str) -> Optional[dict]:
        """Incrementa el valor de un contador y retorna el contador actualizado."""
        query = """
            UPDATE contadores 
            SET valor = valor + 1 
            WHERE tipo = %s 
            RETURNING *
        """
        results = self.execute_query(query, (tipo,))
        return results[0] if results else None
    
    def set_valor(self, tipo: str, valor: int) -> Optional[dict]:
        """Establece el valor de un contador, creandolo si no existe."""
        query = """
            INSERT INTO contadores (tipo, valor) 
            VALUES (%s, %s) 
            ON CONFLICT (tipo) DO UPDATE 
            SET valor = EXCLUDED.valor
            RETURNING *
        """
        results = self.execute_query(query, (tipo, valor))
        return results[0] if results else None
    
    def create(self, tipo: str, valor: int) -> Optional[dict]:
        """Crea un nuevo contador."""
        query = """
            INSERT INTO contadores (tipo, valor) 
            VALUES (%s, %s) 
            RETURNING *
        """
        results = self.execute_query(query, (tipo, valor))
        return results[0] if results else None
    
    def sincronizar(self) -> None:
        """Sincroniza los contadores con los IDs publicos existentes.
        
        Asegura que el siguiente ID generado no choque con valores ya existentes
        en las tablas de negocio. Util para la migracion desde el antiguo sistema
        de archivos a PostgreSQL.
        """
        mapping = {
            'T': 'tasaciones',
            'C': 'comparables',
            'S': 'solicitudes'
        }
        
        for tipo, tabla in mapping.items():
            query = f"""
                UPDATE contadores c
                SET valor = GREATEST(
                    c.valor,
                    COALESCE((
                        SELECT MAX(CAST(SPLIT_PART(id_publico, '-', 2) AS INTEGER))
                        FROM {tabla}
                        WHERE id_publico ~ '^[A-Za-z]-[0-9]+$'
                    ), c.valor)
                )
                WHERE c.tipo = %s
            """
            self.execute_query(query, (tipo,), fetch=False)
    
    def generar_id(self, tipo: str, valor_inicial: int = 100) -> str:
        """Genera un nuevo ID público atómico usando PostgreSQL.
        
        Inserta el contador si no existe con valor_inicial y retorna ese valor,
        o incrementa el valor existente y retorna el nuevo valor. Todo en una
        sola consulta atómica resistente a concurrencia.
        """
        if tipo not in ('T', 'C', 'U', 'S'):
            raise ValueError(f"Tipo de contador invalido: {tipo}")
        
        query = """
            INSERT INTO contadores (tipo, valor) 
            VALUES (%s, %s) 
            ON CONFLICT (tipo) DO UPDATE 
            SET valor = contadores.valor + 1
            RETURNING valor
        """
        results = self.execute_query(query, (tipo, valor_inicial))
        if not results:
            raise RuntimeError(f"No se pudo generar ID para tipo {tipo}")
        return f"{tipo}-{results[0]['valor']}"

"""
Repositorio para tokens de recuperación de contraseña.
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from repositories.base_repository import BaseRepository
from database import get_connection, release_connection
import hashlib
import logging

logger = logging.getLogger(__name__)


def hash_token(token: str) -> str:
    """
    Genera hash SHA-256 de un token de recuperación.

    SHA-256 es determinista (mismo input = mismo hash), lo que permite
    buscar tokens en la base de datos. El token de 32 bytes generado por
    secrets.token_urlsafe(32) ya es criptográficamente seguro, por lo que
    no necesita la protección adicional de bcrypt.

    Args:
        token: Token en texto plano.

    Returns:
        Hash SHA-256 del token.
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


class PasswordResetRepository(BaseRepository):
    """Repositorio para operaciones con tokens de recuperación de contraseña."""

    def __init__(self):
        super().__init__("password_reset_tokens")

    def create_token(
        self,
        usuario_id: int,
        token: str,
        expiracion_minutos: int = 30
    ) -> Dict[str, Any]:
        """
        Crea un nuevo token de recuperación para un usuario.

        Invalida automáticamente cualquier token activo previo del mismo usuario.

        Args:
            usuario_id: ID del usuario.
            token: Token en texto plano (se guardará el hash).
            expiracion_minutos: Minutos hasta que expire el token.

        Returns:
            El registro del token creado.
        """
        # Invalidar tokens activos previos del usuario
        self.invalidate_user_tokens(usuario_id)

        # Calcular expiración
        expiracion = datetime.utcnow() + timedelta(minutes=expiracion_minutos)

        # Guardar solo el hash del token (SHA-256, determinista)
        token_hash = hash_token(token)

        data = {
            "usuario_id": usuario_id,
            "token_hash": token_hash,
            "expiracion": expiracion,
            "utilizado": False
        }

        return self.create(data)

    def find_valid_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Busca un token válido por su valor.

        Verifica:
        - El hash coincide
        - No está marcado como utilizado
        - No ha expirado

        Args:
            token: Token en texto plano.

        Returns:
            El registro del token si es válido, None en caso contrario.

        NOTA: Este método NO es seguro para concurrencia. Para consumo atómico,
        usa consume_token() dentro de una transacción.
        """
        # Calcular hash del token (SHA-256, determinista)
        token_hash = hash_token(token)

        # Buscar por hash directamente (más eficiente que iterar)
        query = """
            SELECT * FROM password_reset_tokens
            WHERE token_hash = %s
            AND utilizado = false
            AND expiracion > CURRENT_TIMESTAMP
            ORDER BY fecha_creacion DESC
            LIMIT 1
        """

        tokens = self.execute_query(query, (token_hash,))

        if tokens:
            return tokens[0]
        return None

    def consume_token(self, token: str, conn) -> Optional[Dict[str, Any]]:
        """
        Consume un token de forma atómica dentro de una transacción.

        Este método debe llamarse dentro de una transacción existente.
        Verifica y marca el token como utilizado en una sola operación atómica.

        Args:
            token: Token en texto plano.
            conn: Conexión de base de datos activa (para usarla en la transacción).

        Returns:
            El registro del token si fue consumido exitosamente, None si:
            - El token no existe
            - El hash no coincide
            - Ya está marcado como utilizado
            - Ha expirado
            - Fue consumido por otra transacción concurrente
        """
        cursor = conn.cursor()

        try:
            # Buscar token por hash y verificar que no esté utilizado ni expirado
            # Usamos una sola query que:
            # 1. Busca por hash (todos los tokens con ese hash)
            # 2. Filtra por no utilizado y no expirado
            # 3. Ordena por fecha (el más reciente primero)
            # 4. LIMIT 1 para obtener solo uno
            query = """
                SELECT * FROM password_reset_tokens
                WHERE token_hash = %s
                AND utilizado = false
                AND expiracion > CURRENT_TIMESTAMP
                ORDER BY fecha_creacion DESC
                LIMIT 1
                FOR UPDATE
            """

            # Calcular hash del token (SHA-256, determinista)
            token_hash = hash_token(token)

            cursor.execute(query, (token_hash,))
            token_record = cursor.fetchone()

            if not token_record:
                # Token no encontrado, ya utilizado, expirado, o consumido por otra transacción
                return None

            # Marcar como utilizado atómicamente
            update_query = """
                UPDATE password_reset_tokens
                SET utilizado = true, fecha_utilizacion = CURRENT_TIMESTAMP
                WHERE id = %s
                AND utilizado = false
            """

            cursor.execute(update_query, (token_record['id'],))

            # Verificar que se actualizó exactamente 1 fila
            # Si es 0, significa que otra transacción lo consumió antes
            if cursor.rowcount == 0:
                return None

            return token_record

        except Exception as e:
            logger.error(f"Error al consumir token: {e}")
            raise

    def mark_as_used(self, token_id: int) -> bool:
        """
        Marca un token como utilizado.

        Args:
            token_id: ID del token.

        Returns:
            True si se marcó correctamente, False en caso contrario.
        """
        return self.update(token_id, {
            "utilizado": True,
            "fecha_utilizacion": "now()"
        }) is not None

    def invalidate_user_tokens(self, usuario_id: int) -> bool:
        """
        Invalida todos los tokens activos de un usuario.

        Args:
            usuario_id: ID del usuario.

        Returns:
            True si se invalidaron correctamente.
        """
        query = """
            UPDATE password_reset_tokens
            SET utilizado = true, fecha_utilizacion = CURRENT_TIMESTAMP
            WHERE usuario_id = %s AND utilizado = false
        """

        try:
            conn = get_connection()
            with conn.cursor() as cur:
                cur.execute(query, (usuario_id,))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error al invalidar tokens del usuario {usuario_id}: {e}")
            return False
        finally:
            release_connection(conn)

    def cleanup_expired_tokens(self, days: int = 7) -> int:
        """
        Limpia tokens expirados antiguos.

        Args:
            days: Número de días de antigüedad para eliminar.

        Returns:
            Número de tokens eliminados.
        """
        query = """
            DELETE FROM password_reset_tokens
            WHERE expiracion < CURRENT_TIMESTAMP - INTERVAL '%s days'
        """

        try:
            conn = get_connection()
            with conn.cursor() as cur:
                cur.execute(query, (days,))
                deleted = cur.rowcount
                conn.commit()
                logger.info(f"Limpiados {deleted} tokens expirados")
                return deleted
        except Exception as e:
            logger.error(f"Error al limpiar tokens expirados: {e}")
            return 0
        finally:
            release_connection(conn)

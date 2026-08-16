from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from os import getenv

JWT_SECRET_KEY = getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_TOKEN_EXPIRE_HOURS = int(getenv("JWT_ACCESS_TOKEN_EXPIRE_HOURS", "24"))

# Lista de emails administradores.
# Los administradores se determinan únicamente por su email.
# No existe asociación entre IDs específicos y permisos de administrador.
# Se cargan desde variables de entorno ADMIN_EMAIL_1 ... ADMIN_EMAIL_99
# y también se pueden agregar hardcodeados abajo.
ADMIN_EMAILS = set()
for i in range(1, 100):  # Soporta hasta 99 administradores por entorno
    email = getenv(f"ADMIN_EMAIL_{i}")
    if email:
        ADMIN_EMAILS.add(email)

# DEBUG LOG - Verificar qué emails de admin se cargaron
import logging
logger = logging.getLogger(__name__)
logger.info(f"=== DEBUG ADMIN === ADMIN_EMAILS cargados: {ADMIN_EMAILS}")

# Opcional: hardcodeados para desarrollo local.
# Forma recomendada: usar el archivo .env con variables ADMIN_EMAIL_1, ADMIN_EMAIL_2, etc.
# Si querés hardcodear, descomentá los correos de abajo.
# ADMIN_EMAILS.update({
#     'tucorreo1@gmail.com',
#     'tucorreo2@gmail.com',
# })


def hash_password(password: str) -> str:
    # Truncar contraseña a 72 bytes máximo (limitación de bcrypt)
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Truncar contraseña a 72 bytes máximo (limitación de bcrypt)
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_ACCESS_TOKEN_EXPIRE_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_user_id_from_token(token: str) -> Optional[int]:
    payload = decode_access_token(token)
    if payload is None:
        return None
    return payload.get("sub")


def is_admin(email: str) -> bool:
    """Determina si un email pertenece a un administrador."""
    result = email in ADMIN_EMAILS
    logger.info(f"=== DEBUG ADMIN === is_admin check - email: '{email}', result: {result}, esta_en_lista: {email in ADMIN_EMAILS}")
    return result

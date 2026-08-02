from typing import Optional
from fastapi import Request, HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from auth import get_user_id_from_token, is_admin
from repositories.usuario_repository import UsuarioRepository

security = HTTPBearer()


async def get_current_user_id(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Dependency que extrae el usuario_id del token JWT."""
    token = credentials.credentials
    
    user_id = get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return int(user_id)


async def get_optional_user_id(request: Request) -> Optional[int]:
    """Dependency opcional que extrae el usuario_id del token si está presente."""
    try:
        credentials: HTTPAuthorizationCredentials = await security(request)
        token = credentials.credentials
        user_id = get_user_id_from_token(token)
        return int(user_id) if user_id else None
    except Exception:
        return None


def require_admin(usuario_id: int = Depends(get_current_user_id)) -> int:
    """Dependencia que requiere que el usuario sea administrador.
    
    Los administradores se determinan únicamente por su email en las variables
    de entorno ADMIN_EMAIL_*. No existe asociación entre IDs específicos y
    permisos de administrador.
    """
    repo = UsuarioRepository()
    usuario = repo.find_by_id(usuario_id)
    
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if not is_admin(usuario['email']):
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    
    return usuario_id

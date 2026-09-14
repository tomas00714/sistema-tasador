from dotenv import load_dotenv
load_dotenv()
from database import init_db_pool
init_db_pool()

import auth
from repositories.usuario_repository import UsuarioRepository
from repositories.profesional_repository import ProfesionalRepository

email = 'qa_avatar_test_20260909@example.com'
password = 'TestPass123!'

u_repo = UsuarioRepository()
p_repo = ProfesionalRepository()

# Cleanup
existing = u_repo.find_by_email(email)
if existing:
    u_repo.execute_query("DELETE FROM profesionales WHERE usuario_id = %s", (existing['id'],), fetch=False)
    u_repo.execute_query("DELETE FROM usuarios WHERE id = %s", (existing['id'],), fetch=False)

# Create user
user = u_repo.create_usuario({
    'email': email,
    'password_hash': auth.hash_password(password),
    'nombre': 'QA',
    'apellido': 'Avatar',
    'estado': 'activo'
})
print('user id:', user['id'])

# Create professional with foto_perfil
p = p_repo.create_for_usuario(user['id'], {
    'matricula': 'CPI 1234',
    'telefono': '+54 11 1234-5678',
    'nombre_inmobiliaria': 'Inmobiliaria QA',
    'foto_perfil': 'foto_perfil_ffdf9dccafb148babff2747738050296.jpg',
    'logo_inmobiliaria': None
})
print('professional created:', p is not None)

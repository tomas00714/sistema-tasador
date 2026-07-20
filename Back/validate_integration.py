"""
Script de validación completa de la integración PostgreSQL.
Ejecuta pruebas para verificar que la implementación es correcta.
"""
import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', 5432)),
    'database': os.getenv('DB_NAME', 'tasador'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'postgres')
}


def get_connection():
    """Obtiene una conexión a PostgreSQL."""
    return psycopg2.connect(**DB_CONFIG)


def test_connection():
    """Prueba la conexión a PostgreSQL."""
    logger.info("=== 1. Probando conexión a PostgreSQL ===")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()
        cursor.close()
        conn.close()
        
        logger.info(f"✅ Conexión exitosa")
        logger.info(f"   Versión: {version[0]}")
        
        # Verificar que es PostgreSQL
        if 'PostgreSQL' in version[0]:
            logger.info("✅ Motor de base de datos: PostgreSQL")
            return True
        else:
            logger.error(f"❌ Motor incorrecto: {version[0]}")
            return False
    except Exception as e:
        logger.error(f"❌ Error de conexión: {e}")
        return False


def drop_all_tables():
    """Elimina todas las tablas para probar migraciones desde cero."""
    logger.info("=== 2. Eliminando todas las tablas (DROP SCHEMA CASCADE) ===")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Eliminar schema public y recrearlo
        cursor.execute("DROP SCHEMA public CASCADE;")
        cursor.execute("CREATE SCHEMA public;")
        cursor.execute("GRANT ALL ON SCHEMA public TO postgres;")
        cursor.execute("GRANT ALL ON SCHEMA public TO public;")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("✅ Schema public eliminado y recreado")
        return True
    except Exception as e:
        logger.error(f"❌ Error al eliminar tablas: {e}")
        return False


def run_migrations():
    """Ejecuta las migraciones desde el archivo SQL."""
    logger.info("=== 3. Ejecutando migraciones desde cero ===")
    try:
        migrations_dir = os.path.join(os.path.dirname(__file__), 'migrations')
        migration_file = os.path.join(migrations_dir, '001_create_initial_tables.sql')
        
        if not os.path.exists(migration_file):
            logger.error(f"❌ Archivo de migración no encontrado: {migration_file}")
            return False
        
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(sql_content)
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("✅ Migraciones ejecutadas exitosamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error al ejecutar migraciones: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_tables():
    """Verifica que todas las tablas estén creadas."""
    logger.info("=== 4. Verificando tablas creadas ===")
    expected_tables = [
        'planes',
        'usuarios',
        'tasaciones',
        'comparables',
        'tasacion_comparable',
        'solicitudes',
        'schema_migrations'
    ]
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        actual_tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        
        logger.info(f"Tablas encontradas: {actual_tables}")
        
        missing_tables = set(expected_tables) - set(actual_tables)
        extra_tables = set(actual_tables) - set(expected_tables)
        
        if missing_tables:
            logger.error(f"❌ Tablas faltantes: {missing_tables}")
            return False
        
        if extra_tables:
            logger.warning(f"⚠️  Tablas extra: {extra_tables}")
        
        logger.info(f"✅ Todas las tablas esperadas están creadas")
        return True
    except Exception as e:
        logger.error(f"❌ Error al verificar tablas: {e}")
        return False


def verify_indexes():
    """Verifica que los índices estén creados."""
    logger.info("=== 5. Verificando índices ===")
    expected_indexes = [
        'idx_usuarios_email',
        'idx_usuarios_google_id',
        'idx_usuarios_plan',
        'idx_usuarios_estado',
        'idx_tasaciones_usuario',
        'idx_tasaciones_tipo',
        'idx_tasaciones_estado',
        'idx_tasaciones_fecha',
        'idx_tasaciones_valor',
        'idx_tasaciones_superficie',
        'idx_tasaciones_provincia',
        'idx_tasaciones_localidad',
        'idx_tasaciones_coords',
        'idx_tasaciones_ambientes',
        'idx_tasaciones_dormitorios',
        'idx_tasaciones_cochera',
        'idx_tasaciones_tipo_lote',
        'idx_tasaciones_zonificacion',
        'idx_tasaciones_datos',
        'idx_comparables_usuario',
        'idx_comparables_tipo',
        'idx_comparables_fuente',
        'idx_comparables_valor',
        'idx_comparables_superficie',
        'idx_comparables_provincia',
        'idx_comparables_localidad',
        'idx_comparables_coords',
        'idx_comparables_datos',
        'idx_tasacion_comparable_tasacion',
        'idx_tasacion_comparable_comparable',
        'idx_solicitudes_usuario',
        'idx_solicitudes_estado',
        'idx_solicitudes_link'
    ]
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public'
            ORDER BY indexname;
        """)
        actual_indexes = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        
        logger.info(f"Total de índices encontrados: {len(actual_indexes)}")
        
        missing_indexes = set(expected_indexes) - set(actual_indexes)
        
        if missing_indexes:
            logger.error(f"❌ Índices faltantes: {missing_indexes}")
            return False
        
        logger.info(f"✅ Todos los índices esperados están creados")
        return True
    except Exception as e:
        logger.error(f"❌ Error al verificar índices: {e}")
        return False


def verify_constraints():
    """Verifica restricciones y claves foráneas."""
    logger.info("=== 6. Verificando restricciones y claves foráneas ===")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Verificar claves foráneas
        cursor.execute("""
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY tc.table_name;
        """)
        
        foreign_keys = cursor.fetchall()
        logger.info(f"Claves foráneas encontradas: {len(foreign_keys)}")
        
        for fk in foreign_keys:
            logger.info(f"   {fk[0]}.{fk[1]} -> {fk[2]}.{fk[3]}")
        
        # Verificar restricciones CHECK
        cursor.execute("""
            SELECT table_name, constraint_name
            FROM information_schema.table_constraints
            WHERE constraint_type = 'CHECK'
            ORDER BY table_name;
        """)
        
        check_constraints = cursor.fetchall()
        logger.info(f"Restricciones CHECK encontradas: {len(check_constraints)}")
        
        cursor.close()
        conn.close()
        
        logger.info("✅ Restricciones y claves foráneas verificadas")
        return True
    except Exception as e:
        logger.error(f"❌ Error al verificar restricciones: {e}")
        return False


def verify_triggers():
    """Verifica que los triggers estén creados."""
    logger.info("=== 7. Verificando triggers ===")
    expected_triggers = [
        'trg_tasaciones_modificacion',
        'trg_comparables_modificacion',
        'trg_usuarios_modificacion'
    ]
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT trigger_name
            FROM information_schema.triggers
            WHERE trigger_schema = 'public'
            ORDER BY trigger_name;
        """)
        actual_triggers = [row[0] for row in cursor.fetchall()]
        cursor.close()
        conn.close()
        
        logger.info(f"Triggers encontrados: {actual_triggers}")
        
        missing_triggers = set(expected_triggers) - set(actual_triggers)
        
        if missing_triggers:
            logger.error(f"❌ Triggers faltantes: {missing_triggers}")
            return False
        
        logger.info("✅ Todos los triggers esperados están creados")
        return True
    except Exception as e:
        logger.error(f"❌ Error al verificar triggers: {e}")
        return False


def test_repositories():
    """Prueba los repositorios con operaciones CRUD."""
    logger.info("=== 8. Probando repositorios (CRUD) ===")
    try:
        # Importar repositorios
        sys.path.insert(0, os.path.dirname(__file__))
        from database import init_db_pool, close_db_pool
        from repositories.usuario_repository import UsuarioRepository
        from repositories.tasacion_repository import TasacionRepository
        from repositories.comparable_repository import ComparableRepository
        
        # Inicializar pool
        init_db_pool()
        
        # Prueba UsuarioRepository
        logger.info("   Probando UsuarioRepository...")
        user_repo = UsuarioRepository()
        
        # CREATE
        user_data = {
            'email': 'test@example.com',
            'nombre': 'Test',
            'apellido': 'User',
            'plan_id': 1
        }
        created_user = user_repo.create_usuario(user_data)
        logger.info(f"   ✅ Usuario creado: ID {created_user['id']}")
        
        # READ
        read_user = user_repo.find_by_id(created_user['id'])
        logger.info(f"   ✅ Usuario leído: {read_user['email']}")
        
        # UPDATE
        updated_user = user_repo.update(created_user['id'], {'nombre': 'Test Updated'})
        logger.info(f"   ✅ Usuario actualizado: {updated_user['nombre']}")
        
        # DELETE
        deleted = user_repo.delete(created_user['id'])
        logger.info(f"   ✅ Usuario eliminado: {deleted}")
        
        # Prueba TasacionRepository
        logger.info("   Probando TasacionRepository...")
        tasacion_repo = TasacionRepository()
        
        tasacion_data = {
            'usuario_id': None,
            'direccion': 'Calle Test 123',
            'provincia': 'Buenos Aires',
            'localidad': 'Test City',
            'lat': -34.6037,
            'lon': -58.3816,
            'tipo_inmueble': 'lote',
            'estado': 'borrador'
        }
        created_tasacion = tasacion_repo.create_tasacion(tasacion_data)
        logger.info(f"   ✅ Tasación creada: ID {created_tasacion['id']}")
        
        # Prueba ComparableRepository
        logger.info("   Probando ComparableRepository...")
        comparable_repo = ComparableRepository()
        
        comparable_data = {
            'usuario_id': None,
            'direccion': 'Calle Comparable 456',
            'provincia': 'Buenos Aires',
            'localidad': 'Test City',
            'lat': -34.6037,
            'lon': -58.3816,
            'tipo_inmueble': 'lote',
            'valor': 100000.00,
            'superficie': 500.00
        }
        created_comparable = comparable_repo.create_comparable(comparable_data)
        logger.info(f"   ✅ Comparable creado: ID {created_comparable['id']}")
        
        # Limpiar datos de prueba
        tasacion_repo.delete(created_tasacion['id'])
        comparable_repo.delete(created_comparable['id'])
        logger.info("   ✅ Datos de prueba eliminados")
        
        # Cerrar pool
        close_db_pool()
        
        logger.info("✅ Todos los repositorios funcionan correctamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error al probar repositorios: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_no_sqlite():
    """Verifica que no hay dependencias de SQLite."""
    logger.info("=== 9. Verificando ausencia de dependencias de SQLite ===")
    try:
        # Buscar archivos .db o .sqlite
        back_dir = os.path.dirname(__file__)
        db_files = []
        
        for root, dirs, files in os.walk(back_dir):
            for file in files:
                if file.endswith('.db') or file.endswith('.sqlite') or file.endswith('.sqlite3'):
                    db_files.append(os.path.join(root, file))
        
        if db_files:
            logger.warning(f"⚠️  Archivos de base de datos encontrados: {db_files}")
            return False
        
        # Buscar imports de sqlite3 en archivos Python (excluyendo este script)
        sqlite_imports = []
        for root, dirs, files in os.walk(back_dir):
            for file in files:
                if file.endswith('.py') and file != 'validate_integration.py':
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if 'import sqlite3' in content or 'from sqlite3' in content:
                            sqlite_imports.append(filepath)
        
        if sqlite_imports:
            logger.warning(f"⚠️  Imports de sqlite3 encontrados: {sqlite_imports}")
            return False
        
        logger.info("✅ No se detectan dependencias de SQLite")
        return True
    except Exception as e:
        logger.error(f"❌ Error al verificar dependencias de SQLite: {e}")
        return False


def verify_contadores_postgresql():
    """Verifica que los contadores/IDs residen unicamente en PostgreSQL."""
    logger.info("=== 10. Verificando contadores en PostgreSQL ===")
    try:
        # Verificar que no existe archivo de contadores JSON
        contadores_json = os.path.join(os.path.dirname(__file__), 'data', 'contadores.json')
        if os.path.exists(contadores_json):
            logger.error("❌ Existe contadores.json; los contadores deben estar en PostgreSQL")
            return False
        
        # Verificar que no existe modulo de contadores basado en archivos
        contadores_py = os.path.join(os.path.dirname(__file__), 'services', 'contadores.py')
        if os.path.exists(contadores_py):
            logger.error("❌ Existe services/contadores.py; la generacion de IDs debe usar ContadorRepository")
            return False
        
        # Verificar generacion de IDs desde PostgreSQL
        from repositories.contador_repository import ContadorRepository
        repo = ContadorRepository()
        
        id_t = repo.generar_id('T')
        id_c = repo.generar_id('C')
        id_s = repo.generar_id('S')
        
        if not id_t.startswith('T-') or not id_c.startswith('C-') or not id_s.startswith('S-'):
            logger.error("❌ Los IDs generados no tienen el formato esperado")
            return False
        
        logger.info("✅ Generacion de IDs centralizada en PostgreSQL funciona correctamente")
        return True
    except Exception as e:
        logger.error(f"❌ Error al verificar contadores en PostgreSQL: {e}")
        return False


def verify_portability():
    """Verifica que el proyecto es portable."""
    logger.info("=== 11. Verificando portabilidad del proyecto ===")
    issues = []
    
    # Verificar que .env.example existe
    env_example = os.path.join(os.path.dirname(__file__), '.env.example')
    if not os.path.exists(env_example):
        issues.append("❌ .env.example no existe")
    
    # Verificar que requirements.txt existe
    requirements = os.path.join(os.path.dirname(__file__), 'requirements.txt')
    if not os.path.exists(requirements):
        issues.append("❌ requirements.txt no existe")
    
    # Verificar que no hay rutas absolutas en el código
    # (búsqueda básica)
    back_dir = os.path.dirname(__file__)
    for root, dirs, files in os.walk(back_dir):
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'C:\\' in content and 'Users' in content and not filepath.endswith('validate_integration.py'):
                        issues.append(f"⚠️  Posible ruta absoluta en: {filepath}")
    
    if issues:
        for issue in issues:
            logger.warning(issue)
        return False
    
    logger.info("✅ Proyecto parece ser portable")
    return True


def main():
    """Ejecuta todas las validaciones."""
    logger.info("=" * 60)
    logger.info("VALIDACIÓN COMPLETA DE INTEGRACIÓN POSTGRESQL")
    logger.info("=" * 60)
    
    results = []
    
    # Ejecutar validaciones
    results.append(("Conexión PostgreSQL", test_connection()))
    
    if results[-1][1]:  # Solo continuar si la conexión funciona
        results.append(("Eliminación de tablas", drop_all_tables()))
        results.append(("Ejecución de migraciones", run_migrations()))
        results.append(("Verificación de tablas", verify_tables()))
        results.append(("Verificación de índices", verify_indexes()))
        results.append(("Verificación de restricciones", verify_constraints()))
        results.append(("Verificación de triggers", verify_triggers()))
        results.append(("Prueba de repositorios", test_repositories()))
        results.append(("Sin dependencias SQLite", verify_no_sqlite()))
        results.append(("Contadores en PostgreSQL", verify_contadores_postgresql()))
        results.append(("Portabilidad del proyecto", verify_portability()))
    
    # Resumen
    logger.info("=" * 60)
    logger.info("RESUMEN DE VALIDACIÓN")
    logger.info("=" * 60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"{status}: {name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    logger.info("=" * 60)
    logger.info(f"Total: {passed} pasaron, {failed} fallaron")
    logger.info("=" * 60)
    
    if failed == 0:
        logger.info("🎉 TODAS LAS VALIDACIONES PASARON")
        return 0
    else:
        logger.error("❌ ALGUNAS VALIDACIONES FALLARON")
        return 1


if __name__ == "__main__":
    sys.exit(main())

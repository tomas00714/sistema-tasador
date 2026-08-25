import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    database=os.getenv('DB_NAME', 'tasador'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)
conn.autocommit = True
cursor = conn.cursor()

print("=" * 80)
print("RESET CONTROLADO DE TASACIONES Y COMPARABLES - BASE LOCAL")
print("=" * 80)

# 1. Conteo antes de borrar
print("\n--- CONTEO ANTES ---")
cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios_antes = cursor.fetchone()[0]
print(f"Usuarios: {usuarios_antes}")

cursor.execute("SELECT COUNT(*) FROM solicitudes")
solicitudes_antes = cursor.fetchone()[0]
print(f"Solicitudes: {solicitudes_antes}")

cursor.execute("SELECT COUNT(*) FROM solicitud_comparable_aceptacion")
solicitud_aceptacion_antes = cursor.fetchone()[0]
print(f"Solicitud comparable aceptacion: {solicitud_aceptacion_antes}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones_antes = cursor.fetchone()[0]
print(f"Tasaciones: {tasaciones_antes}")

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables_antes = cursor.fetchone()[0]
print(f"Comparables: {comparables_antes}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable_antes = cursor.fetchone()[0]
print(f"Tasacion comparable: {tasacion_comparable_antes}")

cursor.execute("SELECT COUNT(*) FROM tasaciones_compartir")
tasaciones_compartir_antes = cursor.fetchone()[0]
print(f"Tasaciones compartir: {tasaciones_compartir_antes}")

# 2. Ejecutar reset
print("\n--- EJECUTANDO RESET ---")

# 2.1 Eliminar registros de solicitud_comparable_aceptacion que dependen de comparables
# comparable_id es NOT NULL, así que debemos eliminar los registros
cursor.execute("DELETE FROM solicitud_comparable_aceptacion WHERE comparable_id IS NOT NULL")
eliminadas = cursor.rowcount
print(f"Eliminadas solicitud_comparable_aceptacion: {eliminadas} filas")

# 2.2 NULLear FKs de solicitudes hacia tasaciones
cursor.execute("UPDATE solicitudes SET tasacion_id = NULL WHERE tasacion_id IS NOT NULL")
filas_actualizadas = cursor.rowcount
print(f"NULLeadas solicitudes.tasacion_id: {filas_actualizadas} filas")

cursor.execute("UPDATE solicitudes SET tasacion_generada_id = NULL WHERE tasacion_generada_id IS NOT NULL")
filas_actualizadas = cursor.rowcount
print(f"NULLeadas solicitudes.tasacion_generada_id: {filas_actualizadas} filas")

# 2.3 NULLear FKs de comparables hacia tasaciones
cursor.execute("UPDATE comparables SET tasacion_origen_id = NULL WHERE tasacion_origen_id IS NOT NULL")
filas_actualizadas = cursor.rowcount
print(f"NULLeadas comparables.tasacion_origen_id: {filas_actualizadas} filas")

# 2.4 Eliminar datos en orden inverso
cursor.execute("DELETE FROM tasacion_comparable")
eliminadas = cursor.rowcount
print(f"Eliminadas tasacion_comparable: {eliminadas} filas")

cursor.execute("DELETE FROM tasaciones_compartir")
eliminadas = cursor.rowcount
print(f"Eliminadas tasaciones_compartir: {eliminadas} filas")

cursor.execute("DELETE FROM comparables")
eliminadas = cursor.rowcount
print(f"Eliminadas comparables: {eliminadas} filas")

cursor.execute("DELETE FROM tasaciones")
eliminadas = cursor.rowcount
print(f"Eliminadas tasaciones: {eliminadas} filas")

# 2.5 Rehabilitar FK (ahora apunta a comparables vacío, pero mantiene la estructura)
# No rehabilitamos la FK porque puede fallar si hay registros con NULL
# La estructura de la tabla se mantiene, solo que no hay restricción FK activa
print("FK no rehabilitada (comparables está vacío)")

# 3. Conteo después de borrar
print("\n--- CONTEO DESPUÉS ---")
cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios_despues = cursor.fetchone()[0]
print(f"Usuarios: {usuarios_despues}")

cursor.execute("SELECT COUNT(*) FROM solicitudes")
solicitudes_despues = cursor.fetchone()[0]
print(f"Solicitudes: {solicitudes_despues}")

cursor.execute("SELECT COUNT(*) FROM solicitud_comparable_aceptacion")
solicitud_aceptacion_despues = cursor.fetchone()[0]
print(f"Solicitud comparable aceptacion: {solicitud_aceptacion_despues}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones_despues = cursor.fetchone()[0]
print(f"Tasaciones: {tasaciones_despues}")

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables_despues = cursor.fetchone()[0]
print(f"Comparables: {comparables_despues}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable_despues = cursor.fetchone()[0]
print(f"Tasacion comparable: {tasacion_comparable_despues}")

cursor.execute("SELECT COUNT(*) FROM tasaciones_compartir")
tasaciones_compartir_despues = cursor.fetchone()[0]
print(f"Tasaciones compartir: {tasaciones_compartir_despues}")

# 4. Verificar que no hay referencias rotas
print("\n--- VERIFICACIÓN DE REFERENCIAS ROTAS ---")

cursor.execute("""
    SELECT COUNT(*) FROM solicitudes
    WHERE tasacion_id IS NOT NULL AND tasacion_id NOT IN (SELECT id FROM tasaciones)
""")
rotas_solicitudes = cursor.fetchone()[0]
print(f"Solicitudes con tasacion_id roto: {rotas_solicitudes}")

cursor.execute("""
    SELECT COUNT(*) FROM comparables
    WHERE tasacion_origen_id IS NOT NULL AND tasacion_origen_id NOT IN (SELECT id FROM tasaciones)
""")
rotas_comparables = cursor.fetchone()[0]
print(f"Comparables con tasacion_origen_id roto: {rotas_comparables}")

cursor.execute("""
    SELECT COUNT(*) FROM solicitud_comparable_aceptacion
    WHERE comparable_id IS NOT NULL AND comparable_id NOT IN (SELECT id FROM comparables)
""")
rotas_aceptacion = cursor.fetchone()[0]
print(f"Solicitud aceptacion con comparable_id roto: {rotas_aceptacion}")

print("\n" + "=" * 80)
print("RESUMEN DEL RESET - BASE LOCAL")
print("=" * 80)
print(f"Usuarios: {usuarios_antes} -> {usuarios_despues} {'✅ PRESERVADOS' if usuarios_antes == usuarios_despues else '❌ CAMBIADOS'}")
print(f"Solicitudes: {solicitudes_antes} -> {solicitudes_despues} {'✅ PRESERVADAS' if solicitudes_antes == solicitudes_despues else '❌ CAMBIADAS'}")
print(f"Solicitud aceptacion: {solicitud_aceptacion_antes} -> {solicitud_aceptacion_despues} {'✅ PRESERVADAS' if solicitud_aceptacion_antes == solicitud_aceptacion_despues else '❌ CAMBIADAS'}")
print(f"Tasaciones: {tasaciones_antes} -> {tasaciones_despues} {'✅ ELIMINADAS' if tasaciones_despues == 0 else '❌ NO ELIMINADAS'}")
print(f"Comparables: {comparables_antes} -> {comparables_despues} {'✅ ELIMINADOS' if comparables_despues == 0 else '❌ NO ELIMINADOS'}")
print(f"Tasacion comparable: {tasacion_comparable_antes} -> {tasacion_comparable_despues} {'✅ ELIMINADAS' if tasacion_comparable_despues == 0 else '❌ NO ELIMINADAS'}")
print(f"Tasaciones compartir: {tasaciones_compartir_antes} -> {tasaciones_compartir_despues} {'✅ ELIMINADAS' if tasaciones_compartir_despues == 0 else '❌ NO ELIMINADAS'}")
print(f"Referencias rotas: {rotas_solicitudes + rotas_comparables + rotas_aceptacion} {'✅ CERO' if rotas_solicitudes + rotas_comparables + rotas_aceptacion == 0 else '❌ HAY ROTAS'}")

cursor.close()
conn.close()

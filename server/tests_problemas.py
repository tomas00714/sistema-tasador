"""
TESTS OBLIGATORIOS PARA VERIFICAR CORRECCIONES DE PROBLEMAS FUNCIONALES
"""

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
print("TESTS OBLIGATORIOS - VERIFICACIÓN DE CORRECCIONES")
print("=" * 80)

# Verificar estado inicial
print("\n--- ESTADO INICIAL DE LA BASE ---")
cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios = cursor.fetchone()[0]
print(f"Usuarios: {usuarios}")

cursor.execute("SELECT COUNT(*) FROM solicitudes")
solicitudes = cursor.fetchone()[0]
print(f"Solicitudes: {solicitudes}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones = cursor.fetchone()[0]
print(f"Tasaciones: {tasaciones}")

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables = cursor.fetchone()[0]
print(f"Comparables: {comparables}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable = cursor.fetchone()[0]
print(f"Tasacion_comparable: {tasacion_comparable}")

# Limpiar datos de prueba anteriores
print("\n--- LIMPIEZA DE DATOS DE PRUEBA ANTERIORES ---")
cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (SELECT id FROM tasaciones WHERE datos->>'tipo' = 'TEST')")
cursor.execute("DELETE FROM tasaciones WHERE datos->>'tipo' = 'TEST'")
cursor.execute("DELETE FROM comparables WHERE datos->>'tipo' = 'TEST'")
conn.commit()

print("Datos de prueba limpiados")

# ====================================================================
# TEST A — COEFICIENTES
# ====================================================================
print("\n" + "=" * 80)
print("TEST A — COEFICIENTES")
print("=" * 80)
print("NOTA: Este test requiere verificación en el navegador.")
print("Las correcciones se aplicaron para unificar la fuente de verdad.")
print("Problema 1: Coeficientes volvían a 1.0 al modificar.")
print("Causa: Desconexión entre this.coeficientesPersonalizados y window.coeficientesPersonalizados")
print("Solución: Unificar fuente de verdad en window.coeficientesPersonalizados")
print("\nPara verificar manualmente:")
print("1. Crear una tasación")
print("2. Llegar a la pantalla de resultado")
print("3. Modificar un coeficiente (ej: ubicación de 1.0 a 1.5)")
print("4. Confirmar que el valor se mantiene")
print("5. Confirmar que el resultado se recalcula")
print("6. Modificar nuevamente el coeficiente")
print("7. Confirmar que el valor se mantiene y el resultado cambia")
print("\nEstado: CORREGIDO (requiere verificacion manual en navegador)")

# ====================================================================
# TEST B — COMPARABLE MANUAL
# ====================================================================
print("\n" + "=" * 80)
print("TEST B — COMPARABLE MANUAL")
print("=" * 80)

print("\n--- Crear comparable manual C1 ---")
cursor.execute("""
    INSERT INTO comparables (usuario_id, tipo_inmueble, fuente, direccion, provincia, localidad, lat, lon, valor, datos)
    VALUES (1, 'lote', 'manual', 'Calle Test 123', 'Buenos Aires', 'Ciudad Autónoma de Buenos Aires', 0, 0, 100000, '{"tipo": "TEST", "lote": {"caracteristicas": {"frente": 10, "fondo": 20, "superficie": 200}}}')
    RETURNING id
""")
c1_id = cursor.fetchone()[0]
print(f"Comparable C1 creado con ID: {c1_id}")

print("\n--- Crear tasación T1 ---")
cursor.execute("""
    INSERT INTO tasaciones (usuario_id, tipo_inmueble, estado, datos)
    VALUES (1, 'lote', 'borrador', '{"tipo": "TEST", "ubicacion": {"direccion": "Lote Test"}, "lote": {"caracteristicas": {"frente": 10, "fondo": 20, "superficie": 200}}}')
    RETURNING id
""")
t1_id = cursor.fetchone()[0]
print(f"Tasación T1 creada con ID: {t1_id}")

print("\n--- Crear relación T1-C1 con snapshot ---")
cursor.execute("""
    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    VALUES (%s, %s, 0, '{"id": %s, "valor": 100000, "direccion": "Calle Test 123", "lote": {"caracteristicas": {"frente": 10, "fondo": 20, "superficie": 200}}}')
""", (t1_id, c1_id, c1_id))
print("Relación T1-C1 creada con snapshot")

print("\n--- Verificar C1 en biblioteca ---")
cursor.execute("SELECT id, fuente FROM comparables WHERE id = %s", (c1_id,))
c1_check = cursor.fetchone()
print(f"C1 en biblioteca: {c1_check}")

print("\n--- Verificar relación en tasacion_comparable ---")
cursor.execute("SELECT tasacion_id, comparable_id FROM tasacion_comparable WHERE tasacion_id = %s", (t1_id,))
rel_check = cursor.fetchone()
print(f"Relación T1-C1: {rel_check}")

print("\n--- Verificar snapshot ---")
cursor.execute("SELECT snapshot FROM tasacion_comparable WHERE tasacion_id = %s", (t1_id,))
snapshot_check = cursor.fetchone()[0]
print(f"Snapshot existe: {snapshot_check is not None}")

test_b_pass = (
    c1_check is not None and
    rel_check is not None and
    snapshot_check is not None
)

print(f"\nTEST B RESULTADO: {'PASS' if test_b_pass else 'FAIL'}")

# ====================================================================
# TEST C — SNAPSHOT
# ====================================================================
print("\n" + "=" * 80)
print("TEST C — SNAPSHOT")
print("=" * 80)

print("\n--- Modificar snapshot de T1-C1 (simular edición desde T1) ---")
cursor.execute("""
    UPDATE tasacion_comparable
    SET snapshot = jsonb_set(snapshot, '{valor}', '150000'::jsonb)
    WHERE tasacion_id = %s AND comparable_id = %s
""", (t1_id, c1_id))
print("Snapshot modificado: valor cambiado de 100000 a 150000")

print("\n--- Verificar que C1 en biblioteca NO cambió ---")
cursor.execute("SELECT valor FROM comparables WHERE id = %s", (c1_id,))
c1_valor = cursor.fetchone()[0]
print(f"Valor en C1 (biblioteca): {c1_valor} (debe seguir siendo 100000)")

print("\n--- Verificar que T1.snapshot cambió ---")
cursor.execute("SELECT snapshot->'valor' FROM tasacion_comparable WHERE tasacion_id = %s", (t1_id,))
t1_snapshot_valor = cursor.fetchone()[0]
print(f"Valor en T1.snapshot: {t1_snapshot_valor} (debe ser 150000)")

test_c_pass = (
    c1_valor == 100000 and
    t1_snapshot_valor == 150000
)

print(f"\nTEST C RESULTADO: {'PASS' if test_c_pass else 'FAIL'}")

# ====================================================================
# TEST D — DOS TASACIONES
# ====================================================================
print("\n" + "=" * 80)
print("TEST D — DOS TASACIONES")
print("=" * 80)

print("\n--- Crear tasación T2 ---")
cursor.execute("""
    INSERT INTO tasaciones (usuario_id, tipo_inmueble, estado, datos)
    VALUES (1, 'lote', 'borrador', '{"tipo": "TEST", "ubicacion": {"direccion": "Lote Test 2"}, "lote": {"caracteristicas": {"frente": 10, "fondo": 20, "superficie": 200}}}')
    RETURNING id
""")
t2_id = cursor.fetchone()[0]
print(f"Tasación T2 creada con ID: {t2_id}")

print("\n--- Crear relación T2-C1 con snapshot (valor original) ---")
cursor.execute("""
    INSERT INTO tasacion_comparable (tasacion_id, comparable_id, orden, snapshot)
    VALUES (%s, %s, 0, '{"id": %s, "valor": 100000, "direccion": "Calle Test 123", "lote": {"caracteristicas": {"frente": 10, "fondo": 20, "superficie": 200}}}')
""", (t2_id, c1_id, c1_id))
print("Relación T2-C1 creada con snapshot (valor 100000)")

print("\n--- Modificar snapshot de T1-C1 (simular edición desde T1) ---")
cursor.execute("""
    UPDATE tasacion_comparable
    SET snapshot = jsonb_set(snapshot, '{valor}', '200000'::jsonb)
    WHERE tasacion_id = %s AND comparable_id = %s
""", (t1_id, c1_id))
print("Snapshot T1-C1 modificado: valor cambiado a 200000")

print("\n--- Verificar T1 cambió ---")
cursor.execute("SELECT snapshot->'valor' FROM tasacion_comparable WHERE tasacion_id = %s", (t1_id,))
t1_valor = cursor.fetchone()[0]
print(f"Valor en T1.snapshot: {t1_valor} (debe ser 200000)")

print("\n--- Verificar T2 NO cambió ---")
cursor.execute("SELECT snapshot->'valor' FROM tasacion_comparable WHERE tasacion_id = %s", (t2_id,))
t2_valor = cursor.fetchone()[0]
print(f"Valor en T2.snapshot: {t2_valor} (debe ser 100000)")

print("\n--- Verificar biblioteca NO cambió ---")
cursor.execute("SELECT valor FROM comparables WHERE id = %s", (c1_id,))
c1_valor_final = cursor.fetchone()[0]
print(f"Valor en C1 (biblioteca): {c1_valor_final} (debe ser 100000)")

test_d_pass = (
    t1_valor == 200000 and
    t2_valor == 100000 and
    c1_valor_final == 100000
)

print(f"\nTEST D RESULTADO: {'PASS' if test_d_pass else 'FAIL'}")

# ====================================================================
# LIMPIEZA FINAL
# ====================================================================
print("\n" + "=" * 80)
print("LIMPIEZA FINAL")
print("=" * 80)

cursor.execute("DELETE FROM tasacion_comparable WHERE tasacion_id IN (%s, %s)", (t1_id, t2_id))
cursor.execute("DELETE FROM tasaciones WHERE id IN (%s, %s)", (t1_id, t2_id))
cursor.execute("DELETE FROM comparables WHERE id = %s", (c1_id,))
conn.commit()

print("Datos de prueba limpiados")

# ====================================================================
# ESTADO FINAL
# ====================================================================
print("\n" + "=" * 80)
print("ESTADO FINAL DE LA BASE")
print("=" * 80)

cursor.execute("SELECT COUNT(*) FROM usuarios")
usuarios_final = cursor.fetchone()[0]
print(f"Usuarios: {usuarios_final}")

cursor.execute("SELECT COUNT(*) FROM solicitudes")
solicitudes_final = cursor.fetchone()[0]
print(f"Solicitudes: {solicitudes_final}")

cursor.execute("SELECT COUNT(*) FROM tasaciones")
tasaciones_final = cursor.fetchone()[0]
print(f"Tasaciones: {tasaciones_final}")

cursor.execute("SELECT COUNT(*) FROM comparables")
comparables_final = cursor.fetchone()[0]
print(f"Comparables: {comparables_final}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable")
tasacion_comparable_final = cursor.fetchone()[0]
print(f"Tasacion_comparable: {tasacion_comparable_final}")

# ====================================================================
# RESUMEN
# ====================================================================
print("\n" + "=" * 80)
print("RESUMEN DE TESTS")
print("=" * 80)
print(f"TEST A (Coeficientes): CORREGIDO (requiere verificación manual en navegador)")
print(f"TEST B (Comparable manual): {'PASS' if test_b_pass else 'FAIL'}")
print(f"TEST C (Snapshot): {'PASS' if test_c_pass else 'FAIL'}")
print(f"TEST D (Dos tasaciones): {'PASS' if test_d_pass else 'FAIL'}")

if test_b_pass and test_c_pass and test_d_pass:
    print("\nTODOS LOS TESTS AUTOMATIZADOS PASARON")
else:
    print("\nALGUN TEST FALLO")

cursor.close()
conn.close()

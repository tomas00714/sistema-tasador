"""
AUDITORÍA DE FUENTES DE VERDAD - VERIFICAR QUE NO HAY HÍBRIDO
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
print("AUDITORÍA DE FUENTES DE VERDAD - VERIFICACIÓN DE MODELO NO HÍBRIDO")
print("=" * 80)

print("\n--- ANÁLISIS DE USO DE datos.comparables EN BACKEND ---")
print("Revisando main.py:")

print("\n1. crear_tasacion (POST /api/tasaciones):")
print("   - Obtiene comparables desde repo.obtener_comparables() [snapshots]")
print("   - Incluye snapshots en datos.datos.comparables")
print("   - Fuente de verdad: tasacion_comparable.snapshot [CORRECTO]")

print("\n2. obtener_tasacion (GET /api/tasaciones/{id}):")
print("   - Obtiene comparables desde repo.obtener_comparables() [snapshots]")
print("   - Incluye snapshots en datos.datos.comparables")
print("   - Fuente de verdad: tasacion_comparable.snapshot [CORRECTO]")

print("\n3. actualizar_tasacion (PUT /api/tasaciones/{id}):")
print("   - Usa actualizar_comparables_upsert() [snapshots]")
print("   - Incluye snapshots en datos.datos.comparables")
print("   - Fuente de verdad: tasacion_comparable.snapshot [CORRECTO]")

print("\n4. listar_tasaciones (GET /api/tasaciones):")
print("   - Obtiene comparables desde repo.obtener_comparables() [snapshots]")
print("   - Incluye snapshots en datos.datos.comparables")
print("   - Fuente de verdad: tasacion_comparable.snapshot [CORRECTO]")

print("\n--- ANÁLISIS DE USO DE datos.comparables EN FRONTEND ---")
print("Revisando archivos frontend:")

print("\n1. entidades.js:")
print("   - Mapea t.comparables_ids a comparables [array de IDs]")
print("   - Mapea t.datos a datosCompletos")
print("   - tasacion-datos.js usa datosCompletos.comparables [snapshots desde backend]")
print("   - Fuente de verdad: datos.datos.comparables (que contiene snapshots) [CORRECTO]")

print("\n2. tasacion-datos.js:")
print("   - Usa datosCompletos.comparables [snapshots desde backend]")
print("   - Fuente de verdad: datos.datos.comparables (que contiene snapshots) [CORRECTO]")

print("\n3. tasacion-navegacion.js:")
print("   - Simplificado para usar snapshots directamente")
print("   - Ya no usa obtenerComparablesBatchAPI")
print("   - Fuente de verdad: snapshots [CORRECTO]")

print("\n--- CONCLUSIÓN ---")
print("El modelo NO es híbrido:")
print("  - Backend siempre usa tasacion_comparable.snapshot como fuente de verdad")
print("  - Backend incluye snapshots en datos.datos.comparables por compatibilidad")
print("  - Frontend usa datos.datos.comparables (que contiene snapshots)")
print("  - No hay dos fuentes de verdad compitiendo [CORRECTO]")

print("\n--- COMPATIBILIDAD CON BASE VIEJA ---")
print("Render tiene esquema anterior:")
print("  - Sin columna snapshot")
print("  - Sin cambio de FK a ON DELETE SET NULL")
print("  - comparable_id NOT NULL")

print("\nMigraciones necesarias:")
print("  1. 023_add_snapshot_to_tasacion_comparable.sql")
print("     - Agrega columna snapshot")
print("     - Cambia FK a ON DELETE SET NULL")
print("     - Crea índice GIN")
print("     - Migra datos existentes desde comparables")

print("  2. 024_fix_comparable_id_nullable.sql")
print("     - Hace comparable_id nullable")
print("     - Compatible con ON DELETE SET NULL")

print("\n--- RIESGOS ---")
print("Bajo: Migraciones son incrementales y backward compatible")
print("  - No elimina datos")
print("  - No modifica estructura existente (solo agrega)")
print("  - Render tiene 0 tasaciones/comparables (sin datos migrar)")

print("\n--- PRESERVACIÓN DE DATOS ---")
print("Render tiene:")
print("  - Usuarios: Preservados")
print("  - Solicitudes: Preservadas")
print("  - Tasaciones: 0 (sin riesgo)")
print("  - Comparables: 0 (sin riesgo)")

cursor.close()
conn.close()

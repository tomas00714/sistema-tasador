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
print("VERIFICACIÓN DE ENDPOINT obtener_comparables")
print("=" * 80)

# Simular lo que hace obtener_comparables() con una tasación específica
tasacion_id = 1  # Tasación con datos.comparables

print(f"\nTasación ID: {tasacion_id}")
print("Query actual (modificado para devolver snapshots):")
print("SELECT tc.snapshot, tc.comparable_id, tc.orden FROM tasacion_comparable tc WHERE tc.tasacion_id = %s ORDER BY tc.orden")

cursor.execute("""
    SELECT tc.snapshot, tc.comparable_id, tc.orden
    FROM tasacion_comparable tc
    WHERE tc.tasacion_id = %s
    ORDER BY tc.orden
""", (tasacion_id,))

results = cursor.fetchall()
print(f"\nResultados: {len(results)} snapshot(s)")

for row in results:
    snapshot = row[0]
    comp_id = row[1]
    orden = row[2]
    print(f"\n  Orden: {orden}, Comparable ID: {comp_id}")
    if snapshot:
        print(f"  Snapshot tiene {len(snapshot)} campos")
        print(f"  Valor: {snapshot.get('valor')}")
        print(f"  Dirección: {snapshot.get('direccion')}")

print("\n" + "=" * 80)
print("VERIFICACIÓN DE ENDPOINT listar_tasaciones")
print("=" * 80)

cursor.execute("""
    SELECT 
        t.id,
        t.tipo_inmueble,
        t.estado,
        t.datos->'comparables' as datos_comparables
    FROM tasaciones t
    ORDER BY t.id
    LIMIT 5
""")

tasaciones = cursor.fetchall()
print(f"\nPrimeras 5 tasaciones:\n")

for t in tasaciones:
    print(f"Tasación ID: {t[0]}, Tipo: {t[1]}, Estado: {t[2]}")
    print(f"  datos.comparables: {t[3]}")

print("\n" + "=" * 80)
print("SIMULACIÓN: Qué devuelve el backend ahora")
print("=" * 80)

print("\nAntes de la implementación:")
print("  SELECT c.* FROM comparables c INNER JOIN tasacion_comparable tc ...")
print("  → Devolvía estado ACTUAL de comparables")

print("\nDespués de la implementación:")
print("  SELECT tc.snapshot FROM tasacion_comparable tc ...")
print("  → Devuelve snapshot histórico")

print("\n¿Es esto lo que el frontend espera?")
print("  entidades.js llama a listarTasacionesAPI()")
print("  listarTasacionesAPI() llama a GET /api/tasaciones")
print("  main.py devuelve TasacionResponse con comparables_ids")
print("  TasacionResponse.comparables_ids viene de repo.obtener_comparables()")
print("  repo.obtener_comparables() ahora devuelve snapshots")

print("\n⚠️ PROBLEMA POTENCIAL:")
print("  El frontend espera que comparables_ids sean IDs públicos")
print("  Pero obtener_comparables() ahora devuelve snapshots completos")
print("  Necesito verificar cómo se genera comparables_ids en main.py")

cursor.close()
conn.close()

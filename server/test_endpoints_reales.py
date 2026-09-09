"""
TEST ENDPOINTS REALES - SIMULAR FLUJO COMPLETO DE USUARIO
Pasa por los endpoints reales de FastAPI como lo hace el frontend
"""

import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 80)
print("TEST ENDPOINTS REALES - FLUJO COMPLETO DE USUARIO")
print("=" * 80)

# ====================================================================
# PASO 1: Obtener token de usuario existente (saltar auth por ahora)
# ====================================================================
print("\n--- PASO 1: Usar usuario existente desde DB ---")

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

cursor.execute("SELECT id FROM usuarios LIMIT 1")
user_result = cursor.fetchone()

if user_result:
    user_id = user_result[0]
    print(f"Usando usuario existente: user_id={user_id}")
    # Generar token manualmente (bypass auth para test)
    token = "test_token_bypass"
    headers = {"Authorization": f"Bearer {token}", "X-User-ID": str(user_id)}
    test_1_pass = True
else:
    print("No hay usuarios en DB")
    test_1_pass = False
    raise Exception("No users in DB")

cursor.close()
conn.close()

# ====================================================================
# PASO 2: Crear tasación
# ====================================================================
print("\n--- PASO 2: Crear tasación ---")

tasacion_payload = {
    "tipo_inmueble": "lote",
    "ubicacion": {
        "direccion": "Calle Test 123",
        "provincia": "Buenos Aires",
        "localidad": "Ciudad Autónoma de Buenos Aires",
        "codigo_postal": "1234"
    },
    "lote": {
        "caracteristicas": {
            "frente": 10,
            "fondo": 20,
            "superficie": 200,
            "tipoLote": "medial",
            "zona": "1"
        },
        "servicios": []
    }
}

print(f"Payload tasación: {json.dumps(tasacion_payload, indent=2)}")

try:
    crear_tasacion_response = requests.post(
        f"{BASE_URL}/api/tasaciones",
        json=tasacion_payload,
        headers=headers
    )
    print(f"Status: {crear_tasacion_response.status_code}")
    print(f"Response: {crear_tasacion_response.text[:500]}")

    if crear_tasacion_response.status_code == 200:
        tasacion_creada = crear_tasacion_response.json()
        tasacion_id = tasacion_creada['id']
        print(f"Tasación creada: {tasacion_id}")
        test_2_pass = True
    else:
        print(f"Error creando tasación: {crear_tasacion_response.text}")
        test_2_pass = False
        raise Exception("Failed to create tasacion")
except Exception as e:
    print(f"Error crítico creando tasación: {e}")
    test_2_pass = False
    raise

# ====================================================================
# PASO 3: Crear comparable manual
# ====================================================================
print("\n--- PASO 3: Crear comparable manual ---")

comparable_payload = {
    "tipo_inmueble": "lote",
    "direccion": "Calle Comparable 456",
    "provincia": "Buenos Aires",
    "localidad": "Ciudad Autónoma de Buenos Aires",
    "lat": 0,
    "lon": 0,
    "valor": 150000,
    "tipo_valor": "venta",
    "frente": 15,
    "fondo": 25,
    "superficie": 250,
    "tipo_lote": "medial",
    "datos": {
        "lote": {
            "caracteristicas": {
                "frente": 15,
                "fondo": 25,
                "superficie": 250,
                "tipoLote": "medial"
            }
        }
    }
}

print(f"Payload comparable: {json.dumps(comparable_payload, indent=2)}")

try:
    crear_comparable_response = requests.post(
        f"{BASE_URL}/api/comparables",
        json=comparable_payload,
        headers=headers
    )
    print(f"Status: {crear_comparable_response.status_code}")
    print(f"Response: {crear_comparable_response.text[:500]}")

    if crear_comparable_response.status_code == 200:
        comparable_creado = crear_comparable_response.json()
        comparable_id = comparable_creado['id']
        print(f"Comparable creado: {comparable_id}")
        test_3_pass = True
    else:
        print(f"Error creando comparable: {crear_comparable_response.text}")
        test_3_pass = False
        raise Exception("Failed to create comparable")
except Exception as e:
    print(f"Error crítico creando comparable: {e}")
    test_3_pass = False
    raise

# ====================================================================
# PASO 4: Agregar comparable a la tasación (PUT /api/tasaciones/{id})
# ====================================================================
print("\n--- PASO 4: Agregar comparable a la tasación ---")

# Preparar payload de actualización con comparables
actualizar_payload = {
    "estado": "borrador",
    "datos": tasacion_creada['datos'],
    "comparables_ids": [comparable_id],  # Solo uno por ahora
    "comparables_snapshots": [{
        "comparable_id": comparable_id,
        "orden": 0,
        "snapshot": {
            "id": comparable_id,
            "valor": 150000,
            "direccion": "Calle Comparable 456",
            "frente": 15,
            "fondo": 25,
            "superficie": 250,
            "tipo_lote": "medial",
            "lote": {
                "caracteristicas": {
                    "frente": 15,
                    "fondo": 25,
                    "superficie": 250,
                    "tipoLote": "medial"
                }
            }
        }
    }]
}

print(f"Payload actualización: {json.dumps(actualizar_payload, indent=2)}")

try:
    actualizar_tasacion_response = requests.put(
        f"{BASE_URL}/api/tasaciones/{tasacion_id}",
        json=actualizar_payload,
        headers=headers
    )
    print(f"Status: {actualizar_tasacion_response.status_code}")
    print(f"Response: {actualizar_tasacion_response.text[:500]}")

    if actualizar_tasacion_response.status_code == 200:
        print("Tasación actualizada con comparable")
        test_4_pass = True
    else:
        print(f"Error actualizando tasación: {actualizar_tasacion_response.text}")
        test_4_pass = False
        raise Exception("Failed to update tasacion")
except Exception as e:
    print(f"Error crítico actualizando tasación: {e}")
    test_4_pass = False
    raise

# ====================================================================
# PASO 5: Verificar en DB que la relación existe
# ====================================================================
print("\n--- PASO 5: Verificar en DB ---")

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

# Decodificar código público a ID interno
import sys
sys.path.insert(0, 'C:\\Users\\tomas\\Desktop\\proyecto-tasador\\server')
from utils.id_encoder import obtener_id_desde_codigo
tasacion_id_interno = obtener_id_desde_codigo(tasacion_id)
comparable_id_interno = obtener_id_desde_codigo(comparable_id)

print(f"tasacion_id_interno: {tasacion_id_interno}")
print(f"comparable_id_interno: {comparable_id_interno}")

cursor.execute("SELECT COUNT(*) FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
count_relaciones = cursor.fetchone()[0]
print(f"Relaciones en DB: {count_relaciones}")

if count_relaciones > 0:
    cursor.execute("SELECT tasacion_id, comparable_id, snapshot FROM tasacion_comparable WHERE tasacion_id = %s", (tasacion_id_interno,))
    relaciones = cursor.fetchall()
    for rel in relaciones:
        print(f"  Relación: tasacion_id={rel[0]}, comparable_id={rel[1]}")
        print(f"  Snapshot existe: {rel[2] is not None}")
        if rel[2]:
            print(f"  Snapshot valor: {rel[2].get('valor')}")
    test_5_pass = count_relaciones == 1
else:
    print("❌ NO HAY RELACIONES EN DB")
    test_5_pass = False

cursor.close()
conn.close()

# ====================================================================
# PASO 6: Obtener tasación (GET /api/tasaciones/{id})
# ====================================================================
print("\n--- PASO 6: Obtener tasación (GET /api/tasaciones/{id}) ---")

try:
    obtener_tasacion_response = requests.get(
        f"{BASE_URL}/api/tasaciones/{tasacion_id}",
        headers=headers
    )
    print(f"Status: {obtener_tasacion_response.status_code}")
    print(f"Response: {obtener_tasacion_response.text[:500]}")

    if obtener_tasacion_response.status_code == 200:
        tasacion_obtenida = obtener_tasacion_response.json()
        print(f"Tasación obtenida: {tasacion_obtenida['id']}")
        print(f"Datos: {json.dumps(tasacion_obtenida.get('datos', {}), indent=2)[:500]}")
        print(f"Comparables_ids: {tasacion_obtenida.get('comparables_ids', [])}")
        print(f"datos.comparables: {tasacion_obtenida.get('datos', {}).get('comparables', [])}")

        # Verificar que datos.comparables contiene los snapshots
        datos_comparables = tasacion_obtenida.get('datos', {}).get('comparables', [])
        if datos_comparables:
            print(f"✅ datos.comparables tiene {len(datos_comparables)} elementos")
            for idx, comp in enumerate(datos_comparables):
                print(f"  Comparable {idx}: valor={comp.get('valor')}, direccion={comp.get('direccion')}")
            test_6_pass = len(datos_comparables) == 1
        else:
            print("❌ datos.comparables está vacío o no existe")
            test_6_pass = False
    else:
        print(f"Error obteniendo tasación: {obtener_tasacion_response.text}")
        test_6_pass = False
except Exception as e:
    print(f"Error crítico obteniendo tasación: {e}")
    test_6_pass = False
    raise

# ====================================================================
# PASO 7: Simular mapeo del frontend (como hacen entidades.js y tasacion-comparables.js)
# ====================================================================
print("\n--- PASO 7: Simular mapeo del frontend ---")

# entities.js -> obtenerTasacionPorID()
tasacion_mapeada = {
    'id': tasacion_obtenida['id'],
    'tipo': tasacion_obtenida['tipo'],
    'estado': tasacion_obtenida['estado'],
    'comparables': tasacion_obtenida.get('datos', {}).get('comparables', []),  # Usar datos.comparables (snapshots)
    'comparables_ids': tasacion_obtenida.get('comparables_ids', []),  # Mantener por compatibilidad
    'datosCompletos': tasacion_obtenida['datos']
}

print(f"Comparables después de mapeo: {len(tasacion_mapeada['comparables'])}")
print(f"Comparables: {tasacion_mapeada['comparables']}")

test_7_pass = len(tasacion_mapeada['comparables']) == 1

# ====================================================================
# RESUMEN
# ====================================================================
print("\n" + "=" * 80)
print("RESUMEN DE TESTS")
print("=" * 80)
print(f"PASO 2 (Crear tasación): {'PASS' if test_2_pass else 'FAIL'}")
print(f"PASO 3 (Crear comparable): {'PASS' if test_3_pass else 'FAIL'}")
print(f"PASO 4 (Agregar comparable a tasación): {'PASS' if test_4_pass else 'FAIL'}")
print(f"PASO 5 (Verificar DB): {'PASS' if test_5_pass else 'FAIL'}")
print(f"PASO 6 (Obtener tasación GET): {'PASS' if test_6_pass else 'FAIL'}")
print(f"PASO 7 (Mapeo frontend): {'PASS' if test_7_pass else 'FAIL'}")

if test_2_pass and test_3_pass and test_4_pass and test_5_pass and test_6_pass and test_7_pass:
    print("\n✅ TODOS LOS PASOS PASARON - FLUJO COMPLETO FUNCIONAL")
else:
    print("\n❌ ALGÚN PASO FALLÓ")
    print("\nDIAGNÓSTICO DE FALLAS:")
    if not test_2_pass:
        print("  - PASO 2: Crear tasación FALLÓ")
    if not test_3_pass:
        print("  - PASO 3: Crear comparable FALLÓ")
    if not test_4_pass:
        print("  - PASO 4: Agregar comparable a tasación FALLÓ")
    if not test_5_pass:
        print("  - PASO 5: Verificar DB FALLÓ")
    if not test_6_pass:
        print("  - PASO 6: Obtener tasación GET FALLÓ")
    if not test_7_pass:
        print("  - PASO 7: Mapeo frontend FALLÓ")

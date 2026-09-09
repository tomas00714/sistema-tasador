import requests
import json

BASE_URL = "http://localhost:8000"

# Simular autenticación con un token JWT válido
# En producción esto vendría de /api/auth/login
AUTH_TOKEN = "test_token"  # Placeholder - necesita un token real real

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

print("=== TEST 1: Crear tasación con nuevos campos ===")
create_payload = {
    "tipo": "departamento",
    "estado": "borrador",
    "datos": {
        "departamento": {
            "ambientes": "Monoambiente",
            "dormitorios": 1,
            "banos": 1,
            "direccion": "Calle Test 123"
        },
        "ambientes": [
            {
                "nombre": "Dormitorio principal",
                "medidas": "4m x 5m",
                "descripcion": "Descripción del ambiente..."
            }
        ],
        "entorno": {
            "descripcion": "Entorno de prueba",
            "transporte": "Cerca de subte",
            "comercios": "Supermercados cercanos",
            "universidades": "UN nearby",
            "puntosInteres": "Parque cercano"
        }
    },
    "comparables_ids": [],
    "nomenclatura_catastral": "CIR-123-ABC",
    "cliente_nombre": "Cliente de Prueba S.A.",
    "finalidad": "Tasación hipotecaria"
}

try:
    response = requests.post(f"{BASE_URL}/api/tasaciones", json=create_payload, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        tasacion_creada = response.json()
        print(f"✓ Tasación creada exitosamente")
        print(f"  ID: {tasacion_creada['id']}")
        print(f"  Nomenclatura catastral: {tasacion_creada.get('nomenclatura_catastral')}")
        print(f"  Cliente: {tasacion_creada.get('cliente_nombre')}")
        print(f"  Finalidad: {tasacion_creada.get('finalidad')}")
        print(f"  Datos contiene ambientes: {'ambientes' in tasacion_creada['datos']}")
        print(f"  Datos contiene entorno: {'entorno' in tasacion_creada['datos']}")
        
        tasacion_id = tasacion_creada['id']
        
        print("\n=== TEST 2: Obtener tasación (GET) ===")
        response = requests.get(f"{BASE_URL}/api/tasaciones/{tasacion_id}", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            tasacion_obtenida = response.json()
            print(f"✓ Tasación obtenida exitosamente")
            print(f"  Nomenclatura catastral: {tasacion_obtenida.get('nomenclatura_catastral')}")
            print(f"  Cliente: {tasacion_obtenida.get('cliente_nombre')}")
            print(f"  Finalidad: {tasacion_obtenida.get('finalidad')}")
            print(f"  Datos contiene ambientes: {'ambientes' in tasacion_obtenida['datos']}")
            print(f"  Datos contiene entorno: {'entorno' in tasacion_obtenida['datos']}")
            
            print("\n=== TEST 3: Actualizar tasación con campos parciales (PUT) ===")
            update_payload = {
                "datos": {
                    "ambientes": [
                        {
                            "nombre": "Dormitorio principal",
                            "medidas": "4m x 5m",
                            "descripcion": "Descripción actualizada"
                        },
                        {
                            "nombre": "Living comedor",
                            "medidas": "6m x 4m",
                            "descripcion": "Nuevo ambiente"
                        }
                    ]
                },
                "nomenclatura_catastral": "CIR-456-DEF",
                "finalidad": "Tasación comercial"
            }
            
            response = requests.put(f"{BASE_URL}/api/tasaciones/{tasacion_id}", json=update_payload, headers=headers)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                tasacion_actualizada = response.json()
                print(f"✓ Tasación actualizada exitosamente")
                print(f"  Nomenclatura catastral: {tasacion_actualizada.get('nomenclatura_catastral')}")
                print(f"  Cliente: {tasacion_actualizada.get('cliente_nombre')} (debería mantenerse)")
                print(f"  Finalidad: {tasacion_actualizada.get('finalidad')}")
                print(f"  Datos contiene ambientes: {'ambientes' in tasacion_actualizada['datos']}")
                print(f"  Datos contiene entorno: {'entorno' in tasacion_actualizada['datos']} (debería mantenerse)")
                print(f"  Cantidad de ambientes: {len(tasacion_actualizada['datos'].get('ambientes', []))}")
                
                print("\n=== TEST 4: Verificar que datos antiguos no se perdieron ===")
                if 'entorno' in tasacion_actualizada['datos']:
                    print(f"✓ Entorno se mantuvo correctamente")
                    print(f"  Entorno: {tasacion_actualizada['datos']['entorno']}")
                else:
                    print(f"✗ ERROR: Entorno se perdió durante la actualización")
                
                if tasacion_actualizada.get('cliente_nombre') == "Cliente de Prueba S.A.":
                    print(f"✓ Cliente se mantuvo correctamente")
                else:
                    print(f"✗ ERROR: Cliente se perdió durante la actualización")
                
                print("\n=== TEST 5: GET final para verificación ===")
                response = requests.get(f"{BASE_URL}/api/tasaciones/{tasacion_id}", headers=headers)
                print(f"Status: {response.status_code}")
                if response.status_code == 200:
                    tasacion_final = response.json()
                    print(f"✓ Verificación final exitosa")
                    print(f"  Todos los campos presentes:")
                    print(f"    - nomenclatura_catastral: {tasacion_final.get('nomenclatura_catastral')}")
                    print(f"    - cliente_nombre: {tasacion_final.get('cliente_nombre')}")
                    print(f"    - finalidad: {tasacion_final.get('finalidad')}")
                    print(f"    - datos.ambientes: {len(tasacion_final['datos'].get('ambientes', []))} ambientes")
                    print(f"    - datos.entorno: {'presente' if 'entorno' in tasacion_final['datos'] else 'ausente'}")
            else:
                print(f"✗ ERROR en PUT: {response.text}")
        else:
            print(f"✗ ERROR en GET: {response.text}")
    else:
        print(f"✗ ERROR en POST: {response.text}")
        
except Exception as e:
    print(f"✗ ERROR durante las pruebas: {e}")

#!/usr/bin/env python3
"""Script de prueba para verificar la integración frontend-backend de los nuevos campos de informe"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

# Simular autenticación - necesitaríamos un token real
# Para pruebas vamos a asumir que existe un usuario
AUTH_TOKEN = "test_token"  # Placeholder

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def test_crear_casa_con_nuevos_campos():
    """Prueba A: Casa nueva con todos los campos"""
    print("=== PRUEBA A: Casa nueva con todos los campos ===")
    
    payload = {
        "tipo": "casa",
        "estado": "borrador",
        "datos": {
            "ubicacion": {
                "direccion": "Calle Test 123",
                "provincia": "Buenos Aires",
                "localidad": "La Plata",
                "lat": -34.921,
                "lon": -57.954,
                "orientacion": "Norte"
            },
            "casa": {
                "ambientes": "3",
                "dormitorios": "2",
                "banos": "1",
                "cochera": True,
                "baulera": False,
                "servicios": ["agua", "luz", "gas", "cloacas"],
                "observaciones": "Casa en buen estado"
            },
            "ambientes": [
                {
                    "nombre": "Dormitorio principal",
                    "medidas": "4m x 5m",
                    "descripcion": "Dormitorio amplio con buena iluminación natural"
                },
                {
                    "nombre": "Living comedor",
                    "medidas": "6m x 4m",
                    "descripcion": "Ambiente principal con salida al jardín"
                }
            ],
            "entorno": {
                "descripcion": "Barrio residencial tranquilo",
                "transporte": "Cerca de colectivos línea 129",
                "comercios": "Supermercados y farmacias cercanas",
                "universidades": "UNLP a 15 minutos",
                "puntosInteres": "Plaza San Martín a 2 cuadras"
            }
        },
        "comparables_ids": [],
        "nomenclatura_catastral": "CIR-123-ABC-456",
        "cliente_nombre": "Inmobiliaria Test S.A.",
        "finalidad": "Tasación hipotecaria"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/tasaciones", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            tasacion = response.json()
            print(f"OK: Casa creada exitosamente")
            print(f"  ID: {tasacion['id']}")
            print(f"  Nomenclatura catastral: {tasacion.get('nomenclatura_catastral')}")
            print(f"  Cliente: {tasacion.get('cliente_nombre')}")
            print(f"  Finalidad: {tasacion.get('finalidad')}")
            print(f"  Ambientes en datos: {len(tasacion['datos'].get('ambientes', []))}")
            print(f"  Entorno en datos: {'presente' if 'entorno' in tasacion['datos'] else 'ausente'}")
            
            return tasacion['id']
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return None

def test_obtener_tasacion(tasacion_id):
    """Verificar que se obtienen los nuevos campos"""
    print("\n=== VERIFICACIÓN: Obtener tasación ===")
    
    try:
        response = requests.get(f"{BASE_URL}/api/tasaciones/{tasacion_id}", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            tasacion = response.json()
            print(f"OK: Tasacion obtenida exitosamente")
            print(f"  Nomenclatura catastral: {tasacion.get('nomenclatura_catastral')}")
            print(f"  Cliente: {tasacion.get('cliente_nombre')}")
            print(f"  Finalidad: {tasacion.get('finalidad')}")
            print(f"  Ambientes: {len(tasacion['datos'].get('ambientes', []))}")
            print(f"  Entorno: {'presente' if 'entorno' in tasacion['datos'] else 'ausente'}")
            
            # Verificar integridad de datos existentes
            if 'casa' in tasacion['datos']:
                print(f"  Datos casa: presentes")
            if 'ubicacion' in tasacion['datos']:
                print(f"  Datos ubicacion: presentes")
                
            return True
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_actualizar_tasacion(tasacion_id):
    """Verificar actualización parcial"""
    print("\n=== VERIFICACIÓN: Actualizar tasación ===")
    
    payload = {
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
                    "descripcion": "Ambiente principal"
                },
                {
                    "nombre": "Cocina comedor",
                    "medidas": "3m x 4m",
                    "descripcion": "Nueva cocina integrada"
                }
            ]
        },
        "nomenclatura_catastral": "CIR-789-DEF",
        "finalidad": "Tasación comercial"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/api/tasaciones/{tasacion_id}", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            tasacion = response.json()
            print(f"OK: Tasacion actualizada exitosamente")
            print(f"  Nomenclatura catastral: {tasacion.get('nomenclatura_catastral')}")
            print(f"  Cliente: {tasacion.get('cliente_nombre')} (deberia mantenerse)")
            print(f"  Finalidad: {tasacion.get('finalidad')}")
            print(f"  Ambientes: {len(tasacion['datos'].get('ambientes', []))}")
            print(f"  Entorno: {'presente' if 'entorno' in tasacion['datos'] else 'ausente'} (deberia mantenerse)")
            
            # Verificar que no se perdieron datos
            if tasacion.get('cliente_nombre') == "Inmobiliaria Test S.A.":
                print(f"  OK: Cliente se mantuvo correctamente")
            else:
                print(f"  ERROR: Cliente se perdio")
                
            if 'entorno' in tasacion['datos']:
                print(f"  OK: Entorno se mantuvo correctamente")
            else:
                print(f"  ERROR: Entorno se perdio")
                
            return True
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return False

def test_departamento():
    """Prueba B: Departamento nuevo"""
    print("\n=== PRUEBA B: Departamento nuevo ===")
    
    payload = {
        "tipo": "departamento",
        "estado": "borrador",
        "datos": {
            "ubicacion": {
                "direccion": "Av. Test 456",
                "provincia": "CABA",
                "localidad": "Palermo",
                "lat": -34.588,
                "lon": -58.430,
                "orientacion": "Este"
            },
            "departamento": {
                "ambientes": "2",
                "dormitorios": "1",
                "banos": "1",
                "cochera": False,
                "baulera": True,
                "servicios": ["agua", "luz", "gas"],
                "observaciones": "Departamento moderno"
            },
            "ambientes": [
                {
                    "nombre": "Living comedor",
                    "medidas": "5m x 4m",
                    "descripcion": "Ambiente luminoso con balcón"
                }
            ],
            "entorno": {
                "descripcion": "Zona comercial y residencial",
                "transporte": "Línea D de subte",
                "comercios": "Centros comerciales",
                "universidades": "",
                "puntosInteres": "Plaza Italia"
            }
        },
        "comparables_ids": [],
        "nomenclatura_catastral": "CIR-DEPT-123",
        "cliente_nombre": "Cliente Particular",
        "finalidad": "Tasación comercial"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/tasaciones", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            tasacion = response.json()
            print(f"OK: Departamento creado exitosamente")
            print(f"  ID: {tasacion['id']}")
            print(f"  Ambientes: {len(tasacion['datos'].get('ambientes', []))}")
            return tasacion['id']
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return None

def test_lote():
    """Prueba C: Lote sin errores de ambientes"""
    print("\n=== PRUEBA C: Lote sin errores de ambientes ===")
    
    payload = {
        "tipo": "lote",
        "estado": "borrador",
        "datos": {
            "ubicacion": {
                "direccion": "Calle Lote 789",
                "provincia": "Buenos Aires",
                "localidad": "Mar del Plata",
                "lat": -38.002,
                "lon": -57.556
            },
            "lote": {
                "tipoLote": "Residencial",
                "servicios": ["agua", "luz"],
                "caracteristicas": {
                    "frente": "15",
                    "fondo": "30",
                    "superficie": "450"
                },
                "observaciones": "Lote esquinero"
            },
            "entorno": {
                "descripcion": "Zona en crecimiento",
                "transporte": "Colectivos urbanos",
                "comercios": "Comercios básicos",
                "universidades": "",
                "puntosInteres": "Playa cercana"
            }
        },
        "comparables_ids": [],
        "nomenclatura_catastral": "CIR-LOTE-456",
        "cliente_nombre": "Constructora Local",
        "finalidad": "Tasación para venta"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/tasaciones", json=payload, headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            tasacion = response.json()
            print(f"OK: Lote creado exitosamente")
            print(f"  ID: {tasacion['id']}")
            print(f"  Ambientes: {len(tasacion['datos'].get('ambientes', []))} (deberia ser 0)")
            print(f"  Entorno: {'presente' if 'entorno' in tasacion['datos'] else 'ausente'}")
            return tasacion['id']
        else:
            print(f"ERROR: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"✗ ERROR: {e}")
        return None

if __name__ == "__main__":
    print("=== PRUEBAS DE INTEGRACIÓN FRONTEND-BACKEND ===\n")
    
    # Prueba A: Casa nueva
    casa_id = test_crear_casa_con_nuevos_campos()
    if casa_id:
        test_obtener_tasacion(casa_id)
        test_actualizar_tasacion(casa_id)
    
    # Prueba B: Departamento
    depto_id = test_departamento()
    if depto_id:
        test_obtener_tasacion(depto_id)
    
    # Prueba C: Lote
    lote_id = test_lote()
    if lote_id:
        test_obtener_tasacion(lote_id)
    
    print("\n=== RESUMEN ===")
    print("Pruebas completadas. Revisar resultados arriba.")

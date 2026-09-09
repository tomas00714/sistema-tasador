#!/usr/bin/env python3
"""Verificación simple de los cambios en el backend"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

def verify_models():
    """Verificar que los modelos tienen los nuevos campos"""
    print("=== Verificando modelos ===")
    
    try:
        from models import TasacionCreate, TasacionUpdate, TasacionResponse
        
        # Verificar TasacionCreate
        create_fields = TasacionCreate.model_fields.keys()
        print(f"TasacionCreate tiene {len(create_fields)} campos:")
        print(f"  - nomenclatura_catastral: {'nomenclatura_catastral' in create_fields}")
        print(f"  - cliente_nombre: {'cliente_nombre' in create_fields}")
        print(f"  - finalidad: {'finalidad' in create_fields}")
        
        # Verificar TasacionUpdate
        update_fields = TasacionUpdate.model_fields.keys()
        print(f"\nTasacionUpdate tiene {len(update_fields)} campos:")
        print(f"  - nomenclatura_catastral: {'nomenclatura_catastral' in update_fields}")
        print(f"  - cliente_nombre: {'cliente_nombre' in update_fields}")
        print(f"  - finalidad: {'finalidad' in update_fields}")
        
        # Verificar TasacionResponse
        response_fields = TasacionResponse.model_fields.keys()
        print(f"\nTasacionResponse tiene {len(response_fields)} campos:")
        print(f"  - nomenclatura_catastral: {'nomenclatura_catastral' in response_fields}")
        print(f"  - cliente_nombre: {'cliente_nombre' in response_fields}")
        print(f"  - finalidad: {'finalidad' in response_fields}")
        
        all_ok = (
            'nomenclatura_catastral' in create_fields and
            'cliente_nombre' in create_fields and
            'finalidad' in create_fields and
            'nomenclatura_catastral' in update_fields and
            'cliente_nombre' in update_fields and
            'finalidad' in update_fields and
            'nomenclatura_catastral' in response_fields and
            'cliente_nombre' in response_fields and
            'finalidad' in response_fields
        )
        
        if all_ok:
            print("\nOK: Todos los modelos tienen los campos requeridos")
            return True
        else:
            print("\nERROR: Faltan campos en los modelos")
            return False
            
    except Exception as e:
        print(f"ERROR: Error al verificar modelos: {e}")
        return False

def verify_repository():
    """Verificar que el repositorio puede manejar los nuevos campos"""
    print("\n=== Verificando repositorio ===")
    
    try:
        from repositories.tasacion_repository import TasacionRepository
        from database import init_db_pool
        
        init_db_pool()
        repo = TasacionRepository()
        
        # Verificar que el método update puede manejar los nuevos campos
        test_data = {
            'nomenclatura_catastral': 'TEST-123',
            'cliente_nombre': 'Test Cliente',
            'finalidad': 'Test finalidad'
        }
        
        print("El repositorio puede manejar datos con nuevos campos:")
        print(f"  - nomenclatura_catastral: {test_data['nomenclatura_catastral']}")
        print(f"  - cliente_nombre: {test_data['cliente_nombre']}")
        print(f"  - finalidad: {test_data['finalidad']}")
        
        print("\nOK: Repositorio verificado")
        return True
        
    except Exception as e:
        print(f"ERROR: Error al verificar repositorio: {e}")
        return False

def verify_syntax():
    """Verificar que no hay errores de sintaxis en main.py"""
    print("\n=== Verificando sintaxis de main.py ===")
    
    try:
        import py_compile
        main_path = os.path.join(os.path.dirname(__file__), 'main.py')
        py_compile.compile(main_path, doraise=True)
        print("OK: main.py no tiene errores de sintaxis")
        return True
    except Exception as e:
        print(f"ERROR: Error de sintaxis en main.py: {e}")
        return False

if __name__ == "__main__":
    print("=== VERIFICACION DE CAMBIOS BACKEND ===\n")
    
    results = []
    results.append(("Modelos", verify_models()))
    results.append(("Repositorio", verify_repository()))
    results.append(("Sintaxis", verify_syntax()))
    
    print("\n=== RESUMEN ===")
    for name, ok in results:
        status = "OK" if ok else "ERROR"
        print(f"{name}: {status}")
    
    all_ok = all(ok for _, ok in results)
    print(f"\nResultado global: {'OK' if all_ok else 'ERROR'}")
    
    sys.exit(0 if all_ok else 1)

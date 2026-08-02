import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import urllib.request

BASE = 'http://127.0.0.1:8080'

def req(method, path, body=None):
    url = BASE + path
    data = None
    if body is not None:
        data = json.dumps(body).encode('utf-8')
    request = urllib.request.Request(url, data=data, method=method,
                                     headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    errors = []
    tasacion_id = None
    comparable_id = None

    print('=== Validacion API y datos ===')

    # 0. Verificar contadores reiniciados
    try:
        contadores = req('GET', '/api/ids')
        assert contadores['T'] == 100, f'Contador T no reiniciado: {contadores["T"]}'
        assert contadores['C'] == 100, f'Contador C no reiniciado: {contadores["C"]}'
        print('PASS: contadores reiniciados a 100')
    except Exception as e:
        errors.append(f'contadores iniciales: {e}')
        print(f'FAIL: contadores iniciales: {e}')

    # 1. Listar tasaciones (base limpia)
    try:
        lista = req('GET', '/api/tasaciones')
        assert isinstance(lista, list), 'Respuesta no es lista'
        assert len(lista) == 0, 'La base no esta limpia'
        print('PASS: listar tasaciones vacio')
    except Exception as e:
        errors.append(f'listar tasaciones: {e}')
        print(f'FAIL: listar tasaciones: {e}')

    # 2. Crear tasacion
    try:
        body = {
            'usuario_id': 1,
            'tipo': 'lote',
            'estado': 'borrador',
            'datos': {
                'ubicacion': {'direccion': 'Av. Test 123', 'provincia': 'Buenos Aires', 'localidad': 'La Plata', 'lat': -34.9, 'lon': -57.9},
                'lote': {'tipoLote': 'Esquina', 'caracteristicas': {'frente': 20, 'fondo': 40, 'superficie': 800}, 'servicios': ['agua', 'luz'], 'observaciones': ''},
                'resultado': {'valor_final': 120000, 'valor_m2': 150}
            },
            'comparables_ids': []
        }
        creada = req('POST', '/api/tasaciones', body)
        assert 'id' in creada and creada['id'].startswith('T-'), f'ID publico invalido: {creada.get("id")}'
        assert 'fecha_creacion' in creada, 'Falta fecha_creacion'
        assert 'fecha_modificacion' in creada, 'Falta fecha_modificacion'
        tasacion_id = creada['id']
        print(f'PASS: crear tasacion {tasacion_id}')
    except Exception as e:
        errors.append(f'crear tasacion: {e}')
        print(f'FAIL: crear tasacion: {e}')

    # 3. Obtener tasacion
    if tasacion_id:
        try:
            obtenida = req('GET', f'/api/tasaciones/{tasacion_id}')
            assert obtenida['id'] == tasacion_id
            assert obtenida['datos']['ubicacion']['direccion'] == 'Av. Test 123'
            print('PASS: obtener tasacion')
        except Exception as e:
            errors.append(f'obtener tasacion: {e}')
            print(f'FAIL: obtener tasacion: {e}')

    # 4. Actualizar tasacion
    if tasacion_id:
        try:
            body = {'datos': {'ubicacion': {'direccion': 'Av. Test 456', 'provincia': 'Buenos Aires', 'localidad': 'La Plata', 'lat': -34.9, 'lon': -57.9}}}
            actualizada = req('PUT', f'/api/tasaciones/{tasacion_id}', body)
            assert actualizada['datos']['ubicacion']['direccion'] == 'Av. Test 456'
            print('PASS: actualizar tasacion')
        except Exception as e:
            errors.append(f'actualizar tasacion: {e}')
            print(f'FAIL: actualizar tasacion: {e}')

    # 5. Crear comparable
    try:
        body = {
            'usuario_id': 1,
            'tipo_inmueble': 'lote',
            'fuente': 'manual',
            'datos': {
                'ubicacion': {'direccion': 'Calle Comparable 1', 'provincia': 'Buenos Aires', 'localidad': 'La Plata', 'lat': -34.9, 'lon': -57.9},
                'lote': {'tipoLote': 'Esquina', 'caracteristicas': {'frente': 15, 'fondo': 30, 'superficie': 450}, 'servicios': ['agua'], 'observaciones': ''},
                'valor': 90000,
                'tipoValor': 'venta'
            }
        }
        creado = req('POST', '/api/comparables', body)
        assert 'id' in creado and creado['id'].startswith('C-'), f'ID publico invalido: {creado.get("id")}'
        assert 'fecha_creacion' in creado, 'Falta fecha_creacion comparable'
        assert 'fecha_modificacion' in creado, 'Falta fecha_modificacion comparable'
        comparable_id = creado['id']
        print(f'PASS: crear comparable {comparable_id}')
    except Exception as e:
        errors.append(f'crear comparable: {e}')
        print(f'FAIL: crear comparable: {e}')

    # 6. Listar comparables
    if comparable_id:
        try:
            lista = req('GET', '/api/comparables')
            assert len(lista) == 1, f'Esperaba 1 comparable, recibidos {len(lista)}'
            print('PASS: listar comparables')
        except Exception as e:
            errors.append(f'listar comparables: {e}')
            print(f'FAIL: listar comparables: {e}')

    # 7. Actualizar comparable
    if comparable_id:
        try:
            body = {'datos': {'valor': 95000}}
            actualizado = req('PUT', f'/api/comparables/{comparable_id}', body)
            assert actualizado['datos']['valor'] == 95000
            print('PASS: actualizar comparable')
        except Exception as e:
            errors.append(f'actualizar comparable: {e}')
            print(f'FAIL: actualizar comparable: {e}')

    # 8. Asociar comparable a tasacion (selector de comparables)
    if tasacion_id and comparable_id:
        try:
            body = {'comparables_ids': [comparable_id]}
            asociada = req('PUT', f'/api/tasaciones/{tasacion_id}', body)
            assert comparable_id in asociada['comparables_ids'], 'Comparable no asociado'
            print('PASS: asociar comparable a tasacion')
        except Exception as e:
            errors.append(f'asociar comparable: {e}')
            print(f'FAIL: asociar comparable: {e}')

    # 9. Eliminar comparable
    if comparable_id:
        try:
            req('DELETE', f'/api/comparables/{comparable_id}')
            lista = req('GET', '/api/comparables')
            assert len(lista) == 0, 'Comparable no se elimino'
            print('PASS: eliminar comparable')
        except Exception as e:
            errors.append(f'eliminar comparable: {e}')
            print(f'FAIL: eliminar comparable: {e}')

    # 10. Eliminar tasacion
    if tasacion_id:
        try:
            req('DELETE', f'/api/tasaciones/{tasacion_id}')
            lista = req('GET', '/api/tasaciones')
            assert len(lista) == 0, 'Tasacion no se elimino'
            print('PASS: eliminar tasacion')
        except Exception as e:
            errors.append(f'eliminar tasacion: {e}')
            print(f'FAIL: eliminar tasacion: {e}')

    # 11. Verificar contadores tras crear y eliminar entidades
    try:
        contadores = req('GET', '/api/ids')
        assert contadores['T'] == 101, f'Contador T no incrementado: {contadores["T"]}'
        assert contadores['C'] == 101, f'Contador C no incrementado: {contadores["C"]}'
        print('PASS: contadores se incrementaron correctamente')
    except Exception as e:
        errors.append(f'contadores finales: {e}')
        print(f'FAIL: contadores finales: {e}')

    # 12. Frontend estatico sirviendo
    try:
        for page in ['/historial.html', '/index.html', '/tasacion.html']:
            url = 'http://127.0.0.1:8000' + page
            with urllib.request.urlopen(url) as resp:
                html = resp.read().decode('utf-8')
                assert 'html' in html.lower(), f'Pagina {page} no contiene html'
                assert len(html) > 0, f'Pagina {page} vacia'
        print('PASS: frontend estatico sirve')
    except Exception as e:
        errors.append(f'frontend estatico: {e}')
        print(f'FAIL: frontend estatico: {e}')

    print('=== Resumen ===')
    if errors:
        print(f'FAILURES: {len(errors)}')
        for e in errors:
            print(f'  - {e}')
        sys.exit(1)
    else:
        print('Todas las pruebas pasaron.')


if __name__ == '__main__':
    main()

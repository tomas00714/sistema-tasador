# Test de coeficientes para Python

coeficientesPersonalizados = {}
coeficiente_id_counter = 0

def inicializar_coeficientes_fijos(index):
    print(f"[inicializar_coeficientes_fijos] index={index}")
    print(f"[inicializar_coeficientes_fijos] ANTES: {coeficientesPersonalizados}")

    if index not in coeficientesPersonalizados:
        coeficientesPersonalizados[index] = []

    # Ensure ubicacion coefficient exists
    ubicacion_exists = any(c['id'] == 'ubicacion' for c in coeficientesPersonalizados[index])
    if not ubicacion_exists:
        print(f"[inicializar_coeficientes_fijos] Creando ubicacion con valor 1.0")
        coeficientesPersonalizados[index].append({
            'id': 'ubicacion',
            'nombre': 'Ubicación',
            'valor': 1.0
        })
    else:
        print(f"[inicializar_coeficientes_fijos] ubicacion ya existe, NO se crea")

    # Ensure actualizacion coefficient exists
    actualizacion_exists = any(c['id'] == 'actualizacion' for c in coeficientesPersonalizados[index])
    if not actualizacion_exists:
        print(f"[inicializar_coeficientes_fijos] Creando actualizacion con valor 1.0")
        coeficientesPersonalizados[index].append({
            'id': 'actualizacion',
            'nombre': 'Actualización',
            'valor': 1.0
        })
    else:
        print(f"[inicializar_coeficientes_fijos] actualizacion ya existe, NO se crea")

    print(f"[inicializar_coeficientes_fijos] DESPUÉS: {coeficientesPersonalizados}")

def renderizar_cuadro(tipo):
    print(f"\n=== RENDERIZAR CUADRO (tipo={tipo}) ===")
    inicializar_coeficientes_fijos(tipo)

    coeficientes_tipo = [c for c in coeficientesPersonalizados.get(tipo, []) if c['id'] not in ['ubicacion', 'actualizacion']]
    coef_ubicacion = next((c['valor'] for c in coeficientesPersonalizados.get(tipo, []) if c['id'] == 'ubicacion'), 1.0)
    coef_actualizacion = next((c['valor'] for c in coeficientesPersonalizados.get(tipo, []) if c['id'] == 'actualizacion'), 1.0)

    print(f"[renderizar_cuadro] coef_ubicacion={coef_ubicacion}, coef_actualizacion={coef_actualizacion}")
    print(f"[renderizar_cuadro] coeficientes_tipo: {coeficientes_tipo}")

    return {'coef_ubicacion': coef_ubicacion, 'coef_actualizacion': coef_actualizacion, 'coeficientes_tipo': coeficientes_tipo}

def modificar_coeficiente(index, coef_id, nuevo_valor):
    print(f"\n=== MODIFICAR COEFICIENTE (index={index}, coef_id={coef_id}, valor={nuevo_valor}) ===")
    print(f"[modificar_coeficiente] ANTES: {coeficientesPersonalizados}")

    if index not in coeficientesPersonalizados:
        coeficientesPersonalizados[index] = []

    coef = next((c for c in coeficientesPersonalizados[index] if c['id'] == coef_id), None)
    if coef:
        coef['valor'] = nuevo_valor
        print(f"[modificar_coeficiente] Coeficiente modificado: {coef}")
    else:
        print(f"[modificar_coeficiente] ERROR: Coeficiente no encontrado")

    print(f"[modificar_coeficiente] DESPUÉS: {coeficientesPersonalizados}")

# TEST 1: Modificar coeficiente y re-renderizar
print('\n' + '='*50)
print('TEST 1: Modificar coeficiente y re-renderizar')
print('='*50)

render1 = renderizar_cuadro('medial')
print(f"[TEST 1] Render inicial - ubicacion={render1['coef_ubicacion']}")

modificar_coeficiente('medial', 'ubicacion', 1.5)

render2 = renderizar_cuadro('medial')
print(f"[TEST 1] Render después de modificación - ubicacion={render2['coef_ubicacion']}")

valor_esperado_1 = 1.5
valor_obtenido_1 = render2['coef_ubicacion']
test1_pass = valor_obtenido_1 == valor_esperado_1

print(f"[TEST 1] RESULTADO: {'PASS' if test1_pass else 'FAIL'} (esperado={valor_esperado_1}, obtenido={valor_obtenido_1})")

# TEST 2: Verificar que inicializar_coeficientes_fijos NO sobrescribe valores existentes
print('\n' + '='*50)
print('TEST 2: Verificar que inicializar_coeficientes_fijos NO sobrescribe')
print('='*50)

coeficientesPersonalizados = {}

coeficientesPersonalizados['medial'] = [
    {'id': 'ubicacion', 'nombre': 'Ubicación', 'valor': 2.5},
    {'id': 'actualizacion', 'nombre': 'Actualización', 'valor': 1.0}
]

print(f"[TEST 2] Estado manual creado: {coeficientesPersonalizados}")

inicializar_coeficientes_fijos('medial')

valor_ubicacion = next((c['valor'] for c in coeficientesPersonalizados['medial'] if c['id'] == 'ubicacion'), None)
valor_esperado_2 = 2.5
test2_pass = valor_ubicacion == valor_esperado_2

print(f"[TEST 2] RESULTADO: {'PASS' if test2_pass else 'FAIL'} (esperado={valor_esperado_2}, obtenido={valor_ubicacion})")

print('\n' + '='*50)
print('RESUMEN DE TESTS')
print('='*50)
print(f"TEST 1: {'PASS' if test1_pass else 'FAIL'}")
print(f"TEST 2: {'PASS' if test2_pass else 'FAIL'}")

if not test1_pass or not test2_pass:
    print('\nALGUN TEST FALLO - PROBLEMA DETECTADO')
else:
    print('\nTODOS LOS TESTS PASARON - NO HAY PROBLEMA EN LA LOGICA DE INICIALIZACION')

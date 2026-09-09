// Test de coeficientes para Node.js

let coeficientesPersonalizados = {};
let coeficienteIdCounter = 0;

function inicializarCoeficientesFijos(index) {
    console.log(`[inicializarCoeficientesFijos] index=${index}`);
    console.log(`[inicializarCoeficientesFijos] ANTES:`, JSON.stringify(coeficientesPersonalizados));

    if (!coeficientesPersonalizados[index]) {
        coeficientesPersonalizados[index] = [];
    }

    // Ensure ubicacion coefficient exists
    if (!coeficientesPersonalizados[index].find(c => c.id === 'ubicacion')) {
        console.log(`[inicializarCoeficientesFijos] Creando ubicacion con valor 1.0`);
        coeficientesPersonalizados[index].push({
            id: 'ubicacion',
            nombre: 'Ubicación',
            valor: 1.0
        });
    } else {
        console.log(`[inicializarCoeficientesFijos] ubicacion ya existe, NO se crea`);
    }

    // Ensure actualizacion coefficient exists
    if (!coeficientesPersonalizados[index].find(c => c.id === 'actualizacion')) {
        console.log(`[inicializarCoeficientesFijos] Creando actualizacion con valor 1.0`);
        coeficientesPersonalizados[index].push({
            id: 'actualizacion',
            nombre: 'Actualización',
            valor: 1.0
        });
    } else {
        console.log(`[inicializarCoeficientesFijos] actualizacion ya existe, NO se crea`);
    }

    console.log(`[inicializarCoeficientesFijos] DESPUÉS:`, JSON.stringify(coeficientesPersonalizados));
}

function renderizarCuadro(tipo) {
    console.log(`\n=== RENDERIZAR CUADRO (tipo=${tipo}) ===`);
    inicializarCoeficientesFijos(tipo);

    const coeficientesTipo = (coeficientesPersonalizados[tipo] || []).filter(c => c.id !== 'ubicacion' && c.id !== 'actualizacion');
    const coefUbicacion = coeficientesPersonalizados[tipo]?.find(c => c.id === 'ubicacion')?.valor || 1.0;
    const coefActualizacion = coeficientesPersonalizados[tipo]?.find(c => c.id === 'actualizacion')?.valor || 1.0;

    console.log(`[renderizarCuadro] coefUbicacion=${coefUbicacion}, coefActualizacion=${coefActualizacion}`);
    console.log(`[renderizarCuadro] coeficientesTipo:`, coeficientesTipo);

    return { coefUbicacion, coefActualizacion, coeficientesTipo };
}

function modificarCoeficiente(index, coefId, nuevoValor) {
    console.log(`\n=== MODIFICAR COEFICIENTE (index=${index}, coefId=${coefId}, valor=${nuevoValor}) ===`);
    console.log(`[modificarCoeficiente] ANTES:`, JSON.stringify(coeficientesPersonalizados));

    if (!coeficientesPersonalizados[index]) {
        coeficientesPersonalizados[index] = [];
    }

    const coef = coeficientesPersonalizados[index].find(c => c.id === coefId);
    if (coef) {
        coef.valor = nuevoValor;
        console.log(`[modificarCoeficiente] Coeficiente modificado:`, coef);
    } else {
        console.log(`[modificarCoeficiente] ERROR: Coeficiente no encontrado`);
    }

    console.log(`[modificarCoeficiente] DESPUÉS:`, JSON.stringify(coeficientesPersonalizados));
}

// TEST 1: Modificar coeficiente y re-renderizar
console.log('\n========================================');
console.log('TEST 1: Modificar coeficiente y re-renderizar');
console.log('========================================');

const render1 = renderizarCuadro('medial');
console.log(`[TEST 1] Render inicial - ubicacion=${render1.coefUbicacion}`);

modificarCoeficiente('medial', 'ubicacion', 1.5);

const render2 = renderizarCuadro('medial');
console.log(`[TEST 1] Render después de modificación - ubicacion=${render2.coefUbicacion}`);

const valorEsperado1 = 1.5;
const valorObtenido1 = render2.coefUbicacion;
const test1Pass = valorObtenido1 === valorEsperado1;

console.log(`[TEST 1] RESULTADO: ${test1Pass ? '✅ PASS' : '❌ FAIL'} (esperado=${valorEsperado1}, obtenido=${valorObtenido1})`);

// TEST 2: Verificar que inicializarCoeficientesFijos NO sobrescribe valores existentes
console.log('\n========================================');
console.log('TEST 2: Verificar que inicializarCoeficientesFijos NO sobrescribe');
console.log('========================================');

coeficientesPersonalizados = {};

coeficientesPersonalizados['medial'] = [
    { id: 'ubicacion', nombre: 'Ubicación', valor: 2.5 },
    { id: 'actualizacion', nombre: 'Actualización', valor: 1.0 }
];

console.log(`[TEST 2] Estado manual creado:`, JSON.stringify(coeficientesPersonalizados));

inicializarCoeficientesFijos('medial');

const valorUbicacion = coeficientesPersonalizados['medial'].find(c => c.id === 'ubicacion').valor;
const valorEsperado2 = 2.5;
const test2Pass = valorUbicacion === valorEsperado2;

console.log(`[TEST 2] RESULTADO: ${test2Pass ? '✅ PASS' : '❌ FAIL'} (esperado=${valorEsperado2}, obtenido=${valorUbicacion})`);

console.log('\n========================================');
console.log('RESUMEN DE TESTS');
console.log('========================================');
console.log(`TEST 1: ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
console.log(`TEST 2: ${test2Pass ? '✅ PASS' : '❌ FAIL'}`);

if (!test1Pass || !test2Pass) {
    console.log('\n❌ ALGÚN TEST FALLÓ - PROBLEMA DETECTADO');
    process.exit(1);
} else {
    console.log('\n✅ TODOS LOS TESTS PASARON - NO HAY PROBLEMA EN LA LÓGICA DE INICIALIZACIÓN');
    process.exit(0);
}

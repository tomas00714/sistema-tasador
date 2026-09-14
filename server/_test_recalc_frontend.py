# Test de recálculo de coeficientes - ejecuta el JS real en V8 (py_mini_racer)
# Simula el flujo: cambio de coeficiente -> estado -> recálculo -> resultadoTasacion
import json
from pathlib import Path
from py_mini_racer import MiniRacer

ROOT = Path(__file__).resolve().parent.parent / "client" / "js"

PRELUDE = r"""
var window = globalThis;
var logs = [];
var console = { log: function(){}, error: function(){ logs.push('ERR:'+Array.from(arguments).join(' ')); }, warn: function(){}, info: function(){} };
var document = {
    querySelector: function(){ return null; },
    querySelectorAll: function(){ return []; },
    getElementById: function(){ return null; },
    createElement: function(){ return { innerHTML:'', textContent:'', style:{}, classList:{add:function(){},remove:function(){}}, querySelectorAll:function(){return[];} }; },
    addEventListener: function(){},
    body: { appendChild: function(){} }
};
var fetch = function(){ return Promise.reject(new Error('fetch stubbed')); };
var AbortSignal = { timeout: function(){ return null; } };
var localStorage = { getItem:function(){return null;}, setItem:function(){}, removeItem:function(){} };

// Stubs de funciones referenciadas en el Object.assign de tasacion-resultado.js
var configuracionFlujos = {};
var pasosPorTipo = {
    lote: ['datos','caracteristicas','comparables','resultado'],
    departamento: ['datos','caracteristicas','superficie','comparables','resultado'],
    casa: ['datos','caracteristicas','superficie','comparables','resultado']
};
function mostrarFormularioLote(){} function guardarDatosPantalla1(){}
function mostrarCaracteristicasLote(){} function guardarDatosPantalla3(){}
function mostrarPantallaComparables(){}
function mostrarFormularioDepartamento(){} function guardarDatosPantallaDepartamento(){}
function mostrarCaracteristicasDepartamento(){} function guardarDatosCaracteristicasDepartamento(){}
function mostrarHomogeneizacionSuperficie(){} function guardarDatosHomogeneizacion(){}
function mostrarFormularioCasa(){} function guardarDatosPantallaCasa(){}
function mostrarCaracteristicasCasa(){} function guardarDatosCaracteristicasCasa(){}
function mostrarHomogeneizacionSuperficieCasa(){} function guardarDatosHomogeneizacionCasa(){}
function mostrarComparablesCasa(){}
function actualizarIndicadoresProgreso(){} function actualizarTextoBotonSiguiente(){}
function actualizarEstadoBotonSiguiente(){} function cerrarModalComparables(){}
function getApiUrl(){ return 'http://stub'; }
var setTimeout = function(fn){ fn(); return 0; };
var clearTimeout = function(){};
"""

ctx = MiniRacer()

# Cargar en el mismo orden que tasacion.html
for f in ["tasacion-core.js", "config/resultados-config.js", "reactive-coefficients.js", "resultados-renderer.js", "tasacion-resultado.js", "tasacion-datos.js"]:
    code = (ROOT / f).read_text(encoding="utf-8")
    ctx.eval(code if f != "tasacion-core.js" else PRELUDE + "\n" + code)

def ev(expr):
    return ctx.eval(expr)

def evj(expr):
    """Evalúa y devuelve el resultado serializado como JSON."""
    return ctx.eval("JSON.stringify(" + expr + ")")

print("=== BINDINGS (única fuente de verdad) ===")
print("window.datosTasacion === datosTasacion:", ev("window.datosTasacion === datosTasacion"))
print("window.coeficientesPersonalizados === coeficientesPersonalizados:", ev("window.coeficientesPersonalizados === coeficientesPersonalizados"))
print("window.resultadoTasacion === resultadoTasacion:", ev("window.resultadoTasacion === resultadoTasacion"))
ev("resultadoTasacion = {x:1}")
print("tras reasignar resultadoTasacion, window sincronizado:", ev("window.resultadoTasacion === resultadoTasacion"))
ev("coeficientesPersonalizados = {foo:[]}")
print("tras reasignar coeficientesPersonalizados, window sincronizado:", ev("window.coeficientesPersonalizados === coeficientesPersonalizados"))
ev("coeficientesPersonalizados = {}")
print("window.datosTasacion.coeficientesPersonalizados tras sync manual:", ev("window.datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados; window.datosTasacion.coeficientesPersonalizados === coeficientesPersonalizados"))

print()
print("=== CASA ===")
ev(r"""
datosTasacion.tipo = 'casa';
datosTasacion.casa = {
    homogeneizacion: { totalHomogeneizada: 120 },
    superficieCubierta: '100-120', superficieCubiertaCoef: 1,
    superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1,
    estadoConservacion: '2 - Bueno', antiguedad: 10
};
// Equivalente al response actual del backend tasar_casa:
// valor_final = superficie * valor_m2_ref * ross * caracteristica_constructiva
resultadoTasacion = {
    comparables: [{ valor: 120000, superficie: 100, valor_m2: 1200, valor_m2_homogeneizado: 1200,
                    rossHeidecke: 0.95, superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1 }],
    valor_final: 136800, valor_m2: 1140,
    rossHeidecke: 0.95, superficie: 120
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
window.__antesCasa = { comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final };
recalcularConCoeficientesCasa();  // con coefs = 1 (recalculo inicial)
window.__baseCasa = { comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final };
""")
print("base (todos los coefs = 1):", evj("window.__baseCasa"))
# El usuario escribe 1.10 en el input "ubicacion" del objetivo -> guardarCoeficiente escribe window.*
ev(r"""
window.coeficientesPersonalizados['casa'] = [{ id: 'ubicacion', nombre: 'Ubicacion', valor: 1.10 }];
window.__coefLeidoPorRecalc = coeficientesPersonalizados['casa'][0].valor; // debe ver 1.10 (mismo objeto)
recalcularConCoeficientesCasa();
window.__despuesCasa = { comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final };
""")
print("el recálculo lee el coef editado vía binding unificado:", evj("window.__coefLeidoPorRecalc"))
print("después coef ubicacion objetivo = 1.10:", evj("window.__despuesCasa"))

print()
print("=== DEPARTAMENTO ===")
ev(r"""
datosTasacion.tipo = 'departamento';
datosTasacion.departamento = {
    homogeneizacion: { totalHomogeneizada: 80 },
    ubicacionPlantaCoef: 1, ubicacionPisoCoef: 1,
    caracteristicaConstructivaCoef: 1, superficieCubiertaCoef: 1
};
// Response actual del backend tasar_departamento: rossHeidecke = C = 1 - K/2
resultadoTasacion = {
    comparables: [{ valor: 200000, superficie: 80, valor_m2: 2500, valor_m2_homogeneizado: 2500,
                    rossHeidecke: 0.9, ubicacionPlantaCoef: 1, ubicacionPisoCoef: 1,
                    caracteristicaConstructivaCoef: 1, superficieCubiertaCoef: 1 }],
    valor_final: 180000, valor_m2: 2250,
    coeficiente_k: 0.2, coeficiente_depreciacion: 0.9, rossHeidecke: 0.9, superficie: 80
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
recalcularConCoeficientesDepartamento();
window.__baseDepto = { comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final };
""")
print("base (coefs = 1):", evj("window.__baseDepto"))
ev(r"""
window.coeficientesPersonalizados['departamento'] = [{ id: 'actividad', nombre: 'Actividad', valor: 1.10 }];
recalcularConCoeficientesDepartamento();
window.__despuesDepto = { comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final };
""")
print("después coef actividad objetivo = 1.10:", evj("window.__despuesDepto"))
# también un coeficiente de comparable
ev(r"""
window.coeficientesPersonalizados['departamento'] = [{ id: 'actividad', nombre: 'Actividad', valor: 1.10 }];
window.coeficientesPersonalizados['0'] = [{ id: 'ubicacion', nombre: 'Ubicacion', valor: 1.10 }];
recalcularConCoeficientesDepartamento();
window.__despuesDepto2 = { comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final };
""")
print("después además coef ubicacion comparable[0] = 1.10:", evj("window.__despuesDepto2"))

print()
print("=== LOTE ===")
ev(r"""
datosTasacion.tipo = 'lote';
datosTasacion.lote = { tipoLote: 'Medial', caracteristicas: { superficie: 300 } };
datosTasacion.ubicacion = { direccion: 'Test' };
resultadoTasacion = {
    comparables: [{ valor_m2: 1000, coef_fitto_comparable: 1, valor_m2_homogeneizado: 1000 }],
    coeficiente_fitto_lote: 1.2, superficie: 300,
    valor_final: 360000, valor_m2: 1200
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
""")
# el renderer escribe en window.coeficientesPersonalizados — el recálculo debe leerlo
ev(r"""
window.coeficientesPersonalizados['lote'] = [{ id: 'ubicacion', nombre: 'Ubicacion', valor: 1.10 }];
window.__promesa = recalcularConCoeficientes();
""")
ctx.eval("undefined")  # flush microtasks no soportado; la función es async pero el cálculo es síncrono hasta el await de Valvano (no aplica a Medial)
import time; time.sleep(0.2)
print("después coef ubicacion lote = 1.10:", evj("({ comp_m2h: resultadoTasacion.comparables[0].valor_m2_homogeneizado, valor_m2: resultadoTasacion.valor_m2, valor_final: resultadoTasacion.valor_final, coef_ubic: resultadoTasacion.coeficiente_ubicacion })"))

print()
print("=== FLUJO COMPLETO REAL: input -> guardarCoeficiente -> onCoeficienteChange -> recalculo ===")
ev(r"""
// Restaurar fixture de casa
datosTasacion.tipo = 'casa';
resultadoTasacion = {
    comparables: [{ valor: 120000, superficie: 100, valor_m2: 1200, valor_m2_homogeneizado: 1200,
                    rossHeidecke: 0.95, superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1 }],
    valor_final: 136800, valor_m2: 1140,
    rossHeidecke: 0.95, superficie: 120
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;

// Instanciar el renderer real sobre un contenedor stub
var contenedorStub = { innerHTML: '' };
var rendererTest = new ResultadosRenderer(contenedorStub, resultadoTasacion, 'casa');

// Simular input real del DOM con la clase coef-ubicacion-input
var fakeInput = {
    value: '1.10',
    dataset: { index: 'casa', coefId: 'ubicacion' },
    classList: {
        _cls: 'coef-ubicacion-input',
        contains: function(c){ return this._cls === c; },
        add: function(){}, remove: function(){}
    }
};

// 1) El renderer guarda el coeficiente (escribe en window.coeficientesPersonalizados)
rendererTest.guardarCoeficiente('casa', fakeInput, 1.10);
window.__coefGuardado = coeficientesPersonalizados['casa'][0].valor;

// 2) El listener real notifica al sistema reactivo (debounce stubbed = inmediato)
reactiveCoefficients.onCoeficienteChange('casa', fakeInput, 1.10);
""")
time.sleep(0.2)
print("coeficiente guardado por el renderer:", evj("window.__coefGuardado"))
print("valor_final tras onCoeficienteChange:", ev("resultadoTasacion.valor_final"))
print("valor_m2 tras onCoeficienteChange:", ev("resultadoTasacion.valor_m2"))

print()
print("=== MISMO FLUJO EN DEPARTAMENTO ===")
ev(r"""
datosTasacion.tipo = 'departamento';
resultadoTasacion = {
    comparables: [{ valor: 200000, superficie: 80, valor_m2: 2500, valor_m2_homogeneizado: 2500,
                    rossHeidecke: 0.9, ubicacionPlantaCoef: 1, ubicacionPisoCoef: 1,
                    caracteristicaConstructivaCoef: 1, superficieCubiertaCoef: 1 }],
    valor_final: 180000, valor_m2: 2250,
    coeficiente_k: 0.2, coeficiente_depreciacion: 0.9, rossHeidecke: 0.9, superficie: 80
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
var rendererDepto = new ResultadosRenderer({ innerHTML: '' }, resultadoTasacion, 'departamento');
var fakeInputD = {
    value: '1.10', dataset: { index: 'departamento', coefId: 'actividad' },
    classList: { contains: function(c){ return c === 'coef-actividad-input'; }, add: function(){}, remove: function(){} }
};
rendererDepto.guardarCoeficiente('departamento', fakeInputD, 1.10);
reactiveCoefficients.onCoeficienteChange('departamento', fakeInputD, 1.10);
""")
time.sleep(0.2)
print("valor_final tras cambio actividad depto=1.10:", ev("resultadoTasacion.valor_final"))

print()
print("=== MISMO FLUJO EN LOTE ===")
ev(r"""
datosTasacion.tipo = 'lote';
resultadoTasacion = {
    comparables: [{ valor_m2: 1000, coef_fitto_comparable: 1, valor_m2_homogeneizado: 1000 }],
    coeficiente_fitto_lote: 1.2, superficie: 300,
    valor_final: 360000, valor_m2: 1200
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
var rendererLote = new ResultadosRenderer({ innerHTML: '' }, resultadoTasacion, 'lote');
var fakeInputL = {
    value: '1.10', dataset: { index: 'lote', coefId: 'ubicacion' },
    classList: { contains: function(c){ return c === 'coef-ubicacion-input'; }, add: function(){}, remove: function(){} }
};
rendererLote.guardarCoeficiente('lote', fakeInputL, 1.10);
reactiveCoefficients.onCoeficienteChange('lote', fakeInputL, 1.10);
""")
time.sleep(0.2)
print("valor_final tras cambio ubicacion lote=1.10:", ev("resultadoTasacion.valor_final"))

print()
print("=== GUARDADO Y RECARGA (capturarDatosCompletos -> limpiar -> cargarDatosCompletos) ===")
ev(r"""
// Volver a casa con coeficiente editado
datosTasacion.tipo = 'casa';
resultadoTasacion = {
    comparables: [{ valor: 120000, superficie: 100, valor_m2: 1200, valor_m2_homogeneizado: 1200,
                    rossHeidecke: 0.95, superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1 }],
    valor_final: 136800, valor_m2: 1140,
    rossHeidecke: 0.95, superficie: 120
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
coeficientesPersonalizados['casa'] = [{ id: 'ubicacion', nombre: 'Ubicacion', valor: 1.10 }];
recalcularConCoeficientesCasa();
window.__valorEditado = resultadoTasacion.valor_final;

// Simular guardado: capturarDatosCompletos es lo que se persiste
window.__guardado = capturarDatosCompletos();
window.__jsonGuardado = JSON.stringify(window.__guardado);

// Simular recarga: nueva sesión -> estado limpio -> cargarDatosCompletos
limpiarDatosTasacion();
window.__trasLimpiar = { coefs: Object.keys(coeficientesPersonalizados).length, resultadoNull: resultadoTasacion === null };

cargarDatosCompletos(JSON.parse(window.__jsonGuardado));
window.__trasCargar = {
    coefUbicacion: coeficientesPersonalizados['casa']?.[0]?.valor,
    valorFinalRestaurado: resultadoTasacion?.valor_final,
    mismoObjeto: window.coeficientesPersonalizados === coeficientesPersonalizados,
    syncDatosTasacion: datosTasacion.coeficientesPersonalizados === coeficientesPersonalizados
};
// Y el recálculo tras recargar debe seguir funcionando sobre lo restaurado
coeficientesPersonalizados['casa'][0].valor = 1.20;
recalcularConCoeficientesCasa();
window.__valorTrasRecarga = resultadoTasacion.valor_final;
""")
time.sleep(0.2)
print("valor_final editado antes de guardar:", ev("window.__valorEditado"))
print("estado tras limpiar:", evj("window.__trasLimpiar"))
print("estado tras cargar:", evj("window.__trasCargar"))
print("valor_final tras recargar + cambiar coef a 1.20:", ev("window.__valorTrasRecarga"))
print()
print("Errores JS capturados:", ev("JSON.stringify(logs)"))

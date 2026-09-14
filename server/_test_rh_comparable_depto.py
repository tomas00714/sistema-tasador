# -*- coding: utf-8 -*-
"""
Test de Ross-Heidecke en comparables de DEPARTAMENTO — regla estricta.

Regla: c.rossHeidecke se aplica como divisor y se muestra en la columna
SOLAMENTE si el comparable tiene estadoConservacion no vacío + antiguedad
presente (antiguedad=0 es válido). Sin datos propios, el RH del backend
proviene de defaults (estado 7 = muy malo) y no debe aplicarse ni mostrarse.

Parte A (V8 / py_mini_racer): recalcularConCoeficientesDepartamento real.
Parte B (Edge/Playwright + backend real): columna del cuadro y coherencia.
"""
import json, time, threading, functools, http.server, socketserver, sys, io
from pathlib import Path
import requests
from py_mini_racer import MiniRacer

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parent.parent / "client" / "js"
BASE = "http://127.0.0.1:8080"
PORT = 8899
CLIENT_DIR = str(ROOT.parent)

PASS, FAIL = "PASS", "FAIL"
checks = []

def check(nombre, cond, detalle=""):
    checks.append((PASS if cond else FAIL, nombre, detalle))
    print(f"  [{PASS if cond else FAIL}] {nombre}  {detalle}")

def aprox(a, b, tol=1e-6):
    return a is not None and b is not None and abs(a - b) <= tol * max(1, abs(b))

# ============================================================
# PARTE A — V8
# ============================================================
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
for f in ["tasacion-core.js", "config/resultados-config.js", "reactive-coefficients.js",
          "resultados-renderer.js", "tasacion-resultado.js", "tasacion-datos.js"]:
    code = (ROOT / f).read_text(encoding="utf-8")
    ctx.eval(code if f != "tasacion-core.js" else PRELUDE + "\n" + code)

def ev(expr):
    return ctx.eval(expr)

def evj(expr):
    return json.loads(ctx.eval("JSON.stringify(" + expr + ")"))

print("=" * 60)
print("PARTE A — regla estricta tieneDatosRH en V8")
print("=" * 60)

ev(r"""
datosTasacion.tipo = 'departamento';
datosTasacion.departamento = {
    homogeneizacion: { totalSuperficie: 80, totalHomogeneizada: 65 },
    ubicacionPlantaCoef: 1.10, ubicacionPisoCoef: 0.95,
    caracteristicaConstructivaCoef: 1.05, superficieCubiertaCoef: 1.00
};
// Los comparables pasan por el normalizador real del renderer (misma vía
// que mostrarPantallaResultado) para probar también el display de RH.
function __fixtureDepto(comps) {
    resultadoTasacion = {
        comparables: comps,
        valor_final: 0, valor_m2: 0,
        coeficiente_depreciacion: 0.8456, rossHeidecke: 0.8456, superficie: 65
    };
    coeficientesPersonalizados = {};
    datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
    var rr = new ResultadosRenderer({ innerHTML: '' }, resultadoTasacion, 'departamento');
    recalcularConCoeficientesDepartamento();
    return {
        comps: resultadoTasacion.comparables.map(c => ({
            m2h: c.valor_m2_homogeneizado,
            rh: c.rossHeidecke   // null -> columna muestra '-'
        })),
        promedio: resultadoTasacion.valor_promedio_homogeneizado,
        valor_m2: resultadoTasacion.valor_m2,
        valor_final: resultadoTasacion.valor_final
    };
}
""")

BASE_COMP = """{ valor: 160000, superficie: 80,
    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90,
    caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
    ROSS, EXTRA }"""

COEFS = 1.20 * 0.90 * 1.10 * 1.00
sin_rh = 2000 / COEFS

# --- 1. estado + antiguedad 10 -> aplicado y mostrado ---
r = evj("""__fixtureDepto([{ valor: 160000, superficie: 80,
    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90, caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
    rossHeidecke: 0.95, estadoConservacion: '2', antiguedad: 10 }])""")
esp = sin_rh / 0.95
check("estado+ant=10 -> RH aplicado", aprox(r["comps"][0]["m2h"], esp),
      f"m2h={r['comps'][0]['m2h']:.4f} esp={esp:.4f}")
check("estado+ant=10 -> RH mostrado (no null)", r["comps"][0]["rh"] == 0.95, f"rh={r['comps'][0]['rh']}")

# --- 2. estado + antiguedad 0 -> aplicado y mostrado ---
r = evj("""__fixtureDepto([{ valor: 160000, superficie: 80,
    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90, caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
    rossHeidecke: 0.98, estadoConservacion: '1', antiguedad: 0 }])""")
esp = sin_rh / 0.98
check("estado+ant=0 -> RH aplicado (0 es válido)", aprox(r["comps"][0]["m2h"], esp),
      f"m2h={r['comps'][0]['m2h']:.4f} esp={esp:.4f}")
check("estado+ant=0 -> RH mostrado", r["comps"][0]["rh"] == 0.98, f"rh={r['comps'][0]['rh']}")

# --- 3. estado sin antiguedad -> NO aplicado, columna '-' ---
r = evj("""__fixtureDepto([{ valor: 160000, superficie: 80,
    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90, caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
    rossHeidecke: 0.90, estadoConservacion: '2' }])""")
check("estado sin antiguedad -> RH NO aplicado", aprox(r["comps"][0]["m2h"], sin_rh),
      f"m2h={r['comps'][0]['m2h']:.4f} esp={sin_rh:.4f}")
check("estado sin antiguedad -> rh null ('-')", r["comps"][0]["rh"] is None, f"rh={r['comps'][0]['rh']}")

# --- 4. sin estado (antiguedad presente) -> NO aplicado, '-' ---
r = evj("""__fixtureDepto([{ valor: 160000, superficie: 80,
    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90, caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
    rossHeidecke: 0.737, antiguedad: 10 }])""")
check("sin estado -> RH NO aplicado (default 7 no entra)", aprox(r["comps"][0]["m2h"], sin_rh),
      f"m2h={r['comps'][0]['m2h']:.4f} esp={sin_rh:.4f}")
check("sin estado -> rh null ('-')", r["comps"][0]["rh"] is None, f"rh={r['comps'][0]['rh']}")

# --- 4b. sin estado y sin antiguedad (caso de la prueba real) ---
r = evj("""__fixtureDepto([{ valor: 160000, superficie: 80,
    ubicacionPlantaCoef: 1.00, ubicacionPisoCoef: 1.00, caracteristicaConstructivaCoef: 1.00, superficieCubiertaCoef: 1.00,
    rossHeidecke: 0.737 }])""")
check("sin estado ni antiguedad -> NO aplicado", aprox(r["comps"][0]["m2h"], 2000.0),
      f"m2h={r['comps'][0]['m2h']:.4f} esp=2000")
check("sin datos -> rh null ('-')", r["comps"][0]["rh"] is None, f"rh={r['comps'][0]['rh']}")

# --- 5. comparable histórico: datos en nested departamento ---
r = evj("""__fixtureDepto([{ valor: 160000, superficie: 80, fuente: 'de_tasacion',
    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90, caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
    rossHeidecke: 0.92,
    departamento: { estadoConservacion: '3', antiguedad: 25, vidaUtil: 80,
                    ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90,
                    caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00 } }])""")
esp = sin_rh / 0.92
check("historial (nested) -> RH aplicado", aprox(r["comps"][0]["m2h"], esp),
      f"m2h={r['comps'][0]['m2h']:.4f} esp={esp:.4f}")
check("historial (nested) -> RH mostrado", r["comps"][0]["rh"] == 0.92, f"rh={r['comps'][0]['rh']}")

# --- 6. varios comparables: mezcla con/sin datos -> promedio correcto ---
r = evj("""__fixtureDepto([
    { valor: 160000, superficie: 80, rossHeidecke: 0.95, estadoConservacion: '2', antiguedad: 10,
      ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90, caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00 },
    { valor: 100000, superficie: 50, rossHeidecke: 0.90, estadoConservacion: '3', antiguedad: 30,
      ubicacionPlantaCoef: 1.00, ubicacionPisoCoef: 1.00, caracteristicaConstructivaCoef: 1.00, superficieCubiertaCoef: 1.00 },
    { valor: 140000, superficie: 70, rossHeidecke: 0.737,
      ubicacionPlantaCoef: 1.00, ubicacionPisoCoef: 1.00, caracteristicaConstructivaCoef: 1.00, superficieCubiertaCoef: 1.00 }
])""")
h0 = 2000 / (COEFS * 0.95)
h1 = 2000 / 0.90
h2 = 2000.0   # sin datos -> sin factor RH
prom_esp = (h0 + h1 + h2) / 3
check("mezcla: cada m2h con su regla", aprox(r["comps"][0]["m2h"], h0) and aprox(r["comps"][1]["m2h"], h1) and aprox(r["comps"][2]["m2h"], h2),
      f"comps={['%.2f' % c['m2h'] for c in r['comps']]} esp={['%.2f' % v for v in (h0, h1, h2)]}")
check("mezcla: promedio coherente", aprox(r["promedio"], prom_esp), f"prom={r['promedio']:.4f} esp={prom_esp:.4f}")
check("mezcla: comp sin datos tiene rh null", r["comps"][2]["rh"] is None, f"rh={r['comps'][2]['rh']}")

# --- 7. coherencia objetivo ---
coefs_obj = 1.10 * 0.95 * 1.05 * 1.00 * 0.8456
vm2_esp = prom_esp * coefs_obj
check("valor_m2 objetivo coherente", aprox(r["valor_m2"], vm2_esp), f"vm2={r['valor_m2']:.4f} esp={vm2_esp:.4f}")
check("valor_final = vm2 x 65", aprox(r["valor_final"], vm2_esp * 65), f"vf={r['valor_final']:.2f}")

# --- 8. casa y lote sin cambios ---
ev(r"""
datosTasacion.tipo = 'casa';
datosTasacion.casa = {
    homogeneizacion: { totalHomogeneizada: 120 },
    superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1
};
resultadoTasacion = {
    comparables: [{ valor: 120000, superficie: 100, rossHeidecke: 0.95,
                    superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1 }],
    valor_final: 0, valor_m2: 0, rossHeidecke: 0.9, superficie: 120
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
recalcularConCoeficientesCasa();
""")
casa_m2h = ev("resultadoTasacion.comparables[0].valor_m2_homogeneizado")
check("casa intacta: m2h = 1200/0.95", aprox(casa_m2h, 1200 / 0.95), f"casa m2h={casa_m2h:.4f}")

ev(r"""
datosTasacion.tipo = 'lote';
datosTasacion.lote = { tipoLote: 'Medial', caracteristicas: { superficie: 300 } };
datosTasacion.ubicacion = { direccion: 'Test' };
resultadoTasacion = {
    comparables: [{ valor_m2: 1000, coef_fitto_comparable: 1, valor_m2_homogeneizado: 1000 }],
    coeficiente_fitto_lote: 1.2, superficie: 300, valor_final: 360000, valor_m2: 1200
};
coeficientesPersonalizados = {};
datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
recalcularConCoeficientes();
""")
lote_vf = ev("resultadoTasacion.valor_final")
check("lote intacto: valor_final = 300 x 1000 x 1.2", aprox(lote_vf, 360000), f"vf={lote_vf}")

print()
print("Errores JS capturados en V8:", ev("JSON.stringify(logs)"))

# ============================================================
# PARTE B — navegador real
# ============================================================
print()
print("=" * 60)
print("PARTE B — Edge real: columna RH y coherencia")
print("=" * 60)

email = f"rh_{int(time.time())}@test.local"
r = requests.post(f"{BASE}/api/auth/register", json={
    "email": email, "password": "Test1234!", "nombre": "RH", "apellido": "Test"
})
r.raise_for_status()
TOKEN = r.json()["access_token"]

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=CLIENT_DIR)
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler)
srv.allow_reuse_address = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

from playwright.sync_api import sync_playwright

SETUP_DEPTO = r"""
async () => {
    datosTasacion.tipo = 'departamento';
    datosTasacion.ubicacion = { direccion: 'Av. Prueba 100', provincia: '', localidad: '', lat: null, lon: null, orientacion: '' };
    coeficientesPersonalizados = {};
    datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
    resultadoTasacion = null;
    datosTasacion.departamento = {
        superficieCubierta: '60', superficieCubiertaCoef: 1.00,
        ubicacionPlanta: 'Media', ubicacionPlantaCoef: 1.10,
        ubicacionPiso: 'Piso 5', ubicacionPisoCoef: 0.95,
        caracteristicaConstructiva: 'Hormigon', caracteristicaConstructivaCoef: 1.05,
        antiguedad: '20', estadoConservacion: '3', vidaUtil: 80,
        homogeneizacion: {
            cubierto: { superficie: 60, coef: 1, homogeneizada: 60 },
            balconDescubierto: { superficie: 10, coef: 0.30, homogeneizada: 3 },
            semicubierto: { superficie: 0, coef: 0.50, homogeneizada: 0 },
            baulera: { superficie: 0, coef: 0.25, homogeneizada: 0 },
            balconTerraza: { superficie: 0, coef: 0.50, homogeneizada: 0 },
            descubierto: { superficie: 10, coef: 0.20, homogeneizada: 2 },
            totalSuperficie: 80, totalHomogeneizada: 65
        }
    };
    datosTasacion.comparables = [
        // Comp 1: CON datos propios (estado + antiguedad)
        { direccion: 'Comp Depto 1', ubicacion: { direccion: 'Comp Depto 1', lat: 0, lon: 0, provincia: 'BA', localidad: 'CABA' },
          tipoInmueble: 'departamento', fuente: 'manual',
          valor: 160000, valor_total: 160000, tipo_valor: 'venta', tipoValor: 'venta',
          superficie: 80, antiguedad: 10, estadoConservacion: '2', vidaUtil: 80,
          departamento: {
              superficie: 80, superficieTotal: 80,
              ubicacionPlantaCoef: 1.20, ubicacionPisoCoef: 0.90,
              caracteristicaConstructivaCoef: 1.10, superficieCubiertaCoef: 1.00,
              antiguedad: 10, estadoConservacion: '2', vidaUtil: 80,
              homogeneizacion: { totalSuperficie: 80, totalHomogeneizada: 72 },
              superficieHomogeneizada: 72
          } },
        // Comp 2: SIN estado ni antiguedad -> backend devuelve RH de defaults
        { direccion: 'Comp Depto 2', ubicacion: { direccion: 'Comp Depto 2', lat: 0, lon: 0, provincia: 'BA', localidad: 'CABA' },
          tipoInmueble: 'departamento', fuente: 'manual',
          valor: 100000, valor_total: 100000, tipo_valor: 'venta', tipoValor: 'venta',
          superficie: 50,
          departamento: {
              superficie: 50, superficieTotal: 50,
              ubicacionPlantaCoef: 1.00, ubicacionPisoCoef: 1.00,
              caracteristicaConstructivaCoef: 1.00, superficieCubiertaCoef: 1.00,
              homogeneizacion: { totalSuperficie: 50, totalHomogeneizada: 50 },
              superficieHomogeneizada: 50
          } }
    ];
    await calcularYMostrarResultado();
    return true;
}
"""

LEER_DEPTO = r"""
() => {
    const wraps = document.querySelectorAll('.resultado-tabla-wrap');
    const cuadros = [];
    wraps.forEach(w => {
        cuadros.push({
            titulo: w.querySelector('h3')?.textContent?.trim() || '',
            headers: [...w.querySelectorAll('thead th')].map(th => th.textContent.trim()),
            filas: [...w.querySelectorAll('tbody tr')].map(tr =>
                [...tr.querySelectorAll('td')].map(td => {
                    const inp = td.querySelector('input');
                    return inp ? inp.value : td.textContent.trim();
                })),
            tfoot: [...w.querySelectorAll('tfoot td')].map(td => td.textContent.trim())
        });
    });
    return {
        cuadros,
        comps: resultadoTasacion.comparables.map(c => ({
            m2: c.valor_m2, m2h: c.valor_m2_homogeneizado, rh: c.rossHeidecke ?? null
        })),
        resultado: {
            promedio: resultadoTasacion.valor_promedio_homogeneizado,
            valor_m2: resultadoTasacion.valor_m2,
            valor_final: resultadoTasacion.valor_final,
            rh_target: resultadoTasacion.rossHeidecke
        }
    };
}
"""

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        ctxp = browser.new_context()
        ctxp.add_init_script(f"localStorage.setItem('auth_token', '{TOKEN}');")
        page = ctxp.new_page()
        page.on("dialog", lambda d: d.accept() if d.type == "beforeunload" else d.dismiss())
        page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="domcontentloaded")
        page.wait_for_timeout(2500)
        page.evaluate(SETUP_DEPTO)
        page.wait_for_timeout(800)
        dom = page.evaluate(LEER_DEPTO)
        browser.close()

    print(json.dumps(dom, indent=1, ensure_ascii=False, default=str))

    cuadro_comps = next((c for c in dom["cuadros"] if "omparable" in c["titulo"]), None)
    idx_rh = cuadro_comps["headers"].index("Ross-Heidecke") if cuadro_comps else -1
    idx_m2h = cuadro_comps["headers"].index("Valor m² homogeneizado") if cuadro_comps else -1

    comp0, comp1 = dom["comps"][0], dom["comps"][1]

    # Comp 1: con datos propios -> RH aplicado y columna muestra el valor
    rh0 = comp0["rh"]
    esp0 = comp0["m2"] / (1.20 * 0.90 * 1.10 * 1.00 * (rh0 or 1))
    check("B: comp1 con datos -> RH aplicado al m2h", aprox(comp0["m2h"], esp0),
          f"m2h={comp0['m2h']} rh={rh0} esp={esp0:.4f}")
    celda_rh0 = cuadro_comps["filas"][0][idx_rh]
    check("B: comp1 columna RH muestra valor", celda_rh0 not in ("-", ""), f"celda='{celda_rh0}'")

    # Comp 2: sin datos -> RH NO aplicado aunque backend devuelva uno, columna '-'
    esp1 = comp1["m2"] / 1.00
    check("B: comp2 sin datos -> factor RH omitido", aprox(comp1["m2h"], esp1),
          f"m2h={comp1['m2h']} esp={esp1:.4f} (rh backend era {comp1['rh']})")
    celda_rh1 = cuadro_comps["filas"][1][idx_rh]
    check("B: comp2 columna RH muestra '-'", celda_rh1 == "-", f"celda='{celda_rh1}'")

    # Coherencia objetivo
    res = dom["resultado"]
    prom_esp_b = (comp0["m2h"] + comp1["m2h"]) / 2
    check("B: promedio coherente", aprox(res["promedio"], prom_esp_b), f"prom={res['promedio']:.2f}")
    check("B: valor_final = valor_m2 x 65", aprox(res["valor_final"], res["valor_m2"] * 65),
          f"vf={res['valor_final']:.2f} vm2={res['valor_m2']:.2f}")
except Exception as e:
    check("B: navegador real", False, f"{type(e).__name__}: {e}")
finally:
    srv.shutdown()

print()
print("=" * 60)
total = len(checks)
ok = sum(1 for c in checks if c[0] == PASS)
print(f"RESULTADO: {ok}/{total} checks OK")
if ok != total:
    sys.exit(1)

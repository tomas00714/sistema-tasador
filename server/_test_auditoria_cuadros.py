# -*- coding: utf-8 -*-
"""
Validación REAL de las correcciones de origen de datos en los cuadros de resultado.
Navegador real (Edge/Playwright) + backend real (127.0.0.1:8080) + frontend estático.

Verifica que cada celda provenga del campo correcto:
- LOTE: Valor por m² objetivo = valor_final/superficie (incluye F&C) desde la carga inicial
- DEPTO: Superficie (cruda) vs Superficie Homogeneizada; 4 coefs del objetivo;
  coefs y superficie homogeneizada de comparables; columna "Valor promedio de comp."
- CASA: Superficie vs Superficie Homogeneizada
- Transporte de coefs para comparable proveniente de tasación (normalizarComparable -> crearComparable)
- Guardar -> recargar -> reabrir
"""
import json, time, threading, functools, http.server, socketserver, sys, io
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8080"
PORT = 8899
CLIENT_DIR = r"C:\Users\tomas\Desktop\proyecto-tasador\client"

email = f"auditoria_{int(time.time())}@test.local"
r = requests.post(f"{BASE}/api/auth/register", json={
    "email": email, "password": "Test1234!", "nombre": "Aud", "apellido": "Test"
})
r.raise_for_status()
TOKEN = r.json()["access_token"]
print(f"[setup] usuario: {email}")

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=CLIENT_DIR)
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler)
srv.allow_reuse_address = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

from playwright.sync_api import sync_playwright

# Lee el cuadro del objetivo y de comparables desde el DOM real,
# mapeando encabezado -> valor de celda (sin depender de posiciones fijas)
LEER_CUADROS_JS = r"""
() => {
    const wraps = document.querySelectorAll('.resultado-tabla-wrap');
    const out = [];
    wraps.forEach(w => {
        const titulo = w.querySelector('h3')?.textContent?.trim() || '';
        const headers = [...w.querySelectorAll('thead th')].map(th => th.textContent.trim());
        const filas = [...w.querySelectorAll('tbody tr')].map(tr =>
            [...tr.querySelectorAll('td')].map(td => {
                const inp = td.querySelector('input');
                return inp ? inp.value : td.textContent.trim();
            })
        );
        const tfoot = [...w.querySelectorAll('tfoot td')].map(td => td.textContent.trim());
        out.push({ titulo, headers, filas, tfoot });
    });
    const card = document.querySelector('.resultado-valor-card');
    return {
        cuadros: out,
        card: card ? card.textContent.replace(/\s+/g, ' ').trim() : null,
        resultado: {
            valor_m2: resultadoTasacion?.valor_m2 ?? null,
            valor_final: resultadoTasacion?.valor_final ?? null,
            superficie: resultadoTasacion?.superficie ?? null,
            superficie_homogeneizada: resultadoTasacion?.superficie_homogeneizada ?? null,
            coeficiente_fitto_lote: resultadoTasacion?.coeficiente_fitto_lote ?? null,
            valor_promedio_homogeneizado: resultadoTasacion?.valor_promedio_homogeneizado ?? null,
            rossHeidecke: resultadoTasacion?.rossHeidecke ?? null
        },
        coefs: JSON.parse(JSON.stringify(coeficientesPersonalizados))
    };
}
"""

SETUP_JS = r"""
async (tipo) => {
    datosTasacion.tipo = tipo;
    datosTasacion.ubicacion = { direccion: 'Av. Prueba 100', provincia: '', localidad: '', lat: null, lon: null, orientacion: '' };
    coeficientesPersonalizados = {};
    datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
    resultadoTasacion = null;

    if (tipo === 'casa') {
        // Homogeneización: 120 cubierto + 20 semicubierto*0.5 = totalSup 140, totalHom 130
        datosTasacion.casa = {
            superficieCubierta: '120', superficieCubiertaCoef: 1,
            superficieTotal: '200', superficieTotalCoef: 1,
            antiguedad: '20', estadoConservacion: '3',
            caracteristicaConstructivaCoef: 1, vidaUtil: 80,
            homogeneizacion: {
                cubierto: { superficie: 120, coef: 1, homogeneizada: 120 },
                semicubierto: { superficie: 20, coef: 0.5, homogeneizada: 10 },
                patio: { superficie: 0, coef: 0.1, homogeneizada: 0 },
                dependencias: { superficie: 0, coef: 0.4, homogeneizada: 0 },
                balcon: { superficie: 0, coef: 0.3, homogeneizada: 0 },
                descubierto: { superficie: 0, coef: 0.2, homogeneizada: 0 },
                totalSuperficie: 140, totalHomogeneizada: 130
            }
        };
        datosTasacion.comparables = [
            { direccion: 'Comp Casa 1', ubicacion: { direccion: 'Comp Casa 1', lat: 0, lon: 0, provincia: 'Buenos Aires', localidad: 'CABA' },
              tipoInmueble: 'casa', fuente: 'manual',
              valor: 120000, valor_total: 120000, tipo_valor: 'venta', tipoValor: 'venta',
              frente: 10, fondo: 30, superficie: 100,
              antiguedad: 15, estadoConservacion: '3', estado_conservacion: '3',
              superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1,
              casa: { superficie: 100, superficieCubiertaCoef: 1, superficieTotalCoef: 1,
                      caracteristicaConstructivaCoef: 1, antiguedad: 15, estadoConservacion: '3',
                      homogeneizacion: { totalSuperficie: 110, totalHomogeneizada: 105 } } }
        ];
    } else if (tipo === 'departamento') {
        // Objetivo: totalSup 80 (60 cub + 10 balcDesc + 10 desc), totalHom 65 (60 + 3 + 2)
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
            { direccion: 'Comp Depto 1', ubicacion: { direccion: 'Comp Depto 1', lat: 0, lon: 0, provincia: 'Buenos Aires', localidad: 'CABA' },
              tipoInmueble: 'departamento', fuente: 'manual',
              valor: 160000, valor_total: 160000, tipo_valor: 'venta', tipoValor: 'venta',
              frente: 8, fondo: 10, superficie: 80,
              antiguedad: 10, estadoConservacion: '2', estado_conservacion: '2',
              departamento: {
                  superficie: 80, superficieTotal: 80,
                  ubicacionPlanta: 'Alta', ubicacionPlantaCoef: 1.20,
                  ubicacionPiso: 'Piso 2', ubicacionPisoCoef: 0.90,
                  caracteristicaConstructiva: 'Hormigon', caracteristicaConstructivaCoef: 1.10,
                  superficieCubierta: '80', superficieCubiertaCoef: 1.00,
                  antiguedad: 10, estadoConservacion: '2', vidaUtil: 80,
                  homogeneizacion: { totalSuperficie: 80, totalHomogeneizada: 72 },
                  superficieHomogeneizada: 72
              } }
        ];
    } else {
        // Lote objetivo: frente 10 x fondo 50 = 500 m2 -> F&C = 0.801 (tabla real)
        datosTasacion.lote = {
            tipoLote: 'Medial',
            servicios: [],
            caracteristicas: { frente: 10, fondo: 50, superficie: 500 }
        };
        datosTasacion.comparables = [
            { direccion: 'Comp Lote 1', ubicacion: { direccion: 'Comp Lote 1', lat: 0, lon: 0, provincia: 'Buenos Aires', localidad: 'CABA' },
              tipoInmueble: 'lote', fuente: 'manual',
              valor: 300000, valor_total: 300000, tipo_valor: 'venta', tipoValor: 'venta',
              frente: 10, fondo: 30, superficie: 300, tipoLote: 'Medial', tipologia: 'Medial' }
        ];
    }

    await calcularYMostrarResultado();
    return true;
}
"""

results = {}

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context()
    ctx.add_init_script(f"localStorage.setItem('auth_token', '{TOKEN}');")
    page = ctx.new_page()
    js_errors, dialogs = [], []
    page.on("pageerror", lambda e: js_errors.append(f"PAGEERROR: {e}"))
    page.on("console", lambda m: js_errors.append(f"CONSOLE.ERROR: {m.text} @ {m.location}") if m.type == "error" else None)
    def on_dialog(d):
        dialogs.append(f"{d.type}: {d.message}")
        if d.type == "beforeunload":
            d.accept()
        else:
            d.dismiss()
    page.on("dialog", on_dialog)

    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="domcontentloaded")
    page.wait_for_timeout(2500)
    if 'login' in page.url:
        print("FALLO: redirigió a login"); sys.exit(1)

    def leer():
        return page.evaluate(LEER_CUADROS_JS)

    # ============ LOTE ============
    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="commit"); page.wait_for_timeout(2500)
    page.evaluate(SETUP_JS, 'lote')
    page.wait_for_timeout(600)
    lote_ini = leer()

    # Editar coef ubicación del objetivo -> recalcular -> verificar misma definición de valor_m2
    inp = page.locator('input.coef-ubicacion-input[data-index="lote"]').first
    lote_inp = inp.count() > 0
    if lote_inp:
        inp.fill('1.10')
    page.wait_for_timeout(600)
    lote_post = leer()
    results['lote'] = dict(inicial=lote_ini, post_edicion=lote_post, input=lote_inp)

    # ============ DEPARTAMENTO ============
    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="commit"); page.wait_for_timeout(2500)
    page.evaluate(SETUP_JS, 'departamento')
    page.wait_for_timeout(600)
    depto_ini = leer()

    inp = page.locator('input.coef-actividad-input[data-index="departamento"]').first
    depto_inp = inp.count() > 0
    if depto_inp:
        inp.fill('1.10')
    page.wait_for_timeout(600)
    depto_post = leer()
    results['departamento'] = dict(inicial=depto_ini, post_edicion=depto_post, input=depto_inp)

    # Transporte de comparable de tasación: normalizarComparable + crearComparable real
    transporte = page.evaluate(r"""(async () => {
        const datosComp = {
            fuente: 'de_tasacion', tipoInmueble: 'departamento',
            ubicacion: { direccion: 'Depto Hist 9', provincia: 'BA', localidad: 'CABA', lat: 0, lon: 0 },
            valor: 200000, tipoValor: 'venta',
            departamento: {
                superficie: 70, superficieTotal: 70,
                ubicacionPlantaCoef: 1.15, ubicacionPisoCoef: 0.92,
                caracteristicaConstructivaCoef: 1.08, superficieCubiertaCoef: 1.02,
                antiguedad: 25, vidaUtil: 80, estadoConservacion: '3',
                homogeneizacion: { totalSuperficie: 70, totalHomogeneizada: 61 },
                superficieHomogeneizada: 61
            },
            ubicacionPlantaCoef: 1.15, ubicacionPisoCoef: 0.92,
            caracteristicaConstructivaCoef: 1.08, superficieCubiertaCoef: 1.02,
            antiguedad: 25, vidaUtil: 80, estadoConservacion: '3',
            superficie: 70, superficieHomogeneizada: 61,
            homogeneizacion: { totalSuperficie: 70, totalHomogeneizada: 61 }
        };
        const norm = normalizarComparable(datosComp, 'departamento');
        const creado = await crearComparable(norm);
        return {
            inmueble_norm: norm.inmueble,
            departamento_creado: creado.departamento ?? null
        };
    })()""")
    results['transporte_depto_desde_tasacion'] = transporte

    # Guardar la tasación depto y reabrir tras recarga
    saved = page.evaluate("""(async () => {
        const id = await guardarTasacion('completada');
        return { id, valor_final: resultadoTasacion.valor_final };
    })()""")
    page.wait_for_timeout(400)
    print(f"[guardar] depto id={saved.get('id')} valor_final={saved.get('valor_final')}")

    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="commit"); page.wait_for_timeout(2500)
    recarga = page.evaluate(f"""(async () => {{
        const t = await obtenerTasacionAPI({json.dumps(saved.get('id'))});
        if (!t) return {{ error: 'obtenerTasacionAPI null' }};
        await cargarDatosCompletos(t.datos);
        await mostrarPantallaResultado();
        return true;
    }})()""")
    page.wait_for_timeout(800)
    depto_recarga = leer()
    results['depto_recarga'] = dict(saved=saved, cuadros=depto_recarga)

    # ============ CASA ============
    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="commit"); page.wait_for_timeout(2500)
    page.evaluate(SETUP_JS, 'casa')
    page.wait_for_timeout(600)
    casa_ini = leer()
    results['casa'] = dict(inicial=casa_ini)

    browser.close()

srv.shutdown()

print("\n================= RESULTADOS =================")
print(json.dumps(results, indent=1, ensure_ascii=False, default=str))
print("\n================= DIALOGS =================")
print(dialogs[:10])
print("\n========= ERRORES JS =========")
uniq = []
for e in js_errors:
    if e not in uniq: uniq.append(e)
for e in uniq[:30]: print(" -", e[:300])
print(f"(total: {len(js_errors)})")

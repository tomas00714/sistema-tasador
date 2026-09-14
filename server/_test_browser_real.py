# -*- coding: utf-8 -*-
"""
Validación REAL del flujo de recálculo de coeficientes en navegador (Edge via Playwright).
- Backend real en http://127.0.0.1:8080
- Frontend real servido estáticamente desde client/
- Usuario de prueba registrado vía API para obtener JWT real
- Llama calcularYMostrarResultado() (flujo real: tasarAPI -> mostrarPantallaResultado)
- Simula edición real del input (fill -> evento 'input' -> listener -> debounce -> recálculo -> re-render)
- Guarda con guardarTasacion() real, recarga la página y reabre con obtenerTasacionAPI + cargarDatosCompletos
"""
import json, time, threading, functools, http.server, socketserver, sys, io
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:8080"
PORT = 8899
CLIENT_DIR = r"C:\Users\tomas\Desktop\proyecto-tasador\client"

# ---------- 1. Registrar usuario de prueba -> JWT real ----------
email = f"validacion_{int(time.time())}@test.local"
r = requests.post(f"{BASE}/api/auth/register", json={
    "email": email, "password": "Test1234!", "nombre": "Val", "apellido": "Test"
})
r.raise_for_status()
TOKEN = r.json()["access_token"]
print(f"[setup] usuario registrado: {email}")

# ---------- 2. Servidor estático de client/ ----------
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=CLIENT_DIR)
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler)
srv.allow_reuse_address = True
threading.Thread(target=srv.serve_forever, daemon=True).start()
print(f"[setup] client/ servido en http://127.0.0.1:{PORT}")

from playwright.sync_api import sync_playwright

SETUP_JS = r"""
async (tipo) => {
    // Estado como lo dejaría el formulario real
    datosTasacion.tipo = tipo;
    datosTasacion.ubicacion = { direccion: 'Av. Prueba 100', provincia: '', localidad: '', lat: null, lon: null, orientacion: '' };
    coeficientesPersonalizados = {};
    datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
    resultadoTasacion = null;

    if (tipo === 'casa') {
        datosTasacion.casa = {
            superficieCubierta: '120', superficieCubiertaCoef: 1,
            superficieTotal: '200', superficieTotalCoef: 1,
            antiguedad: '20', estadoConservacion: '3',
            caracteristicaConstructivaCoef: 1, vidaUtil: 80,
            superficieHomogeneizada: 120,
            homogeneizacion: {
                cubierto: { superficie: 120, coeficiente: 1, homogeneizada: 120 },
                semicubierto: { superficie: 0, coeficiente: 0.5, homogeneizada: 0 },
                balcon: { superficie: 0, coeficiente: 0.3, homogeneizada: 0 },
                descubierto: { superficie: 0, coeficiente: 0.2, homogeneizada: 0 },
                totalSuperficie: 120, totalHomogeneizada: 120
            }
        };
        datosTasacion.comparables = [
            { direccion: 'Comp Casa 1', ubicacion: { direccion: 'Comp Casa 1', lat: 0, lon: 0, provincia: 'Buenos Aires', localidad: 'CABA' },
              tipoInmueble: 'casa', fuente: 'manual',
              valor: 120000, valor_total: 120000, tipo_valor: 'venta', tipoValor: 'venta',
              frente: 10, fondo: 30, superficie: 100,
              antiguedad: 15, estadoConservacion: '3', estado_conservacion: '3',
              superficieCubiertaCoef: 1, superficieTotalCoef: 1, caracteristicaConstructivaCoef: 1 }
        ];
    } else if (tipo === 'departamento') {
        datosTasacion.departamento = {
            superficieCubierta: '80', superficieCubiertaCoef: 1,
            ubicacionPlantaCoef: 1, ubicacionPisoCoef: 1, caracteristicaConstructivaCoef: 1,
            antiguedad: '20', estadoConservacion: '3', vidaUtil: 80,
            superficieHomogeneizada: 80,
            homogeneizacion: {
                cubierto: { superficie: 80, coeficiente: 1, homogeneizada: 80 },
                semicubierto: { superficie: 0, coeficiente: 0.5, homogeneizada: 0 },
                balcon: { superficie: 0, coeficiente: 0.3, homogeneizada: 0 },
                descubierto: { superficie: 0, coeficiente: 0.2, homogeneizada: 0 },
                totalSuperficie: 80, totalHomogeneizada: 80
            }
        };
        datosTasacion.comparables = [
            { direccion: 'Comp Depto 1', ubicacion: { direccion: 'Comp Depto 1', lat: 0, lon: 0, provincia: 'Buenos Aires', localidad: 'CABA' },
              tipoInmueble: 'departamento', fuente: 'manual',
              valor: 160000, valor_total: 160000, tipo_valor: 'venta', tipoValor: 'venta',
              frente: 8, fondo: 10, superficie: 80,
              antiguedad: 10, estadoConservacion: '2', estado_conservacion: '2',
              ubicacionPlantaCoef: 1, ubicacionPisoCoef: 1,
              caracteristicaConstructivaCoef: 1, superficieCubiertaCoef: 1 }
        ];
    } else {
        datosTasacion.lote = {
            tipoLote: 'Medial',
            servicios: [],
            caracteristicas: { frente: 10, fondo: 30, superficie: 300 }
        };
        datosTasacion.comparables = [
            { direccion: 'Comp Lote 1', ubicacion: { direccion: 'Comp Lote 1', lat: 0, lon: 0, provincia: 'Buenos Aires', localidad: 'CABA' },
              tipoInmueble: 'lote', fuente: 'manual',
              valor: 300000, valor_total: 300000, tipo_valor: 'venta', tipoValor: 'venta',
              frente: 10, fondo: 30, superficie: 300, tipoLote: 'Medial', tipologia: 'Medial' }
        ];
    }

    await calcularYMostrarResultado();   // flujo REAL: tasarAPI -> resultadoTasacion -> mostrarPantallaResultado
    return {
        valor_m2: resultadoTasacion ? resultadoTasacion.valor_m2 : null,
        valor_final: resultadoTasacion ? resultadoTasacion.valor_final : null,
        comp_m2h: resultadoTasacion?.comparables?.[0]?.valor_m2_homogeneizado ?? null
    };
}
"""

SNAPSHOT_JS = r"""
() => ({
    valor_m2: resultadoTasacion ? resultadoTasacion.valor_m2 : null,
    valor_final: resultadoTasacion ? resultadoTasacion.valor_final : null,
    comp_m2h: resultadoTasacion?.comparables?.[0]?.valor_m2_homogeneizado ?? null,
    coefs: JSON.parse(JSON.stringify(coeficientesPersonalizados)),
    cardText: document.querySelector('.resultado-valor')?.textContent?.trim() || null,
    cardExists: !!document.querySelector('.resultado-valor-card')
})
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
            d.accept()   # aceptar = permitir la recarga (como usuario que confirma salir)
        else:
            d.dismiss()
    page.on("dialog", on_dialog)

    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="domcontentloaded")
    page.wait_for_timeout(2500)
    print(f"[setup] URL tras carga: {page.url}")
    if 'login' in page.url:
        print("FALLO: redirigió a login"); sys.exit(1)

    def snap():
        return page.evaluate(SNAPSHOT_JS)

    def run_tipo(tipo, input_sel, valor):
        page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="commit"); page.wait_for_timeout(2500)
        antes = page.evaluate(SETUP_JS, tipo)
        page.wait_for_timeout(600)
        antes_dom = snap()
        # Edición real del input (fill dispara evento 'input' -> listener real)
        inp = page.locator(input_sel).first
        visible = inp.count() > 0
        if visible:
            inp.fill(valor)
        page.wait_for_timeout(500)          # debounce 300ms + recálculo + re-render
        despues_dom = snap()
        page.wait_for_timeout(800)          # estabilidad: ¿una segunda pasada lo pisa?
        estable_dom = snap()
        return antes, antes_dom, despues_dom, estable_dom, visible

    # ===== 1. CASA: coef ubicación objetivo 1.00 -> 1.10 =====
    a, ad, d, e, vis = run_tipo('casa', 'input.coef-ubicacion-input[data-index="casa"]', '1.10')
    results['casa'] = dict(antes=a, antes_dom=ad, despues=d, estable=e, input_encontrado=vis)

    # ===== 4. Coeficiente de COMPARABLE (casa, comparable[0] ubicación 1.10) =====
    inp = page.locator('input.coef-ubicacion-input[data-index="0"]').first
    comp_ok = inp.count() > 0
    antes_comp = snap()
    if comp_ok:
        inp.fill('1.10')
    page.wait_for_timeout(500)
    despues_comp = snap()
    results['casa_comparable'] = dict(antes=antes_comp, despues=despues_comp, input_encontrado=comp_ok)

    # ===== 5. GUARDAR + RECARGAR + REABRIR =====
    saved = page.evaluate("""(async () => {
        const id = await guardarTasacion('completada');
        return { id, tasacionId, tasacionIdReal,
                 coefs: JSON.parse(JSON.stringify(coeficientesPersonalizados)),
                 valor_final: resultadoTasacion.valor_final };
    })()""")
    page.wait_for_timeout(400)
    tid = saved.get('id')
    print(f"[guardar] tasacion id={tid} valor_final={saved.get('valor_final')}")
    # Diagnóstico: GET inmediato (misma sesión) para aislar el 404/403
    diag = page.evaluate(f"""(async () => {{
        const tid = {json.dumps(tid)};
        const url = 'http://127.0.0.1:8080/api/tasaciones/' + tid;
        const h = getAuthHeaders();
        const resp = await fetch(url, {{ headers: h }});
        const t = resp.ok ? await resp.json() : null;
        return {{ status: resp.status, url_final: resp.url, tid_pasado: tid,
                 authEnviado: (h['Authorization']||'').slice(0,30),
                 body: resp.ok ? null : await resp.text(),
                 tieneDatos: !!(t && t.datos),
                 coefsEnDatos: t?.datos?.coeficientesPersonalizados ?? null,
                 valorFinalEnDatos: t?.datos?.resultado?.valor_final ?? null }};
    }})()""")
    print(f"[guardar] GET inmediato: {diag}")
    diag2 = page.evaluate("""(async () => {
        const resp = await fetch('http://127.0.0.1:8080/api/tasaciones', { headers: getAuthHeaders() });
        const lista = resp.ok ? await resp.json() : null;
        return { status: resp.status, ids: Array.isArray(lista) ? lista.map(x=>x.id) : lista };
    })()""")
    print(f"[guardar] LISTA tasaciones del usuario: {diag2}")

    page.goto(f"http://127.0.0.1:{PORT}/app/tasacion.html", wait_until="commit"); page.wait_for_timeout(2500)
    recarga = page.evaluate(f"""(async () => {{
        const tid = {json.dumps(tid)};
        const t = await obtenerTasacionAPI(tid);
        if (!t) return {{ error: 'obtenerTasacionAPI devolvió null', tid }};
        await cargarDatosCompletos(t.datos);
        await mostrarPantallaResultado();
        return {{
            valor_final: resultadoTasacion?.valor_final ?? null,
            valor_m2: resultadoTasacion?.valor_m2 ?? null,
            coefUbicacionCasa: coeficientesPersonalizados?.casa?.find(c=>c.id==='ubicacion')?.valor ?? null,
            coefUbicacionComp0: coeficientesPersonalizados?.['0']?.find(c=>c.id==='ubicacion')?.valor ?? null,
            mismoObj: window.coeficientesPersonalizados === coeficientesPersonalizados,
            cardText: document.querySelector('.resultado-valor')?.textContent?.trim() || null
        }};
    }})()""")
    page.wait_for_timeout(600)
    # Re-editar tras recarga
    inp = page.locator('input.coef-ubicacion-input[data-index="casa"]').first
    reedit_ok = inp.count() > 0
    if reedit_ok:
        inp.fill('1.20')
    page.wait_for_timeout(600)
    post_recarga = snap()
    results['recarga'] = dict(saved=saved, tras_recarga=recarga, post_reedit=post_recarga, input_encontrado=reedit_ok)

    # ===== 2. DEPARTAMENTO: coef actividad objetivo 1.00 -> 1.10 =====
    a, ad, d, e, vis = run_tipo('departamento', 'input.coef-actividad-input[data-index="departamento"]', '1.10')
    results['departamento'] = dict(antes=a, antes_dom=ad, despues=d, estable=e, input_encontrado=vis)

    # ===== 3. LOTE: coef ubicación 1.00 -> 1.10 =====
    a, ad, d, e, vis = run_tipo('lote', 'input.coef-ubicacion-input[data-index="lote"]', '1.10')
    results['lote'] = dict(antes=a, antes_dom=ad, despues=d, estable=e, input_encontrado=vis)

    browser.close()

srv.shutdown()

print("\n================= RESULTADOS =================")
print(json.dumps(results, indent=1, ensure_ascii=False, default=str))
print("\n================= DIALOGS =================")
print(dialogs[:10])
print("\n========= ERRORES JS (consola/pageerror) =========")
uniq = []
for e in js_errors:
    if e not in uniq: uniq.append(e)
for e in uniq[:30]: print(" -", e[:300])
print(f"(total errores capturados: {len(js_errors)})")

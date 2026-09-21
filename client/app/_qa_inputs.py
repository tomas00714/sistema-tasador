# QA ronda inputs + precision numerica — resultados incrementales
import asyncio, json, os, sys, urllib.request
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"
API = "http://127.0.0.1:8080"
OUT = r"C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_inputs"
os.makedirs(OUT, exist_ok=True)
LOGF = os.path.join(OUT, "progress.log")
RESF = os.path.join(OUT, "results.json")

TASACIONES = [
    ("departamento", "T7ePR8EkfQH", 3),
    ("casa", "T8tl6cXAuHU", 45),
    ("lote", "T79TAXJmZTn", 3),
]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

def api_get(path, tok):
    req = urllib.request.Request(API + path, headers={"Authorization": "Bearer " + tok})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def log(msg):
    print(msg, flush=True)
    with open(LOGF, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

async def run_case(pw, tipo, code, uid):
    tok = token(uid)
    t = api_get(f"/api/tasaciones/{code}", tok)
    tasacion_ed = {"id": t["id"], "tipo": t["tipo"], "estado": t["estado"],
                   **(t.get("datos") or {}), "datosCompletos": t.get("datos")}

    browser = await pw.chromium.launch(channel="msedge")
    page = await browser.new_page(viewport={"width": 1500, "height": 1000})
    errs, dialogs = [], []
    page.on("pageerror", lambda e: errs.append("PE:" + str(e)[:200]))
    async def on_dialog(d):
        dialogs.append(d.message[:160]); await d.accept()
    page.on("dialog", on_dialog)

    await page.goto(f"{APP}/tasacion.html")
    await page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(tok)})")
    await page.evaluate(f"localStorage.setItem('tasacionEnEdicion', {json.dumps(json.dumps(tasacion_ed))})")
    await page.goto(f"{APP}/tasacion.html")
    await page.wait_for_timeout(2500)
    log(f"[{tipo}] pagina cargada")
    R = {"tipo": tipo, "errores": errs, "dialogs": dialogs}

    sel = {"departamento": "#ambientesInput", "casa": "#ambientesInput", "lote": "#tipoLoteInput"}[tipo]
    try:
        await page.wait_for_selector(sel, timeout=15000)
    except Exception:
        R["fatal"] = "no se renderizo el formulario"
        await browser.close(); return R

    if tipo in ("departamento", "casa"):
        R["inputs"] = await page.evaluate(r"""async (tipo) => {
            const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
            const out = {};
            const selAutocomplete = async (inputId, listId, itemText) => {
                const input = document.getElementById(inputId);
                const list = document.getElementById(listId);
                if (!input || !list) return {error: 'no existe'};
                input.click();
                await new Promise(r => setTimeout(r, 80));
                const abierto = getComputedStyle(list).display !== 'none';
                const items = list.querySelectorAll('.autocomplete-item').length;
                const item = [...list.querySelectorAll('.autocomplete-item')].find(i => i.textContent.trim() === itemText);
                if (!item) return {abierto, items, error: 'item no encontrado'};
                item.click();
                await new Promise(r => setTimeout(r, 60));
                return {abierto, items, valor: input.value};
            };
            out.ambientes = await selAutocomplete('ambientesInput', 'ambientesList', '3');
            out.ambientes.estado = datos.ambientes;
            out.dormitorios = await selAutocomplete('dormitoriosInput', 'dormitoriosList', '2');
            out.dormitorios.estado = datos.dormitorios;
            out.banos = await selAutocomplete('banosInput', 'banosList', '2');
            out.banos.estado = datos.banos;
            // Monoambiente deshabilita dormitorios
            const amb = document.getElementById('ambientesInput');
            [...document.getElementById('ambientesList').querySelectorAll('.autocomplete-item')].find(i => i.textContent.trim() === 'Monoambiente')?.click();
            await new Promise(r => setTimeout(r, 60));
            amb.click();
            await new Promise(r => setTimeout(r, 60));
            [...document.getElementById('ambientesList').querySelectorAll('.autocomplete-item')].find(i => i.textContent.trim() === 'Monoambiente')?.click();
            await new Promise(r => setTimeout(r, 60));
            out.monoDormDisabled = document.getElementById('dormitoriosInput').disabled;
            out.monoEstado = datos.ambientes;
            // restaurar
            [...document.getElementById('ambientesList').querySelectorAll('.autocomplete-item')].find(i => i.textContent.trim() === '3')?.click();
            await new Promise(r => setTimeout(r, 60));

            // switches: deben escribir en la rama correcta
            const cocheraAntes = datos.cochera;
            const otraRamaAntes = tipo === 'casa' ? datosTasacion.departamento.cochera : datosTasacion.casa.cochera;
            document.getElementById('cocheraSwitch').click();
            await new Promise(r => setTimeout(r, 50));
            out.cochera = {estado: datos.cochera, otraRama: tipo === 'casa' ? datosTasacion.departamento.cochera : datosTasacion.casa.cochera, otraRamaAntes};
            document.getElementById('bauleraSwitch').click();
            await new Promise(r => setTimeout(r, 50));
            out.baulera = {estado: datos.baulera};

            // orientacion autocomplete escribe estado al seleccionar
            const oriInput = document.getElementById('orientacionInput');
            const oriList = document.getElementById('orientacionList');
            if (oriInput && oriList) {
                oriInput.click();
                await new Promise(r => setTimeout(r, 60));
                const item = oriList.querySelector('.autocomplete-item');
                out.orientacion = {abierto: getComputedStyle(oriList).display !== 'none', nItems: oriList.querySelectorAll('.autocomplete-item').length};
                if (item) { item.click(); await new Promise(r => setTimeout(r, 50)); out.orientacion.estado = datosTasacion.ubicacion.orientacion; }
            }

            // agregar ambiente: +1, no +2 (listener duplicado)
            const cont = document.getElementById('ambientesContainer');
            const antes = cont ? cont.querySelectorAll('.ambiente-item').length : -1;
            document.getElementById('btnAgregarAmbiente')?.click();
            await new Promise(r => setTimeout(r, 60));
            out.agregarAmbiente = {antes, despues: cont ? cont.querySelectorAll('.ambiente-item').length : -1};

            // guardar datos del paso -> estado
            if (tipo === 'departamento' && typeof guardarDatosPantallaDepartamento === 'function') guardarDatosPantallaDepartamento();
            if (tipo === 'casa' && typeof guardarDatosPantallaCasa === 'function') guardarDatosPantallaCasa();
            out.estadoPostGuardar = {ambientes: datos.ambientes, dormitorios: datos.dormitorios, banos: datos.banos, cochera: datos.cochera, baulera: datos.baulera};
            return out;
        }""", tipo)
        log(f"[{tipo}] inputs OK")

        # persistencia real: cambiar ambientes, guardar, re-leer API, restaurar
        R["persistencia"] = await page.evaluate(r"""async (tipo) => {
            const datos = tipo === 'casa' ? datosTasacion.casa : datosTasacion.departamento;
            const original = datos.ambientes;
            const nuevo = original === '3' ? '4' : '3';
            document.getElementById('ambientesInput').value = nuevo;
            datos.ambientes = nuevo;
            await guardarTasacion('borrador');
            return {original, nuevo, idReal: tasacionIdReal};
        }""", tipo)
        await page.wait_for_timeout(1500)
        try:
            t2 = api_get(f"/api/tasaciones/{code}", tok)
            guardado = (t2.get("datos") or {}).get(tipo, {}).get("ambientes")
            R["persistencia"]["persistido"] = guardado
            R["persistencia"]["ok"] = guardado == R["persistencia"]["nuevo"]
            # restaurar
            await page.evaluate(r"""async (original) => {
                const datos = datosTasacion[datosTasacion.tipo];
                document.getElementById('ambientesInput').value = original || '';
                datos.ambientes = original;
                await guardarTasacion('borrador');
            }""", R["persistencia"]["original"])
            await page.wait_for_timeout(1500)
            t3 = api_get(f"/api/tasaciones/{code}", tok)
            R["persistencia"]["restaurado"] = (t3.get("datos") or {}).get(tipo, {}).get("ambientes")
        except Exception as e:
            R["persistencia"]["error"] = str(e)[:200]
        log(f"[{tipo}] persistencia OK")

    if tipo == "lote":
        R["inputs"] = await page.evaluate(r"""async () => {
            const out = {};
            const input = document.getElementById('tipoLoteInput');
            const list = document.getElementById('tipoLoteList');
            input.click();
            await new Promise(r => setTimeout(r, 60));
            out.tipoLote = {abierto: getComputedStyle(list).display !== 'none', items: list.querySelectorAll('.autocomplete-item').length};
            const item = [...list.querySelectorAll('.autocomplete-item')].find(i => i.textContent.trim() === 'Esquina');
            if (item) { item.click(); await new Promise(r => setTimeout(r, 80)); }
            out.tipoLote.estado = datosTasacion.lote.tipoLote;
            // navegar a caracteristicas: zona + frente/fondo
            if (typeof mostrarCaracteristicasLote === 'function') {
                mostrarCaracteristicasLote();
                await new Promise(r => setTimeout(r, 300));
                const zona = document.getElementById('zonaInput');
                out.zonaPresente = !!zona;
                if (zona) { zona.value = '2'; zona.dispatchEvent(new Event('change', {bubbles:true})); await new Promise(r=>setTimeout(r,50)); out.zonaEstado = datosTasacion.lote.caracteristicas.zona; }
                const frente = document.getElementById('frenteInput');
                const fondo = document.getElementById('fondoInput');
                if (frente && fondo) {
                    frente.value = '10'; frente.dispatchEvent(new Event('input', {bubbles:true}));
                    fondo.value = '33.333'; fondo.dispatchEvent(new Event('input', {bubbles:true}));
                    await new Promise(r => setTimeout(r, 60));
                    out.superficieCalc = document.getElementById('superficieInput')?.value;
                }
            }
            return out;
        }""")
        log("[lote] inputs OK")

    # precision numerica: homogeneizacion con coef periodico
    R["numerico"] = await page.evaluate(r"""async () => {
        const cfg = {departamento:'departamento', casa:'casa'}[datosTasacion.tipo];
        if (!cfg) return {skip: 'lote sin homogeneizacion'};
        const homData = {};
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;left:-9999px;top:0';
        document.body.appendChild(probe);
        probe.innerHTML = generarTablaHomogeneizacion(cfg, homData, 'T_');
        inicializarHomogeneizacionSuperficie(cfg, homData, 'T_');
        const sup = document.getElementById('T_superficieCubierto');
        const coef = document.getElementById('T_coefCubierto');
        const hom = document.getElementById('T_homogeneizadaCubierto');
        sup.value = '35'; sup.dispatchEvent(new Event('input', {bubbles:true}));
        coef.value = '0.333333'; coef.dispatchEvent(new Event('input', {bubbles:true}));
        await new Promise(r => setTimeout(r, 60));
        const res = {
            displayHomogeneizada: hom.value,
            internoHomogeneizada: homData.cubierto.homogeneizada,
            displayTotal: document.getElementById('T_totalHomogeneizada').value,
            internoTotal: homData.totalHomogeneizada,
            internoCoef: homData.cubierto.coef,
            coefInputCrudo: coef.value
        };
        // re-render: los inputs disabled no deben mostrar decimales largos
        probe.innerHTML = generarTablaHomogeneizacion(cfg, homData, 'T_');
        res.reRenderHomogeneizada = document.getElementById('T_homogeneizadaCubierto').value;
        res.reRenderTotal = document.getElementById('T_totalHomogeneizada').value;
        // lectura
        probe.innerHTML = generarTablaHomogeneizacion(cfg, homData, 'T_', true);
        res.lectura = probe.textContent;
        probe.remove();
        return res;
    }""")
    log(f"[{tipo}] numerico OK")

    R["errores"] = errs
    R["dialogs"] = dialogs
    await browser.close()
    return R

async def reporte_decimales(pw):
    # escanear el informe por numeros con >2 decimales
    out = {}
    browser = await pw.chromium.launch(channel="msedge")
    for tipo, code, uid in TASACIONES:
        tok = token(uid)
        page = await browser.new_page()
        await page.goto(f"{APP}/vista-previa-informe.html")
        await page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(tok)})")
        await page.goto(f"{APP}/vista-previa-informe.html?id={code}")
        try:
            await page.wait_for_selector('.report-page', timeout=60000)
            await page.wait_for_timeout(1500)
            out[tipo] = await page.evaluate(r"""() => {
                const txt = document.getElementById('report-root')?.innerText || document.body.innerText;
                const matches = txt.match(/\d[.,]\d{3,}/g) || [];
                // excluir miles es-AR tipo 1.234 o 1.234.567
                const sospechosos = matches.filter(m => {
                    if (/\.\d{3}(\.|$)/.test('.'+m.split(/[.,]/)[1])) return false;
                    return true;
                });
                return {sospechosos: sospechosos.slice(0, 20), total: matches.length};
            }""")
        except Exception as e:
            out[tipo] = {"error": str(e)[:150]}
        await page.close()
    await browser.close()
    return out

async def main():
    results = []
    async with async_playwright() as pw:
        for tipo, code, uid in TASACIONES:
            try:
                results.append(await run_case(pw, tipo, code, uid))
            except Exception as e:
                results.append({"tipo": tipo, "fatal": str(e)[:300]})
                log(f"[{tipo}] FATAL {e}")
            with open(RESF, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
        dec = await reporte_decimales(pw)
        with open(RESF, "w", encoding="utf-8") as f:
            json.dump({"casos": results, "reporte_decimales": dec}, f, indent=2, ensure_ascii=False)
    log("FIN")

asyncio.run(main())

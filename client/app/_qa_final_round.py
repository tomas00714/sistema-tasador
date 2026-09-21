# QA pasada integral — informe PDF/preview
import asyncio, json, os, sys, urllib.request
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"
API = "http://127.0.0.1:8080"
OUT = r"C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_final"
os.makedirs(OUT, exist_ok=True)
LOGF = os.path.join(OUT, "progress.log")
RESF = os.path.join(OUT, "results.json")

TASACIONES = [
    ("casa", "T8tl6cXAuHU", 45),
    ("departamento", "T7ePR8EkfQH", 3),
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

async def open_report(pw, code, uid):
    browser = await pw.chromium.launch(channel="msedge")
    page = await browser.new_page(viewport={"width": 1500, "height": 1000})
    errs = []
    page.on("pageerror", lambda e: errs.append("PE:" + str(e)[:200]))
    page.on("dialog", lambda d: d.accept())
    await page.goto(f"{APP}/vista-previa-informe.html")
    await page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
    await page.goto(f"{APP}/vista-previa-informe.html?id={code}")
    await page.wait_for_selector('.report-page', timeout=60000)
    await page.wait_for_timeout(1500)
    return browser, page, errs

async def main():
    results = {}
    async with async_playwright() as pw:
        for tipo, code, uid in TASACIONES:
            tok = token(uid)
            R = {"tipo": tipo}
            browser, page, errs = await open_report(pw, code, uid)
            try:
                # ============ 1. INDICE DE REFERENCIA ============
                R["indice"] = await page.evaluate(r"""() => {
                    const sec = [...document.querySelectorAll('.report-section')].find(s =>
                        s.querySelector('h2')?.textContent.includes('Índice de Referencia'));
                    if (!sec) return {error: 'sin seccion'};
                    const items = [...sec.querySelectorAll('.report-reference-item')];
                    const cols = [...sec.querySelectorAll('.report-reference-column')];
                    return {
                        filas: items.map(i => ({
                            label: i.querySelector('.report-reference-label')?.textContent.trim(),
                            valor: i.querySelector('.report-reference-value')?.textContent.trim(),
                            editable: !!i.querySelector('[data-editable]')
                        })),
                        colsAlturaOk: cols.map(c => {
                            const r = c.getBoundingClientRect();
                            const last = c.lastElementChild?.getBoundingClientRect();
                            return last ? Math.round(r.bottom - last.bottom) : null;
                        })
                    };
                }""")
                log(f"[{tipo}] indice OK")

                # ============ 2. CARACTERISTICAS TECNICAS ============
                R["tecnico"] = await page.evaluate(r"""() => {
                    const grids = [...document.querySelectorAll('.report-technical-grid')];
                    const out = {grids: grids.length, vacios: 0, overflow: [], solapes: 0, estructura: []};
                    grids.forEach(g => {
                        [...g.querySelectorAll('.report-technical-item')].forEach(it => {
                            const label = it.querySelector('.report-technical-label');
                            const val = it.querySelector('.report-technical-value');
                            if (!val || !val.textContent.trim() || ['—','-'].includes(val.textContent.trim())) out.vacios++;
                            if (it.scrollWidth > it.clientWidth + 1) out.overflow.push(it.querySelector('.report-technical-label')?.textContent?.trim());
                            if (label && val) {
                                const lr = label.getBoundingClientRect(), vr = val.getBoundingClientRect();
                                if (vr.left < lr.right - 2 && vr.top < lr.bottom - 2 && vr.bottom > lr.top + 2) out.solapes++;
                            }
                        });
                        const items = g.querySelectorAll('.report-technical-item');
                        if (items.length) {
                            const i0 = items[0];
                            out.estructura.push(getComputedStyle(i0).display);
                        }
                    });
                    return out;
                }""")
                log(f"[{tipo}] tecnico OK")

                # ============ 3. SUPERFICIES ============
                R["superficies"] = await page.evaluate(r"""() => {
                    const sec = [...document.querySelectorAll('.report-section')].find(s =>
                        s.querySelector('h2')?.textContent.includes('Homogeneización de Superficies'));
                    if (!sec) return {ausente: true};
                    const filas = [...sec.querySelectorAll('.report-surfaces-table tbody tr')].map(tr =>
                        [...tr.querySelectorAll('td')].map(td => td.textContent.trim()));
                    const cols = sec.querySelectorAll('.report-chart-col').length;
                    return {filas, chartCols: cols};
                }""")
                log(f"[{tipo}] superficies OK")

                # ============ 4-6. TABLAS A/B ============
                R["tablas"] = await page.evaluate(r"""() => {
                    const tabs = [...document.querySelectorAll('.report-table-tech')];
                    const res = {n: tabs.length};
                    if (tabs.length >= 2) {
                        const [a, b] = tabs;
                        const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
                        const samePage = ra.top > 0 && rb.top > 0 && Math.abs(ra.top - rb.top) < 3000;
                        res.gapAB = samePage ? Math.round(rb.top - ra.bottom) : null;
                        res.paginaA = ra.top, res.paginaB = rb.top;
                        res.headersA = [...a.querySelectorAll('thead th')].map(th => th.textContent.trim());
                        res.headersB = [...b.querySelectorAll('thead th')].map(th => th.textContent.trim());
                        const th = a.querySelector('thead th');
                        res.thBg = getComputedStyle(th).backgroundColor;
                        res.thColor = getComputedStyle(th).color;
                        const td1 = a.querySelector('tbody td');
                        res.td1Bg = td1 ? getComputedStyle(td1).backgroundColor : null;
                        res.borderColor = getComputedStyle(a).borderColor || getComputedStyle(th).borderColor;
                    }
                    // resumen
                    const resumen = [...document.querySelectorAll('.report-summary')].find(Boolean) ||
                        [...document.querySelectorAll('*')].find(e => e.textContent?.trim().startsWith('Comparables utilizados'));
                    res.resumenOk = !!resumen;
                    return res;
                }""")
                # paridad contra ResultadosRenderer
                R["paridad"] = await page.evaluate(r"""async () => {
                    const cont = document.createElement('div');
                    cont.style.cssText = 'position:absolute;left:-9999px';
                    document.body.appendChild(cont);
                    const renderer = new ResultadosRenderer(cont, {...tasacionCargada.resultado}, tasacionCargada.tipo, tasacionCargada.datosCompletos || tasacionCargada, 'lectura');
                    const cols = renderer.obtenerColumnas(tasacionCargada.tipo, 'comparables');
                    const partes = renderer.insertarColumnasPersonalizadas(cols, 'comparables');
                    const pers = renderer.obtenerColumnasPersonalizadas('comparables');
                    const pdfHeaders = [...document.querySelectorAll('.report-table-tech')].flatMap(t =>
                        [...t.querySelectorAll('thead th')].map(th => th.textContent.trim()));
                    const refHeaders = [
                        ...partes.columnasAntes.map(c => c.label),
                        ...pers.map(c => c.nombre),
                        ...partes.columnasDespues.map(c => c.label)
                    ];
                    const faltan = refHeaders.filter(h => h !== 'Dirección' ? !pdfHeaders.includes(h) : false);
                    cont.remove();
                    return {refHeaders, pdfHeaders, faltan};
                }""")
                log(f"[{tipo}] tablas OK")

                # ============ 7-8. TARJETAS + FOTOS ============
                R["cards"] = await page.evaluate(r"""() => {
                    const cards = [...document.querySelectorAll('.report-comparable-card')];
                    const xs = new Set(cards.map(c => Math.round(c.getBoundingClientRect().x)));
                    const ws = [...cards].map(c => Math.round(c.getBoundingClientRect().width));
                    return {
                        n: cards.length,
                        apiladas: xs.size <= 1,
                        anchos: ws,
                        seccionFotosComparables: !!document.querySelector('.report-comparables-photos-section'),
                        tituloFotosComp: [...document.querySelectorAll('h2,h3')].some(h => h.textContent.trim() === 'Fotografías de Comparables'),
                        seccionInmueble: !!document.querySelector('.report-photos-section')
                    };
                }""")
                log(f"[{tipo}] cards OK")

                # ============ 10. DECIMALES ============
                R["decimales"] = await page.evaluate(r"""() => {
                    const txt = document.getElementById('reportViewer')?.innerText || '';
                    const matches = txt.match(/\d[.,]\d{3,}/g) || [];
                    const malos = matches.filter(m => {
                        const frac = m.split(/[.,]/).slice(1).join('');
                        return !/^(\d{3})+$/.test(frac) || m.includes(',');
                    });
                    return {total: matches.length, malos: malos.slice(0, 15)};
                }""")
                log(f"[{tipo}] decimales OK")

                # ============ OVERFLOW + PDF ============
                R["overflow"] = await page.evaluate(r"""() => {
                    const paginas = [...document.querySelectorAll('.report-page')];
                    const out = [];
                    paginas.forEach((p, i) => {
                        [...p.querySelectorAll('*')].forEach(el => {
                            const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
                            if (r.width > 5 && (r.right > pr.right + 1 || r.bottom > pr.bottom + 1))
                                out.push(`p${i}:${el.className?.toString().slice(0,40)}`);
                        });
                    });
                    return out.slice(0, 15);
                }""")
                R["paginas"] = await page.evaluate("document.querySelectorAll('.report-page').length")
                pdf = await page.pdf(format='A4', print_background=True)
                R["pdfBytes"] = len(pdf)
                with open(os.path.join(OUT, f"final_{tipo}.pdf"), "wb") as f:
                    f.write(pdf)
                log(f"[{tipo}] pdf {len(pdf)}b")

                # ============ 1b. PERSISTENCIA CLIENTE/NOMENCLATURA ============
                if tipo == "departamento":
                    R["persistencia"] = await page.evaluate(r"""async () => {
                        const out = {};
                        const editar = async (key, valor) => {
                            const el = document.querySelector(`#reportViewer [data-editable="${key}"]`);
                            if (!el) return 'sin elemento editable';
                            el.click();
                            await new Promise(r => setTimeout(r, 80));
                            el.innerText = valor;
                            el.dispatchEvent(new InputEvent('input', {bubbles: true}));
                            el.blur();
                            await new Promise(r => setTimeout(r, 400));
                            return 'ok';
                        };
                        out.editCliente = await editar('clienteNombre', 'QA Cliente Persistente');
                        out.editNomen = await editar('nomenclaturaCatastral', 'CIR-QA-999');
                        out.configTrasEdit = {c: reportConfig.clienteNombre, n: reportConfig.nomenclaturaCatastral};
                        // forzar rerender
                        await renderReportPreview();
                        await new Promise(r => setTimeout(r, 300));
                        const sec = [...document.querySelectorAll('.report-section')].find(s =>
                            s.querySelector('h2')?.textContent.includes('Índice de Referencia'));
                        out.trasRerender = sec ? sec.innerText.includes('QA Cliente Persistente') && sec.innerText.includes('CIR-QA-999') : 'sin seccion';
                        return out;
                    }""")
                    log(f"[{tipo}] persistencia edit OK")

                R["errores"] = errs
            finally:
                await browser.close()
            results[tipo] = R
            with open(RESF, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

        # recargar departamento: verificar persistencia post-recarga
        browser, page, errs = await open_report(pw, "T7ePR8EkfQH", 3)
        try:
            results["departamento"]["persistenciaRecarga"] = await page.evaluate(r"""() => {
                const sec = [...document.querySelectorAll('.report-section')].find(s =>
                    s.querySelector('h2')?.textContent.includes('Índice de Referencia'));
                return {
                    config: {c: reportConfig.clienteNombre, n: reportConfig.nomenclaturaCatastral},
                    enDom: sec ? sec.innerText.includes('QA Cliente Persistente') : null,
                    errores: []
                };
            }""")
            # restaurar valores vacios originales
            await page.evaluate(r"""async () => {
                reportConfig.clienteNombre = '';
                reportConfig.nomenclaturaCatastral = '';
                await persistirConfigInforme();
            }""")
            await page.wait_for_timeout(800)
            t = api_get("/api/tasaciones/T7ePR8EkfQH", token(3))
            results["departamento"]["restaurado"] = {
                "cliente_col": t.get("cliente_nombre"),
                "config_blob": bool((t.get("datos") or {}).get("reportConfig"))
            }
        finally:
            await browser.close()
        with open(RESF, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
    log("FIN")

asyncio.run(main())

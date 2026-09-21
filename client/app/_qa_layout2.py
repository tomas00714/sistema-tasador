import asyncio, sys, json
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
BASE = "http://localhost:5501/app/vista-previa-informe.html"
TASACIONES = [("casa", "T8tl6cXAuHU", 45), ("departamento", "T7ePR8EkfQH", 3), ("lote", "T79TAXJmZTn", 3)]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

CHECKS = r"""async () => {
    const out = {};
    // --- 1. Indice: altura contenido + solicitante ---
    const grid = document.querySelector('.report-reference-grid');
    const cols = [...document.querySelectorAll('.report-reference-column')];
    out.indice = {
        alignItems: grid ? getComputedStyle(grid).alignItems : null,
        cols: cols.map(c => {
            const items = [...c.querySelectorAll('.report-reference-item')];
            const last = items[items.length - 1];
            return {
                boxH: Math.round(c.getBoundingClientRect().height),
                contentBottom: last ? Math.round(last.getBoundingClientRect().bottom - c.getBoundingClientRect().top) : 0
            };
        }),
        solicitanteLabels: cols[1] ? [...cols[1].querySelectorAll('.report-reference-label')].map(l => l.textContent.trim()) : [],
        solicitanteEditables: cols[1] ? [...cols[1].querySelectorAll('[data-editable]')].map(e => e.dataset.editable) : []
    };
    // --- 2/3/4. Caracteristicas: solapamiento, vacios, layout adaptable ---
    const items = [...document.querySelectorAll('.report-technical-item')];
    out.caracts = {
        total: items.length,
        conGuionVacio: items.filter(i => {
            const v = i.querySelector('.report-technical-value');
            return v && (v.textContent.trim() === '—' || v.textContent.trim() === '-' || v.textContent.trim() === '');
        }).length,
        solapamientos: items.filter(i => {
            const l = i.querySelector('.report-technical-label');
            const v = i.querySelector('.report-technical-value');
            if (!l || !v) return false;
            const lr = l.getBoundingClientRect(), vr = v.getBoundingClientRect();
            return vr.left < lr.right - 1 && vr.right > lr.left + 1 &&
                   Math.min(vr.bottom, lr.bottom) - Math.max(vr.top, lr.top) > 1;
        }).length,
        valueOverflow: items.filter(i => {
            const v = i.querySelector('.report-technical-value');
            return v && v.scrollWidth > v.clientWidth + 1;
        }).length,
        gridDisplay: (() => { const g = document.querySelector('.report-technical-grid'); return g ? getComputedStyle(g).display : null; })()
    };
    // --- 5/6. Homogeneizacion ---
    const tabla = document.querySelector('.report-surfaces-table');
    out.superficies = tabla ? {
        filas: [...tabla.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim()))
    } : null;
    const chart = document.querySelector('.report-chart-columns');
    out.chart = chart ? {
        display: getComputedStyle(chart).display,
        alignItems: getComputedStyle(chart).alignItems,
        columnas: [...chart.querySelectorAll('.report-chart-col')].map(c => ({
            label: c.querySelector('.report-chart-col-label')?.textContent.trim(),
            h: c.querySelector('.report-chart-col-bar')?.style.height
        }))
    } : null;
    out.overflow = getReportPaginator().verifyPageOverflow().catch(() => 'n/a');
    out.paginas = document.querySelectorAll('.report-page').length;
    return out;
}"""

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="msedge")
        for nombre, pid, uid in TASACIONES:
            page = await browser.new_page()
            errores = []
            page.on("pageerror", lambda e: errores.append(str(e)[:200]))
            await page.goto(BASE)
            await page.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
            await page.goto(f"{BASE}?id={pid}")
            await page.wait_for_selector('.report-page', timeout=30000)
            await page.wait_for_timeout(1800)
            r = await page.evaluate(CHECKS)
            # --- caso sintetico: texto largo + campo vacio + superficies extra ---
            extra = await page.evaluate(r"""async () => {
                const LARGO = 'Zona residencial consolidada con excelente accesibilidad, proxima a avenidas principales y servicios urbanos completos de primer nivel';
                const res = {antes: null, despues: null, sups: null};
                const items = () => [...document.querySelectorAll('.report-technical-item')];
                // inyectar texto largo en un campo extrinseco segun tipo
                if (tasacionCargada.tipo === 'lote') {
                    tasacionCargada.lote.caracteristicas.zonificacion = LARGO;
                } else {
                    tasacionCargada.ubicacion = tasacionCargada.ubicacion || {};
                    tasacionCargada.ubicacion.orientacion = LARGO;
                    // forzar campo vacio
                    tasacionCargada[tasacionCargada.tipo] = tasacionCargada[tasacionCargada.tipo] || {};
                    tasacionCargada[tasacionCargada.tipo].fot = null;
                    tasacionCargada[tasacionCargada.tipo].fos = null;
                }
                // inyectar tipos de superficie extra + coeficiente modificado
                const cont = tasacionCargada[tasacionCargada.tipo];
                if (cont && cont.homogeneizacion) {
                    cont.homogeneizacion.baulera = {superficie: 5, coef: 0.7, homogeneizada: 3.5};
                    cont.homogeneizacion.balconDescubierto = {superficie: 10, coef: 0.4, homogeneizada: 4};
                    if (cont.homogeneizacion.cubierto) {
                        cont.homogeneizacion.cubierto.coef = 0.95;
                        cont.homogeneizacion.cubierto.homogeneizada = cont.homogeneizacion.cubierto.superficie * 0.95;
                    }
                }
                await renderReportPreview();
                await new Promise(r => setTimeout(r, 500));
                const its = items();
                const largo = its.find(i => i.querySelector('.report-technical-value')?.textContent.includes('consolidada'));
                const pageW = document.querySelector('.report-page')?.getBoundingClientRect().width || 0;
                res.despues = {
                    itemLargo: largo ? {
                        w: Math.round(largo.getBoundingClientRect().width),
                        pageW: Math.round(pageW),
                        ocupaFilaCompleta: largo.getBoundingClientRect().width > pageW * 0.7
                    } : null,
                    fotFosPresentes: its.some(i => i.querySelector('.report-technical-label')?.textContent.startsWith('FOT') || i.querySelector('.report-technical-label')?.textContent.startsWith('FOS')),
                    solap: its.filter(i => {
                        const l = i.querySelector('.report-technical-label');
                        const v = i.querySelector('.report-technical-value');
                        if (!l || !v) return false;
                        const lr = l.getBoundingClientRect(), vr = v.getBoundingClientRect();
                        return vr.left < lr.right - 1 && vr.right > lr.left + 1 &&
                               Math.min(vr.bottom, lr.bottom) - Math.max(vr.top, lr.top) > 1;
                    }).length,
                    vOver: its.filter(i => {
                        const v = i.querySelector('.report-technical-value');
                        return v && v.scrollWidth > v.clientWidth + 1;
                    }).length
                };
                const tabla = document.querySelector('.report-surfaces-table');
                res.sups = tabla ? [...tabla.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())) : null;
                const chart = document.querySelector('.report-chart-columns');
                res.chartCols = chart ? chart.querySelectorAll('.report-chart-col').length : 0;
                res.overflow = getReportPaginator().verifyPageOverflow().catch(() => 'n/a');
                return res;
            }""")
            pdf = await page.pdf(format="A4", print_background=True)
            print(f"==================== {nombre} ====================")
            print(json.dumps(r, ensure_ascii=False, indent=1))
            print("EXTRA:", json.dumps(extra, ensure_ascii=False, indent=1))
            print("pdf_bytes:", len(pdf), "| errores:", errores)
            await page.close()
        await browser.close()

asyncio.run(main())

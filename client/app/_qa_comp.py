# QA ronda comparables: tarjetas apiladas, fotos 1-4 en tarjeta, límite 5ta,
# tablas PDF vs ResultadosRenderer, sin sección "Fotografías de Comparables".
import asyncio, json, os, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
BASE = "http://localhost:5501/app/vista-previa-informe.html"
OUT = r"C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_comp"
os.makedirs(OUT, exist_ok=True)

TASACIONES = [
    ("casa", "T8tl6cXAuHU", 45),
    ("departamento", "T7ePR8EkfQH", 3),
    ("lote", "T79TAXJmZTn", 3),
]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="

async def run_case(pw, tipo, code, uid):
    browser = await pw.chromium.launch(channel="msedge")
    page = await browser.new_page(viewport={"width": 1500, "height": 1000})
    errs, dialogs = [], []
    page.on("pageerror", lambda e: errs.append("PE:" + str(e)[:200]))
    async def on_dialog(d):
        dialogs.append(d.message[:160])
        await d.accept()
    page.on("dialog", on_dialog)
    await page.goto(BASE)
    await page.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
    await page.goto(f"{BASE}?id={code}")
    await page.wait_for_selector('.report-page', timeout=30000)
    await page.wait_for_timeout(2200)
    R = {"tipo": tipo}

    # ============ 1. TARJETAS APILADAS + SECCIÓN DE FOTOS ELIMINADA ============
    R["cards"] = await page.evaluate(r"""() => {
        const cards = [...document.querySelectorAll('.report-comparable-card')];
        const grid = document.querySelector('.report-comparables-visual-grid');
        const gw = grid ? grid.getBoundingClientRect().width : 0;
        return {
            n: cards.length,
            gridCols: grid ? getComputedStyle(grid).gridTemplateColumns : null,
            boxes: cards.map(c => {
                const r = c.getBoundingClientRect();
                return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width)};
            }),
            gridW: Math.round(gw),
            seccionFotosComparables: !!document.querySelector('.report-comparables-photos-section'),
            tituloFotosComparables: [...document.querySelectorAll('h2')].some(h => h.textContent.includes('Comparables') && h.textContent.includes('Fotograf')),
            seccionFotosInmueble: !!document.querySelector('.report-photos-section')
        };
    }""")

    # ============ 2. LAYOUTS DE FOTOS 0..4 ============
    R["layouts"] = {}
    for n in (0, 1, 2, 3, 4):
        R["layouts"][n] = await page.evaluate(r"""async (n) => {
            const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
            const c1 = comparablesResueltos[0];
            if (!c1) return {error: 'sin comparable'};
            c1.fotos = Array.from({length: n}, (_, i) => mk('T' + n + '_' + i));
            reportConfig.showPhotos = true;
            await renderReportPreview();
            await new Promise(r => setTimeout(r, 400));
            const card = [...document.querySelectorAll('.report-comparable-card')][0];
            if (!card) return {error: 'sin card'};
            const area = card.querySelector('.report-comparable-card-photos');
            const cr = card.getBoundingClientRect();
            if (!area) return {n, fotos: 0, cardH: Math.round(cr.height)};
            const ar = area.getBoundingClientRect();
            const imgs = [...area.querySelectorAll('img')];
            const fit = imgs.length ? getComputedStyle(imgs[0]).objectFit : null;
            const rects = imgs.map(i => { const r = i.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; });
            return {
                n, fotos: imgs.length, fit,
                areaW: Math.round(ar.width), areaH: Math.round(ar.height),
                cardH: Math.round(cr.height),
                ratio: +(ar.width / ar.height).toFixed(2),
                igualAltura: Math.abs(ar.height - cr.height) < 3,
                clase: area.className,
                rects
            };
        }""", n)

    # ============ 3. LÍMITE: 5ta foto ============
    R["limite"] = await page.evaluate(r"""async () => {
        const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
        const c1 = comparablesResueltos[0];
        c1.fotos = [mk('A'), mk('B'), mk('C'), mk('D')];   // 4 existentes
        const file = new File([new Uint8Array([1, 2, 3])], 'x.png', {type: 'image/png'});
        const antes = c1.fotos.length;
        await agregarFotosComparable(c1.id, [file]);      // debe rechazar antes de procesar
        const r1 = {rechazoTotal: c1.fotos.length === antes, despues: c1.fotos.length};
        // caso parcial: 3 existentes + 2 nuevos -> rechazo de todo
        c1.fotos = [mk('A'), mk('B'), mk('C')];
        await agregarFotosComparable(c1.id, [file, file]);
        const r2 = {rechazoParcial: c1.fotos.length === 3, despues: c1.fotos.length};
        // caso válido: 3 + 1 -> acepta (queda en 4); procesarArchivoFoto falla
        // con PNG falso pero el guard debe permitir llegar al procesamiento:
        // lo probamos solo con conteo — 4+0 archivos válidos:
        c1.fotos = [mk('A'), mk('B'), mk('C')];
        await agregarFotosComparable(c1.id, []);
        const r3 = {sinCambio: c1.fotos.length === 3};
        c1.fotos = [];
        await renderReportPreview();
        return {r1, r2, r3};
    }""")

    # ============ 4. TABLAS PDF vs RESULTADOSRENDERER (paridad) ============
    R["tablas"] = await page.evaluate(r"""async () => {
        await renderReportPreview();
        await new Promise(r => setTimeout(r, 500));
        const norm = s => (s || '').replace(/\s+/g, ' ').trim();
        // referencia: la tabla tal cual la genera tasacion.html (modo lectura)
        const datosTasacion = tasacionCargada.datosCompletos || tasacionCargada;
        const resultado = datosTasacion.resultado || tasacionCargada.resultado || {};
        const tipoRef = datosTasacion.tipo || tasacionCargada.tipo || 'lote';
        const ref = new ResultadosRenderer(document.createElement('div'), {...resultado}, tipoRef, datosTasacion, 'lectura');
        const tmp = document.createElement('div');
        tmp.innerHTML = ref.renderizarTablaComparables();
        const refRows = [...tmp.querySelectorAll('tbody tr')].map(tr =>
            [...tr.querySelectorAll('td')].slice(0, -1).map(td => norm(td.textContent)));

        // tablas del informe en orden de documento; agrupar por firma de headers
        const tabs = [...document.querySelectorAll('.report-table-tech')];
        const grupos = {};
        tabs.forEach(t => {
            const sig = [...t.querySelectorAll('thead th')].map(th => norm(th.textContent)).join('|');
            (grupos[sig] = grupos[sig] || []).push(t);
        });
        const firmas = Object.keys(grupos);
        const filasPorFirma = {};
        firmas.forEach(sig => {
            filasPorFirma[sig] = grupos[sig].flatMap(t =>
                [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => norm(td.textContent))));
        });
        // identificar A (más datos: sin coeficientes) y B (tiene coeficientes/tfoot)
        const esB = sig => /Ubicaci|Actividad|Actualizaci|F&C|Ross|homogeneizado|Planta|Piso|constructiva|Cubierta|Total/i.test(sig);
        const sigB = firmas.find(esB);
        const sigA = firmas.find(s => s !== sigB);
        const filasA = filasPorFirma[sigA] || [];
        const filasB = filasPorFirma[sigB] || [];
        // comparar fila a fila: A + B[1:] == ref (sin celda de acciones)
        const diffs = [];
        refRows.forEach((refRow, i) => {
            const pdfRow = [...(filasA[i] || []), ...(filasB[i] || []).slice(1)];
            if (pdfRow.length !== refRow.length) {
                diffs.push(`fila ${i}: ${pdfRow.length} celdas vs ref ${refRow.length}`);
                return;
            }
            refRow.forEach((v, j) => {
                if (pdfRow[j] !== v) diffs.push(`fila ${i} col ${j}: pdf="${pdfRow[j]}" ref="${v}"`);
            });
        });
        // estilos del header/primera columna
        const t = tabs[0];
        const th = t?.querySelector('thead th');
        const td1 = t?.querySelector('tbody td');
        const cs = el => el ? getComputedStyle(el) : {};
        // separación A->B vs B->resumen (si están en la misma página)
        const resumen = document.querySelector('.report-comparables-summary');
        let gapAB = null, gapBRes = null;
        const tabA = document.querySelector('.report-comparables-tabla-a table');
        const secA = document.querySelector('.report-comparables-tabla-a');
        const secB = resumen?.closest('.report-section');
        if (secA && secB) {
            const ra = secA.getBoundingClientRect(), rb = secB.getBoundingClientRect();
            const tb = secB.querySelector('.report-table-tech');
            gapAB = Math.round(rb.top - ra.bottom);
            if (tb) gapBRes = Math.round(resumen.getBoundingClientRect().top - tb.getBoundingClientRect().bottom);
        }
        const tfoot = document.querySelector('.report-table-tech tfoot');
        return {
            nTablas: tabs.length, firmas,
            headersA: sigA, headersB: sigB,
            nFilasA: filasA.length, nFilasB: filasB.length, nFilasRef: refRows.length,
            diffs: diffs.slice(0, 10),
            thBg: cs(th).backgroundColor, thColor: cs(th).color,
            td1Bg: cs(td1).backgroundColor,
            borderColor: cs(t).borderColor,
            tfootBg: tfoot ? cs(tfoot.querySelector('td')).backgroundColor : null,
            tfootTxt: tfoot ? norm(tfoot.textContent) : null,
            gapAB, gapBRes,
            resumen: resumen ? norm(resumen.textContent).slice(0, 90) : null
        };
    }""")

    # ============ 5. OVERFLOW + PDF + REGRESIÓN RÁPIDA ============
    R["overflow"] = await page.evaluate(r"""() => {
        const bad = [];
        document.querySelectorAll('.report-page').forEach((pg, i) => {
            const r = pg.getBoundingClientRect();
            pg.querySelectorAll('*').forEach(el => {
                const e = el.getBoundingClientRect();
                if (e.width && e.height && (e.right > r.right + 2 || e.left < r.left - 2))
                    bad.push('p' + (i+1) + ':' + (el.className || el.tagName));
            });
        });
        return bad.slice(0, 8);
    }""")
    R["regresion"] = await page.evaluate(r"""() => {
        const cols = [...document.querySelectorAll('.report-surface-chart-col, [class*="chart"]')];
        const tech = document.querySelector('.report-technical-grid');
        const ref = document.querySelector('.report-reference-column');
        return {
            chartCols: cols.length,
            techDisplay: tech ? getComputedStyle(tech).display : null,
            refOk: !!ref,
            fodaSection: !!document.querySelector('.report-foda-section')
        };
    }""")
    await page.emulate_media(media="print")
    pdf = await page.pdf(format="A4", print_background=True)
    with open(os.path.join(OUT, f"comp_{tipo}.pdf"), "wb") as f:
        f.write(pdf)
    R["pdf_bytes"] = len(pdf)
    await page.emulate_media(media="screen")
    R["paginas"] = await page.evaluate("document.querySelectorAll('.report-page').length")
    R["dialogs"] = dialogs[:6]
    R["errores"] = errs[:6]
    await browser.close()
    return R

async def main():
    async with async_playwright() as pw:
        results = []
        for tipo, code, uid in TASACIONES:
            try:
                results.append(await run_case(pw, tipo, code, uid))
            except Exception as e:
                results.append({"tipo": tipo, "error": str(e)[:600]})
        with open(os.path.join(OUT, "comp.json"), "w", encoding="utf-8") as f:
            f.write(json.dumps(results, ensure_ascii=False, indent=1))
        print("OK")

asyncio.run(main())

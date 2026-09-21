# QA ronda comparables v2 — resultados incrementales a JSON
import asyncio, json, os, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
BASE = "http://localhost:5501/app/vista-previa-informe.html"
OUT = r"C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_comp"
os.makedirs(OUT, exist_ok=True)
LOGF = os.path.join(OUT, "comp2_progress.log")
RESF = os.path.join(OUT, "comp2.json")

TASACIONES = [
    ("casa", "T8tl6cXAuHU", 45),
    ("departamento", "T7ePR8EkfQH", 3),
    ("lote", "T79TAXJmZTn", 3),
]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

def log(msg):
    with open(LOGF, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

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
    await page.wait_for_selector('.report-page', timeout=60000)
    await page.wait_for_timeout(2000)
    log(f"[{tipo}] render inicial OK")
    R = {"tipo": tipo}

    # 1. Tarjetas apiladas + sección fotos-comparables eliminada
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
            tituloDuplicado: [...document.querySelectorAll('h2')].some(h => h.textContent.trim() === 'Fotografías de Comparables'),
            seccionFotosInmueble: !!document.querySelector('.report-photos-section')
        };
    }""")
    log(f"[{tipo}] cards OK")

    # 2. Layouts de fotos: regenerar SOLO la sección comparables (sin re-render completo)
    R["layouts"] = await page.evaluate(r"""async () => {
        const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
        const comp = {id:'x', address:'Calle Falsa 123', surfaceTotal: 80, rooms: 3, price: 50000, pricePerM2: 625};
        const res = {};
        const secEl = [...document.querySelectorAll('.report-section')].find(s =>
            s.querySelector('h2') && s.querySelector('h2').textContent.trim() === 'Comparables de Mercado');
        const cont = secEl || document.querySelector('.report-page');
        if (!cont) return {error: 'sin contenedor'};
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;left:0;top:0;width:170mm;';
        document.body.appendChild(probe);
        for (let n = 0; n <= 4; n++) {
            const c = {...(comp || {id:'x', address:'Calle Falsa 123', surfaceTotal: 80, rooms: 3, price: 50000, pricePerM2: 625})};
            c.photos = Array.from({length: n}, (_, i) => mk('L' + n + '_' + i));
            probe.innerHTML = ReportComparablesVisual({comparables: [c]});
            await new Promise(r => setTimeout(r, 60));
            const card = probe.querySelector('.report-comparable-card');
            const area = card && card.querySelector('.report-comparable-card-photos');
            const cr = card ? card.getBoundingClientRect() : null;
            if (!area) { res[n] = {n, fotos: 0, cardH: cr ? Math.round(cr.height) : null}; continue; }
            const ar = area.getBoundingClientRect();
            const imgs = [...area.querySelectorAll('img')];
            res[n] = {
                n, fotos: imgs.length,
                fit: imgs.length ? getComputedStyle(imgs[0]).objectFit : null,
                areaW: Math.round(ar.width), areaH: Math.round(ar.height),
                cardH: Math.round(cr.height),
                ratio: +(ar.width / ar.height).toFixed(2),
                igualAltura: Math.abs(ar.height - cr.height) < 3,
                rects: imgs.map(i => { const r = i.getBoundingClientRect(); return {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}; })
            };
        }
        probe.remove();
        return res;
    }""")
    log(f"[{tipo}] layouts OK")

    # 3. Límite 4 fotos (rechazo antes de mutar)
    R["limite"] = await page.evaluate(r"""async () => {
        const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
        const c1 = comparablesResueltos[0];
        if (!c1) return {error: 'sin comparable'};
        const file = new File([new Uint8Array([1,2,3])], 'x.png', {type:'image/png'});
        c1.fotos = [mk('A'), mk('B'), mk('C'), mk('D')];
        await agregarFotosComparable(c1.id, [file]);
        const r1 = c1.fotos.length;
        c1.fotos = [mk('A'), mk('B'), mk('C')];
        await agregarFotosComparable(c1.id, [file, file]);
        const r2 = c1.fotos.length;
        c1.fotos = [];
        return {r1_rechazoTotal: r1 === 4, r2_rechazoParcial: r2 === 3};
    }""")
    log(f"[{tipo}] limite OK: {R['limite']}")

    # 4. Paridad tablas PDF vs ResultadosRenderer (misma fuente)
    R["tablas"] = await page.evaluate(r"""() => {
        const norm = s => (s || '').replace(/\s+/g, ' ').trim();
        const datosTasacion = tasacionCargada.datosCompletos || tasacionCargada;
        const resultado = datosTasacion.resultado || {};
        const tipo = datosTasacion.tipo || 'lote';
        const ref = new ResultadosRenderer(document.createElement('div'), {...resultado}, tipo, datosTasacion, 'lectura');
        const tmp = document.createElement('div');
        tmp.innerHTML = ref.renderizarTablaComparables();
        const refRows = [...tmp.querySelectorAll('tbody tr')].map(tr =>
            [...tr.querySelectorAll('td')].slice(0, -1).map(td => norm(td.textContent)));

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
        const esB = sig => /Ubicaci|Actividad|Actualizaci|F&C|Ross|homogeneizado|Planta|Piso|constructiva|Cubierta/i.test(sig);
        const sigB = firmas.find(esB);
        const sigA = firmas.find(s => s !== sigB);
        const filasA = filasPorFirma[sigA] || [];
        const filasB = filasPorFirma[sigB] || [];
        const diffs = [];
        refRows.forEach((refRow, i) => {
            const pdfRow = [...(filasA[i] || []), ...(filasB[i] || []).slice(1)];
            if (pdfRow.length !== refRow.length) { diffs.push(`fila ${i}: ${pdfRow.length} vs ${refRow.length}`); return; }
            refRow.forEach((v, j) => { if (pdfRow[j] !== v) diffs.push(`f${i}c${j}: pdf="${pdfRow[j]}" ref="${v}"`); });
        });
        const t = tabs[0];
        const cs = el => el ? getComputedStyle(el) : {};
        const th = t?.querySelector('thead th'), td1 = t?.querySelector('tbody td');
        const resumen = document.querySelector('.report-comparables-summary');
        const secA = document.querySelector('.report-comparables-tabla-a');
        const secB = resumen?.closest('.report-section');
        let gapAB = null, gapBRes = null;
        if (secA && secB) {
            gapAB = Math.round(secB.getBoundingClientRect().top - secA.getBoundingClientRect().bottom);
            const tb = secB.querySelector('.report-table-tech');
            if (tb) gapBRes = Math.round(resumen.getBoundingClientRect().top - tb.getBoundingClientRect().bottom);
        }
        const tfoot = [...document.querySelectorAll('.report-table-tech tfoot')].pop();
        return {
            nTablas: tabs.length, headersA: sigA, headersB: sigB,
            nFilasA: filasA.length, nFilasB: filasB.length, nFilasRef: refRows.length,
            diffs: diffs.slice(0, 12),
            thBg: cs(th).backgroundColor, thColor: cs(th).color,
            td1Bg: cs(td1).backgroundColor, borderColor: cs(t).borderColor,
            tfootTxt: tfoot ? norm(tfoot.textContent) : null,
            gapAB, gapBRes,
            resumenTxt: resumen ? norm(resumen.textContent).slice(0, 80) : null
        };
    }""")
    log(f"[{tipo}] tablas OK")

    # 5. Overflow + PDF + regresión
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
    R["regresion"] = await page.evaluate(r"""() => ({
        chartCols: document.querySelectorAll('.report-surface-chart-col').length,
        techDisplay: (() => { const t = document.querySelector('.report-technical-grid'); return t ? getComputedStyle(t).display : null; })(),
        refCol: !!document.querySelector('.report-reference-column'),
        solFilas: document.querySelectorAll('.report-reference-column .report-reference-item').length
    })""")
    await page.emulate_media(media="print")
    pdf = await page.pdf(format="A4", print_background=True)
    with open(os.path.join(OUT, f"comp2_{tipo}.pdf"), "wb") as f:
        f.write(pdf)
    R["pdf_bytes"] = len(pdf)
    await page.emulate_media(media="screen")
    R["paginas"] = await page.evaluate("document.querySelectorAll('.report-page').length")
    R["dialogs"] = dialogs[:6]
    R["errores"] = errs[:6]
    await browser.close()
    log(f"[{tipo}] FIN")
    return R

async def main():
    if os.path.exists(LOGF): os.remove(LOGF)
    async with async_playwright() as pw:
        results = []
        for tipo, code, uid in TASACIONES:
            try:
                results.append(await asyncio.wait_for(run_case(pw, tipo, code, uid), 420000))
            except Exception as e:
                results.append({"tipo": tipo, "error": str(e)[:600]})
                log(f"[{tipo}] ERROR {e}")
            with open(RESF, "w", encoding="utf-8") as f:
                f.write(json.dumps(results, ensure_ascii=False, indent=1))
        print("OK", flush=True)

asyncio.run(main())

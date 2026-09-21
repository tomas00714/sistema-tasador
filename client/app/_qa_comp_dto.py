# Debug por pasos — solo departamento, con prints y timeouts
import asyncio, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
BASE = "http://localhost:5501/app/vista-previa-informe.html"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

async def ev(page, label, expr, arg=None, timeout=60000):
    print(f"--- {label} ...", flush=True)
    coro = page.evaluate(expr, arg) if arg is not None else page.evaluate(expr)
    r = await asyncio.wait_for(coro, timeout)
    print(f"--- {label} OK", flush=True)
    return r

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="msedge")
        page = await browser.new_page(viewport={"width": 1500, "height": 1000})
        page.on("pageerror", lambda e: print("PE:", str(e)[:300], flush=True))
        page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(BASE)
        await page.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
        await page.goto(f"{BASE}?id=T7ePR8EkfQH")
        await page.wait_for_selector('.report-page', timeout=30000)
        print("render inicial OK", flush=True)
        await page.wait_for_timeout(1500)

        print("cards:", await page.evaluate("document.querySelectorAll('.report-comparable-card').length"), flush=True)
        print("tablas tech:", await page.evaluate("document.querySelectorAll('.report-table-tech').length"), flush=True)

        for n in (0,1,2,3,4):
            r = await ev(page, f"fotos={n}", r"""async (n) => {
                const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
                const c1 = comparablesResueltos[0];
                if (!c1) return {error: 'sin comparable'};
                c1.fotos = Array.from({length: n}, (_, i) => mk('T' + n + '_' + i));
                reportConfig.showPhotos = true;
                await renderReportPreview();
                const card = document.querySelector('.report-comparable-card');
                const area = card && card.querySelector('.report-comparable-card-photos');
                const cr = card ? card.getBoundingClientRect() : null;
                const ar = area ? area.getBoundingClientRect() : null;
                return {
                    n, areas: document.querySelectorAll('.report-comparable-card-photos').length,
                    imgs: area ? area.querySelectorAll('img').length : 0,
                    areaW: ar ? Math.round(ar.width) : null, areaH: ar ? Math.round(ar.height) : null,
                    cardH: cr ? Math.round(cr.height) : null,
                    fit: area && area.querySelector('img') ? getComputedStyle(area.querySelector('img')).objectFit : null
                };
            }""", n)
            print("   ", r, flush=True)

        r = await ev(page, "limite", r"""async () => {
            const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
            const c1 = comparablesResueltos[0];
            c1.fotos = [mk('A'), mk('B'), mk('C'), mk('D')];
            const file = new File([new Uint8Array([1,2,3])], 'x.png', {type:'image/png'});
            await agregarFotosComparable(c1.id, [file]);
            const r1 = c1.fotos.length;
            c1.fotos = [mk('A'), mk('B'), mk('C')];
            await agregarFotosComparable(c1.id, [file, file]);
            const r2 = c1.fotos.length;
            c1.fotos = [];
            await renderReportPreview();
            return {r1, r2};
        }""")
        print("   limite:", r, flush=True)

        r = await ev(page, "paridad", r"""async () => {
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
            return {nTablas: tabs.length, firmas, refRows};
        }""", timeout=120000)
        print("   tablas:", r["nTablas"], flush=True)
        print("   firmaA:", r["firmas"][0][:200] if r["firmas"] else None, flush=True)
        for f in r["firmas"][1:]: print("   firmaX:", f[:200], flush=True)
        for row in r["refRows"]: print("   ref:", row, flush=True)

        await browser.close()
        print("FIN", flush=True)

asyncio.run(main())

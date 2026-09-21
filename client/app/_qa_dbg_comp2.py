import asyncio, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
BASE = "http://localhost:5501/app/vista-previa-informe.html"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(channel="msedge")
        page = await browser.new_page(viewport={"width": 1500, "height": 1000})
        page.on("pageerror", lambda e: print("PE:", str(e)[:400]))
        page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(BASE)
        await page.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
        print("goto dto...", flush=True)
        await page.goto(f"{BASE}?id=T7ePR8EkfQH")
        await page.wait_for_timeout(8000)
        st = await page.evaluate(r"""() => ({
            pages: document.querySelectorAll('.report-page').length,
            cargada: typeof tasacionCargada !== 'undefined' && !!tasacionCargada,
            RR: typeof ResultadosRenderer,
            cfg: typeof configuracionResultados,
            coefs: typeof window.coeficientesPersonalizados
        })""")
        print("state:", st, flush=True)
        # instanciar renderer a mano con timing
        r = await page.evaluate(r"""() => {
            const t0 = performance.now();
            const datosTasacion = tasacionCargada.datosCompletos || tasacionCargada;
            const resultado = datosTasacion.resultado || {};
            const tipo = datosTasacion.tipo || 'lote';
            const rr = new ResultadosRenderer(document.createElement('div'), {...resultado}, tipo, datosTasacion, 'lectura');
            const t1 = performance.now();
            const cols = rr.obtenerColumnas('comparables');
            const t2 = performance.now();
            return {ctor: Math.round(t1-t0), cols: cols.length, colsMs: Math.round(t2-t1),
                    comps: rr.resultado.comparables.length, tipo};
        }""")
        print("renderer:", r, flush=True)
        await browser.close()
        print("FIN", flush=True)

asyncio.run(main())

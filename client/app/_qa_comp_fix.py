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
        page.on("pageerror", lambda e: print("PE:", str(e)[:300], flush=True))
        page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(BASE)
        await page.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
        await page.goto(f"{BASE}?id=T7ePR8EkfQH")
        await page.wait_for_selector('.report-page', timeout=60000)
        await page.wait_for_timeout(2000)

        r = await page.evaluate(r"""() => {
            const norm = s => (s||'').replace(/\s+/g,' ').trim();
            const cards = [...document.querySelectorAll('.report-comparable-card')];
            return {
                compsResueltos: comparablesResueltos.length,
                datosComps: (tasacionCargada.datosCompletos?.comparables || []).length,
                resComps: (tasacionCargada.datosCompletos?.resultado?.comparables || []).length,
                ids: comparablesResueltos.map(c => c.id),
                nCards: cards.length,
                cards: cards.map(c => {
                    const r = c.getBoundingClientRect();
                    const area = c.querySelector('.report-comparable-card-photos');
                    const ar = area ? area.getBoundingClientRect() : null;
                    return {w: Math.round(r.width), h: Math.round(r.height),
                            dir: norm(c.querySelector('.report-comparable-card-title')?.textContent).slice(0,30),
                            areaCls: area ? area.className.replace('report-comparable-card-photos','') : null,
                            areaW: ar ? Math.round(ar.width) : null, areaH: ar ? Math.round(ar.height) : null,
                            nImgs: area ? area.querySelectorAll('img').length : 0};
                }),
                chartCols: document.querySelectorAll('.report-chart-col').length,
                overflow: (() => {
                    const bad = [];
                    document.querySelectorAll('.report-page').forEach((pg, i) => {
                        const r = pg.getBoundingClientRect();
                        pg.querySelectorAll('*').forEach(el => {
                            const e = el.getBoundingClientRect();
                            if (e.width && e.height && (e.right > r.right + 2 || e.left < r.left - 2))
                                bad.push('p' + (i+1) + ':' + (el.className || el.tagName));
                        });
                    });
                    return bad.slice(0, 10);
                })()
            };
        }""")
        for k, v in r.items(): print(k, "=", v, flush=True)
        await browser.close()
        print("FIN", flush=True)

asyncio.run(main())

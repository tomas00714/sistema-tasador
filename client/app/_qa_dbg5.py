import asyncio, sys, json
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
        page = await browser.new_page()
        await page.goto(BASE)
        await page.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
        await page.goto(f"{BASE}?id=T7ePR8EkfQH")
        await page.wait_for_selector('.report-page', timeout=30000)
        await page.wait_for_timeout(2000)
        r = await page.evaluate(r"""async () => {
            const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag});
            const c1 = comparablesResueltos[0];
            c1.fotos = [mk('C1A'), mk('C1B'), mk('C1C')];
            const c2 = JSON.parse(JSON.stringify(c1));
            c2.id = 'CLONE_' + c1.id;
            c2.fotos = [mk('C2A')];
            comparablesResueltos.push(c2);
            tasacionCargada.comparables = comparablesResueltos;
            selectedComparableIds.add('CLONE_' + c1.id);
            reportConfig.showPhotos = true;
            await renderReportPreview();
            await new Promise(r => setTimeout(r, 400));
            const secs = [...document.querySelectorAll('.report-comparables-photos-section')];
            return {
                secciones: secs.length,
                gruposTotal: document.querySelectorAll('.report-comparable-photo-group').length,
                porSeccion: secs.map(s => [...s.querySelectorAll('.report-comparable-card-number')].map(t => t.textContent.trim())),
                paginas: [...document.querySelectorAll('.report-page')].map((pg, i) => ({
                    p: i + 1,
                    grupos: pg.querySelectorAll('.report-comparable-photo-group').length,
                    tieneSec: !!pg.querySelector('.report-comparables-photos-section')
                })).filter(x => x.grupos > 0 || x.tieneSec)
            };
        }""")
        print(json.dumps(r, ensure_ascii=False))
        await browser.close()

asyncio.run(main())

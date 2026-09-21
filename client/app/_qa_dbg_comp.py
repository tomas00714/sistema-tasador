# Debug: dónde se cuelga departamento
import asyncio, sys, os
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
        page.on("pageerror", lambda e: print("PE:", str(e)[:300]))
        page.on("console", lambda m: None)  # ignorar spam
        page.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
        await page.goto(BASE)
        await page.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
        print("goto tasacion dto...")
        await page.goto(f"{BASE}?id=T7ePR8EkfQH")
        await page.wait_for_selector('.report-page', timeout=30000)
        print("report-page OK, esperando render...")
        await page.wait_for_timeout(2500)
        print("cards:", await page.evaluate("document.querySelectorAll('.report-comparable-card').length"))
        print("tablas tech:", await page.evaluate("document.querySelectorAll('.report-table-tech').length"))
        # tiempo de un re-render con fotos
        r = await page.evaluate(r"""async () => {
            const t0 = performance.now();
            const c1 = comparablesResueltos[0];
            c1.fotos = [{url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#A', description:'A'}];
            reportConfig.showPhotos = true;
            await renderReportPreview();
            return Math.round(performance.now() - t0);
        }""")
        print("re-render con 1 foto:", r, "ms")
        print("areas:", await page.evaluate("document.querySelectorAll('.report-comparable-card-photos').length"))
        await browser.close()
        print("FIN")

asyncio.run(main())

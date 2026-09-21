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
        for nombre, pid, uid in [("casa","T8tl6cXAuHU",45),("depto","T7ePR8EkfQH",3),("lote","T79TAXJmZTn",3)]:
            page = await browser.new_page()
            await page.goto(BASE)
            await page.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
            await page.goto(f"{BASE}?id={pid}")
            await page.wait_for_selector('.report-page', timeout=30000)
            await page.wait_for_timeout(1800)
            r = await page.evaluate("getReportPaginator().verifyPageOverflow()")
            excede = [x for x in r if x.get('exceeds')]
            print(nombre, "| paginas:", len(r), "| exceden:", excede)
            await page.close()
        await browser.close()

asyncio.run(main())

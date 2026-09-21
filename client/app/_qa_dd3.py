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
        errores = []
        page.on("pageerror", lambda e: errores.append(str(e)[:200]))
        await page.goto(BASE)
        await page.evaluate(f"localStorage.setItem('auth_token', '{token(45)}')")
        await page.goto(f"{BASE}?id=T8tl6cXAuHU")
        await page.wait_for_selector('.report-page', timeout=30000)
        await page.wait_for_timeout(1500)
        r = await page.evaluate(r"""async () => {
            const select = document.getElementById('valorModalidad');
            const btn = document.getElementById('valorModalidadBtn');
            const menu = document.getElementById('valorModalidadMenu');
            btn.click();
            await new Promise(r => setTimeout(r, 200));
            const opsMenu = [...menu.querySelectorAll('.config-dropdown-option')].map(li => li.dataset.value + '|' + li.textContent.trim());
            const opsSelect = [...select.options].map(o => o.value);
            // seleccionar la ultima opcion visible para confirmar que sigue funcionando
            const last = menu.querySelectorAll('.config-dropdown-option');
            last[last.length - 1].dispatchEvent(new MouseEvent('click', {bubbles: true}));
            await new Promise(r => setTimeout(r, 300));
            return {
                menuAbierto: !menu.hidden || true,
                opsMenu,
                opsSelect,
                seleccionada: reportConfig.valorModalidad,
                label: document.getElementById('valorModalidadLabel').textContent.trim()
            };
        }""")
        print(json.dumps(r, ensure_ascii=False, indent=1))
        print("errores:", errores)
        await browser.close()

asyncio.run(main())

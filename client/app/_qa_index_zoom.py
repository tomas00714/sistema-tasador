# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
CASES = [('T8tl6cXAuHU', 45, 'casa'), ('T7ePR8EkfQH', 3, 'dto')]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    for code, uid, name in CASES:
        pg = b.new_page(viewport={"width": 1500, "height": 1000}, device_scale_factor=2)
        pg.goto('http://localhost:5501/app/vista-previa-informe.html')
        pg.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
        pg.goto(f'http://localhost:5501/app/vista-previa-informe.html?id={code}')
        pg.wait_for_selector('.report-page', timeout=30000)
        pg.wait_for_timeout(1500)
        pg.emulate_media(media='print')
        pg.wait_for_timeout(400)
        grid = pg.locator('.report-reference-grid').first
        grid.screenshot(path=rf'C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_pdf_imgs\idx_print_{name}.png')
        # dump computed borders of first column items in print media
        r = pg.evaluate('''() => {
            const col = document.querySelector('.report-reference-column');
            const sub = col.querySelector('.report-reference-subtitle');
            const items = [...col.querySelectorAll('.report-reference-item')];
            const cs = el => getComputedStyle(el);
            return {
                subBorderBottom: cs(sub).borderBottom,
                subDisplay: cs(sub).display,
                items: items.slice(0, 6).map(it => ({
                    bt: cs(it).borderTop, bb: cs(it).borderBottom,
                    disp: cs(it).display, vis: cs(it).visibility
                }))
            };
        }''')
        print(f'=== {name} ===')
        print(' subtitle borderBottom:', r['subBorderBottom'])
        for i, it in enumerate(r['items']):
            print(f'  item{i}: top={it["bt"]} bottom={it["bb"]} disp={it["disp"]}')
        pg.close()
    b.close()
print('done')

# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    pg.goto('http://localhost:5501/app/vista-previa-informe.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
    pg.goto('http://localhost:5501/app/vista-previa-informe.html?id=T7ePR8EkfQH')
    pg.wait_for_selector('.report-page', timeout=30000)
    pg.wait_for_timeout(1200)

    r = pg.evaluate('''() => {
        const t = document.querySelector('table.report-table-autofit');
        const host = t.parentElement;
        const ths = [...t.tHead.rows[0].cells];
        return {
            hostCls: host.className,
            hostClientW: host.clientWidth,
            hostScrollW: host.scrollWidth,
            hostOverflowX: getComputedStyle(host).overflowX,
            tOffsetW: t.offsetWidth,
            tScrollW: t.scrollWidth,
            fontSize: t.style.fontSize,
            thStyles: ths.map(th => th.style.width),
            firstTdWidths: [...t.tBodies[0].rows[0].cells].map(td => td.offsetWidth),
            sectionW: host.parentElement ? Math.round(host.parentElement.getBoundingClientRect().width) : null,
            sectionCls: host.parentElement?.className
        };
    }''')
    for k, v in r.items(): print(k, ':', v)
    b.close()

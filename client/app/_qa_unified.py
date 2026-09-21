# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
CASES = [('T8tl6cXAuHU', 45, 'casa'), ('T7ePR8EkfQH', 3, 'dto'), ('T79TAXJmZTn', 3, 'lote')]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    for code, uid, name in CASES:
        pg = b.new_page(viewport={"width": 1500, "height": 1000})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:5501/app/vista-previa-informe.html')
        pg.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
        pg.goto(f'http://localhost:5501/app/vista-previa-informe.html?id={code}')
        pg.wait_for_selector('.report-page', timeout=30000)
        pg.wait_for_timeout(1500)

        r = pg.evaluate('''() => {
            const tablas = [...document.querySelectorAll('table.report-table-autofit')];
            const res = {nAutofit: tablas.length, detalle: []};
            tablas.forEach(t => {
                const ths = [...t.tHead.rows[0].cells].map(th => th.textContent.trim());
                const body = t.parentElement;
                res.detalle.push({
                    cols: ths.length,
                    first: ths[0],
                    headers: ths,
                    fontSize: t.style.fontSize || '(css)',
                    w: Math.round(t.getBoundingClientRect().width),
                    hostW: Math.round(body.getBoundingClientRect().width),
                    thWidths: [...t.tHead.rows[0].cells].slice(0,4).map(th => th.style.width),
                    numTh: t.tHead.querySelectorAll('th.num').length,
                    numTd: t.querySelector('tbody tr')?.querySelectorAll('td.num').length,
                    tfoot: !!t.tFoot
                });
            });
            res.techTotal = document.querySelectorAll('.report-table-tech').length;
            res.pages = document.querySelectorAll('.report-page').length;
            // overflow horizontal en páginas
            res.overflow = [];
            document.querySelectorAll('.report-page').forEach((p, i) => {
                if (p.scrollWidth > p.clientWidth + 2) res.overflow.push(i + 1);
            });
            return res;
        }''')
        print(f'=== {name} ===')
        print('  pages:', r['pages'], 'autofit tables:', r['nAutofit'], 'tech total:', r['techTotal'])
        for d in r['detalle']: print('  ', d)
        print('  overflow páginas:', r['overflow'] or 'ninguno')
        print('  errores JS:', errs or 'ninguno')
        pg.close()
    b.close()

# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
CODE = 'T8tl6cXAuHU'  # casa

def token(uid=45):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    pg.goto('http://localhost:5501/app/vista-previa-informe.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token()}')")
    pg.goto(f'http://localhost:5501/app/vista-previa-informe.html?id={CODE}')
    pg.wait_for_selector('.report-page', timeout=30000)
    pg.wait_for_timeout(1200)

    def dump(media):
        pg.emulate_media(media=media)
        pg.wait_for_timeout(300)
        return pg.evaluate('''() => {
            const out = {cols: [], items: [], extra: {}};
            document.querySelectorAll('.report-reference-column').forEach((c, i) => {
                const cs = getComputedStyle(c);
                const r = c.getBoundingClientRect();
                out.cols.push({i, bt: cs.borderTopWidth, bb: cs.borderBottomWidth,
                               bl: cs.borderLeftWidth, br: cs.borderRightWidth,
                               h: Math.round(r.height)});
                c.querySelectorAll('.report-reference-item').forEach((it, j) => {
                    const s = getComputedStyle(it);
                    out.items.push({col:i, j, bb: s.borderBottomWidth, display: s.display,
                                    label: it.querySelector('.report-reference-label')?.textContent.trim().slice(0,16)});
                });
            });
            // Otros componentes con borde: tabla tech, cards, valoracion, foda
            const t = document.querySelector('.report-table-tech');
            if (t) { const s = getComputedStyle(t); out.extra.tabla = {b: s.borderWidth, w: Math.round(t.getBoundingClientRect().width), pw: Math.round(t.parentElement.getBoundingClientRect().width)}; }
            const card = document.querySelector('.report-comparable-card');
            if (card) { const s = getComputedStyle(card); out.extra.card = {b: s.borderWidth}; }
            return out;
        }''')

    scr = dump('screen')
    prn = dump('print')
    print('=== SCREEN cols ===')
    for c in scr['cols']: print(c)
    print('=== PRINT cols ===')
    for c in prn['cols']: print(c)
    print('--- items print ---')
    for it in prn['items']: print(it)
    print('--- extra print ---', prn['extra'])
    b.close()

# -*- coding: utf-8 -*-
import json, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

TASACIONES = [("casa", "T8tl6cXAuHU", 45), ("departamento", "T7ePR8EkfQH", 3), ("lote", "T79TAXJmZTn", 3)]

with sync_playwright() as p:
    for tipo, code, uid in TASACIONES:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)[:200]))
        page.on("dialog", lambda d: d.accept())
        page.goto(f"{APP}/vista-previa-informe.html")
        page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
        page.goto(f"{APP}/vista-previa-informe.html?id={code}")
        page.wait_for_selector('.report-page', timeout=60000)
        r = page.evaluate(r"""() => {
            const sec = [...document.querySelectorAll('.report-section')].find(s =>
                s.querySelector('h2')?.textContent.includes('Índice de Referencia'));
            const items = sec ? [...sec.querySelectorAll('.report-reference-item')].map(i => ({
                l: i.querySelector('.report-reference-label')?.textContent.trim(),
                v: i.querySelector('.report-reference-value')?.textContent.trim()
            })) : [];
            const overflow = [];
            document.querySelectorAll('.report-page').forEach((pg, i) => {
                pg.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect(), pr = pg.getBoundingClientRect();
                    if (r.width > 5 && (r.right > pr.right + 1 || r.bottom > pr.bottom + 1))
                        overflow.push(`p${i}:${(el.className||'').toString().slice(0,40)}`);
                });
            });
            const txt = document.getElementById('reportViewer').innerText;
            const malos = (txt.match(/\d[.,]\d{3,}/g) || []).filter(m =>
                m.includes(',') || !/^(\d{3})+$/.test(m.split(/[.,]/).slice(1).join('')));
            return {antig: items.filter(i => i.l && i.l.includes('Antig')),
                    cliente: items.filter(i => i.l && i.l.includes('Cliente')),
                    overflow: overflow.slice(0, 8), malos, paginas: document.querySelectorAll('.report-page').length};
        }""")
        pdf = page.pdf(format='A4', print_background=True)
        print(f'[{tipo}] paginas={r["paginas"]} pdf={len(pdf)}b overflow={r["overflow"]} malos={r["malos"]} errs={errs}')
        print('   antig:', json.dumps(r['antig'], ensure_ascii=False))
        print('   cliente:', json.dumps(r['cliente'], ensure_ascii=False))
        browser.close()
print('FIN')

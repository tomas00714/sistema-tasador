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

with sync_playwright() as p:
    for tipo, code, uid in [("lote", "T79TAXJmZTn", 3), ("casa", "T8tl6cXAuHU", 45), ("departamento", "T7ePR8EkfQH", 3)]:
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
            // Config panel: hidden sections for lote
            const fodaSec = document.getElementById('showFODA')?.closest('.config-section');
            const compSec = document.getElementById('showCompetition')?.closest('.config-section');
            const visible = el => el && getComputedStyle(el).display !== 'none' && el.style.display !== 'none';
            // Technical grid: last-row single item width
            const grids = [...document.querySelectorAll('.report-technical-grid')].map(g => {
                const items = [...g.children];
                const gw = g.getBoundingClientRect().width;
                return items.map(i => Math.round(i.getBoundingClientRect().width / gw * 100));
            });
            // Summary values
            const items2 = [...document.querySelectorAll('.report-summary-item')].map(i => ({
                l: i.querySelector('.report-summary-label')?.textContent.trim(),
                v: i.querySelector('.report-summary-value')?.textContent.trim()
            }));
            // Header logo on page 2
            const hdrLogo = document.querySelectorAll('.report-page-header .report-page-header-logo').length;
            return {
                fodaVisible: fodaSec ? fodaSec.style.display !== 'none' : null,
                compVisible: compSec ? compSec.style.display !== 'none' : null,
                grids, summary: items2, hdrLogo,
                errs: []
            };
        }""")
        pdf = page.pdf(format='A4', print_background=True)
        print(f'[{tipo}] pdf={len(pdf)}b fodaVisible={r["fodaVisible"]} compVisible={r["compVisible"]} hdrLogo={r["hdrLogo"]} errs={errs}')
        print(f'   gridWidths%={r["grids"]}')
        print(f'   summary={json.dumps(r["summary"], ensure_ascii=False)}')
        browser.close()
print('FIN')

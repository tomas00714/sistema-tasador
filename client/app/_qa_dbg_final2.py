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
    for tipo, code, uid in [("departamento", "T7ePR8EkfQH", 3), ("lote", "T79TAXJmZTn", 3)]:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page()
        page.goto(f"{APP}/vista-previa-informe.html")
        page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
        page.goto(f"{APP}/vista-previa-informe.html?id={code}")
        page.wait_for_selector('.report-page', timeout=60000)
        r = page.evaluate(r"""() => {
            // Introducción: contenido real?
            const intro = [...document.querySelectorAll('.report-technical-subtitle')]
                .find(h => h.textContent.trim() === 'Introducción');
            const introTxt = intro ? intro.closest('.report-technical-block').innerText.trim() : null;
            // Tabla B: ¿entra en la página de A?
            const tabs = [...document.querySelectorAll('.report-table-tech')];
            const out = {introTxt: introTxt ? introTxt.slice(0, 80) : null};
            if (tabs.length >= 2) {
                const pagA = tabs[0].closest('.report-page');
                const ra = tabs[0].getBoundingClientRect();
                const pr = pagA.getBoundingClientRect();
                // espacio libre debajo de A dentro del área de contenido
                const st = getComputedStyle(pagA);
                const padB = parseFloat(st.paddingBottom) || 0;
                const libre = pr.bottom - padB - ra.bottom;
                const hb = tabs[1].closest('.report-section').offsetHeight;
                out.libreTrasA_px = Math.round(libre);
                out.alturaB_px = Math.round(hb);
                out.alturaBSinPad = Math.round(hb - (parseFloat(getComputedStyle(tabs[1].closest('.report-section')).paddingBottom) || 0));
            }
            return out;
        }""")
        print(f'[{tipo}]', json.dumps(r, ensure_ascii=False))
        browser.close()
print('FIN')

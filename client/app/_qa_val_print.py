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
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:200]))
    page.on("dialog", lambda d: d.accept())
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(3))})")
    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-page', timeout=60000)

    r = page.evaluate(r"""() => {
        const rows = [...document.querySelectorAll('.report-valuation-detail')].map(d => ({
            l: d.querySelector('.report-valuation-detail-label')?.textContent.trim() || '(oculta)',
            v: d.querySelector('.report-valuation-detail-value')?.textContent.trim().slice(0, 40) || '',
            po: d.classList.contains('report-preview-only')
        }));
        const principal = document.querySelector('.report-valuation-main');
        return {modalidad: reportConfig.valorModalidad, rows,
                principalMenos: !!principal?.querySelector('[data-remove-value]'),
                principalTxt: principal?.innerText.slice(0, 80)};
    }""")
    print('screen:', json.dumps(r, ensure_ascii=False))

    page.emulate_media(media='print')
    rp = page.evaluate(r"""() => [...document.querySelectorAll('.report-valuation-detail')].map(d => ({
        l: d.querySelector('.report-valuation-detail-label')?.textContent.trim() || '(hidden row)',
        display: getComputedStyle(d).display
    }))""")
    print('print :', json.dumps(rp, ensure_ascii=False))
    print('errs:', errs)
    browser.close()
print('FIN')

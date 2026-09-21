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

tok = token(3)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    page.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    page.on("dialog", lambda d: d.accept())
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(tok)})")
    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-page', timeout=60000)

    r1 = page.evaluate(r"""async () => {
        const cb = document.getElementById('showMethodology');
        const antes = reportConfig.showMethodology;
        cb.checked = !antes;
        cb.dispatchEvent(new Event('change', {bubbles: true}));
        await new Promise(r => setTimeout(r, 1500));
        return {antes, despues: reportConfig.showMethodology};
    }""")
    print('toggle:', json.dumps(r1))

    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-page', timeout=60000)
    r2 = page.evaluate("({post: reportConfig.showMethodology, cb: document.getElementById('showMethodology').checked})")
    print('tras recarga:', json.dumps(r2))

    # restaurar
    page.evaluate(r"""async () => {
        reportConfig.showMethodology = %s;
        await persistirConfigInforme();
    }""" % json.dumps(r1['antes']))
    page.wait_for_timeout(800)
    print('restaurado a', r1['antes'])
    browser.close()

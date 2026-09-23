# -*- coding: utf-8 -*-
import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
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
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(3))})")
    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-ambiente-item', timeout=20000)
    page.wait_for_timeout(1000)
    # editar título del primer ambiente
    page.click('.report-ambiente-item .report-ambiente-title')
    page.keyboard.type('Living comedor')
    page.keyboard.press('Tab')
    page.wait_for_timeout(1500)
    val = page.evaluate("() => reportConfig.ambiente0Nombre")
    vis = page.evaluate("() => !document.querySelector('.report-ambiente-item').classList.contains('report-preview-only')")
    print('ambiente0Nombre persistido:', repr(val))
    print('cuadro ya no es preview-only:', vis)
    # revertir
    page.evaluate("""() => { reportConfig.ambiente0Nombre=''; return persistirConfigInforme(); }""")
    print('Errores JS:', len(errs), errs[:3])
    browser.close()

# -*- coding: utf-8 -*-
import json, sys, urllib.request
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"
API = "http://127.0.0.1:8080"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

tok = token(3)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    page.on("dialog", lambda d: d.accept())
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(tok)})")
    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-page', timeout=60000)
    page.evaluate(r"""async () => {
        reportConfig.valorModalidad = 'tasacion';
        reportConfig.valorRangoMin = '';
        reportConfig.valorRangoMax = '';
        reportConfig.fechaCierre = '';
        await persistirConfigInforme();
        await renderReportPreview();
    }""")
    page.wait_for_timeout(1000)
    req = urllib.request.Request(API + "/api/tasaciones/T7ePR8EkfQH",
                                 headers={"Authorization": "Bearer " + tok})
    t = json.loads(urllib.request.urlopen(req).read())
    rc = (t.get("datos") or {}).get("reportConfig") or {}
    print(json.dumps({k: rc.get(k) for k in
          ['valorModalidad','showFODA','valorRangoMin','valorRangoMax','fechaCierre',
           'clienteNombre','nomenclaturaCatastral']}, ensure_ascii=False))
    browser.close()

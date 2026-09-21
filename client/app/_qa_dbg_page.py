# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"

def token(uid=3):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:300]))
    pg.on("console", lambda m: print("CON:", m.type, m.text[:200]) if m.type in ('error','warning') else None)
    pg.goto('http://localhost:5501/app/vista-previa-informe.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token()}')")
    pg.goto('http://localhost:5501/app/vista-previa-informe.html?id=T8tl6cXAuHU')
    pg.wait_for_timeout(12000)
    print("pages:", pg.evaluate("document.querySelectorAll('.report-page').length"))
    print("empty hidden:", pg.evaluate("document.getElementById('reportEmptyState')?.hidden"))
    print("viewer children:", pg.evaluate("document.getElementById('reportViewer')?.children.length"))
    b.close()

# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1400, "height": 950})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:250]))
    pg.on("console", lambda m: print("CON:", m.type, m.text[:150]) if m.type == 'error' else None)
    pg.goto('http://localhost:5501/app/perfil.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
    pg.reload()
    pg.wait_for_timeout(6000)
    print("url:", pg.url)
    print("btnEditar existe:", pg.evaluate("!!document.getElementById('btnEditarPerfil')"))
    print("btn visible:", pg.evaluate("document.getElementById('btnEditarPerfil')?.offsetParent !== null"))
    print("auth_token set:", pg.evaluate("!!localStorage.getItem('auth_token')"))
    b.close()

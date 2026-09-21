# -*- coding: utf-8 -*-
"""QA: perfil de borrador en historial — sin error, solo Editar/Eliminar."""
import json, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

CASOS = [("departamento borrador", "T7ePR8EkfQH", 3), ("casa borrador", "T8tl6cXAuHU", 45),
         ("lote completada", "T79TAXJmZTn", 3)]

with sync_playwright() as p:
    for nombre, tid, uid in CASOS:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)[:200]))
        page.on("dialog", lambda d: d.accept())
        page.goto(f"{APP}/historial.html")
        page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
        page.goto(f"{APP}/historial.html")
        page.wait_for_load_state('networkidle')
        page.evaluate(f"abrirPerfilTasacion({json.dumps(tid)})")
        page.wait_for_timeout(2500)
        r = page.evaluate(r"""() => {
            const vis = id => { const el = document.getElementById(id);
                return !!el && el.offsetParent !== null; };
            return {
                modalAbierto: !!document.querySelector('.perfil-card-container'),
                informe: vis('btnCrearInformePerfil'),
                compartir: vis('btnCompartirPerfil'),
                editar: vis('btnEditarPerfil'),
                eliminar: vis('btnEliminarPerfil'),
                homogeneizacion: !!document.querySelector('.resultado-tabla-wrap')
            };
        }""")
        print(f'[{nombre}]', json.dumps(r), 'errores:', errs)
        browser.close()
print('FIN')

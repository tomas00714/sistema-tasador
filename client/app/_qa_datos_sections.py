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
    page.on("console", lambda m: errs.append(m.text[:200]) if m.type == "error" else None)
    page.goto(f"{APP}/tasacion.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(3))})")
    page.goto(f"{APP}/tasacion.html")
    page.wait_for_selector('.card-tipo[data-tipo="departamento"]', timeout=15000)

    for tipo in ["departamento", "lote"]:
        page.click(f'.card-tipo[data-tipo="{tipo}"]')
        page.click('#btnSiguiente')
        page.wait_for_timeout(800)
        html = page.inner_html('.panel-principal')
        checks = {
            'sin Datos del informe': 'Datos del informe' not in html,
            'sin Carac. entorno': 'entornoDescripcionInput' not in html,
            'sin nomenclaturaInput': 'nomenclaturaCatastralInput' not in html,
        }
        if tipo != 'lote':
            checks['conserva Detalle ambientes'] = 'Detalle de ambientes' in html
        print(f"--- {tipo} ---")
        for k, v in checks.items():
            print(('OK  ' if v else 'FAIL ') + k)
        # volver a la pantalla 1 para el siguiente tipo
        page.evaluate("volverPasoAnterior()") if page.evaluate("typeof volverPasoAnterior") == 'function' else None
        page.wait_for_timeout(400)
        if not page.query_selector('.grid-tipos'):
            page.goto(f"{APP}/tasacion.html")
            page.wait_for_selector('.card-tipo')

    # verificar que guardarDatosInforme no pisa valores (vienen del informe)
    page.click('.card-tipo[data-tipo="casa"]')
    page.click('#btnSiguiente')
    page.wait_for_timeout(800)
    res = page.evaluate("""() => {
        datosInforme.nomenclaturaCatastral = 'CIR-999';
        datosInforme.clienteNombre = 'Juan';
        datosInforme.entorno.descripcion = 'Entorno x';
        datosInforme.finalidad = 'Hipoteca';
        guardarDatosInforme();
        return { nom: datosInforme.nomenclaturaCatastral, cli: datosInforme.clienteNombre,
                 desc: datosInforme.entorno.descripcion, fin: datosInforme.finalidad,
                 amb: Array.isArray(datosInforme.ambientes) };
    }""")
    print('guardarDatosInforme preserva:', res)
    print('Errores JS:', len(errs))
    for e in errs[:6]: print(' -', e)
    browser.close()

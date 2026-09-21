# -*- coding: utf-8 -*-
"""QA persistencia reportConfig: modalidad, toggles, rango, fecha cierre."""
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

def api_get(path, tok):
    req = urllib.request.Request(API + path, headers={"Authorization": "Bearer " + tok})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

CODE, UID = "T7ePR8EkfQH", 3
tok = token(UID)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:200]))
    page.on("dialog", lambda d: d.accept())
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(tok)})")
    page.goto(f"{APP}/vista-previa-informe.html?id={CODE}")
    page.wait_for_selector('.report-page', timeout=60000)

    r1 = page.evaluate(r"""async () => {
        const out = {};
        out.antes = {modalidad: reportConfig.valorModalidad, foda: reportConfig.showFODA,
                     rangoMin: reportConfig.valorRangoMin, cierre: reportConfig.fechaCierre};
        // 1) modalidad
        const sel = document.getElementById('valorModalidad');
        sel.value = 'rango';
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        await new Promise(r => setTimeout(r, 1200));
        // 2) toggle FODA
        const foda = document.getElementById('showFODA');
        if (foda && !foda.disabled) { foda.checked = false; foda.dispatchEvent(new Event('change', {bubbles:true})); }
        // 3) edicion directa de rango
        const editar = async (key, valor) => {
            const el = document.querySelector(`#reportViewer [data-editable="${key}"]`);
            if (!el) return 'sin elemento';
            el.click();
            await new Promise(r => setTimeout(r, 100));
            el.innerText = valor;
            el.dispatchEvent(new InputEvent('input', {bubbles: true}));
            el.blur();
            await new Promise(r => setTimeout(r, 1200));
            return 'ok';
        };
        out.editRango = await editar('valorRangoMin', '1234567');
        out.editCierre = await editar('fechaCierre', '15/08/2025');
        out.config = {modalidad: reportConfig.valorModalidad, foda: reportConfig.showFODA,
                      rangoMin: reportConfig.valorRangoMin, cierre: reportConfig.fechaCierre,
                      cliente: reportConfig.clienteNombre};
        return out;
    }""")
    print('edit:', json.dumps(r1, ensure_ascii=False))

    # recargar y verificar
    page.goto(f"{APP}/vista-previa-informe.html?id={CODE}")
    page.wait_for_selector('.report-page', timeout=60000)
    page.wait_for_timeout(1000)
    r2 = page.evaluate(r"""() => ({
        modalidad: reportConfig.valorModalidad,
        foda: reportConfig.showFODA,
        rangoMin: reportConfig.valorRangoMin,
        cierre: reportConfig.fechaCierre,
        rangoEnDom: document.getElementById('reportViewer').innerText.includes('1.234.567'),
        selSync: document.getElementById('valorModalidad').value
    })""")
    print('tras recarga:', json.dumps(r2, ensure_ascii=False))

    # restaurar modalidad y toggles originales
    page.evaluate(r"""async () => {
        reportConfig.valorModalidad = 'tasacion';
        reportConfig.showFODA = true;
        await persistirConfigInforme();
        await renderReportPreview();
    }""")
    page.wait_for_timeout(800)
    t = api_get(f"/api/tasaciones/{CODE}", tok)
    rc = (t.get("datos") or {}).get("reportConfig") or {}
    print('backend blob:', json.dumps({k: rc.get(k) for k in
          ['valorModalidad','showFODA','valorRangoMin','fechaCierre','clienteNombre','nomenclaturaCatastral']}, ensure_ascii=False))
    print('cliente_col:', repr(t.get('cliente_nombre')))
    print('pageerrors:', errs)
    browser.close()
print('FIN')

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

    # ---------- A. tasacion.html pantalla datos sin secciones ----------
    page.goto(f"{APP}/tasacion.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(3))})")
    page.goto(f"{APP}/tasacion.html")
    page.wait_for_selector('.card-tipo[data-tipo="departamento"]', timeout=15000)
    page.click('.card-tipo[data-tipo="departamento"]')
    page.click('#btnSiguiente')
    page.wait_for_timeout(800)
    html = page.inner_html('.panel-principal')
    print("== tasacion datos dto ==")
    print('OK  sin Detalle de ambientes' if 'Detalle de ambientes' not in html else 'FAIL ambientes sigue')
    print('OK  sin Datos del informe' if 'Datos del informe' not in html else 'FAIL datos informe sigue')
    print('OK  sin entorno' if 'entornoDescripcionInput' not in html else 'FAIL entorno sigue')

    # ---------- B. vista previa dto ----------
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(3))})")
    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-page', timeout=20000)
    page.wait_for_timeout(1500)
    print("== vista previa dto ==")
    cb = page.query_selector('#showAmbientes')
    print('OK  checkbox showAmbientes existe' if cb else 'FAIL checkbox')
    print('checked:', cb.is_checked() if cb else '-')
    r = page.evaluate("""() => {
        const v = document.getElementById('reportViewer');
        const ref = v.innerHTML;
        // orden: nomenclatura dentro de Identificación, no en Solicitante
        const cols = [...v.querySelectorAll('.report-reference-column')];
        const idCol = cols.find(c => c.textContent.includes('Identificación del Inmueble'));
        const solCol = cols.find(c => c.textContent.includes('Datos del Solicitante'));
        const amb = [...v.querySelectorAll('.report-ambiente-item')];
        const ambBlock = v.querySelector('.report-technical-block .report-technical-subtitle');
        const ambTitles = [...v.querySelectorAll('.report-technical-subtitle')].filter(e => e.textContent.trim()==='Detalle de Ambientes').length;
        const homog = ref.includes('Detalle de Ambientes y Superficies');
        return {
            nomEnIdentificacion: idCol ? idCol.textContent.includes('Nomenclatura catastral') : null,
            nomEnSolicitante: solCol ? solCol.textContent.includes('Nomenclatura catastral') : null,
            solicitanteFilas: solCol ? [...solCol.querySelectorAll('.report-reference-label')].map(e=>e.textContent) : null,
            cuadrosAmbiente: amb.length,
            ambTodosPreviewOnly: amb.length ? amb.every(a => a.classList.contains('report-preview-only')) : null,
            titulosDetalleAmb: ambTitles,
            homogTieneAmbientes: homog,
            showAmbientesConfig: reportConfig.showAmbientes
        };
    }""")
    for k, v in r.items(): print(f'  {k}: {v}')
    # border-bottom en último item técnico
    lastItem = page.evaluate("""() => {
        const items = [...document.querySelectorAll('.report-technical-item')];
        if (!items.length) return null;
        const last = items[items.length-1];
        return getComputedStyle(last).borderBottomWidth;
    }""")
    print('  border-bottom último item técnico:', lastItem)
    # logo header con showLogo off
    page.evaluate("""() => {
        reportConfig.showLogo = false;
        return renderReportPreview();
    }""")
    page.wait_for_timeout(1500)
    hdr = page.evaluate("() => document.querySelectorAll('.report-page-header-logo').length")
    print('  logos en encabezados con showLogo=false:', hdr)
    page.evaluate("""() => { reportConfig.showLogo = true; return renderReportPreview(); }""")
    page.wait_for_timeout(1200)

    # ---------- C. lote: checkbox oculto ----------
    page.goto(f"{APP}/vista-previa-informe.html?id=T79TAXJmZTn")
    page.wait_for_selector('.report-page', timeout=20000)
    page.wait_for_timeout(1000)
    print("== vista previa lote ==")
    vis = page.evaluate("""() => {
        const cb = document.getElementById('showAmbientes');
        const fila = cb?.closest('label.config-toggle');
        return { visible: fila ? getComputedStyle(fila).display !== 'none' : null,
                 checked: cb?.checked, config: reportConfig.showAmbientes,
                 cuadros: document.querySelectorAll('.report-ambiente-item').length };
    }""")
    print(' ', vis)

    print('Errores JS:', len(errs))
    for e in errs[:8]: print(' -', e)
    browser.close()

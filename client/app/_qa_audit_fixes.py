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

TASACIONES = [("casa", "T8tl6cXAuHU", 45), ("lote", "T79TAXJmZTn", 3), ("departamento", "T7ePR8EkfQH", 3)]

with sync_playwright() as p:
    # ============ A. Report preview per type ============
    for tipo, code, uid in TASACIONES:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page()
        errs = []
        page.on("pageerror", lambda e: errs.append(str(e)[:200]))
        page.on("dialog", lambda d: d.accept())
        page.goto(f"{APP}/vista-previa-informe.html")
        page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
        page.goto(f"{APP}/vista-previa-informe.html?id={code}")
        page.wait_for_selector('.report-page', timeout=60000)
        r = page.evaluate(r"""() => {
            const sec = [...document.querySelectorAll('.report-page .report-section, .report-page section')];
            const items = [...document.querySelectorAll('.report-reference-item')].map(i => ({
                l: i.querySelector('.report-reference-label')?.textContent.trim(),
                v: i.querySelector('.report-reference-value')?.textContent.trim(),
                previewOnly: i.classList.contains('report-preview-only')
            }));
            const txt = document.getElementById('reportViewer').innerText;
            const overflow = [];
            document.querySelectorAll('.report-page').forEach((pg, i) => {
                pg.querySelectorAll('*').forEach(el => {
                    const r = el.getBoundingClientRect(), pr = pg.getBoundingClientRect();
                    if (r.width > 5 && (r.right > pr.right + 1 || r.bottom > pr.bottom + 1))
                        overflow.push(`p${i}:${(el.className||'').toString().slice(0,40)}`);
                });
            });
            return {
                items,
                foda: !!document.querySelector('.report-foda-section'),
                caracLote: txt.includes('Características del Lote'),
                supEnLote: /Superficie:\s*\d/.test(txt),
                metodologiaLote: /Fitto-Cervini|Valvano/.test(txt),
                metodologiaConstruido: /Ross-Heidecke/.test(txt),
                overflow: overflow.slice(0, 8),
                paginas: document.querySelectorAll('.report-page').length
            };
        }""")
        pdf = page.pdf(format='A4', print_background=True)
        print(f'[{tipo}] paginas={r["paginas"]} pdf={len(pdf)}b errs={errs}')
        print('   index:', json.dumps(r['items'], ensure_ascii=False))
        print(f'   foda={r["foda"]} caracLote={r["caracLote"]} supEnLote={r["supEnLote"]} metLote={r["metodologiaLote"]} metConstr={r["metodologiaConstruido"]}')
        print(f'   overflow={r["overflow"]}')
        browser.close()

    # ============ B. Casa form inputs ============
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:200]))
    page.goto(f"{APP}/tasacion.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(45))})")
    page.goto(f"{APP}/tasacion.html")
    page.wait_for_timeout(2000)
    r = page.evaluate(r"""() => {
        datosTasacion.tipo = 'casa';
        mostrarCaracteristicasCasa();
        const terreno = document.getElementById('superficieTerrenoInput');
        const total = document.getElementById('superficieTotalInput');
        const list = document.getElementById('superficieTotalList');
        const coef = document.getElementById('superficieTotalCoef');
        return {
            terreno: !!terreno, total: !!total, coef: !!coef,
            opciones: list ? list.querySelectorAll('.autocomplete-item').length : 0
        };
    }""")
    print('[form-casa]', json.dumps(r), 'errs:', errs)

    # simulate: terreno=250, select range '200-300 m²', save
    r2 = page.evaluate(r"""() => {
        document.getElementById('superficieTerrenoInput').value = '250';
        const item = [...document.querySelectorAll('#superficieTotalList .autocomplete-item')].find(i => i.textContent.includes('200-300'));
        if (item) item.click();
        guardarDatosCaracteristicasCasa();
        return {
            terreno: datosTasacion.casa.superficieTerreno,
            total: datosTasacion.casa.superficieTotal,
            totalCoef: datosTasacion.casa.superficieTotalCoef
        };
    }""")
    print('[form-casa-save]', json.dumps(r2, ensure_ascii=False), 'errs:', errs)
    browser.close()
print('FIN')

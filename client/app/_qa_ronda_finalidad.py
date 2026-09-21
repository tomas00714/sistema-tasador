# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
CASES = [('T8tl6cXAuHU', 45, 'casa'), ('T7ePR8EkfQH', 3, 'dto'), ('T79TAXJmZTn', 3, 'lote')]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    for code, uid, name in CASES:
        pg = b.new_page(viewport={"width": 1500, "height": 1000})
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
        pg.goto('http://localhost:5501/app/vista-previa-informe.html')
        pg.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
        pg.goto(f'http://localhost:5501/app/vista-previa-informe.html?id={code}')
        pg.wait_for_selector('.report-page', timeout=30000)
        pg.wait_for_timeout(1500)

        r = pg.evaluate('''() => {
            const txt = document.body.innerText;
            const res = {};
            // 1) Índice: sin fila Finalidad dentro del cuadro del solicitante
            const cols = [...document.querySelectorAll('.report-reference-column')];
            const solicitante = cols.find(c => c.textContent.includes('Solicitante'));
            res.filasSolicitante = solicitante ? [...solicitante.querySelectorAll('.report-reference-label')].map(l => l.textContent.trim()) : null;
            // 2) Bloque Finalidad bajo Consideraciones
            const subs = [...document.querySelectorAll('.report-reference-subtitle')];
            const finSub = subs.find(s => s.textContent.trim() === 'Finalidad de la tasación');
            res.finalidadBlock = finSub ? finSub.parentElement.querySelector('p').textContent.trim() : null;
            res.finalidadEditable = finSub ? !!finSub.parentElement.querySelector('[data-editable="finalidadTasacion"]') : null;
            // orden: Consideraciones -> Finalidad dentro de la misma sección
            const consSub = subs.find(s => s.textContent.trim() === 'Consideraciones Previas');
            res.ordenOk = consSub && finSub ? (consSub.compareDocumentPosition(finSub) & 4) !== 0 : null;
            // 3) Introducción ausente
            res.tieneIntroduccion = txt.includes('Introducción');
            // 4) Sección fotos renombrada
            res.tituloFotos = [...document.querySelectorAll('.report-section-title')].map(t => t.textContent.trim()).filter(t => /Documentaci|Fotograf/.test(t));
            res.configLabel = [...document.querySelectorAll('.config-toggle span, .config-field label')].map(l => l.textContent.trim()).filter(t => /documentaci|fotograf/i.test(t));
            // 5) Precio USD en cards
            res.preciosCards = [...document.querySelectorAll('.report-comparable-card-item')].filter(i => /Precio:|Valor\/m2:/.test(i.textContent)).map(i => i.textContent.trim());
            // 6) Valuation: placeholders en filas vacías
            res.valRows = [...document.querySelectorAll('.report-valuation-detail')].map(d => ({
                label: d.querySelector('.report-valuation-detail-label')?.textContent.trim(),
                ph: d.querySelector('[data-editable]')?.dataset.ph || null,
                empty: !!d.querySelector('.is-empty'),
                previewOnly: d.classList.contains('report-preview-only'),
                txt: d.querySelector('.report-valuation-detail-value')?.textContent.trim()
            }));
            res.overflow = [];
            document.querySelectorAll('.report-page').forEach((p, i) => {
                if (p.scrollWidth > p.clientWidth + 2) res.overflow.push(i + 1);
            });
            res.pages = document.querySelectorAll('.report-page').length;
            return res;
        }''')
        print(f'=== {name} ===')
        print('  filas solicitante:', r['filasSolicitante'])
        print('  finalidad block:', repr((r['finalidadBlock'] or '')[:80]), '| editable:', r['finalidadEditable'], '| orden:', r['ordenOk'])
        print('  tiene Introducción:', r['tieneIntroduccion'])
        print('  titulo fotos:', r['tituloFotos'], '| config label:', r['configLabel'])
        print('  precios cards:', r['preciosCards'][:4])
        for v in r['valRows']: print('   valRow:', v)
        print('  pages:', r['pages'], '| overflow:', r['overflow'] or 'ninguno')
        print('  errores JS:', errs or 'ninguno')
        pg.close()
    b.close()

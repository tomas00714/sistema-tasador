# -*- coding: utf-8 -*-
"""QA ronda final: filas vacías en print, +/- valoración, captions, paginación."""
import asyncio, json, os, sys, urllib.request
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"
API = "http://127.0.0.1:8080"

TASACIONES = [
    ("casa", "T8tl6cXAuHU", 45),
    ("departamento", "T7ePR8EkfQH", 3),
    ("lote", "T79TAXJmZTn", 3),
]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

async def open_report(pw, code, uid):
    browser = await pw.chromium.launch(channel="msedge")
    page = await browser.new_page(viewport={"width": 1500, "height": 1000})
    errs = []
    page.on("pageerror", lambda e: errs.append("PE:" + str(e)[:200]))
    page.on("dialog", lambda d: d.accept())
    await page.goto(f"{APP}/vista-previa-informe.html")
    await page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
    await page.goto(f"{APP}/vista-previa-informe.html?id={code}")
    await page.wait_for_selector('.report-page', timeout=60000)
    await page.wait_for_timeout(1000)
    return browser, page, errs

async def main():
    async with async_playwright() as pw:
        for tipo, code, uid in TASACIONES:
            browser, page, errs = await open_report(pw, code, uid)
            try:
                # ===== 1-2. Filas vacías: preview visibles / print ocultas =====
                vacios = await page.evaluate(r"""() => {
                    const sec = [...document.querySelectorAll('.report-section')].find(s =>
                        s.querySelector('h2')?.textContent.includes('Índice de Referencia'));
                    const items = sec ? [...sec.querySelectorAll('.report-reference-item')].map(i => ({
                        l: i.querySelector('.report-reference-label')?.textContent.trim(),
                        v: i.querySelector('.report-reference-value')?.textContent.trim(),
                        po: i.classList.contains('report-preview-only')
                    })) : [];
                    const subtitulosVacios = [...document.querySelectorAll('.report-technical-subtitle')].filter(h => {
                        const block = h.closest('.report-technical-block');
                        return block && ![...block.querySelectorAll('.report-technical-item,.report-technical-item-full,.report-ambiente-item,.report-entorno-item')].length;
                    }).map(h => h.textContent.trim());
                    return {items, subtitulosVacios};
                }""")
                # emular print: ningún preview-only debe ser visible
                await page.emulate_media(media='print')
                print_hidden = await page.evaluate(r"""() => {
                    const bad = [];
                    document.querySelectorAll('.report-preview-only').forEach(el => {
                        if (getComputedStyle(el).display !== 'none') bad.push(el.className.slice(0, 50));
                    });
                    // filas con valor vacío que NO estén marcadas
                    const sinMarcar = [];
                    document.querySelectorAll('.report-reference-item').forEach(i => {
                        const v = i.querySelector('.report-reference-value');
                        if (v && ['', '-', '—'].includes(v.textContent.trim()) && !i.classList.contains('report-preview-only'))
                            sinMarcar.push(i.querySelector('.report-reference-label')?.textContent.trim());
                    });
                    return {visiblesEnPrint: bad, refItemsVaciosSinMarcar: sinMarcar};
                }""")
                await page.emulate_media(media='screen')
                print(f'[{tipo}] indice items:', json.dumps(vacios["items"], ensure_ascii=False))
                print(f'[{tipo}] subtitulos vacios:', vacios["subtitulosVacios"], '| print:', print_hidden)

                # ===== 5-9. Valoración +/- =====
                val = await page.evaluate(r"""async () => {
                    const out = {modalidad: reportConfig.valorModalidad};
                    const sec = () => [...document.querySelectorAll('.report-valuation-detail')];
                    out.filas = sec().map(d => ({
                        l: d.querySelector('.report-valuation-detail-label')?.textContent.trim() || '(oculta)',
                        menos: !!d.querySelector('[data-remove-value]'),
                        mas: !!d.querySelector('[data-restore-value]'),
                        hidden: d.classList.contains('report-valuation-hidden')
                    }));
                    // principal sin botón −
                    out.principalSinMenos = !document.querySelector('.report-valuation-main [data-remove-value]');
                    // ocultar rango estimado
                    const btn = document.querySelector('[data-remove-value="rangoEstimado"]');
                    if (btn) {
                        btn.click();
                        await new Promise(r => setTimeout(r, 2500));
                        out.trasOcultar = {
                            oculto: reportConfig.rangoEstimadoOculto,
                            valorConserva: reportConfig.rangoEstimado,
                            filaPlus: !!document.querySelector('[data-restore-value="rangoEstimado"]'),
                            filaNormal: !!document.querySelector('[data-remove-value="rangoEstimado"]')
                        };
                        // restaurar
                        const add = document.querySelector('[data-restore-value="rangoEstimado"]');
                        add.click();
                        await new Promise(r => setTimeout(r, 2500));
                        out.trasRestaurar = {
                            oculto: reportConfig.rangoEstimadoOculto,
                            filaNormal: !!document.querySelector('[data-remove-value="rangoEstimado"]'),
                            filaPlus: !!document.querySelector('[data-restore-value="rangoEstimado"]')
                        };
                    }
                    return out;
                }""")
                print(f'[{tipo}] valoracion:', json.dumps(val, ensure_ascii=False))

                # ===== print: (+)/(−) nunca aparecen =====
                await page.emulate_media(media='print')
                ctrl = await page.evaluate(r"""() => {
                    const vis = [...document.querySelectorAll('.report-editor-control')]
                        .filter(b => getComputedStyle(b).display !== 'none').length;
                    const hiddenRows = [...document.querySelectorAll('.report-valuation-hidden')]
                        .filter(d => getComputedStyle(d).display !== 'none').length;
                    return {controlesVisibles: vis, filasOcultasVisibles: hiddenRows};
                }""")
                await page.emulate_media(media='screen')
                print(f'[{tipo}] print controles:', ctrl)

                # ===== 3. Paginación A/B =====
                tablas = await page.evaluate(r"""() => {
                    const tabs = [...document.querySelectorAll('.report-table-tech')];
                    if (tabs.length < 2) return {n: tabs.length};
                    const ra = tabs[0].getBoundingClientRect(), rb = tabs[1].getBoundingClientRect();
                    const paginas = [...document.querySelectorAll('.report-page')];
                    const pagA = paginas.findIndex(pg => pg.contains(tabs[0]));
                    const pagB = paginas.findIndex(pg => pg.contains(tabs[1]));
                    return {n: tabs.length, mismaPagina: pagA === pagB, pagA, pagB, totalPags: paginas.length};
                }""")
                print(f'[{tipo}] tablas A/B:', tablas)

                # ===== overflow + PDF =====
                ovf = await page.evaluate(r"""() => {
                    const out = [];
                    document.querySelectorAll('.report-page').forEach((p, i) => {
                        p.querySelectorAll('*').forEach(el => {
                            const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect();
                            // ignorar padding trailing invisible dentro del margen de página
                            if (r.width > 5 && (r.right > pr.right + 1 || r.bottom > pr.bottom + 1))
                                out.push(`p${i}:${(el.className||'').toString().slice(0,45)}`);
                        });
                    });
                    return out.slice(0, 12);
                }""")
                pdf = await page.pdf(format='A4', print_background=True)
                print(f'[{tipo}] overflow={ovf} pdf={len(pdf)}b errores={errs}')
            finally:
                await browser.close()

        # ===== 4. Caption editable + persistencia (dto, que tiene fotos) =====
        browser, page, errs = await open_report(pw, "T7ePR8EkfQH", 3)
        try:
            cap = await page.evaluate(r"""async () => {
                const out = {fotos: fotosTasacion.length};
                const cap0 = document.querySelector('#reportViewer [data-editable="fotoCaption0"]');
                out.captionEditable = !!cap0;
                out.captionAntes = cap0 ? cap0.textContent.trim() : null;
                if (cap0) {
                    cap0.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                    await new Promise(r => setTimeout(r, 150));
                    cap0.innerText = 'QA Frente Test';
                    cap0.dispatchEvent(new InputEvent('input', {bubbles: true}));
                    cap0.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));
                    await new Promise(r => setTimeout(r, 1500));
                    out.despues = fotosTasacion[0]?.description;
                    out.enDom = document.getElementById('reportViewer').innerText.includes('QA Frente Test');
                }
                return out;
            }""")
            print('[dto] caption edit:', json.dumps(cap, ensure_ascii=False))
            # recargar: persiste
            await page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
            await page.wait_for_selector('.report-page', timeout=60000)
            cap2 = await page.evaluate(r"""() => ({
                desc: fotosTasacion[0]?.description,
                enDom: document.getElementById('reportViewer').innerText.includes('QA Frente Test')
            })""")
            print('[dto] caption tras recarga:', cap2)
            # vaciar caption → print sin caption
            await page.evaluate(r"""async () => {
                const cap0 = document.querySelector('#reportViewer [data-editable="fotoCaption0"]');
                cap0.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                await new Promise(r => setTimeout(r, 150));
                cap0.innerText = '';
                cap0.dispatchEvent(new InputEvent('input', {bubbles: true}));
                cap0.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));
                await new Promise(r => setTimeout(r, 1500));
            }""")
            await page.emulate_media(media='print')
            capPrint = await page.evaluate(r"""() => {
                const cap = document.querySelector('.report-photo-caption');
                return {existe: !!cap, display: cap ? getComputedStyle(cap).display : null,
                        desc: fotosTasacion[0]?.description};
            }""")
            print('[dto] caption vacío en print:', capPrint)
            await page.emulate_media(media='screen')
            # restaurar caption original
            await page.evaluate(r"""async () => {
                if (fotosTasacion[0]) { fotosTasacion[0].description = %s; }
                await persistirFotosInmueble();
            }""" % json.dumps(cap.get('captionAntes') or ''))
            await page.wait_for_timeout(600)
            print('[dto] caption restaurado a:', repr(cap.get('captionAntes')))
        finally:
            await browser.close()
    print('FIN')

asyncio.run(main())

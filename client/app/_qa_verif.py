# Verificación final — fotos, índice, FODA, modalidades, dropdown, persistencia, PDF
import asyncio, json, os, sys
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.async_api import async_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
BASE = "http://localhost:5501/app/vista-previa-informe.html"
OUT = r"C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_verif"
os.makedirs(OUT, exist_ok=True)

TASACIONES = [
    ("casa", "T8tl6cXAuHU", 45),
    ("departamento", "T7ePR8EkfQH", 3),
    ("lote", "T79TAXJmZTn", 3),
]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

# pequeño data-URI válido (1x1) con marca distintiva en el src
def durl(tag):
    return f"data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#{tag}"

async def run_case(pw, tipo, code, uid):
    browser = await pw.chromium.launch(channel="msedge")
    page = await browser.new_page(viewport={"width": 1500, "height": 1000})
    errs = []
    page.on("pageerror", lambda e: errs.append("PE:" + str(e)[:250]))
    await page.goto(BASE)
    await page.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
    await page.goto(f"{BASE}?id={code}")
    await page.wait_for_selector('.report-page', timeout=30000)
    await page.wait_for_timeout(2500)
    R = {"tipo": tipo}

    # ============ 1. FOTOGRAFÍAS ============
    # Inyección en memoria (no persiste en DB): 2 fotos inmueble, 3 fotos comp1, 1 foto comp2 (clon)
    R["fotos"] = await page.evaluate(r"""async () => {
        const mk = (tag) => ({url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==#' + tag, description: tag});
        fotosTasacion = [mk('INM1'), mk('INM2')];
        tasacionCargada.fotos = fotosTasacion;
        if (tasacionCargada.datosCompletos) tasacionCargada.datosCompletos.fotos = fotosTasacion;
        const c1 = comparablesResueltos[0];
        if (c1) c1.fotos = [mk('C1A'), mk('C1B'), mk('C1C')];
        // segundo comparable en memoria para probar agrupación sin mezcla
        if (c1 && comparablesResueltos.length === 1) {
            const c2 = JSON.parse(JSON.stringify(c1));
            c2.id = 'CLONE_' + c1.id;
            c2.fotos = [mk('C2A')];
            comparablesResueltos.push(c2);
            tasacionCargada.comparables = comparablesResueltos;
            selectedComparableIds.add('CLONE_' + c1.id);
        } else if (comparablesResueltos.length > 1) {
            comparablesResueltos[1].fotos = [mk('C2A')];
        }
        reportConfig.showPhotos = true;
        setupPhotosState();
        await renderReportPreview();
        await new Promise(r => setTimeout(r, 300));

        const seccInm = document.querySelector('.report-photos-section');
        const seccComp = document.querySelector('.report-comparables-photos-section');
        const srcs = (el) => el ? [...el.querySelectorAll('img')].map(i => i.src) : [];
        const inmSrcs = srcs(seccInm);
        const grupos = seccComp ? [...seccComp.querySelectorAll('.report-comparable-photo-group')].map(g => ({
            titulo: g.querySelector('.report-comparable-card-number')?.textContent.trim(),
            srcs: [...g.querySelectorAll('img')].map(i => i.src.split('#')[1])
        })) : [];
        const img0 = seccInm?.querySelector('img');
        const cs = img0 ? getComputedStyle(img0) : null;
        // overflow dentro de .report-page
        const over = [];
        document.querySelectorAll('.report-page').forEach((pg, i) => {
            const r = pg.getBoundingClientRect();
            pg.querySelectorAll('*').forEach(el => {
                const e = el.getBoundingClientRect();
                if (e.width && e.height && (e.right > r.right + 2 || e.left < r.left - 2))
                    over.push('p' + (i+1) + ':' + el.className);
            });
        });
        return {
            seccInm: !!seccInm, inmSrcs: inmSrcs.map(s => s.split('#')[1]),
            seccComp: !!seccComp, grupos,
            imgRatio: cs ? cs.aspectRatio : null,
            imgFit: cs ? cs.objectFit : null,
            overflow: over.slice(0, 8),
            // mezcla: ninguna foto de comp dentro de la sección inmueble ni viceversa
            mezclaInm: inmSrcs.some(s => s.includes('C1') || s.includes('C2')),
            mezclaComp: grupos.flatMap(g => g.srcs).some(s => s.includes('INM'))
        };
    }""")

    # Sin fotos -> sin secciones ni placeholders
    R["fotos_vacio"] = await page.evaluate(r"""async () => {
        fotosTasacion = [];
        tasacionCargada.fotos = [];
        if (tasacionCargada.datosCompletos) tasacionCargada.datosCompletos.fotos = [];
        comparablesResueltos.forEach(c => { c.fotos = []; });
        setupPhotosState();
        await renderReportPreview();
        await new Promise(r => setTimeout(r, 300));
        const ph = [...document.querySelectorAll('.report-photo-placeholder')].length;
        // hueco anormal: sección de fotos presente sin imgs, o gap > 30mm sin contenido
        return {
            seccInm: !!document.querySelector('.report-photos-section'),
            seccComp: !!document.querySelector('.report-comparables-photos-section'),
            placeholders: ph
        };
    }""")

    # ============ 2. ÍNDICE ============
    R["indice"] = await page.evaluate(r"""() => {
        const col = document.querySelector('.report-reference-column');
        const item = col?.querySelector('.report-reference-item');
        const lab = item?.querySelector('.report-reference-label');
        const val = item?.querySelector('.report-reference-value');
        const sub = col?.querySelector('.report-reference-subtitle');
        const cs = el => el ? getComputedStyle(el) : {};
        return {
            borderColor: cs(col).borderColor,
            labelBg: cs(lab).backgroundColor,
            labelBorder: cs(lab).borderRightColor,
            valueBg: cs(val).backgroundColor,
            subtitleBg: cs(sub).backgroundColor,
            itemRadius: cs(item).borderRadius,
            colRadius: cs(col).borderRadius
        };
    }""")

    # ============ 3. FODA ============
    R["foda"] = await page.evaluate(r"""async () => {
        const cb = document.getElementById('showFODA');
        if (!cb || cb.disabled) return {deshabilitado: true};
        cb.checked = true; cb.dispatchEvent(new Event('change'));
        await new Promise(r => setTimeout(r, 1200));
        const vacio = () => {
            const s = document.querySelector('.report-foda-section');
            if (!s) return null;
            return {
                seccionPreviewOnly: s.classList.contains('report-preview-only'),
                bloques: [...s.querySelectorAll('.report-foda-block')].map(b => ({
                    previewOnly: b.classList.contains('report-preview-only'),
                    ph: b.querySelector('[data-editable]')?.dataset.ph,
                    emptyAttr: b.querySelector('[data-editable]')?.hasAttribute('data-empty')
                }))
            };
        };
        const antes = vacio();
        // un cuadro con contenido
        reportConfig.fodaFortalezas = 'Ubicación céntrica y buen estado general.';
        await renderReportPreview();
        await new Promise(r => setTimeout(r, 300));
        const s = document.querySelector('.report-foda-section');
        const bloques = s ? [...s.querySelectorAll('.report-foda-block')].map(b => ({
            titulo: b.querySelector('.report-foda-title')?.textContent.trim(),
            previewOnly: b.classList.contains('report-preview-only'),
            texto: b.querySelector('.report-foda-content')?.textContent.trim().slice(0, 40)
        })) : [];
        reportConfig.fodaFortalezas = '';
        await renderReportPreview();
        return {antes, conContenido: bloques};
    }""")

    # ============ 4. MODALIDADES ============
    async def set_mod(m):
        await page.evaluate(f"""() => {{
            const s = document.getElementById('valorModalidad');
            s.value = '{m}'; s.dispatchEvent(new Event('change'));
        }}""")
        await page.wait_for_timeout(1300)

    async def valuacion():
        return await page.evaluate(r"""() => {
            const sec = [...document.querySelectorAll('.report-section')].find(s =>
                s.querySelector('h2') && s.querySelector('h2').textContent.includes('Valor de Tasación'));
            if (!sec) return {error: 'sin seccion'};
            return {
                label: sec.querySelector('.report-valuation-label')?.textContent.trim(),
                value: sec.querySelector('.report-valuation-value')?.textContent.trim(),
                details: [...sec.querySelectorAll('.report-valuation-detail')].map(d =>
                    d.querySelector('.report-valuation-detail-label')?.textContent.trim() + '=>' +
                    d.querySelector('.report-valuation-detail-value')?.textContent.trim()),
                minus: !!sec.querySelector('.report-editor-control'),
                editables: [...sec.querySelectorAll('[data-editable]')].map(e => e.dataset.editable)
            };
        }""")

    R["mod"] = {}
    for m in ("tasacion", "rango", "publicacion", "cierre"):
        await set_mod(m)
        R["mod"][m] = await valuacion()

    # tasacion: quitar valor -> m2 no es 0; reintroducir -> recalcula; rangoEstimado editable+persiste
    await set_mod("tasacion")
    await page.evaluate("""() => {
        document.querySelector('.report-editor-control[data-remove-value="valorTasacion"]')?.dispatchEvent(
            new MouseEvent('click', {bubbles: true}));
    }""")
    await page.wait_for_timeout(1300)
    R["mod"]["tasacion_sin_valor"] = await valuacion()
    # reintroducir valor manualmente
    R["mod"]["tasacion_reintroducido"] = await page.evaluate(r"""async () => {
        const el = document.querySelector('[data-editable="valorTasacion"]');
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await new Promise(r => setTimeout(r, 80));
        el.textContent = '200000';
        el.blur();
        await new Promise(r => setTimeout(r, 1500));
        const sec = [...document.querySelectorAll('.report-section')].find(s =>
            s.querySelector('h2') && s.querySelector('h2').textContent.includes('Valor de Tasación'));
        return {
            config: reportConfig.valorTasacion,
            value: sec.querySelector('.report-valuation-value')?.textContent.trim(),
            m2: sec.querySelector('.report-valuation-detail-value')?.textContent.trim()
        };
    }""")
    # rangoEstimado editable y persistente tras re-render
    R["mod"]["rango_estimado_edit"] = await page.evaluate(r"""async () => {
        const el = document.querySelector('[data-editable="rangoEstimado"]');
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await new Promise(r => setTimeout(r, 80));
        el.textContent = 'USD 180.000 — 220.000';
        el.blur();
        await new Promise(r => setTimeout(r, 1500));
        const el2 = document.querySelector('[data-editable="rangoEstimado"]');
        return {config: reportConfig.rangoEstimado, dom: el2?.textContent.trim()};
    }""")

    # rango: editar min/max via DOM real y verificar recalculo de m2
    await set_mod("rango")
    R["mod"]["rango_edit_real"] = await page.evaluate(r"""async () => {
        const editar = async (key, val) => {
            const el = document.querySelector(`[data-editable="${key}"]`);
            el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
            await new Promise(r => setTimeout(r, 60));
            el.textContent = val;
            el.blur();
            await new Promise(r => setTimeout(r, 1400));
        };
        await editar('valorRangoMin', '40000');
        await editar('valorRangoMax', '60000');
        const sec = [...document.querySelectorAll('.report-section')].find(s =>
            s.querySelector('h2') && s.querySelector('h2').textContent.includes('Valor de Tasación'));
        return {
            value: sec.querySelector('.report-valuation-value')?.textContent.trim(),
            details: [...sec.querySelectorAll('.report-valuation-detail')].map(d => d.textContent.trim()),
            hayRangoEstimado: sec.textContent.includes('Rango estimado')
        };
    }""")

    # publicacion: quitar valor -> m2 '—'
    await set_mod("publicacion")
    await page.evaluate("""() => {
        document.querySelector('.report-editor-control[data-remove-value="valorTasacion"]')?.dispatchEvent(
            new MouseEvent('click', {bubbles: true}));
    }""")
    await page.wait_for_timeout(1300)
    R["mod"]["publicacion_sin_valor"] = await valuacion()
    await page.evaluate("reportConfig.valorTasacionOculto = false; renderReportPreview()")
    await page.wait_for_timeout(800)

    # ============ 5. DROPDOWN ============
    await page.click('#valorModalidadBtn')
    await page.wait_for_timeout(250)
    R["dropdown"] = await page.evaluate(r"""() => {
        const btn = document.getElementById('valorModalidadBtn');
        const menu = document.getElementById('valorModalidadMenu');
        const opt = menu?.querySelector('.config-dropdown-option');
        const sel = menu?.querySelector('.config-dropdown-option.selected');
        const panel = document.querySelector('.config-panel');
        const mr = menu?.getBoundingClientRect();
        const pr = panel?.getBoundingClientRect();
        const cs = getComputedStyle(btn);
        return {
            abierto: !menu?.hidden,
            fontFamily: cs.fontFamily, border: cs.border, radius: cs.borderRadius,
            minHeight: cs.minHeight, padding: cs.padding,
            opciones: menu?.children.length,
            optHoverTieneBg: !!opt,
            selectedText: sel?.textContent.trim(),
            menuOverflowX: mr && pr ? (mr.right > pr.right + 2 || mr.left < pr.left - 2) : null
        };
    }""")
    await page.keyboard.press("Escape")

    # ============ 6. PERSISTENCIA (in-session) ============
    # valorCierre en modalidad cierre + recarga de config (re-render) -> persiste
    await set_mod("cierre")
    R["persistencia_cierre"] = await page.evaluate(r"""async () => {
        const el = document.querySelector('[data-editable="valorCierre"]');
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await new Promise(r => setTimeout(r, 80));
        el.textContent = '47000';
        el.blur();
        await new Promise(r => setTimeout(r, 1500));
        const el2 = document.querySelector('[data-editable="valorCierre"]');
        return {config: reportConfig.valorCierre, dom: el2?.textContent.trim()};
    }""")

    # ============ 7. PDF ============
    await set_mod("tasacion")
    await page.wait_for_timeout(800)
    await page.emulate_media(media="print")
    R["print"] = await page.evaluate(r"""() => ({
        minusDisplay: (() => { const b = document.querySelector('.report-editor-control'); return b ? getComputedStyle(b).display : 'sin-boton'; })(),
        placeholdersVisibles: (() => {
            // elementos is-empty cuyo ::before mostraría data-ph: en print content:none
            const el = document.querySelector('.report-editable.is-empty');
            if (!el) return 'sin-is-empty';
            return getComputedStyle(el, '::before').content;
        })(),
        previewOnlyOcultos: [...document.querySelectorAll('.report-preview-only')].every(el => getComputedStyle(el).display === 'none'),
        seccFotosVacias: (() => {
            const s1 = document.querySelector('.report-photos-section');
            const s2 = document.querySelector('.report-comparables-photos-section');
            return {s1: !!s1, s2: !!s2};
        })()
    })""")
    await page.emulate_media(media="screen")
    pdf = await page.pdf(format="A4", print_background=True)
    with open(os.path.join(OUT, f"verif_{tipo}.pdf"), "wb") as f:
        f.write(pdf)
    R["pdf_bytes"] = len(pdf)
    R["overflow_final"] = await page.evaluate(r"""() => {
        const bad = [];
        document.querySelectorAll('.report-page').forEach((pg, i) => {
            const r = pg.getBoundingClientRect();
            pg.querySelectorAll('*').forEach(el => {
                const e = el.getBoundingClientRect();
                if (e.width && e.height && (e.right > r.right + 2 || e.left < r.left - 2))
                    bad.push('p' + (i+1) + ':' + el.className);
            });
        });
        return bad.slice(0, 8);
    }""")
    R["paginas"] = await page.evaluate("document.querySelectorAll('.report-page').length")
    R["errores"] = errs[:8]
    await browser.close()
    return R

async def main():
    async with async_playwright() as pw:
        results = []
        for tipo, code, uid in TASACIONES:
            try:
                results.append(await run_case(pw, tipo, code, uid))
            except Exception as e:
                results.append({"tipo": tipo, "error": str(e)[:500]})
        with open(os.path.join(OUT, "verif.json"), "w", encoding="utf-8") as f:
            f.write(json.dumps(results, ensure_ascii=False, indent=1))
        print("OK")

asyncio.run(main())

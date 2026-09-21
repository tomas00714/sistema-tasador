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

tok = token(3)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()
    page.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    page.on("dialog", lambda d: d.accept())
    page.goto(f"{APP}/vista-previa-informe.html")
    page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(tok)})")
    page.goto(f"{APP}/vista-previa-informe.html?id=T7ePR8EkfQH")
    page.wait_for_selector('.report-page', timeout=60000)

    # modalidad rango y esperar a que el render termine de verdad
    page.evaluate(r"""async () => {
        const sel = document.getElementById('valorModalidad');
        sel.value = 'rango';
        sel.dispatchEvent(new Event('change', {bubbles: true}));
    }""")
    page.wait_for_timeout(4000)

    r = page.evaluate(r"""async () => {
        const out = {};
        const el = document.querySelector('#reportViewer [data-editable="valorRangoMin"]');
        if (!el) return {err: 'sin elemento'};
        out.outer = el.outerHTML.slice(0, 200);
        // simular el flujo real: click → editar → blur
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await new Promise(r => setTimeout(r, 150));
        out.trasClick = {editing: editingElement === el, ce: el.contentEditable,
                         focused: document.activeElement === el,
                         raw: el.dataset.raw, texto: el.textContent};
        el.innerText = '1234567';
        el.dispatchEvent(new InputEvent('input', {bubbles: true}));
        el.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));
        await new Promise(r => setTimeout(r, 1500));
        out.config = reportConfig.valorRangoMin;
        return out;
    }""")
    print(json.dumps(r, ensure_ascii=False, indent=1))
    browser.close()

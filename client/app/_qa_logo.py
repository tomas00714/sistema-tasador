# -*- coding: utf-8 -*-
import sys, io, os, tempfile, struct, zlib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

def make_png(path, w=160, h=160, rgb=(40, 90, 160)):
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))

tmp = tempfile.mkdtemp()
img = os.path.join(tmp, 'logo.png'); make_png(img)

with sync_playwright() as p:
    b = p.chromium.launch()

    # ============ dto (uid 3, CON logo) ============
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    pg.goto('http://localhost:5501/login.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
    pg.goto('http://localhost:5501/app/vista-previa-informe.html?id=T7ePR8EkfQH')
    pg.wait_for_selector('.report-page', timeout=30000)
    pg.wait_for_timeout(1200)
    print('=== dto (con logo) ===')
    print('  showLogo checked:', pg.evaluate("document.getElementById('showLogo').checked"))
    print('  logo img en portada:', pg.evaluate("!!document.querySelector('.report-cover-logo')"))
    print('  aviso presente:', pg.evaluate("!!document.getElementById('reportLogoNotice')"))
    # desmarcar → oculta logo; remarcar → reaparece
    pg.click('#showLogo')
    pg.wait_for_timeout(800)
    print('  tras desmarcar: logo visible:', pg.evaluate("!!document.querySelector('.report-cover-logo')"), '| aviso:', pg.evaluate("!!document.getElementById('reportLogoNotice')"))
    pg.click('#showLogo')
    pg.wait_for_timeout(800)
    print('  tras remarcar: logo visible:', pg.evaluate("!!document.querySelector('.report-cover-logo')"))
    pg.close()

    # ============ casa (uid 45, SIN logo) ============
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    pg.goto('http://localhost:5501/login.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(45)}')")
    pg.goto('http://localhost:5501/app/vista-previa-informe.html?id=T8tl6cXAuHU')
    pg.wait_for_selector('.report-page', timeout=30000)
    pg.wait_for_timeout(1200)
    print('=== casa (sin logo) ===')
    print('  showLogo checked inicial:', pg.evaluate("document.getElementById('showLogo').checked"))
    print('  logo img:', pg.evaluate("!!document.querySelector('.report-cover-logo')"))
    # activar sin logo → aviso
    pg.click('#showLogo')
    pg.wait_for_timeout(800)
    print('  aviso tras activar:', pg.evaluate("!!document.getElementById('reportLogoNotice')"))
    # cancelar → checkbox off, aviso fuera
    pg.click('.report-logo-notice-cancelar')
    pg.wait_for_timeout(600)
    print('  tras cancelar: checked:', pg.evaluate("document.getElementById('showLogo').checked"),
          '| aviso:', pg.evaluate("!!document.getElementById('reportLogoNotice')"))
    # activar de nuevo → aviso → Agregar → file chooser → cropper → confirma
    pg.click('#showLogo')
    pg.wait_for_timeout(600)
    with pg.expect_file_chooser(timeout=5000) as fc:
        pg.click('.report-logo-notice-agregar')
    fc.value.set_files(img)
    pg.wait_for_selector('.icrop-overlay', timeout=15000)
    print('  cropper abierto para logo:', True)
    pg.click('.icrop-btn-confirmar')
    pg.wait_for_timeout(3000)
    print('  tras subir: aviso:', pg.evaluate("!!document.getElementById('reportLogoNotice')"),
          '| checked:', pg.evaluate("document.getElementById('showLogo').checked"),
          '| logo img:', pg.evaluate("!!document.querySelector('.report-cover-logo')"))
    print('  profesional.logo actualizado:', pg.evaluate("profesionalActual?.logo_inmobiliaria"))
    pg.close()
    b.close()

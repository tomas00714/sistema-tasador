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

def make_png(path, w=120, h=160, rgb=(60, 120, 60)):
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b''))

tmp = tempfile.mkdtemp()
img = os.path.join(tmp, 'comp.png'); make_png(img)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:200]))
    pg.on("dialog", lambda d: print("DIALOG:", d.message[:120]) or d.accept())
    pg.goto('http://localhost:5501/login.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
    pg.goto('http://localhost:5501/app/vista-previa-informe.html?id=T79TAXJmZTn')
    pg.wait_for_selector('.report-page', timeout=30000)
    pg.wait_for_timeout(1200)

    # fotos actuales del primer comparable
    info = pg.evaluate("""(() => {
        const c = comparablesResueltos[0];
        return {id: c.id, fotos: (c.fotos||[]).length};
    })()""")
    print('comparable:', info)
    # setear compId y disparar input
    pg.evaluate(f"document.getElementById('comparablePhotoUpload').dataset.compId = '{info['id']}'")
    pg.set_input_files('#comparablePhotoUpload', img)
    pg.wait_for_timeout(2500)
    print('cropper modal (comparable):', pg.evaluate("!!document.querySelector('.icrop-overlay')"))
    pg.click('.icrop-btn-confirmar')
    pg.wait_for_timeout(2500)
    despues = pg.evaluate(f"(comparablesResueltos.find(c=>c.id==='{info['id']}').fotos||[]).length")
    print('fotos tras confirmar:', despues, '(antes:', info['fotos'], ')')
    # limpiar: quitar la foto agregada
    pg.evaluate(f"quitarFotoComparable('{info['id']}', {despues-1})")
    pg.wait_for_timeout(1500)
    print('fotos tras limpieza:', pg.evaluate(f"(comparablesResueltos.find(c=>c.id==='{info['id']}').fotos||[]).length"))
    b.close()

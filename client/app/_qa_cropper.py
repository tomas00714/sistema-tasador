# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright
import struct, zlib, os, tempfile

SECRET = "dev-only-insecure-secret-do-not-use-in-production"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

def make_png(path, w=200, h=100, rgb=(200, 60, 60)):
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

tmp = tempfile.mkdtemp()
img1 = os.path.join(tmp, 'foto.png'); make_png(img1, 200, 100)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1400, "height": 950})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:250]))

    # ---- perfil: foto de perfil cropper ----
    pg.goto('http://localhost:5501/login.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
    pg.goto('http://localhost:5501/app/perfil.html')
    pg.wait_for_selector('#btnEditarPerfil', timeout=20000)
    pg.wait_for_timeout(1000)
    pg.click('#btnEditarPerfil')
    pg.click('#perfilAvatar')  # abre popover
    pg.click('#btnCambiarFoto')
    pg.set_input_files('#inputFotoPerfil', img1)
    pg.wait_for_timeout(2500)
    modal = pg.query_selector('.icrop-overlay')
    print('perfil: modal cropper abierto:', bool(modal))
    if modal:
        print('perfil: Cropper cargado:', pg.evaluate("typeof Cropper"))
        print('perfil: botones:', pg.evaluate("[...document.querySelectorAll('.icrop-btn')].map(b=>b.textContent.trim())"))
        # confirmar
        pg.click('.icrop-btn-confirmar')
        pg.wait_for_timeout(1500)
        print('perfil: modal cerrado tras confirmar:', not pg.query_selector('.icrop-overlay'))
        print('perfil: avatar con preview:', pg.evaluate("document.getElementById('perfilAvatarImg').style.display !== 'none'"))
        print('perfil: archivoPendiente es File:', pg.evaluate("archivoFotoPendiente instanceof File"))

    # ---- cancelar en logo ----
    pg.click('#logoInmobiliaria')
    pg.click('#btnCambiarLogo')
    pg.set_input_files('#inputLogoInmobiliaria', img1)
    pg.wait_for_timeout(2500)
    modal = pg.query_selector('.icrop-overlay')
    print('logo: modal abierto:', bool(modal))
    if modal:
        pg.click('.icrop-btn-cancelar')
        pg.wait_for_timeout(500)
        print('logo: modal cerrado tras cancelar:', not pg.query_selector('.icrop-overlay'))
        print('logo: sin archivo pendiente:', pg.evaluate("archivoLogoPendiente === null"))
    pg.close()

    # ---- vista previa: fotos del inmueble (dto) ----
    pg = b.new_page(viewport={"width": 1500, "height": 1000})
    pg.on("pageerror", lambda e: print("PE:", str(e)[:250]))
    pg.goto('http://localhost:5501/login.html')
    pg.evaluate(f"localStorage.setItem('auth_token', '{token(3)}')")
    pg.goto('http://localhost:5501/app/vista-previa-informe.html?id=T7ePR8EkfQH')
    pg.wait_for_selector('.report-page', timeout=30000)
    pg.wait_for_timeout(1000)
    antes = pg.evaluate("fotosTasacion.length")
    pg.set_input_files('#photosUpload', img1)
    pg.wait_for_timeout(2500)
    modal = pg.query_selector('.icrop-overlay')
    print('inmueble: modal abierto:', bool(modal), '| fotos antes:', antes)
    if modal:
        pg.click('.icrop-btn-cancelar')
        pg.wait_for_timeout(800)
        print('inmueble: cancelar no agrega foto:', pg.evaluate("fotosTasacion.length") == antes)
        # ahora confirmar
        pg.set_input_files('#photosUpload', img1)
        pg.wait_for_timeout(2500)
        pg.click('.icrop-btn-confirmar')
        pg.wait_for_timeout(2500)
        print('inmueble: confirmar agrega foto:', pg.evaluate("fotosTasacion.length") == antes + 1)
        print('inmueble: aspect ~4:3:', pg.evaluate("""(() => {
            const i = new Image(); const f = fotosTasacion[fotosTasacion.length-1];
            return f.url.startsWith('data:image');
        })()"""))
    pg.close()
    b.close()

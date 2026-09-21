# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from datetime import datetime, timedelta
from jose import jwt
from playwright.sync_api import sync_playwright
import fitz, os

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
OUT = r"C:\Users\tomas\Desktop\proyecto-tasador\client\app\_qa_pdf_imgs"
os.makedirs(OUT, exist_ok=True)

CASES = [('T7ePR8EkfQH', 3, 'dto')]

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

with sync_playwright() as p:
    b = p.chromium.launch()
    for code, uid, name in CASES:
        pg = b.new_page(viewport={"width": 1500, "height": 1000})
        pg.on("pageerror", lambda e: print(f"[{name}] PE:", str(e)[:200]))
        pg.goto('http://localhost:5501/app/vista-previa-informe.html')
        pg.evaluate(f"localStorage.setItem('auth_token', '{token(uid)}')")
        pg.goto(f'http://localhost:5501/app/vista-previa-informe.html?id={code}')
        pg.wait_for_selector('.report-page', timeout=30000)
        pg.wait_for_timeout(1500)
        pdf_path = os.path.join(OUT, f'{name}.pdf')
        pg.emulate_media(media='print')
        pg.pdf(path=pdf_path, format='A4', print_background=True)
        pg.close()
        doc = fitz.open(pdf_path)
        print(f"{name}: {len(doc)} paginas, {os.path.getsize(pdf_path)//1024}KB")
        for i, page in enumerate(doc):
            pix = page.get_pixmap(dpi=110)
            pix.save(os.path.join(OUT, f'{name}_p{i+1}.png'))
        doc.close()
    b.close()
print("done ->", OUT)

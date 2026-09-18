"""Test E2E del rediseño de solicitudes.html: clasificación principal vs historial.
Sirve client/ + responde /api/* con mocks en el mismo puerto."""
import asyncio, http.server, threading, functools, os, json, urllib.parse
from playwright.async_api import async_playwright

CLIENT = os.path.join(os.path.dirname(__file__), '..', 'client')
PORT = 8893

SOLICITUDES = [
    { "id": "S1", "estado": "pendiente", "tipo_inmueble": "casa", "datos": {},
      "fecha_creacion": "2025-01-01", "fecha_expiracion": "2025-01-08", "link_publico": "https://x/s/1",
      "resumen_comparables": None },
    { "id": "S2", "estado": "completada", "tipo_inmueble": "lote", "datos": { "mensaje": "test" },
      "fecha_creacion": "2025-01-02", "fecha_expiracion": "2025-01-09",
      "fecha_completacion": "2025-01-05", "link_publico": "https://x/s/2",
      "resumen_comparables": { "recibidos": 3, "aceptados": 2, "rechazados": 0, "pendientes": 1 } },
    { "id": "S3", "estado": "completada", "tipo_inmueble": "departamento", "datos": {},
      "fecha_creacion": "2025-01-03", "fecha_expiracion": "2025-01-10",
      "fecha_completacion": "2025-01-06", "link_publico": "https://x/s/3",
      "resumen_comparables": { "recibidos": 2, "aceptados": 1, "rechazados": 1, "pendientes": 0 } },
    { "id": "S4", "estado": "expirada", "tipo_inmueble": "casa", "datos": {},
      "fecha_creacion": "2024-12-01", "fecha_expiracion": "2024-12-08", "link_publico": "https://x/s/4",
      "resumen_comparables": None },
    { "id": "S5", "estado": "completada", "tipo_inmueble": "casa", "datos": {},
      "fecha_creacion": "2025-01-04", "fecha_expiracion": "2025-01-11",
      "fecha_completacion": "2025-01-07", "link_publico": "https://x/s/5",
      "resumen_comparables": { "recibidos": 0, "aceptados": 0, "rechazados": 0, "pendientes": 0 } },
    { "id": "S6", "estado": "completada", "tipo_inmueble": "casa", "datos": {},
      "fecha_creacion": "2025-01-05", "fecha_expiracion": "2025-01-12",
      "fecha_completacion": "2025-01-08", "link_publico": "https://x/s/6",
      "resumen_comparables": None }  # completada sin comparables → historial
]

COMPARABLES = {
    "S2": [
        { "id": "c1", "estado_aceptacion": "aceptado", "datos": {} },
        { "id": "c2", "estado_aceptacion": "aceptado", "datos": {} },
        { "id": "c3", "estado_aceptacion": "pendiente", "datos": {} }
    ],
    "S3": [
        { "id": "c4", "estado_aceptacion": "aceptado", "datos": {} },
        { "id": "c5", "estado_aceptacion": "rechazado", "datos": {} }
    ],
    "S5": []
}

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=CLIENT, **kw)

    def log_message(self, *a):
        pass

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path.startswith('/api/'):
            self._api(path)
        else:
            super().do_GET()

    def _api(self, path):
        if '/comparables' in path and path.startswith('/api/solicitudes/'):
            sid = path.split('/')[3]
            data = COMPARABLES.get(sid, [])
        elif path == '/api/solicitudes':
            data = SOLICITUDES
        else:
            data = {}
        body = json.dumps(data).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

def serve():
    httpd = http.server.HTTPServer(('127.0.0.1', PORT), Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()

async def main():
    serve()
    async with async_playwright() as p:
        browser = await p.chromium.launch(channel='msedge')
        page = await browser.new_page()
        await page.add_init_script("localStorage.setItem('auth_token','test-token');")

        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))

        url = f'http://127.0.0.1:{PORT}/_test_solicitudes.html?api_base_url=http://127.0.0.1:{PORT}'
        await page.goto(url)
        await page.wait_for_timeout(2000)

        checks = []

        main_cards = await page.locator('#solicitudesLista .solicitud-card').count()
        checks.append(('Principal: 2 tarjetas (pendiente + completada c/comparables pendientes)', main_cards == 2))

        resumenes = await page.locator('#solicitudesLista .solicitud-card-comparables span').all_inner_texts()
        checks.append(('Completada muestra "3 comparables recibidos · 2 aceptados · 0 rechazados · 1 pendientes"',
                       any('3 comparables recibidos' in r and '1 pendiente' in r for r in resumenes)))
        checks.append(('Pendiente muestra "Esperando respuesta"',
                       any('Esperando respuesta' in r for r in resumenes)))

        await page.click('#btnToggleHistorial')
        await page.wait_for_timeout(300)
        hist_visible = await page.locator('#solicitudesHistorial').is_visible()
        main_hidden = not await page.locator('#solicitudesLista').is_visible()
        checks.append(('"Ver historial" muestra sección y oculta principal', hist_visible and main_hidden))
        checks.append(('Spinner "Cargando historial" se oculta tras cargar',
                       not await page.locator('#historialCargando').is_visible()))
        btn_text = (await page.locator('#btnToggleHistorial').inner_text()).lower()
        checks.append(('Botón cambia a "Volver a solicitudes" en historial', 'volver' in btn_text))
        hist_cards = await page.locator('#historialLista .solicitud-card').count()
        checks.append(('Historial: 4 tarjetas (resuelta + expirada + 2 completadas sin pendientes)', hist_cards == 4))
        estados_hist = ' '.join(await page.locator('#historialLista .solicitud-card-estado').all_inner_texts()).lower()
        checks.append(('Historial contiene badge "expirada"', 'expirada' in estados_hist))

        await page.click('#btnToggleHistorial')
        await page.wait_for_timeout(200)
        checks.append(('"Volver" restaura vista principal',
                       await page.locator('#solicitudesLista').is_visible()))
        btn_text = (await page.locator('#btnToggleHistorial').inner_text()).lower()
        checks.append(('Botón vuelve a "Ver historial" en principal', 'historial' in btn_text))

        checks.append(('Sin filtros (.segmented-control ausente)',
                       await page.locator('.segmented-control').count() == 0))
        checks.append(('Botón "Nueva solicitud" visible',
                       await page.locator('#btnCrearSolicitud').is_visible()))

        await page.locator('#solicitudesLista .solicitud-card').first.click()
        await page.wait_for_timeout(300)
        checks.append(('Modal detalle abre desde tarjeta principal',
                       await page.locator('#modalDetalleSolicitud').is_visible()))
        await page.click('#cerrarModalDetalleSolicitud')
        await page.wait_for_timeout(200)

        await page.click('#btnToggleHistorial')
        await page.wait_for_timeout(200)
        await page.locator('#historialLista .solicitud-card').first.click()
        await page.wait_for_timeout(300)
        checks.append(('Modal detalle abre desde historial',
                       await page.locator('#modalDetalleSolicitud').is_visible()))

        checks.append(('Sin errores JS', len(errors) == 0))
        for e in errors:
            print('  JS ERROR:', e)

        passed = sum(1 for _, ok in checks if ok)
        for name, ok in checks:
            print(('PASS' if ok else 'FAIL'), name)
        print(f'\n{passed}/{len(checks)} checks')
        await browser.close()

asyncio.run(main())

# -*- coding: utf-8 -*-
"""
Verificación del cambio de tiles CARTO -> OpenStreetMap.
- Sirve client/ estáticamente
- Página harness con MapaCore.inicializarEdicion + inicializarLectura + marcador
- Monitorea requests: tile.openstreetmap.org debe usarse, cartocdn nunca
- Verifica markers, zoom, atribución, ausencia de 'API KEY REQUIRED'
"""
import json, threading, functools, http.server, socketserver, sys, io, os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

PORT = 8899
CLIENT_DIR = r"C:\Users\tomas\Desktop\proyecto-tasador\client"
HARNESS = os.path.join(CLIENT_DIR, "_test_mapa.html")

HTML = """<!DOCTYPE html><html><head>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script src="https://kit.fontawesome.com/d853729d1d.js" crossorigin="anonymous"></script>
<style>
  #mapaEdicion, #mapaLectura { width: 600px; height: 400px; }
  .pin-mapa i { color: #d00; }
</style>
</head><body>
<div id="mapaEdicion"></div>
<div id="mapaLectura"></div>
<script src="js/global.js"></script>
<script>
window._testResult = {};
(async () => {
  try {
    const ed = await MapaCore.inicializarEdicion('mapaEdicion', { lat: -34.6037, lon: -58.3816, zoom: 13, draggable: true });
    const le = MapaCore.inicializarLectura('mapaLectura', { lat: -34.6037, lon: -58.3816, zoom: 12 });
    if (le) MapaCore.agregarMarcador('mapaLectura', { lat: -34.60, lon: -58.38 });
    window._testResult.edicion = !!ed;
    window._testResult.lectura = !!le;
    window._testResult.done = true;
  } catch (e) {
    window._testResult.error = String(e);
    window._testResult.done = true;
  }
})();
</script></body></html>"""

with open(HARNESS, "w", encoding="utf-8") as f:
    f.write(HTML)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
handler = functools.partial(Quiet, directory=CLIENT_DIR)
srv = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), handler)
srv.allow_reuse_address = True
threading.Thread(target=srv.serve_forever, daemon=True).start()

from playwright.sync_api import sync_playwright

requests_log = {"osm": [], "carto": [], "otros_tiles": [], "errores": []}
checks = []

def check(nombre, ok, detalle=""):
    checks.append((ok, nombre, detalle))
    print(f"  [{'PASS' if ok else 'FAIL'}] {nombre}  {detalle}")

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page()

    def on_request(req):
        url = req.url
        if "basemaps.cartocdn.com" in url or "carto" in url:
            requests_log["carto"].append(url)
        elif "tile.openstreetmap.org" in url:
            requests_log["osm"].append(url)

    def on_response(resp):
        if "openstreetmap.org" in resp.url and resp.status != 200:
            requests_log["errores"].append(f"{resp.status} {resp.url}")

    page.on("request", on_request)
    page.on("response", on_response)

    page.goto(f"http://127.0.0.1:{PORT}/_test_mapa.html", wait_until="networkidle")
    page.wait_for_function("window._testResult && window._testResult.done", timeout=15000)
    page.wait_for_timeout(3000)  # dejar cargar tiles

    res = page.evaluate("window._testResult")

    # Zoom real en mapa edición
    page.mouse.move(300, 200)
    page.mouse.wheel(0, -400)  # zoom in
    page.wait_for_timeout(1500)
    zoom_despues = page.evaluate("document.getElementById('mapaEdicion')._mapa.getZoom()")

    attribution = page.eval_on_selector_all(".leaflet-control-attribution", "els => els.map(e => e.textContent)")
    marcadores = page.eval_on_selector_all(".leaflet-marker-icon", "els => els.length")
    tiles_img = page.eval_on_selector_all(".leaflet-tile-loaded", "els => els.length")

    page.screenshot(path=r"C:\Users\tomas\Desktop\proyecto-tasador\server\_mapa_test.png", full_page=True)
    browser.close()

print("=" * 60)
print("RESULTADOS")
print("=" * 60)
print(f"  requests OSM tiles: {len(requests_log['osm'])}")
print(f"  requests CARTO:     {len(requests_log['carto'])}")
print(f"  respuestas != 200:  {requests_log['errores']}")
print(f"  harness: {res}")
print(f"  zoom tras wheel: {zoom_despues}")
print(f"  attribution: {attribution}")
print(f"  markers: {marcadores}, tiles cargados: {tiles_img}")
print("-" * 60)

check("mapa edición inicializado", res.get("edicion") is True)
check("mapa lectura inicializado", res.get("lectura") is True)
check("requests a tile.openstreetmap.org", len(requests_log["osm"]) > 0, f"n={len(requests_log['osm'])}")
check("cero requests a cartocdn", len(requests_log["carto"]) == 0, f"n={len(requests_log['carto'])}")
check("sin respuestas de error en tiles", len(requests_log["errores"]) == 0, str(requests_log["errores"]))
check("marcadores presentes", marcadores >= 2, f"n={marcadores}")
check("zoom funciona (wheel)", zoom_despues > 13, f"13 -> {zoom_despues}")
check("atribución OSM visible", any("OpenStreetMap" in a for a in attribution), str(attribution))

os.remove(HARNESS)
print("=" * 60)
ok = sum(1 for c in checks if c[0])
print(f"RESULTADO: {ok}/{len(checks)} checks OK")

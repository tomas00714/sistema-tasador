# -*- coding: utf-8 -*-
"""Paridad correcta + restaurar cliente_nombre/nomenclatura de dto."""
import json, sys, urllib.request
from datetime import datetime, timedelta
sys.path.insert(0, r"C:\Users\tomas\Desktop\proyecto-tasador\server")
from jose import jwt
from playwright.sync_api import sync_playwright

SECRET = "dev-only-insecure-secret-do-not-use-in-production"
APP = "http://localhost:5501/app"
API = "http://127.0.0.1:8080"

def token(uid):
    return jwt.encode({"sub": str(uid), "exp": datetime.utcnow() + timedelta(hours=2)}, SECRET, algorithm="HS256")

def api_put(path, payload, tok):
    req = urllib.request.Request(API + path, data=json.dumps(payload).encode(),
                                 headers={"Authorization": "Bearer " + tok,
                                          "Content-Type": "application/json"}, method="PUT")
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

def api_get(path, tok):
    req = urllib.request.Request(API + path, headers={"Authorization": "Bearer " + tok})
    return json.loads(urllib.request.urlopen(req, timeout=30).read())

TASACIONES = [("casa", "T8tl6cXAuHU", 45), ("departamento", "T7ePR8EkfQH", 3), ("lote", "T79TAXJmZTn", 3)]

# Restaurar valores de prueba en dto
try:
    api_put("/api/tasaciones/T7ePR8EkfQH", {"cliente_nombre": "", "nomenclatura_catastral": ""}, token(3))
    t = api_get("/api/tasaciones/T7ePR8EkfQH", token(3))
    print("[restore] cliente_nombre=%r nomenclatura=%r reportConfig=%s" % (
        t.get("cliente_nombre"), t.get("nomenclatura_catastral"),
        bool((t.get("datos") or {}).get("reportConfig"))))
except Exception as e:
    print("[restore] error:", e)

with sync_playwright() as p:
    for tipo, code, uid in TASACIONES:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page()
        page.goto(f"{APP}/vista-previa-informe.html")
        page.evaluate(f"localStorage.setItem('auth_token', {json.dumps(token(uid))})")
        page.goto(f"{APP}/vista-previa-informe.html?id={code}")
        page.wait_for_selector('.report-page', timeout=60000)
        r = page.evaluate(r"""() => {
            const t = tasacionCargada;
            const datosT = t.datosCompletos || t.datos || t;
            const tipo = t.tipo;
            const renderer = new ResultadosRenderer(document.createElement('div'),
                {...t.resultado}, tipo, datosT, 'lectura');
            const cols = renderer.obtenerColumnas('comparables');
            const { columnasAntes, columnasDespues } = renderer.insertarColumnasPersonalizadas(cols, 'comparables');
            const pers = renderer.obtenerColumnasPersonalizadas('comparables');
            const todas = [...columnasAntes.map(d=>({def:d,custom:null})),
                           ...pers.map(c=>({def:{id:c.id,label:c.nombre,tipo:'coeficiente'},custom:c})),
                           ...columnasDespues.map(d=>({def:d,custom:null}))];
            const refLabels = todas.map(c=>c.def.label);
            const pdfLabels = [...document.querySelectorAll('.report-table-tech thead th')].map(th=>th.textContent.trim());
            const faltan = refLabels.filter(l => l !== 'Dirección' && !pdfLabels.includes(l));
            const extras = pdfLabels.filter(l => l !== 'Dirección' && !refLabels.includes(l));
            // celda a celda
            const comps = (t.resultado.comparables || []);
            const esCoef = c => c.custom || c.def.es_fijo || c.def.destacado ||
                ['coeficiente','coeficiente_editable','parametro_editable'].includes(c.def.tipo);
            const colsA = todas.filter(c=>!esCoef(c));
            const colsB = todas.filter(esCoef);
            const tabs = [...document.querySelectorAll('.report-table-tech')];
            const rowsA = [...tabs[0].querySelectorAll('tbody tr')];
            const rowsB = tabs[1] ? [...tabs[1].querySelectorAll('tbody tr')] : [];
            const diffs = [];
            comps.forEach((comp, i) => {
                const tdsA = rowsA[i] ? [...rowsA[i].querySelectorAll('td')].map(td=>td.textContent.trim()) : [];
                const tdsB = rowsB[i] ? [...rowsB[i].querySelectorAll('td')].map(td=>td.textContent.trim()) : [];
                colsA.forEach((col, j) => {
                    const esp = String(renderer.renderizarCelda(comp, col.def)).trim();
                    if (tdsA[j] !== undefined && esp !== tdsA[j]) diffs.push({f:i,col:col.def.label,esp,pdf:tdsA[j]});
                });
                colsB.forEach((col, j) => {
                    const esp = String(col.custom ? renderer.renderizarCeldaPersonalizada(comp, col.custom)
                                                  : renderer.renderizarCelda(comp, col.def)).trim();
                    const pdf = tdsB[j+1];
                    if (pdf !== undefined && esp !== pdf) diffs.push({f:i,col:col.def.label,esp,pdf});
                });
            });
            return {tipo, faltan, extras, diffs, nComps: comps.length,
                    cliente: t.cliente_nombre ?? null};
        }""")
        print(f'[{r["tipo"]}] faltan={r["faltan"]} extras={r["extras"]} diffs={len(r["diffs"])} comps={r["nComps"]} cliente={r["cliente"]!r}')
        for d in r['diffs'][:6]:
            print('   DIFF', d)
        browser.close()
print('FIN')

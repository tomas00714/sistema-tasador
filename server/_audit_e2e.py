"""Pruebas E2E de auditoría — NO es un test suite del proyecto.
Ejecuta requests contra el backend local y limpia los datos creados al final."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(__file__))
import requests

BASE = "http://127.0.0.1:8080"
TS = str(int(time.time()))
EMAIL_A = f"audit_a_{TS}@test.local"
EMAIL_B = f"audit_b_{TS}@test.local"
PASS = "Test12345"

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (" | " + str(detail) if detail else ""))

created = {"usuarios": [], "solicitudes": [], "comparables": [], "tasaciones": []}

def reg(email):
    r = requests.post(f"{BASE}/api/auth/register", json={
        "nombre": "Audit", "apellido": "Test", "email": email, "password": PASS})
    return r

def login(email):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": PASS})
    return r.json().get("access_token") if r.status_code == 200 else None

def H(t): return {"Authorization": f"Bearer {t}"}

rA = reg(EMAIL_A); rB = reg(EMAIL_B)
check("register A", rA.status_code == 200, rA.status_code)
check("register B", rB.status_code == 200, rB.status_code)
tokA, tokB = login(EMAIL_A), login(EMAIL_B)
check("login A+B", bool(tokA and tokB))
if not (tokA and tokB): sys.exit(1)
uidA = requests.get(f"{BASE}/api/usuarios/me", headers=H(tokA)).json().get("id") if requests.get(f"{BASE}/api/usuarios/me", headers=H(tokA)).status_code == 200 else None
print("uidA:", uidA)

# --- Solicitud: crear ---
r = requests.post(f"{BASE}/api/solicitudes", headers=H(tokA), json={
    "tipo_inmueble": "lote", "datos": {"mensaje": "audit"}})
check("crear solicitud", r.status_code == 200, r.status_code)
sol = r.json()
sid, link = sol["id"], sol["link_publico"]
print("  link_publico:", link)
from urllib.parse import urlparse, parse_qs
codigo = parse_qs(urlparse(link).query).get("link", [link.rstrip("/").split("/")[-1]])[0]
created["solicitudes"].append(sid)

# --- tasacion de A para probar aislamiento ---
r = requests.post(f"{BASE}/api/tasaciones", headers=H(tokA), json={
    "tipo": "lote", "estado": "completada",
    "datos": {"tipo": "lote", "ubicacion": {"direccion": "Audit 1", "provincia": "Bs As",
             "localidad": "X", "lat": -34.0, "lon": -58.0}, "resultado": {"valor_final": 100000}}})
check("crear tasacion A", r.status_code == 200, r.status_code)
tasA = r.json()["id"] if r.status_code == 200 else None
if tasA: created["tasaciones"].append(tasA)

# --- flujo público ---
from urllib.parse import quote
r = requests.get(f"{BASE}/api/solicitudes/link/{codigo}")
check("GET solicitud por codigo publico", r.status_code == 200, f"{r.status_code} estado={r.json().get('estado') if r.status_code==200 else r.text[:100]}")
r = requests.get(f"{BASE}/api/solicitudes/link/{quote(link, safe='')}")
check("GET solicitud por URL completa (encodeada)", r.status_code == 200, r.status_code)
r = requests.get(f"{BASE}/api/solicitudes/link/{quote('https://tasador.app/s/' + codigo, safe='')}")
check("GET solicitud por URL vieja tasador.app/s/X", r.status_code == 200, r.status_code)
r = requests.get(f"{BASE}/api/solicitudes/link/{quote('http://x/solicitud.html?link=' + codigo, safe='')}")
check("GET solicitud por URL solicitud.html?link=X", r.status_code == 200, r.status_code)

comp_datos = {"datos": {"tipoInmueble": "lote", "valor": 50000, "superficie": 300,
    "ubicacion": {"direccion": "Pub 1", "provincia": "Bs As", "localidad": "X", "lat": -34.1, "lon": -58.1}}}
r = requests.post(f"{BASE}/api/solicitudes/link/{codigo}/contribuir",
                  json={"comparables": [comp_datos], "colaborador": {"nombre": "Colab X"}})
check("contribuir comparable", r.status_code == 200, f"{r.status_code} estado={r.json().get('estado') if r.status_code==200 else r.text[:200]}")
if r.status_code == 200:
    check("fecha_completacion seteada", bool(r.json().get("fecha_completacion")), r.json().get("fecha_completacion"))

r = requests.get(f"{BASE}/api/solicitudes/link/{codigo}/comparables")
pub_comps = r.json() if r.status_code == 200 else []
check("GET comparables publico devuelve el comparable", r.status_code == 200 and len(pub_comps) >= 1,
      f"status={r.status_code} count={len(pub_comps)}")
for c in pub_comps: created["comparables"].append(c["id"])

r = requests.get(f"{BASE}/api/solicitudes/link/{codigo}")
check("solicitud ahora completada", r.status_code == 200 and r.json()["estado"] == "completada")

r = requests.get(f"{BASE}/api/solicitudes/{sid}/comparables", headers=H(tokA))
own_comps = r.json() if r.status_code == 200 else []
check("owner lista comparables por id", r.status_code == 200 and len(own_comps) >= 1, f"{r.status_code} n={len(own_comps)}")

if own_comps:
    cid = own_comps[0]["id"]
    r = requests.post(f"{BASE}/api/solicitudes/{sid}/comparables/{cid}/aceptar", headers=H(tokA), json={})
    check("aceptar comparable", r.status_code == 200, f"{r.status_code} {r.text[:120]}")

# --- solicitud inexistente ---
r = requests.get(f"{BASE}/api/solicitudes/link/SZZZZZZ/comparables")
check("comparables de solicitud inexistente -> 404 (no 500)", r.status_code == 404, r.status_code)

# --- expiración: crear sol2 y forzar vencida ---
r = requests.post(f"{BASE}/api/solicitudes", headers=H(tokA), json={"tipo_inmueble": "lote", "datos": {}})
sol2 = r.json(); sid2 = sol2["id"]
cod2 = parse_qs(urlparse(sol2["link_publico"]).query).get("link", [sol2["link_publico"].rstrip("/").split("/")[-1]])[0]
created["solicitudes"].append(sid2)

import psycopg2
from dotenv import load_dotenv; load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
conn = psycopg2.connect(host=os.getenv('DB_HOST'), port=int(os.getenv('DB_PORT')), dbname=os.getenv('DB_NAME'), user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'))
cur = conn.cursor()
from utils.id_encoder import obtener_id_desde_codigo
sid2_int = obtener_id_desde_codigo(sid2)
cur.execute("UPDATE solicitudes SET fecha_expiracion = NOW() - interval '1 day' WHERE id = %s", (sid2_int,))
conn.commit()

r = requests.get(f"{BASE}/api/solicitudes/link/{cod2}")
check("expirada: GET publico -> estado=expirada", r.status_code == 200 and r.json()["estado"] == "expirada", r.json().get("estado"))
r = requests.post(f"{BASE}/api/solicitudes/link/{cod2}/contribuir", json={"comparables": [comp_datos]})
check("expirada: contribuir rechazada", r.status_code in (400, 410), r.status_code)
r = requests.get(f"{BASE}/api/solicitudes", headers=H(tokA))
estados = {s["id"]: s["estado"] for s in r.json()}
check("expirada: listado materializa", estados.get(sid2) == "expirada", estados.get(sid2))
r = requests.get(f"{BASE}/api/solicitudes/{sid2}", headers=H(tokA))
check("expirada: detalle por id materializa", r.status_code == 200 and r.json()["estado"] == "expirada", r.json().get("estado"))

# --- aislamiento entre usuarios ---
if tasA:
    r = requests.get(f"{BASE}/api/tasaciones/{tasA}", headers=H(tokB))
    check("B no lee tasacion de A", r.status_code == 403, r.status_code)
    r = requests.put(f"{BASE}/api/tasaciones/{tasA}", headers=H(tokB), json={"estado": "borrador"})
    check("B no edita tasacion de A", r.status_code == 403, r.status_code)
    r = requests.delete(f"{BASE}/api/tasaciones/{tasA}", headers=H(tokB))
    check("B no borra tasacion de A", r.status_code == 403, r.status_code)
    r = requests.get(f"{BASE}/api/tasaciones", headers=H(tokB))
    check("B no ve tasaciones de A en lista", all(t["id"] != tasA for t in r.json()), len(r.json()))

r = requests.get(f"{BASE}/api/solicitudes/{sid}", headers=H(tokB))
check("B no lee solicitud de A", r.status_code == 403, r.status_code)
r = requests.put(f"{BASE}/api/solicitudes/{sid}", headers=H(tokB), json={"estado": "expirada"})
check("B no modifica solicitud de A", r.status_code in (400, 403), r.status_code)
if own_comps:
    r = requests.post(f"{BASE}/api/solicitudes/{sid}/comparables/{own_comps[0]['id']}/rechazar", headers=H(tokB), json={})
    check("B no rechaza comparable de solicitud de A", r.status_code == 403, r.status_code)
    r = requests.get(f"{BASE}/api/solicitudes/{sid}/comparables", headers=H(tokB))
    check("B no lista comparables de solicitud de A", r.status_code == 403, r.status_code)
    r = requests.delete(f"{BASE}/api/comparables/{own_comps[0]['id']}", headers=H(tokB))
    check("B no borra comparable de A", r.status_code == 403, r.status_code)

# admin endpoint sin admin
r = requests.get(f"{BASE}/api/migrations/status", headers=H(tokA))
check("usuario normal no accede /api/migrations/status", r.status_code == 403, r.status_code)
r = requests.post(f"{BASE}/api/admin/clean-db", headers=H(tokA))
check("usuario normal no accede clean-db", r.status_code in (403, 404, 405), r.status_code)

# --- cleanup ---
try:
    from utils.id_encoder import obtener_id_desde_codigo as dec
    for s in created["solicitudes"]:
        i = dec(s); cur.execute("DELETE FROM solicitudes WHERE id=%s", (i,))
    for c in created["comparables"]:
        i = dec(c); cur.execute("DELETE FROM solicitud_comparable_aceptacion WHERE comparable_id=%s", (i,)); cur.execute("DELETE FROM comparables WHERE id=%s", (i,))
    for t in created["tasaciones"]:
        i = dec(t); cur.execute("DELETE FROM tasacion_comparable WHERE tasacion_id=%s", (i,)); cur.execute("DELETE FROM tasaciones WHERE id=%s", (i,))
    for e in (EMAIL_A, EMAIL_B):
        cur.execute("DELETE FROM usuarios WHERE email=%s", (e,))
    conn.commit()
    print("cleanup ok")
except Exception as e:
    print("cleanup err:", e)
conn.close()

fails = [r for r in results if not r[1]]
print(f"\n===== {len(results)-len(fails)}/{len(results)} PASS =====")
for n, _, d in fails: print("FAIL:", n, d)

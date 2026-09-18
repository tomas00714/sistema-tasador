"""E2E tasaciones: /tasar -> crear -> reabrir -> editar -> recalcular."""
import sys, os, time
sys.path.insert(0, os.path.dirname(__file__))
import requests
from urllib.parse import urlparse, parse_qs

BASE = "http://127.0.0.1:8080"
TS = str(int(time.time()))
EMAIL = f"audit_t_{TS}@test.local"
PASS = "Test12345"

results = []
def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (" | " + str(detail)[:140] if detail else ""))

r = requests.post(f"{BASE}/api/auth/register", json={"nombre": "A", "apellido": "T", "email": EMAIL, "password": PASS})
tok = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASS}).json()["access_token"]
H = {"Authorization": f"Bearer {tok}"}

COMP = {"direccion": "Comp 1", "valor": 45000, "valor_total": 45000, "tipo_valor": "venta",
        "frente": 10, "fondo": 30, "superficie": 300, "tipologia": "Medial"}

payloads = {
    "lote": {
        "tipo": "lote",
        "ubicacion": {"direccion": "Lote Audit 1", "provincia": "Bs As", "localidad": "X", "lat": -34.0, "lon": -58.0},
        "inmueble": {"tipoLote": "Medial", "servicios": ["agua"], "caracteristicas": {"frente": 10, "fondo": 30, "superficie": 300}},
        "comparables": [COMP],
    },
    "departamento": {
        "tipo": "departamento",
        "ubicacion": {"direccion": "Depto Audit 1", "provincia": "Bs As", "localidad": "X", "lat": -34.0, "lon": -58.0},
        "inmueble": {"superficie": 60, "antiguedad": 20, "estadoConservacion": "3 - Bueno", "vidaUtil": 80},
        "comparables": [dict(COMP, superficie=60, valor=120000, valor_total=120000)],
    },
    "casa": {
        "tipo": "casa",
        "ubicacion": {"direccion": "Casa Audit 1", "provincia": "Bs As", "localidad": "X", "lat": -34.0, "lon": -58.0},
        "inmueble": {"superficie": 120, "antiguedad": 30, "estadoConservacion": "3 - Bueno", "vidaUtil": 80, "caracteristicaConstructivaCoef": 1.0},
        "comparables": [dict(COMP, superficie=120, valor=180000, valor_total=180000)],
    },
}

created_tas = []
created_comps = []
for tipo, p in payloads.items():
    r = requests.post(f"{BASE}/tasar", headers=H, json=p)
    ok = r.status_code == 200
    check(f"tasar {tipo}", ok, f"{r.status_code} {r.text[:120] if not ok else ''}")
    if not ok: continue
    res = r.json()
    vf = res.get("valor_final") or res.get("valorFinal")
    check(f"tasar {tipo} devuelve valor_final", vf is not None and vf > 0, f"valor_final={vf}")

    # guardar
    datos = dict(p)
    datos["resultado"] = res
    r2 = requests.post(f"{BASE}/api/tasaciones", headers=H, json={
        "tipo": tipo, "estado": "completada", "datos": datos, "comparables_ids": []})
    check(f"guardar {tipo}", r2.status_code == 200, r2.status_code)
    if r2.status_code != 200: continue
    tid = r2.json()["id"]
    created_tas.append(tid)

    # reabrir
    r3 = requests.get(f"{BASE}/api/tasaciones/{tid}", headers=H)
    check(f"reabrir {tipo}", r3.status_code == 200 and r3.json().get("tipo") == tipo,
          f"{r3.status_code} tipo={r3.json().get('tipo') if r3.status_code==200 else ''}")

    # editar: cambiar direccion + recalcular
    p2 = dict(p); p2["ubicacion"] = dict(p["ubicacion"], direccion=p["ubicacion"]["direccion"] + " EDIT")
    r4 = requests.put(f"{BASE}/api/tasaciones/{tid}", headers=H, json={"datos": {**datos, "ubicacion": p2["ubicacion"]}})
    check(f"editar {tipo}", r4.status_code == 200, r4.status_code)
    r5 = requests.get(f"{BASE}/api/tasaciones/{tid}", headers=H)
    check(f"edicion persistida {tipo}", r5.status_code == 200 and "EDIT" in str(r5.json()["datos"].get("ubicacion", {}).get("direccion", "")))

    # recalcular con datos editados
    r6 = requests.post(f"{BASE}/tasar", headers=H, json=p2)
    check(f"recalcular {tipo}", r6.status_code == 200, r6.status_code)

    # datos para informe (lo que consume el adapter)
    td = r5.json()
    check(f"informe: datos.resultado presente {tipo}", "resultado" in (td.get("datos") or {}))

# tasacion inexistente / de otro tipo de codigo
r = requests.get(f"{BASE}/api/tasaciones/TZZZZZZ", headers=H)
check("tasacion inexistente -> 404", r.status_code == 404, r.status_code)
r = requests.post(f"{BASE}/tasar", headers=H, json={"tipo": "galpon", "ubicacion": {}, "inmueble": {}, "comparables": []})
check("tipo invalido -> 400 (no 500)", r.status_code == 400, r.status_code)

# cleanup
import psycopg2
from dotenv import load_dotenv; load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
conn = psycopg2.connect(host=os.getenv('DB_HOST'), port=int(os.getenv('DB_PORT')), dbname=os.getenv('DB_NAME'), user=os.getenv('DB_USER'), password=os.getenv('DB_PASSWORD'))
cur = conn.cursor()
from utils.id_encoder import obtener_id_desde_codigo as dec
for t in created_tas:
    i = dec(t)
    cur.execute("DELETE FROM tasacion_comparable WHERE tasacion_id=%s", (i,))
    cur.execute("DELETE FROM tasaciones WHERE id=%s", (i,))
cur.execute("DELETE FROM usuarios WHERE email=%s", (EMAIL,))
conn.commit(); conn.close()
print("cleanup ok")

fails = [r for r in results if not r[1]]
print(f"\n===== {len(results)-len(fails)}/{len(results)} PASS =====")
for n, _, d in fails: print("FAIL:", n, d)

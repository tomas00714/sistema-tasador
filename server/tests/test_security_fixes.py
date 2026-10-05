"""
Tests de las correcciones de seguridad V-01 a V-10.

Dos frentes:

- Frontend (py_mini_racer): ejecuta el JavaScript real de client/js y
  verifica que los renderizadores no conviertan payloads de usuario en
  HTML/atributos ejecutables (V-01, V-03, V-04) y que el redirect
  post-login solo acepte destinos del mismo origen (V-05).

- Backend (unittest.mock sobre main.py): ownership de comparables
  (V-02), tokens públicos impredecibles (V-06), clean-db bloqueado en
  producción (V-07), login de cuentas Google-only sin 500 ni oráculo
  (V-08), errores 500 sin detalle interno (V-09) y postMessage OAuth
  fail-closed (V-10).
"""

import os
import sys
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

SERVER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT_DIR = os.path.join(SERVER_DIR, "..", "client")
sys.path.insert(0, SERVER_DIR)

try:
    from py_mini_racer import MiniRacer
except ImportError:
    MiniRacer = None

from fastapi import HTTPException  # noqa: E402

import main  # noqa: E402
from models import LoginRequest, SolicitudContribuirRequest  # noqa: E402


# ============================================================
#   Frontend: entorno JS mínimo
# ============================================================

# Stub de URL/URLSearchParams suficiente para destinoRedirectSeguro:
# esquema absoluto, protocol-relative (//host), rutas relativas.
JS_ENV = r"""
var window = {
    __handlers: {},
    addEventListener: function (ev, fn) { window.__handlers[ev] = fn; },
    print: function () {},
    location: { href: 'https://app.test/login.html', search: '', origin: 'https://app.test' }
};
var __elements = {};
function __el(id) {
    if (!__elements[id]) {
        __elements[id] = {
            id: id, innerHTML: '', style: {}, dataset: {},
            children: [], classList: { add:function(){}, remove:function(){}, toggle:function(){} },
            addEventListener: function () {},
            setAttribute: function () {},
            querySelector: function () { return null; },
            querySelectorAll: function () { return []; },
            appendChild: function () {}
        };
    }
    return __elements[id];
}
var document = {
    addEventListener: function () {},
    getElementById: function (id) { return __el(id); },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function () {
        return { style:{}, dataset:{}, children:[], setAttribute:function(){}, addEventListener:function(){}, appendChild:function(){} };
    },
    body: { appendChild: function () {}, dataset: {}, classList: { add:function(){}, remove:function(){} } }
};
var localStorage = { getItem: function(){return null;}, setItem:function(){}, removeItem:function(){} };
var console = { log:function(){}, warn:function(){}, error:function(){} };
var API_BASE_URL = 'https://api.test';
var fetch = function () { return Promise.reject(new Error('offline')); };
var setTimeout = function (fn) { return 0; };
var navigator = { clipboard: { writeText: function(){ return Promise.resolve(); } } };

function __splitParts(t, ps) {
    var h = ps.indexOf('#'); t.hash = '';
    if (h >= 0) { t.hash = ps.slice(h); ps = ps.slice(0, h); }
    var q = ps.indexOf('?'); t.search = '';
    if (q >= 0) { t.search = ps.slice(q); ps = ps.slice(0, q); }
    t.pathname = ps || '/';
}
function URL(u, base) {
    var baseM = base ? /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]*)/.exec(base) : null;
    var schemeM = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(u);
    if (schemeM) {
        this.protocol = schemeM[1].toLowerCase() + ':';
        if (this.protocol === 'http:' || this.protocol === 'https:') {
            var m = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/([^/?#]*)(.*)$/.exec(u);
            this.origin = this.protocol + '//' + (m ? m[1] : '');
            __splitParts(this, m ? (m[2] || '/') : '/');
        } else {
            this.origin = 'null';
            __splitParts(this, u.slice(schemeM[0].length));
        }
        return;
    }
    if (u.indexOf('//') === 0) {
        this.protocol = baseM ? baseM[1].toLowerCase() + ':' : 'http:';
        var m2 = /^\/\/([^/?#]*)(.*)$/.exec(u);
        this.origin = this.protocol + '//' + (m2 ? m2[1] : '');
        __splitParts(this, m2 ? (m2[2] || '/') : '/');
        return;
    }
    if (!baseM) throw new Error('Invalid URL');
    this.protocol = baseM[1].toLowerCase() + ':';
    this.origin = this.protocol + '//' + baseM[2];
    var p = u.charAt(0) === '/' ? u : '/' + u;
    __splitParts(this, p);
}
function URLSearchParams(s) { this._q = (s || '').replace(/^\?/, ''); }
URLSearchParams.prototype.get = function (k) {
    var parts = this._q ? this._q.split('&') : [];
    for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].split('=');
        if (decodeURIComponent(kv[0]) === k) {
            return kv.length > 1 ? decodeURIComponent(kv.slice(1).join('=')) : '';
        }
    }
    return null;
};
URLSearchParams.prototype.set = function (k, v) { this._q += '&' + k + '=' + v; };
URLSearchParams.prototype.toString = function () { return this._q; };

function getApiUrl() { return 'https://api.test'; }
function getUserData() { return { is_admin: true, email: 'admin@test' }; }
function getAuthHeaders() { return {}; }
function handleAuthError() { return false; }
function isAuthenticated() { return false; }
"""


def _js_path(name):
    return os.path.join(CLIENT_DIR, "js", name)


def _to_js(value):
    import json
    return json.dumps(value)


@unittest.skipUnless(MiniRacer, "py_mini_racer no instalado")
class BaseJsTest(unittest.TestCase):
    FILES = []

    @classmethod
    def setUpClass(cls):
        cls.ctx = MiniRacer()
        cls.ctx.eval(JS_ENV)
        for f in cls.FILES:
            with open(_js_path(f), encoding="utf-8") as fh:
                cls.ctx.eval(fh.read())


PAYLOADS = [
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
    '"><img src=x onerror=alert(1)>',
    "javascript:alert(1)",
]

# Lo que NO debe aparecer en la salida HTML generada: tags reales o
# handlers/atributos ejecutables sin escapar.
FORBIDDEN_RAW = ["<img src=x", "<script>", "onerror=alert(1)>", '"><img']


def assert_no_html_executable(test, html):
    for raw in FORBIDDEN_RAW:
        test.assertNotIn(raw, html, f"payload sin escapar en salida: {raw}")
    # 'javascript:' jamás debe quedar dentro de un atributo de URL
    test.assertNotIn('src="javascript:', html)
    test.assertNotIn('href="javascript:', html)


# ------------------------------------------------------------
# V-01: renderers de comparables (contribución pública almacenada)
# ------------------------------------------------------------

class TestV01ComparableRenderers(BaseJsTest):
    FILES = ["global.js", "tasacion-comparables.js", "solicitud.js"]

    def _detalles(self, comp):
        self.ctx.eval("window.__comp = " + _to_js(comp) + ";")
        return self.ctx.eval("generarDetallesComparable(window.__comp)")

    def _fallback(self, comp):
        self.ctx.eval("window.__comp = " + _to_js(comp) + ";")
        return self.ctx.eval("generarDetallesFallback(window.__comp)")

    def test_generarDetallesComparable_escapa_campos_lote(self):
        for p in PAYLOADS:
            html = self._detalles({
                "tipoInmueble": "lote", "tipoLote": p,
                "frente": p, "fondo": p, "superficie": p,
            })
            assert_no_html_executable(self, html)

    def test_generarDetallesComparable_escapa_campos_no_lote(self):
        for p in PAYLOADS:
            html = self._detalles({
                "tipoInmueble": "departamento", "superficie": p,
                "superficieTerreno": p, "ambientes": p,
                "dormitorios": p, "banos": p,
            })
            assert_no_html_executable(self, html)

    def test_generarDetallesFallback_escapa_campos(self):
        for p in PAYLOADS:
            html = self._fallback({
                "tipoInmueble": "casa", "superficie": p,
                "ambientes": p, "dormitorios": p, "banos": p,
                "superficieTerreno": p,
            })
            assert_no_html_executable(self, html)

    def test_generarDetallesComparable_valores_normales_intactos(self):
        html = self._detalles({
            "tipoInmueble": "departamento", "superficie": 60,
            "ambientes": 3, "dormitorios": 2, "banos": 1,
        })
        self.assertIn("60", html)
        self.assertIn("3", html)


class TestV01EscaparDatosProfundo(BaseJsTest):
    """historial.abrirPerfilComparable/Tasacion escapan el árbol entero."""

    FILES = ["historial.js"]

    def test_escapa_strings_anidados(self):
        payload = {
            "direccion": "<img src=x onerror=alert(1)>",
            "tipoLote": '"><script>alert(1)</script>',
            "detalles": {"observaciones": "<svg onload=alert(1)>"},
            "fotos": [{"url": "javascript:alert(1)", "desc": "<b>x</b>"}],
            "valor": 123,
        }
        self.ctx.eval("window.__r = escaparDatosProfundo(" + _to_js(payload) + ");")
        r = self.ctx.eval("JSON.stringify(window.__r)")
        for raw in ["<img", "<script>", "<svg", "<b>"]:
            self.assertNotIn(raw, r)
        self.assertIn("&lt;img", r)
        self.assertEqual(self.ctx.eval("window.__r.valor"), 123)
        # El original no se muta: siguen existiendo los strings crudos
        self.assertEqual(payload["direccion"], "<img src=x onerror=alert(1)>")


class TestV01CardOnClick(BaseJsTest):
    """construirCardMinimizada: el handler onclick escapa su contenido."""

    FILES = ["global.js"]

    def test_onclick_escapado_en_atributo(self):
        html = self.ctx.eval(
            "construirCardMinimizada({id:'1', titulo:'t', onClick:'f(\\'x\\'>"
            + _to_js("<img onerror=alert(1)>") + ")'})"
        )
        self.assertNotIn("<img onerror", html)
        self.assertIn("&lt;img", html)


# ------------------------------------------------------------
# V-03: renderers del panel de administración
# ------------------------------------------------------------

class TestV03Admin(BaseJsTest):
    FILES = ["global.js", "admin.js"]

    def _hook(self, fn, arg):
        return self.ctx.eval(
            f"window.__adminTestHooks.{fn}(" + _to_js(arg) + ")"
        )

    def test_hooks_disponibles(self):
        self.assertTrue(self.ctx.eval("!!window.__adminTestHooks"))

    def test_capitalizar_escapa(self):
        for p in PAYLOADS:
            self.assertNotIn("<img", self._hook("capitalizar", p))
            self.assertNotIn("<script>", self._hook("capitalizar", p))

    def test_formatear_estado_escapa_valor_desconocido(self):
        out = self._hook("formatearEstado", "<img src=x onerror=alert(1)>")
        self.assertNotIn("<img", out)

    def test_formatear_fuente_escapa_valor_desconocido(self):
        out = self._hook("formatearFuente", '"><script>alert(1)</script>')
        self.assertNotIn("<script>", out)

    def test_valores_normales_intactos(self):
        self.assertIn("Completada", self._hook("formatearEstado", "completada"))
        self.assertIn("Borrador", self._hook("formatearEstado", "borrador"))
        self.assertIn("Lote", self._hook("capitalizar", "lote"))


# ------------------------------------------------------------
# V-04: paneles laterales de vista previa del informe
# ------------------------------------------------------------

class TestV04PreviewPanels(BaseJsTest):
    FILES = ["report-data-adapter.js", "vista-previa-informe.js"]

    def _render_photos(self, fotos):
        self.ctx.eval("fotosTasacion = " + _to_js(fotos) + ";")
        self.ctx.eval("renderPhotosPanel();")
        return self.ctx.eval("__el('photosCarousel').innerHTML")

    def _render_comps(self, comps, tipo="departamento"):
        self.ctx.eval("tasacionCargada = { tipo: " + _to_js(tipo) + " };")
        self.ctx.eval("comparablesResueltos = " + _to_js(comps) + ";")
        self.ctx.eval("renderComparablesPanel();")
        return self.ctx.eval("__el('comparablesList').innerHTML")

    def test_url_imagen_valida(self):
        html = self._render_photos([
            {"url": "https://cdn.test/foto.jpg", "description": "Frente"},
            {"url": "/uploads/a.png", "description": "Foto 2"},
            {"url": "data:image/png;base64,AAAA", "description": "local"},
        ])
        self.assertIn("https://cdn.test/foto.jpg", html)
        self.assertIn("/uploads/a.png", html)
        self.assertIn("data:image/png;base64,AAAA", html)

    def test_url_javascript_rechazada(self):
        html = self._render_photos([
            {"url": "javascript:alert(1)", "description": "x"},
        ])
        self.assertNotIn("javascript:", html)

    def test_url_data_no_imagen_rechazada(self):
        html = self._render_photos([
            {"url": "data:text/html,<script>alert(1)</script>", "description": "x"},
        ])
        self.assertNotIn("data:text/html", html)

    def test_url_con_comillas_no_rompe_atributo(self):
        html = self._render_photos([
            {"url": 'foto.jpg"><img src=x onerror=alert(1)>', "description": "x"},
        ])
        self.assertNotIn('"><img src=x', html)

    def test_descripcion_foto_escapada(self):
        html = self._render_photos([
            {"url": "a.jpg", "description": "<img src=x onerror=alert(1)>"},
        ])
        self.assertNotIn("<img src=x", html)
        self.assertIn("&lt;img", html)

    def test_comparable_direccion_e_id_escapados(self):
        html = self._render_comps([{
            "id": '"><img src=x onerror=alert(1)>',
            "ubicacion": {"direccion": "<script>alert(1)</script>"},
            "fotos": [{"url": "javascript:alert(1)"}],
        }])
        assert_no_html_executable(self, html)
        self.assertNotIn("javascript:alert", html)

    def test_comparable_normal_funciona(self):
        html = self._render_comps([{
            "id": "C123", "direccion": "Calle Falsa 123",
            "fotos": [{"url": "https://cdn.test/c.jpg"}],
        }])
        self.assertIn("Calle Falsa 123", html)
        self.assertIn('data-id="C123"', html)
        self.assertIn("https://cdn.test/c.jpg", html)


# ------------------------------------------------------------
# V-05: redirect post-login (whitelist mismo-origen)
# ------------------------------------------------------------

class TestV05AuthRedirect(BaseJsTest):
    FILES = ["auth.js"]

    def _redirect(self, search):
        self.ctx.eval("window.location.search = " + _to_js(search) + ";")
        return self.ctx.eval("getAuthRedirect()")

    def test_ruta_relativa_aceptada(self):
        self.assertEqual(self._redirect("?redirect=/historial.html"), "/historial.html")
        self.assertEqual(self._redirect("?redirect=/perfil.html"), "/perfil.html")

    def test_ruta_relativa_sin_barra(self):
        self.assertEqual(
            self._redirect("?redirect=compartir.html"), "/compartir.html"
        )

    def test_url_externa_rechazada(self):
        out = self._redirect("?redirect=" + "https%3A%2F%2Fsitio-malicioso.com")
        self.assertNotIn("sitio-malicioso", out)
        # Cae al default seguro
        self.assertFalse(out.startswith("http"))

    def test_protocol_relative_rechazado(self):
        out = self._redirect("?redirect=" + "%2F%2Fsitio-malicioso.com%2Fx")
        self.assertNotIn("sitio-malicioso", out)

    def test_javascript_uri_rechazada(self):
        out = self._redirect("?redirect=javascript%3Aalert(1)")
        self.assertNotIn("javascript", out)

    def test_data_uri_rechazada(self):
        out = self._redirect("?redirect=data%3Atext%2Fhtml%2C%3Cscript%3E")
        self.assertNotIn("data:", out)

    def test_share_token_preservado(self):
        out = self._redirect("?redirect=/compartir.html&share_token=tok123")
        self.assertIn("compartir.html", out)
        self.assertIn("token=tok123", out)

    def test_default_sin_param(self):
        # Destino por defecto de la app cuando no hay redirect
        self.assertFalse(self._redirect("").startswith("http"))
        self.assertNotIn("javascript", self._redirect(""))


# ------------------------------------------------------------
# V-02: ownership de comparables al asociar a tasación
# ------------------------------------------------------------

class TestV02ComparableOwnership(unittest.TestCase):
    """_verificar_comparables_propios: el comp ajeno se rechaza antes de
    escribir nada; el propio pasa; los snapshots deleted_* siguen su
    flujo."""

    def _comp_repo(self, comparable):
        repo = MagicMock()
        repo.find_by_id.return_value = comparable
        return repo

    def test_comparable_ajeno_rechazado(self):
        # código público real para un comparable existente
        codigo = "Cfake"
        with patch("main.obtener_id_desde_codigo", return_value=99), \
             patch("main.ComparableRepository") as RC:
            RC.return_value = self._comp_repo({"id": 99, "usuario_id": 1})
            with self.assertRaises(HTTPException) as ctx:
                main._verificar_comparables_propios([codigo], usuario_id=2)
            self.assertEqual(ctx.exception.status_code, 403)

    def test_comparable_propio_aceptado(self):
        with patch("main.obtener_id_desde_codigo", return_value=99), \
             patch("main.ComparableRepository") as RC:
            RC.return_value = self._comp_repo({"id": 99, "usuario_id": 2})
            main._verificar_comparables_propios(["Cfake"], usuario_id=2)  # no lanza

    def test_deleted_y_desconocidos_no_validan_ownership(self):
        with patch("main.obtener_id_desde_codigo", return_value=None), \
             patch("main.ComparableRepository") as RC:
            RC.return_value = self._comp_repo(None)
            main._verificar_comparables_propios(
                ["deleted_5", "codigo-inexistente"], usuario_id=1
            )

    def test_put_no_escribe_si_comparable_ajeno(self):
        """La validación corre antes de repo.update / upserts."""
        tasacion = MagicMock()
        tasacion.comparables_ids = ["Cfake"]
        tasacion.estado = None
        tasacion.nomenclatura_catastral = None
        tasacion.cliente_nombre = None
        tasacion.finalidad = None
        tasacion.datos = None
        tasacion.comparables_snapshots = None

        tasacion_repo = MagicMock()
        tasacion_repo.find_by_id.return_value = {
            "id": 10, "usuario_id": 2, "datos": {},
        }
        comp_repo = MagicMock()
        comp_repo.find_by_id.return_value = {"id": 99, "usuario_id": 1}

        with patch("main.obtener_id_desde_codigo", side_effect=lambda c: 10 if c == "T10" else 99), \
             patch("main.TasacionRepository", return_value=tasacion_repo), \
             patch("main.ComparableRepository", return_value=comp_repo):
            with self.assertRaises(HTTPException) as ctx:
                main.actualizar_tasacion("T10", tasacion, usuario_id=2)
            self.assertEqual(ctx.exception.status_code, 403)
            tasacion_repo.update.assert_not_called()


# ------------------------------------------------------------
# V-06: token público de solicitud aleatorio
# ------------------------------------------------------------

class TestV06PublicTokens(unittest.TestCase):
    def test_tokens_distintos_y_largos(self):
        from utils.public_links import generar_token_link
        t1 = generar_token_link()
        t2 = generar_token_link()
        self.assertNotEqual(t1, t2)
        self.assertGreaterEqual(len(t1), 32)
        self.assertGreaterEqual(len(t2), 32)

    def test_token_no_deriva_de_id(self):
        """Dos solicitudes consecutivas no tienen relación predecible."""
        from utils.public_links import generar_token_link
        tokens = {generar_token_link() for _ in range(100)}
        self.assertEqual(len(tokens), 100)

    def test_lookup_usa_token_no_optimus(self):
        from repositories.solicitud_repository import SolicitudRepository
        repo = SolicitudRepository.__new__(SolicitudRepository)
        repo.find_where = MagicMock(return_value=[{"id": 7, "token_link": "tok"}])
        repo.find_by_id = MagicMock(side_effect=AssertionError(
            "no debe decodificar Optimus ni buscar por ID interno"
        ))
        found = repo.find_by_link_publico("tok")
        self.assertEqual(found["id"], 7)
        repo.find_where.assert_called_once_with({"token_link": "tok"}, limit=1)

    def test_lookup_url_completa(self):
        from repositories.solicitud_repository import SolicitudRepository
        repo = SolicitudRepository.__new__(SolicitudRepository)
        repo.find_where = MagicMock(return_value=[])
        repo.find_by_link_publico(
            "https://app.test/solicitud.html?link=tokXYZ"
        )
        repo.find_where.assert_called_once_with({"token_link": "tokXYZ"}, limit=1)

    def test_token_inventado_falla(self):
        from repositories.solicitud_repository import SolicitudRepository
        repo = SolicitudRepository.__new__(SolicitudRepository)
        repo.find_where = MagicMock(return_value=[])
        self.assertIsNone(repo.find_by_link_publico("token-inexistente"))

    def test_token_de_otra_solicitud_no_da_acceso(self):
        from repositories.solicitud_repository import SolicitudRepository
        repo = SolicitudRepository.__new__(SolicitudRepository)
        repo.find_where = MagicMock(return_value=[])
        # El WHERE token_link=... solo devuelve la solicitud dueña del token
        self.assertIsNone(repo.find_by_link_publico("token-ajeno"))


# ------------------------------------------------------------
# V-07: clean-db deshabilitado en producción
# ------------------------------------------------------------

class TestV07CleanDb(unittest.TestCase):
    def test_production_rechaza_antes_de_tocar_db(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}), \
             patch("main.get_connection",
                   side_effect=AssertionError("no debe abrir conexión")):
            with self.assertRaises(HTTPException) as ctx:
                main.endpoint_clean_db(usuario_id=1)
            self.assertEqual(ctx.exception.status_code, 404)

    def test_prod_alias_rechazado(self):
        with patch.dict(os.environ, {"APP_ENV": "prod"}), \
             patch("main.get_connection",
                   side_effect=AssertionError("no debe abrir conexión")):
            with self.assertRaises(HTTPException):
                main.endpoint_clean_db(usuario_id=1)


# ------------------------------------------------------------
# V-08: login con cuenta Google-only (password_hash NULL)
# ------------------------------------------------------------

class TestV08GoogleOnlyLogin(unittest.TestCase):
    def _repo(self, usuario):
        repo = MagicMock()
        repo.find_by_email.return_value = usuario
        return repo

    def test_google_only_devuelve_401_no_500(self):
        usuario = {
            "id": 5, "email": "g@test.com", "password_hash": None,
            "estado": "activo", "nombre": "G", "apellido": "T",
        }
        with patch("main.UsuarioRepository", return_value=self._repo(usuario)):
            with self.assertRaises(HTTPException) as ctx:
                main.login(LoginRequest(email="g@test.com", password="x"))
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertEqual(ctx.exception.detail, "Credenciales inválidas")

    def test_email_inexistente_misma_respuesta(self):
        with patch("main.UsuarioRepository", return_value=self._repo(None)):
            with self.assertRaises(HTTPException) as ctx:
                main.login(LoginRequest(email="nadie@test.com", password="x"))
            self.assertEqual(ctx.exception.status_code, 401)
            self.assertEqual(ctx.exception.detail, "Credenciales inválidas")

    def test_login_correcto_funciona(self):
        import auth as auth_mod
        usuario = {
            "id": 5, "email": "u@test.com",
            "password_hash": auth_mod.hash_password("secreto123"),
            "estado": "activo", "nombre": "U", "apellido": "T",
        }
        with patch("main.UsuarioRepository", return_value=self._repo(usuario)):
            resp = main.login(LoginRequest(email="u@test.com", password="secreto123"))
            self.assertTrue(resp.access_token)
            self.assertEqual(resp.email, "u@test.com")

    def test_password_incorrecto_misma_respuesta(self):
        import auth as auth_mod
        usuario = {
            "id": 5, "email": "u@test.com",
            "password_hash": auth_mod.hash_password("secreto123"),
            "estado": "activo", "nombre": "U", "apellido": "T",
        }
        with patch("main.UsuarioRepository", return_value=self._repo(usuario)):
            with self.assertRaises(HTTPException) as ctx:
                main.login(LoginRequest(email="u@test.com", password="mala"))
            self.assertEqual(ctx.exception.detail, "Credenciales inválidas")


# ------------------------------------------------------------
# V-09: errores 500 sin detalle interno
# ------------------------------------------------------------

class TestV09Generic500(unittest.TestCase):
    def test_error_db_no_filtra_detalle(self):
        repo = MagicMock()
        repo.find_by_email.side_effect = Exception(
            'psycopg2.errors.UndefinedColumn: column "secreto" does not exist '
            'LINE 1: SELECT secreto FROM usuarios'
        )
        with patch("main.UsuarioRepository", return_value=repo):
            with self.assertRaises(HTTPException) as ctx:
                main.login(LoginRequest(email="u@test.com", password="x"))
            self.assertEqual(ctx.exception.status_code, 500)
            self.assertEqual(ctx.exception.detail, "Error interno del servidor")
            self.assertNotIn("secreto", ctx.exception.detail)
            self.assertNotIn("psycopg2", ctx.exception.detail)
            self.assertNotIn("SELECT", ctx.exception.detail)

    def test_sin_detail_str_e_en_500(self):
        """Ningún handler genérico devuelve str(e) en un 500."""
        with open(os.path.join(SERVER_DIR, "main.py"), encoding="utf-8") as fh:
            src = fh.read()
        import re
        matches = re.findall(
            r"status_code\s*=\s*500[^)]*detail\s*=\s*str\(e\)", src, re.S
        )
        self.assertEqual(matches, [])


# ------------------------------------------------------------
# V-10: postMessage fail-closed
# ------------------------------------------------------------

class TestV10PostMessageOrigin(unittest.TestCase):
    def test_origin_valido(self):
        with patch.object(main, "PUBLIC_APP_URL", "https://app.test/client"):
            self.assertEqual(
                main._google_post_message_origin(), "https://app.test"
            )

    def test_public_app_url_ausente(self):
        with patch.object(main, "PUBLIC_APP_URL", ""):
            self.assertIsNone(main._google_post_message_origin())

    def test_public_app_url_invalida(self):
        for bad in ("*", "javascript:x", "notaurl", "ftp://x.com"):
            with patch.object(main, "PUBLIC_APP_URL", bad):
                self.assertIsNone(
                    main._google_post_message_origin(), f"para {bad}"
                )

    def test_callback_html_fail_closed(self):
        with patch.object(main, "PUBLIC_APP_URL", ""):
            resp = main._google_callback_html({"type": "google_auth", "access_token": "JWT"})
            html = resp.body.decode()
            self.assertIn("const targetOrigin = null", html)
            self.assertIn("if (targetOrigin && window.opener)", html)

    def test_callback_html_origin_correcto(self):
        with patch.object(main, "PUBLIC_APP_URL", "https://app.test"):
            resp = main._google_callback_html({"type": "google_auth"})
            html = resp.body.decode()
            self.assertIn('"https://app.test"', html)
            self.assertNotIn('"*"', html)


# ------------------------------------------------------------
# V-01 backend: normalización del payload público de contribución
# ------------------------------------------------------------

class TestV01ContribuirBackend(unittest.TestCase):
    """El endpoint público no debe persistir claves internas spoofables
    ni tipos de inmueble arbitrarios dentro del JSON del comparable."""

    def _solicitud(self):
        return {
            "id": 42, "usuario_id": 7, "estado": "pendiente",
            "tipo_inmueble": "lote", "token_link": "tok",
            "tasacion_id": None, "datos": {},
            "fecha_creacion": datetime.utcnow(),
            "fecha_modificacion": datetime.utcnow(),
            "fecha_expiracion": datetime.utcnow() + timedelta(days=1),
            "fecha_completacion": None,
        }

    def _run_contribuir(self, comparables, solicitud=None):
        sol_repo = MagicMock()
        sol_repo.find_by_link_publico.return_value = solicitud or self._solicitud()
        sol_repo.update.return_value = dict(
            solicitud or self._solicitud(), estado="completada"
        )
        comp_repo = MagicMock()
        comp_repo.create.return_value = {"id": 1}
        conn = MagicMock()

        captured = []

        def fake_crear(**kwargs):
            captured.append(kwargs["datos"])
            return {"id": 1}

        with patch("main.SolicitudRepository", return_value=sol_repo), \
             patch("main.ComparableRepository", return_value=comp_repo), \
             patch("main._crear_comparable", side_effect=fake_crear), \
             patch("main.get_connection", return_value=conn), \
             patch("main.release_connection"):
            return main.contribuir_solicitud(
                "tok", SolicitudContribuirRequest(comparables=comparables)
            ), captured

    def test_claves_internas_no_persisten(self):
        _, captured = self._run_contribuir([{
            "datos": {
                "direccion": "Calle 1", "id": "<img src=x>",
                "usuario_id": 999, "estado_aceptacion": "aceptado",
                "id_creador": 1, "observaciones": "spoof",
            }
        }])
        datos = captured[0]
        for clave in ("id", "usuario_id", "estado_aceptacion",
                      "id_creador", "observaciones"):
            self.assertNotIn(clave, datos)
        self.assertEqual(datos["direccion"], "Calle 1")

    def test_tipo_inmueble_invalido_cae_al_de_solicitud(self):
        _, captured = self._run_contribuir([{
            "datos": {"direccion": "Calle 1", "tipoInmueble": "<script>"}
        }])
        # _crear_comparable fue llamado con el tipo de la solicitud
        self.assertEqual(len(captured), 1)

    def test_limite_comparables(self):
        with self.assertRaises(HTTPException) as ctx:
            self._run_contribuir([{"datos": {}}] * 51)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_colaborador_tipo_invalido_ignorado(self):
        resp, _ = self._run_contribuir(
            [{"datos": {"direccion": "Calle 1"}}],
        )
        self.assertEqual(resp.estado, "completada")


if __name__ == "__main__":
    unittest.main()

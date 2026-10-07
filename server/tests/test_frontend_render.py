"""
Tests de renderizado del frontend (informe/PDF y sanitización XSS).

Ejecutan el JavaScript real de client/js dentro de un motor V8
(py_mini_racer) con stubs mínimos de DOM, para validar:

- ReportReference marca data-report-empty en los cuadros vacíos del
  Índice de Referencia (las 4 combinaciones pedidas).
- printReport() remueve del DOM los nodos vacíos (incluido el caso de
  grilla completa + columnas anidadas), colapsa el grid a 1 columna
  cuando queda una sola, y restaura todo después de imprimir.
- tasacionToReportData() escapa todos los strings del árbol de datos
  (anti-XSS almacenado) sin tocar el objeto original.

Requieren py_mini_racer; se saltan automáticamente si no está instalado.
"""

import json
import os
import unittest

try:
    from py_mini_racer import MiniRacer
except ImportError:
    MiniRacer = None

CLIENT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "..", "client"
)

# Entorno mínimo de navegador. window.print registra el estado del DOM
# en el momento de imprimir; setTimeout y addEventListener capturan los
# callbacks para poder invocarlos manualmente desde el test.
JS_ENV = r"""
var window = {
    __handlers: {},
    __deferred: [],
    addEventListener: function (ev, fn) { window.__handlers[ev] = fn; },
    print: function () {
        var v = document.getElementById('reportViewer');
        window.__printedChildren = v ? v.children.length : -1;
        var g = v && v.querySelectorAll('.report-reference-grid')[0];
        window.__printedGridStyle = g ? g.style.gridTemplateColumns : null;
        window.__printedGridCols = g ? g.querySelectorAll('.report-reference-column').length : -1;
        window.__printed = true;
    },
    location: { search: '' }
};
var document = {
    addEventListener: function () {},
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    createElement: function () { return { style: {}, setAttribute: function(){} }; },
    body: { appendChild: function () {}, classList: { add: function(){}, remove: function(){} } }
};
var localStorage = {
    getItem: function () { return null; },
    setItem: function () {},
    removeItem: function () {}
};
var console = { log: function () {}, warn: function () {}, error: function () {} };
var API_BASE_URL = 'https://api.test';
var fetch = function () { return Promise.reject(new Error('offline')); };
var ResizeObserver = function () { this.observe = function(){}; this.unobserve = function(){}; this.disconnect = function(){}; };
var MutationObserver = function () { this.observe = function(){}; this.disconnect = function(){}; };
var setTimeout = function (fn) { window.__deferred.push(fn); return 0; };
"""

# Mini-DOM compartido por los tests de printReport.
FAKE_DOM = r"""
function makeEl(attrs) {
    var el = {
        attrs: attrs || {},
        children: [],
        parentNode: null,
        nextSibling: null,
        isConnected: true,
        style: {},
        remove: function () {
            var i = this.parentNode.children.indexOf(this);
            if (i >= 0) this.parentNode.children.splice(i, 1);
            this.isConnected = false;
        },
        insertBefore: function (n, ref) {
            var i = ref ? this.children.indexOf(ref) : -1;
            if (i < 0) i = this.children.length;
            this.children.splice(i, 0, n);
            n.parentNode = this;
            n.isConnected = true;
        },
        querySelectorAll: function (sel) {
            var out = [];
            function walk(node) {
                node.children.forEach(function (c) {
                    if (sel === '[data-report-empty="1"]' && c.attrs['data-report-empty']) out.push(c);
                    if (sel === '.report-reference-grid' && c.attrs['class'] === 'report-reference-grid') out.push(c);
                    if (sel === '.report-reference-column' && c.attrs['class'] === 'report-reference-column') out.push(c);
                    walk(c);
                });
            }
            walk(this);
            return out;
        }
    };
    return el;
}
"""


def _js_path(name):
    return os.path.join(CLIENT_DIR, "js", name)


def _to_js(value):
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

    def setUp(self):
        self.ctx.eval(
            "window.__handlers = {}; window.__deferred = [];"
            "window.__printed = false; window.__printedChildren = -1;"
            "window.__printedGridStyle = null; window.__printedGridCols = -1;"
        )


class TestReportReferenceEmptySections(BaseJsTest):
    """Combinaciones de cuadros vacíos del Índice de Referencia."""

    FILES = ["report-components.js"]

    def _render(self, ubicacion=None, solicitante=None, tipo_lote=None,
                superficie=None, nomenclatura=None):
        sel = {
            "tipo": "lote",
            "tasacion": {
                "ubicacion": ubicacion or {},
                "finalidad": None,
                "clienteNombre": (solicitante or {}).get("clienteNombre"),
                "nomenclaturaCatastral": nomenclatura,
                "lote": {},
            },
        }
        self.ctx.eval("window.__sel = " + _to_js(sel) + ";")
        self.ctx.eval(
            "window.__sel.getTipoLote = function(){ return "
            + _to_js(tipo_lote) + "; };"
            "window.__sel.getSuperficieTotal = function(){ return "
            + _to_js(superficie) + "; };"
            "window.__sel.mostrarAmbientes = function(){ return false; };"
            "window.__sel.getAmbientes = function(){ return null; };"
            "window.__sel.getSuperficieCubierta = function(){ return null; };"
            "window.__sel.getSuperficieTerreno = function(){ return null; };"
            "window.__sel.getAntiguedad = function(){ return null; };"
        )
        config = {}
        if solicitante:
            config.update({
                "clienteDni": solicitante.get("dni"),
                "clienteTelefono": solicitante.get("telefono"),
            })
        if nomenclatura:
            config["nomenclaturaCatastral"] = nomenclatura
        self.ctx.eval(
            "window.__html = ReportReference({"
            "  selector: window.__sel, reportInfo: {}, config: " + _to_js(config) +
            "});"
        )
        return self.ctx.eval("window.__html")

    # ---- combinaciones pedidas ----

    def test_ambos_vacios_no_aparece_ningun_cuadro(self):
        """A) identificación vacía + solicitante vacío → todo marcado."""
        html = self._render()
        # grilla + 2 columnas marcadas → al imprimir no queda nada
        self.assertEqual(html.count('data-report-empty="1"'), 3)

    def test_solo_identificacion(self):
        """B) identificación con datos + solicitante vacío → solo solicitante marcado."""
        html = self._render(ubicacion={"direccion": "Av. Siempreviva 742"})
        self.assertEqual(html.count('data-report-empty="1"'), 1)
        # el marcado está en la segunda columna (Datos del Solicitante)
        parte_solicitante = html.split('Identificación del Inmueble')[1]
        self.assertIn('data-report-empty="1"', parte_solicitante)

    def test_solo_solicitante(self):
        """C) identificación vacía + solicitante con datos → solo identificación marcada."""
        html = self._render(solicitante={"clienteNombre": "Juan Pérez"})
        self.assertEqual(html.count('data-report-empty="1"'), 1)
        # el marcado está en la primera columna (Identificación)
        parte_inmueble = html.split('Identificación del Inmueble')[0]
        self.assertIn('data-report-empty="1"', parte_inmueble)

    def test_ambos_con_datos(self):
        """D) ambos con datos → ningún marcado."""
        html = self._render(
            ubicacion={"direccion": "Calle 1", "localidad": "X", "provincia": "Y"},
            solicitante={"clienteNombre": "Ana", "dni": "123", "telefono": "555"},
        )
        self.assertEqual(html.count('data-report-empty="1"'), 0)

    # ---- casos de borde ----

    def test_nomenclatura_catastral_cuenta_como_dato(self):
        html = self._render(nomenclatura="12-345-67")
        self.assertEqual(html.count('data-report-empty="1"'), 1)  # solo solicitante

    def test_superficie_lote_cuenta_como_dato(self):
        html = self._render(superficie="850")
        self.assertEqual(html.count('data-report-empty="1"'), 1)  # solo solicitante

    def test_telefono_solo_cuenta_como_dato(self):
        html = self._render(solicitante={"telefono": "444"})
        self.assertEqual(html.count('data-report-empty="1"'), 1)  # solo inmueble


class TestPrintReportRemovesEmpty(BaseJsTest):
    """printReport() saca del DOM los data-report-empty y los restaura."""

    FILES = ["report-components.js", "vista-previa-informe.js"]

    def _build_dom(self, grid_marked, col1_marked, col2_marked):
        self.ctx.eval(FAKE_DOM)
        self.ctx.eval(
            r"""
            var viewer = makeEl();
            var grid = makeEl({ 'class': 'report-reference-grid' """
            + (", 'data-report-empty': '1'" if grid_marked else "")
            + r""" });
            var col1 = makeEl({ 'class': 'report-reference-column' """
            + (", 'data-report-empty': '1'" if col1_marked else "")
            + r""" });
            var col2 = makeEl({ 'class': 'report-reference-column' """
            + (", 'data-report-empty': '1'" if col2_marked else "")
            + r""" });
            grid.children = [col1, col2];
            col1.parentNode = grid; col2.parentNode = grid;
            col1.nextSibling = col2;
            viewer.children = [grid]; grid.parentNode = viewer;
            document.getElementById = function (id) { return id === 'reportViewer' ? viewer : null; };
            window.__viewer = viewer;
            window.__grid = grid;
            """
        )

    def _fire_afterprint(self):
        """Dispara el listener afterprint y los deferred (setTimeout)."""
        self.ctx.eval(
            "if (window.__handlers.afterprint) window.__handlers.afterprint();"
            "window.__deferred.forEach(function(f){ f(); });"
            "window.__deferred = [];"
        )

    def test_grilla_completa_vacia_se_remueve_y_restaura(self):
        """Grilla marcada + columnas marcadas: la grilla se lleva todo."""
        self._build_dom(grid_marked=True, col1_marked=True, col2_marked=True)
        self.ctx.eval("printReport();")
        # durante print: la grilla entera ya no está en el viewer
        self.assertEqual(self.ctx.eval("window.__printedChildren"), 0)
        # tras afterprint: restaurada con sus 2 columnas
        self._fire_afterprint()
        self.assertEqual(self.ctx.eval("window.__viewer.children.length"), 1)
        self.assertEqual(self.ctx.eval("window.__grid.children.length"), 2)

    def test_una_columna_vacia_se_remueve_y_colapsa_grid(self):
        """Solo col2 vacía: se remueve, el grid queda en 1fr para print."""
        self._build_dom(grid_marked=False, col1_marked=False, col2_marked=True)
        self.ctx.eval("printReport();")
        self.assertEqual(self.ctx.eval("window.__printedGridCols"), 1)
        self.assertEqual(self.ctx.eval("window.__printedGridStyle"), "1fr")
        self._fire_afterprint()
        self.assertEqual(self.ctx.eval("window.__grid.children.length"), 2)
        # restaura el estilo previo (undefined en el fake DOM = '' en el real)
        self.assertIsNone(
            self.ctx.eval("window.__grid.style.gridTemplateColumns")
        )

    def test_nada_marcado_no_cambia_dom(self):
        """Sin nodos vacíos: printReport no toca el DOM."""
        self._build_dom(grid_marked=False, col1_marked=False, col2_marked=False)
        self.ctx.eval("printReport();")
        self.assertEqual(self.ctx.eval("window.__printedChildren"), 1)
        self.assertEqual(self.ctx.eval("window.__printedGridCols"), 2)
        self._fire_afterprint()
        self.assertEqual(self.ctx.eval("window.__viewer.children.length"), 1)


class TestXssEscapeInforme(BaseJsTest):
    """Escape centralizado de datos para el render por innerHTML."""

    FILES = ["report-data-adapter.js"]

    def test_escapar_datos_informe_escapa_todo_el_arbol(self):
        self.ctx.eval(r"""
            window.__out = escaparDatosInforme({
                a: '<img src=x onerror=alert(1)>',
                b: { c: '"><script>alert(2)</script>', n: 5, ok: null },
                arr: ['x&y', { z: "it's" }],
                num: 42,
                bool: false
            });
        """)
        out = json.loads(self.ctx.eval("JSON.stringify(window.__out)"))
        self.assertEqual(out["a"], "&lt;img src=x onerror=alert(1)&gt;")
        self.assertEqual(
            out["b"]["c"], "&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"
        )
        self.assertEqual(out["b"]["n"], 5)
        self.assertIsNone(out["b"]["ok"])
        self.assertEqual(out["arr"][0], "x&amp;y")
        self.assertEqual(out["arr"][1]["z"], "it&#39;s")
        self.assertEqual(out["num"], 42)
        self.assertFalse(out["bool"])

    def test_no_modifica_el_objeto_original(self):
        self.ctx.eval(r"""
            window.__orig = { txt: '<b>bold</b>' };
            window.__copia = escaparDatosInforme(window.__orig);
        """)
        self.assertEqual(self.ctx.eval("window.__orig.txt"), "<b>bold</b>")
        self.assertEqual(
            self.ctx.eval("window.__copia.txt"), "&lt;b&gt;bold&lt;/b&gt;"
        )

    def test_tasacion_to_report_data_escapa_campos_de_terceros(self):
        """Un comparable/dirección con markup malicioso sale escapado."""
        self.ctx.eval(r"""
            window.__maliciosa = {
                id: 't1',
                tipo: 'lote',
                estado: 'completada',
                fecha_creacion: '2024-01-01',
                cliente_nombre: '<svg onload=alert(1)>',
                clienteNombre: '<svg onload=alert(1)>',
                // igual que obtenerTasacionParaInforme: datos va con spread
                ubicacion: { direccion: '<img src=x onerror=alert(1)>' },
                comparables: [{
                    id: 'c1',
                    ubicacion: { direccion: '<script>alert(9)</script>' },
                    valor: 100
                }],
                datos: {
                    ubicacion: { direccion: '<img src=x onerror=alert(1)>' },
                    comparables: [{
                        id: 'c1',
                        ubicacion: { direccion: '<script>alert(9)</script>' },
                        valor: 100
                    }],
                    resultado: { valor_final: 50000, valor_m2: 100 }
                },
                lote: {}
            };
            window.__promise = tasacionToReportData(window.__maliciosa, {
                config: { title: '<b onclick=alert(3)>x</b>' },
                usuario: { nombre: 'Ana', apellido: 'García' },
                profesional: {}
            });
            window.__promise.then(function (r) {
                window.__rdstr = JSON.stringify(r);
            });
        """)
        rd = json.loads(self.ctx.eval("window.__rdstr"))
        self.assertNotIn("<img", rd["property"]["address"])
        self.assertIn("&lt;img", rd["property"]["address"])
        self.assertNotIn("<script", rd["comparables"][0]["address"])
        self.assertIn("&lt;script&gt;", rd["comparables"][0]["address"])
        self.assertIn("&lt;svg", rd["client"]["name"])
        self.assertIn("&lt;b", rd["reportInfo"]["title"])
        # el objeto de entrada no quedó mutado
        orig = json.loads(self.ctx.eval("JSON.stringify(window.__maliciosa)"))
        self.assertEqual(
            orig["datos"]["ubicacion"]["direccion"],
            "<img src=x onerror=alert(1)>",
        )


if __name__ == "__main__":
    unittest.main()

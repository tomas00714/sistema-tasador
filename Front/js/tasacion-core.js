/* =========================
   TASACION CORE
   Variables globales y estructura de datos
========================= */

// Helpers DOM
function getBtnSiguiente() {
    return document.getElementById("btnSiguiente");
}

function getBtnVolverPaso() {
    return document.getElementById("btnVolverPaso");
}

function getContenidoTasacion() {
    const contenido = document.querySelector("#tarjetaNuevaTasacion .tasacion-contenido") ||
                     document.querySelector(".tasacion-contenido");
    console.log("getContenidoTasacion() devolvió:", contenido);
    return contenido;
}

// Estado global
let pasoActual = 1;
let tipoSeleccionado = null;
let tasacionId = 0; // 0 = nueva tasación, 1 = edición
let tasacionIdReal = null; // ID real cuando es edición (para usar al guardar)
let resultadoCalculado = false;
let comparablesContenidoClickInicializado = false;
let comparablePanelModo = null;
const comparableManualDocListeners = [];
let resultadoTasacion = null;

// Configuración API
const API_TASACION = "http://127.0.0.1:8080";

/* =========================
   DATOS
========================= */

const datosTasacion = {
    tipo: null,
    cantDeEdiciones: 0,
    comparables: [], // Array de objetos completos (no solo IDs)
    ubicacion: {
        direccion: "",
        provincia: "",
        localidad: "",
        lat: null,
        lon: null,
        orientacion: ""
    },
    lote: {
        tipoLote: "",
        servicios: [],
        caracteristicas: {},
        observaciones: ""
    },
    departamento: {
        ambientes: "",
        dormitorios: "",
        banos: "",
        cochera: false,
        baulera: false,
        servicios: [],
        amenities: [],
        infraestructura: [],
        observaciones: "",
        ubicacionPlanta: "",
        ubicacionPlantaCoef: 0,
        tieneAscensor: "",
        ubicacionPiso: "",
        ubicacionPisoCoef: 0,
        superficieCubierta: "",
        superficieCubiertaCoef: 0,
        antiguedad: "",
        estadoConservacion: "",
        estadoConservacionCoef: 0,
        caracteristicaConstructiva: "",
        caracteristicaConstructivaCoef: 0,
        ubicacionEdificio: "",
        homogeneizacion: {
            cubierto: { superficie: 0, coeficiente: 1, homogeneizada: 0 },
            semicubierto: { superficie: 0, coeficiente: 0.50, homogeneizada: 0 },
            balcon: { superficie: 0, coeficiente: 0.30, homogeneizada: 0 },
            descubierto: { superficie: 0, coeficiente: 0.20, homogeneizada: 0 },
            totalSuperficie: 0,
            totalHomogeneizada: 0
        }
    },
    casa: {
        ambientes: "",
        dormitorios: "",
        banos: "",
        cochera: false,
        baulera: false,
        servicios: [],
        infraestructura: [],
        observaciones: "",
        superficieCubierta: "",
        superficieCubiertaCoef: 0,
        superficieTotal: "",
        superficieTotalCoef: 0,
        antiguedad: "",
        estadoConservacion: "",
        calidadConstruccion: "",
        calidadConstruccionCoef: 0,
        superficieHomogeneizada: 0,
        homogeneizacion: {
            cubierto: { superficie: 0, coeficiente: 1, homogeneizada: 0 },
            semicubierto: { superficie: 0, coeficiente: 0.50, homogeneizada: 0 },
            balcon: { superficie: 0, coeficiente: 0.30, homogeneizada: 0 },
            descubierto: { superficie: 0, coeficiente: 0.20, homogeneizada: 0 },
            totalSuperficie: 0,
            totalHomogeneizada: 0
        }
    },
    comparables: []
};

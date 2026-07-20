// USA ESTO PARA BUSCAR DINÁMICAMENTE:
function getBtnSiguiente() {
    return document.getElementById("btnSiguiente");
}

function getBtnVolverPaso() {
    return document.getElementById("btnVolverPaso");
}

function getContenidoTasacion() {
    // Esto asegura que busque dentro de la tarjeta expandida de TASADOR.html
    const contenido = document.querySelector("#tarjetaNuevaTasacion .tasacion-contenido") ||
                     document.querySelector(".tasacion-contenido"); // Fallback para tasacion.html
    console.log("getContenidoTasacion() devolvió:", contenido);
    return contenido;
}

let pasoActual = 1;

let tipoSeleccionado = null;

// Inicializar IDs para la tasación actual
let tasacionId = 0;
let tasacionIdReal = null;

let resultadoCalculado = false;

let comparablesContenidoClickInicializado = false;

let comparablePanelModo = null;

const comparableManualDocListeners = [];

const API_TASACION =
    "http://127.0.0.1:8080";

let resultadoTasacion = null;

/* =========================
   DATOS
========================= */

const datosTasacion = {

    tipo: null,

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

        // Tercera pantalla
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

        // Cuarta pantalla - Homogeneización de superficie
        homogeneizacion: {
            cubierto: { superficie: 0, coeficiente: 1, homogeneizada: 0 },
            semicubierto: { superficie: 0, coeficiente: 0.50, homogeneizada: 0 },
            balcon: { superficie: 0, coeficiente: 0.30, homogeneizada: 0 },
            descubierto: { superficie: 0, coeficiente: 0.20, homogeneizada: 0 },
            totalSuperficie: 0,
            totalHomogeneizada: 0
        }
    },

    comparables: [] // Array de IDs de comparables (no objetos embebidos)
};

/* =========================
   SIGUIENTE
========================= */

function inicializarBotonesTasacion() {
    const btnSiguiente = getBtnSiguiente();
    if (btnSiguiente) {
        // Guardar estado antes de clonar
        const wasDisabled = btnSiguiente.disabled;
        const wasActive = btnSiguiente.classList.contains("activo");

        // Remove existing listener to avoid duplicates
        const newBtn = btnSiguiente.cloneNode(true);
        btnSiguiente.parentNode.replaceChild(newBtn, btnSiguiente);

        // Mantener el estado del botón original
        newBtn.disabled = wasDisabled;
        if (wasActive) {
            newBtn.classList.add("activo");
        }

        newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            manejarBtnSiguiente();
        });
    }

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        // Remove existing listener to avoid duplicates
        const newBtn = btnVolverPaso.cloneNode(true);
        btnVolverPaso.parentNode.replaceChild(newBtn, btnVolverPaso);

        newBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const tipo = datosTasacion.tipo || 'lote';
            const nombrePasoActual = typeof getNombrePaso === 'function' ? getNombrePaso(tipo, getIndexPaso(tipo, pasoActual)) : null;

            if (pasoActual === 2) {
                volverSeleccionTipo();
            } else if (nombrePasoActual === 'datos') {
                if (tipo === 'lote') {
                    mostrarFormularioLote();
                } else if (tipo === 'departamento') {
                    mostrarFormularioDepartamento();
                }
            } else if (nombrePasoActual === 'caracteristicas') {
                if (tipo === 'lote') {
                    mostrarFormularioLote();
                } else if (tipo === 'departamento') {
                    mostrarFormularioDepartamento();
                }
            } else if (nombrePasoActual === 'superficie') {
                if (tipo === 'departamento') {
                    mostrarCaracteristicasDepartamento();
                }
            } else if (nombrePasoActual === 'comparables') {
                if (tipo === 'lote') {
                    mostrarCaracteristicasLote();
                } else if (tipo === 'departamento') {
                    mostrarHomogeneizacionSuperficie();
                }
            } else if (nombrePasoActual === 'resultado') {
                if (tipo === 'lote') {
                    mostrarPantallaComparables();
                } else if (tipo === 'departamento') {
                    mostrarPantallaComparables();
                }
            }
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    inicializarBotonesTasacion();
    verificarModoEdicion();
});

// Verificar si estamos en modo edición
function verificarModoEdicion() {
    try {
        const tasacionEnEdicion = localStorage.getItem("tasacionEnEdicion");
        if (tasacionEnEdicion) {
            const tasacion = JSON.parse(tasacionEnEdicion);
            
            // Establecer el ID de la tasación que se está editando
            tasacionId = tasacion.id;
            
            // Cargar los datos completos
            if (tasacion.datosCompletos) {
                cargarDatosCompletos(tasacion.datosCompletos);
            } else {
                // Si no tiene datosCompletos, cargar desde la estructura antigua
                datosTasacion.tipo = tasacion.tipo;
                datosTasacion.ubicacion = tasacion.ubicacion || { direccion: "", provincia: "", localidad: "", lat: null, lon: null, orientacion: "" };
                
                // Cargar datos según el tipo de inmueble
                if (tasacion.tipo === 'lote') {
                    datosTasacion.lote = tasacion.lote || { tipoLote: "", servicios: [], caracteristicas: {}, observaciones: "" };
                } else if (tasacion.tipo === 'departamento') {
                    datosTasacion.departamento = tasacion.departamento || { ambientes: "", dormitorios: "", banos: "", cochera: false, baulera: false, servicios: [], amenities: [], infraestructura: [], observaciones: "" };
                } else if (tasacion.tipo === 'casa') {
                    datosTasacion.casa = tasacion.casa || {};
                }
                
                datosTasacion.comparables = tasacion.comparables || [];
                resultadoTasacion = tasacion.resultado || null;
                pasoActual = 2; // Siempre ir a pantalla 2 (datos) al editar
                tipoSeleccionado = tasacion.tipo;
            }
            
            // Limpiar localStorage
            localStorage.removeItem("tasacionEnEdicion");

            // Navegar a la pantalla 2 (datos) del tipo correcto
            if (tipoSeleccionado) {
                pasoActual = 2;
                if (tipoSeleccionado === 'lote') {
                    mostrarFormularioLote();
                } else if (tipoSeleccionado === 'departamento') {
                    mostrarFormularioDepartamento();
                } else if (tipoSeleccionado === 'casa') {
                    mostrarFormularioCasa();
                }
            }
        }
    } catch (e) {
        console.error("Error al cargar tasación en edición:", e);
    }
}

// Re-inicializar cuando se abre la tarjeta de tasación
const originalAbrirTasacionHome = window.abrirTasacionHome;
if (originalAbrirTasacionHome) {
    window.abrirTasacionHome = function(opciones) {
        originalAbrirTasacionHome(opciones);
        setTimeout(inicializarBotonesTasacion, 100);
    };
}

/* =========================
   Selección tipo (delegación — evita listeners huérfanos al reemplazar HTML)
========================= */

function rootDelegacionSeleccionTipo() {

    return (
        document.getElementById("tarjetaNuevaTasacion") ||

        document.querySelector(".panel-principal") ||

        getContenidoTasacion()

    );

}

function sincronizarBotonesTipoVisuales() {

    const contenido = getContenidoTasacion();
    const scope =
        contenido ||

        rootDelegacionSeleccionTipo();

    if (!scope) {

        return;
    }

    let botonesTipo = null;

    if (contenido) {

        botonesTipo =
            contenido.querySelectorAll(
                "button.card-tipo"
            );
    }

    if (
        !botonesTipo ||
        botonesTipo.length === 0
    ) {

        botonesTipo =
            scope.querySelectorAll(
                ".tasacion-contenido button.card-tipo"
            );
    }

    if (
        !botonesTipo ||
        botonesTipo.length === 0
    ) {

        botonesTipo =
            scope.querySelectorAll(
                "button.card-tipo"
            );
    }

    botonesTipo.forEach(btn => {

        const marcado =
            btn.dataset.tipo === datosTasacion.tipo;

        btn.classList.toggle("active", marcado);

        btn.classList.toggle("seleccionado", marcado);
    });
}

function resolverBotonTipoDesdeEvento(
    event
) {

    const path =
        typeof event.composedPath ===
        "function"
            ? event.composedPath()
            : null;

    if (path && path.length) {

        for (let i = 0; i < path.length; i++) {

            const n = path[i];

            if (
                n &&
                n.nodeType === Node.ELEMENT_NODE &&
                typeof n.matches === "function" &&
                n.matches("button.card-tipo")
            ) {

                return n;
            }
        }
    }

    const raw = event.target;

    const origin =
        raw instanceof Element
            ? raw
            : raw && raw.parentElement;

    return origin &&
        typeof origin.closest === "function"
        ? origin.closest(
              "button.card-tipo"
          )
        : null;
}

function hostFlujoSeleccionTipo(
    card
) {

    const tarjetaHome =
        document.getElementById(
            "tarjetaNuevaTasacion"
        );

    if (tarjetaHome && tarjetaHome.contains(card)) {

        return tarjetaHome;
    }

    const panel =
        document.querySelector(
            ".panel-principal"
        );

    if (panel && panel.contains(card)) {

        return panel;
    }

    return null;
}

function aplicarSeleccionTipoInmueble(
    card,
    host
) {
    const nuevoTipo = card.dataset.tipo;
    
    // Verificar si ya hay datos en pantalla 2+ y se está cambiando de tipo
    if (datosTasacion.tipo && datosTasacion.tipo !== nuevoTipo && hayDatosEnPantalla2Mas()) {
        // Guardar referencia al card y host para usar después de confirmar
        tipoPendiente = nuevoTipo;
        cardPendiente = card;
        hostPendiente = host;
        mostrarConfirmacionCambiarTipo();
        return;
    }

    aplicarCambioTipo(card, host, nuevoTipo);
}

function aplicarCambioTipo(card, host, nuevoTipo) {
    host
        .querySelectorAll(
            "button.card-tipo"
        )
        .forEach(c => {

            c.classList.remove(
                "active",
                "seleccionado"
            );
        });

    card.classList.add("active", "seleccionado");

    tipoSeleccionado = nuevoTipo;

    datosTasacion.tipo = tipoSeleccionado;

    // Reset resultadoCalculado when type changes
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    const btnSiguiente = getBtnSiguiente();
    if (btnSiguiente) {

        btnSiguiente.disabled = false;

        btnSiguiente.classList.add("activo");
    }
}

function hayDatosEnPantalla2Mas() {
    // Verificar si hay datos en ubicación, lote, o comparables
    const tieneUbicacion = datosTasacion.ubicacion && 
        (datosTasacion.ubicacion.direccion || 
         datosTasacion.ubicacion.provincia || 
         datosTasacion.ubicacion.localidad ||
         datosTasacion.ubicacion.lat ||
         datosTasacion.ubicacion.lon);
    
    const tieneLote = datosTasacion.lote && 
        (datosTasacion.lote.tipoLote || 
         (datosTasacion.lote.servicios && datosTasacion.lote.servicios.length > 0) ||
         (datosTasacion.lote.caracteristicas && Object.keys(datosTasacion.lote.caracteristicas).length > 0));
    
    const tieneComparables = datosTasacion.comparables && datosTasacion.comparables.length > 0;
    
    return tieneUbicacion || tieneLote || tieneComparables;
}

function limpiarDatosPantallasPosteriores() {
    // Limpiar datos de ubicación, lote y comparables
    datosTasacion.ubicacion = {
        direccion: "",
        provincia: "",
        localidad: "",
        lat: null,
        lon: null
    };
    datosTasacion.lote = {
        tipoLote: "",
        servicios: [],
        caracteristicas: {}
    };
    datosTasacion.comparables = [];
    datosTasacion.resultado = null;
    resultadoTasacion = null;
    
    // Si estamos en pantalla 2+, volver a pantalla 1
    if (pasoActual >= 2) {
        pasoActual = 1;
        actualizarIndicadoresProgreso();
        volverSeleccionTipo();
    }
}

function limpiarDatosPantallasPosterioresSinVolver() {
    // Limpiar datos de ubicación, lote y comparables sin volver a pantalla 1
    datosTasacion.ubicacion = {
        direccion: "",
        provincia: "",
        localidad: "",
        lat: null,
        lon: null
    };
    datosTasacion.lote = {
        tipoLote: "",
        servicios: [],
        caracteristicas: {}
    };
    datosTasacion.comparables = [];
    datosTasacion.resultado = null;
    resultadoTasacion = null;
}

function inicializarDelegacionSeleccionTipo() {

    if (
        document.documentElement.dataset
            .delegacionTipoGlobal === "1"
    ) {

        return;
    }

    document.documentElement.dataset.delegacionTipoGlobal =
        "1";

    document.addEventListener(
        "click",
        event => {

            if (pasoActual !== 1) {

                return;
            }

            const card =
                resolverBotonTipoDesdeEvento(
                    event
                );

            if (!card) {

                return;
            }

            const host =
                hostFlujoSeleccionTipo(card);

            if (!host) {

                return;
            }

            aplicarSeleccionTipoInmueble(
                card,
                host
            );
        },

        true
    );
}

/* =========================
   COMPONENTES REUTILIZABLES
========================= */

function generarHTMLUbicacionConMapa(opciones = {}) {
    const incluirOrientacion = opciones.incluirOrientacion || false;
    const orientacionValue = opciones.orientacion || "";
    const incluirTipoLote = opciones.incluirTipoLote || false;

    let orientacionHTML = "";
    if (incluirOrientacion) {
        orientacionHTML = `
                <div class="input-group">

                    <label>Orientación</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="orientacionInput"
                            placeholder="Seleccionar orientación"
                            autocomplete="off"
                            readonly
                            value="${orientacionValue}"
                        >

                        <div class="autocomplete-list" id="orientacionList">

                            <div class="autocomplete-item">Norte</div>
                            <div class="autocomplete-item">Noreste</div>
                            <div class="autocomplete-item">Este</div>
                            <div class="autocomplete-item">Sureste</div>
                            <div class="autocomplete-item">Sur</div>
                            <div class="autocomplete-item">Suroeste</div>
                            <div class="autocomplete-item">Oeste</div>
                            <div class="autocomplete-item">Noroeste</div>

                        </div>

                    </div>

                </div>
        `;
    }

    let tipoLoteHTML = "";
    if (incluirTipoLote) {
        tipoLoteHTML = `
                <div class="input-group">

                    <label>Tipo de lote</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="tipoLoteInput"
                            placeholder="Seleccionar tipo"
                            autocomplete="off"
                            readonly
                            value="${datosTasacion.lote.tipoLote || ""}"
                        >

                        <div class="autocomplete-list" id="tipoLoteList">

                            <div class="autocomplete-item">
                                Medial
                            </div>

                            <div class="autocomplete-item">
                                Esquina
                            </div>

                            <div class="autocomplete-item">
                                Esquina larga (+30m)
                            </div>

                            <div class="autocomplete-item">
                                Salida a dos calles
                            </div>

                            <div class="autocomplete-item">
                                Irregular
                            </div>

                        </div>

                    </div>

                </div>
        `;
    }

    return `
            <div class="form-left">

                <div class="input-group">

                    <label>Dirección</label>

                    <input
                        type="text"
                        id="direccionInput"
                        value="${datosTasacion.ubicacion.direccion || ""}"
                    >

                </div>

                <div class="input-group">

                    <label>Provincia</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="provinciaInput"
                            placeholder="Escribí una provincia"
                            autocomplete="off"
                            value="${datosTasacion.ubicacion.provincia || ""}"
                        >

                        <div class="autocomplete-list" id="provinciaList"></div>

                    </div>

                </div>

                <div class="input-group">

                    <label>Localidad</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="localidadInput"
                            placeholder="Seleccionar provincia primero"
                            autocomplete="off"
                            disabled
                            value="${datosTasacion.ubicacion.localidad || ""}"
                        >

                        <div class="autocomplete-list" id="localidadList"></div>

                    </div>

                </div>

                ${orientacionHTML}

                ${tipoLoteHTML}

            </div>

            <div class="form-right">

                <div id="mapaTasacion" class="mapa-placeholder"></div>

            </div>
    `;
}

function generarHTMLServicios(serviciosActuales = []) {
    const opcionesServicios = ["Agua", "Luz", "Gas", "Cloacas", "Pavimento", "Ripio"];

    return opcionesServicios.map(servicio => `
        <div class="check-servicio">
            <label>
                <input
                    type="checkbox"
                    value="${servicio}"
                    ${serviciosActuales.includes(servicio) ? "checked" : ""}
                >
                ${servicio}
            </label>
        </div>
    `).join("");
}

function generarHTMLAmenities(amenitiesActuales = []) {
    const opcionesAmenities = [
        "Pileta",
        "Gimnasio",
        "SUM",
        "Quincho",
        "Seguridad 24hs",
        "Lavadero",
        "Balcón",
        "Terraza",
        "Sauna",
        "Solarium",
        "Jacuzzi",
        "Parrilla",
        "Laundry",
        "Coworking",
        "Terraza común",
        "Espacios verdes"
    ];

    return opcionesAmenities.map(amenity => `
        <div class="check-servicio">
            <label>
                <input
                    type="checkbox"
                    value="${amenity}"
                    ${amenitiesActuales.includes(amenity) ? "checked" : ""}
                >
                ${amenity}
            </label>
        </div>
    `).join("");
}

function generarHTMLInfraestructura(infraestructuraActuales = []) {
    const opcionesInfraestructura = [
        "Ascensor",
        "Encargado",
        "Seguridad",
        "Portero electrónico",
        "Cámara de seguridad",
        "Hall de ingreso"
    ];

    return opcionesInfraestructura.map(infra => `
        <div class="check-servicio">
            <label>
                <input
                    type="checkbox"
                    value="${infra}"
                    ${infraestructuraActuales.includes(infra) ? "checked" : ""}
                >
                ${infra}
            </label>
        </div>
    `).join("");
}

/* =========================
   FORMULARIO LOTE
========================= */

function mostrarFormularioLote() {

    pasoActual = 2;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {

        btnVolverPaso.style.display = "block";
    }

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `

        <div class="titulo-seccion">

            <h1>Datos del lote</h1>

        </div>

        <div class="form-grid">

            ${generarHTMLUbicacionConMapa({ incluirTipoLote: true })}

        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top:32px;">

            <h3>Servicios</h3>

            <div class="servicios-grid">

                ${generarHTMLServicios(datosTasacion.lote.servicios)}

            </div>

        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top: 32px;">

            <h3>Observaciones</h3>

            <div class="input-group">

                <textarea
                    id="observacionesLoteInput"
                    placeholder="Escribe cualquier observación adicional..."
                    rows="4"
                >${datosTasacion.lote.observaciones || ""}</textarea>

            </div>

        </div>

    `;

    // Update button state using dynamic validation
    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    cargarProvincias();

        requestAnimationFrame(() => {

            inicializarMapa();

            configurarBusquedaMapa();

            inicializarTipoLote();

        });

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);

}

/* =========================
   FORMULARIO DEPARTAMENTO
========================= */

function mostrarFormularioDepartamento() {

    pasoActual = 2;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {

        btnVolverPaso.style.display = "block";
    }

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `

        <div class="titulo-seccion">

            <h1>Datos del departamento</h1>

        </div>

        <!-- SECCIÓN 1: Ubicación y mapa -->
        <div class="form-grid">

            ${generarHTMLUbicacionConMapa({ incluirOrientacion: true, orientacion: datosTasacion.ubicacion.orientacion || "" })}

        </div>

        <div class="separador-formulario"></div>

        <!-- SECCIÓN 2: Características del departamento -->
        <div style="margin-top: 32px;">

            <h3>Características</h3>

            <div class="form-grid-departamento">

                <div class="input-group">

                    <label>Ambientes</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="ambientesInput"
                            placeholder="Seleccionar cantidad"
                            autocomplete="off"
                            readonly
                            value="${datosTasacion.departamento.ambientes || ""}"
                        >

                        <div class="autocomplete-list" id="ambientesList">

                            <div class="autocomplete-item">Monoambiente</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5</div>
                            <div class="autocomplete-item">6</div>
                            <div class="autocomplete-item">Más</div>

                        </div>

                    </div>

                </div>

                <div class="input-group">

                    <label>Dormitorios</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="dormitoriosInput"
                            placeholder="Seleccionar cantidad"
                            autocomplete="off"
                            readonly
                            value="${datosTasacion.departamento.dormitorios || ""}"
                            ${datosTasacion.departamento.ambientes === "Monoambiente" ? "disabled" : ""}
                        >

                        <div class="autocomplete-list" id="dormitoriosList">

                            <div class="autocomplete-item">1</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5</div>
                            <div class="autocomplete-item">6</div>
                            <div class="autocomplete-item">Más</div>

                        </div>

                    </div>

                </div>

                <div class="input-group">

                    <label>Baños</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="banosInput"
                            placeholder="Seleccionar cantidad"
                            autocomplete="off"
                            readonly
                            value="${datosTasacion.departamento.banos || ""}"
                        >

                        <div class="autocomplete-list" id="banosList">

                            <div class="autocomplete-item">1</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">Más</div>

                        </div>

                    </div>

                </div>

                <div class="input-group">

                    <label>Cochera</label>

                    <div class="switch-container-ascensor">

                        <label class="switch">

                            <input
                                type="checkbox"
                                id="cocheraSwitch"
                                ${datosTasacion.departamento.cochera ? "checked" : ""}
                            >

                            <span class="slider"></span>

                        </label>

                    </div>

                </div>

                <div class="input-group">

                    <label>Baulera</label>

                    <div class="switch-container-ascensor">

                        <label class="switch">

                            <input
                                type="checkbox"
                                id="bauleraSwitch"
                                ${datosTasacion.departamento.baulera ? "checked" : ""}
                            >

                            <span class="slider"></span>

                        </label>

                    </div>

                </div>

            </div>

        </div>

        <div class="separador-formulario"></div>

        <!-- SECCIÓN 3: Servicios, Amenities y Observaciones -->
        <div style="margin-top: 32px;">

            <h3>Servicios</h3>

            <div class="servicios-grid">

                ${generarHTMLServicios(datosTasacion.departamento.servicios)}

            </div>

        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top: 32px;">

            <h3>Infraestructura</h3>

            <div class="servicios-grid">

                ${generarHTMLInfraestructura(datosTasacion.departamento.infraestructura)}

            </div>

        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top: 32px;">

            <h3>Amenities</h3>

            <div class="servicios-grid">

                ${generarHTMLAmenities(datosTasacion.departamento.amenities)}

            </div>

        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top: 32px;">

            <h3>Observaciones</h3>

            <div class="input-group">

                <textarea
                    id="observacionesInput"
                    placeholder="Escribe cualquier observación adicional..."
                    rows="4"
                >${datosTasacion.departamento.observaciones || ""}</textarea>

            </div>

        </div>

    `;

    // Update button state using dynamic validation
    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    cargarProvincias();

    requestAnimationFrame(() => {

        inicializarMapa();

        configurarBusquedaMapa();

        inicializarOrientacion();

        inicializarAmbientes();

        inicializarDormitorios();

        inicializarBanos();

        inicializarSwitchCochera();

        inicializarSwitchBaulera();

    });

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);

}

function inicializarSwitchCochera() {
    const switchInput = document.getElementById("cocheraSwitch");
    if (!switchInput) return;

    agregarListenerSeguro(switchInput, "change", () => {
        datosTasacion.departamento.cochera = switchInput.checked;
    });
}

function inicializarSwitchBaulera() {
    const switchInput = document.getElementById("bauleraSwitch");
    if (!switchInput) return;

    agregarListenerSeguro(switchInput, "change", () => {
        datosTasacion.departamento.baulera = switchInput.checked;
    });
}

/* =========================
   TERCERA PANTALLA DEPARTAMENTO
========================= */

function mostrarCaracteristicasDepartamento() {

    pasoActual = 3;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {

        btnVolverPaso.style.display = "block";
    }

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `

        <div class="titulo-seccion">

            <h1>Características del departamento</h1>

        </div>

        <div class="form-grid-2-columnas">

            <!-- COLUMNA 1 (4 inputs) -->
            <div class="columna-departamento">

                <!-- Ubicación en planta -->
                <div class="input-group input-2-3">

                    <label>Ubicación en planta</label>

                    <div class="input-dividido-container">

                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">

                                <input
                                    type="text"
                                    id="ubicacionPlantaInput"
                                    placeholder="Seleccionar ubicación"
                                    autocomplete="off"
                                    readonly
                                    value="${datosTasacion.departamento.ubicacionPlanta || ""}"
                                >

                                <div class="autocomplete-list" id="ubicacionPlantaList">

                                    <div class="autocomplete-item" data-coef="1" data-rango="1">
                                        <span>Frente</span>
                                        <span class="coef-display">1</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95">
                                        <span>Contrafrente</span>
                                        <span class="coef-display">0.95</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90">
                                        <span>Patio interior</span>
                                        <span class="coef-display">0.90</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="0.93" data-rango="0.93">
                                        <span>Lateral</span>
                                        <span class="coef-display">0.93</span>
                                    </div>

                                </div>

                            </div>
                        </div>

                        <div class="input-dividido-coef">
                            <input
                                type="number"
                                id="ubicacionPlantaCoef"
                                placeholder="Coef"
                                step="0.01"
                                min="0"
                                value="${datosTasacion.departamento.ubicacionPlantaCoef || ""}"
                            >
                        </div>

                    </div>

                </div>

                <!-- Ubicación en piso -->
                <div class="input-group input-2-3">

                    <label>Ubicación en piso</label>

                    <div class="input-dividido-container">

                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">

                                <input
                                    type="text"
                                    id="ubicacionPisoInput"
                                    placeholder="Seleccionar piso"
                                    autocomplete="off"
                                    readonly
                                    value="${datosTasacion.departamento.ubicacionPiso || ""}"
                                >

                                <div class="autocomplete-list" id="ubicacionPisoList">

                                    <!-- Se llena dinámicamente según si tiene ascensor -->

                                </div>

                            </div>
                        </div>

                        <div class="input-dividido-coef">
                            <input
                                type="number"
                                id="ubicacionPisoCoef"
                                placeholder="Coef"
                                step="0.01"
                                min="0"
                                value="${datosTasacion.departamento.ubicacionPisoCoef || ""}"
                            >
                        </div>

                    </div>

                </div>

                <!-- Característica constructiva -->
                <div class="input-group input-2-3">

                    <label>Característica constructiva</label>

                    <div class="input-dividido-container">

                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">

                                <input
                                    type="text"
                                    id="caracteristicaConstructivaInput"
                                    placeholder="Seleccionar característica"
                                    autocomplete="off"
                                    readonly
                                    value="${datosTasacion.departamento.caracteristicaConstructiva || ""}"
                                >

                                <div class="autocomplete-list" id="caracteristicaConstructivaList">

                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90">
                                        <span>Económica</span>
                                        <span class="coef-display">0.90</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1">
                                        <span>Buena económica</span>
                                        <span class="coef-display">1</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05-1.10">
                                        <span>Buena sin servicios</span>
                                        <span class="coef-display">1.05-1.10</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="1.15" data-rango="1.15-1.20">
                                        <span>Buena con servicios</span>
                                        <span class="coef-display">1.15-1.20</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="1.25" data-rango="1.25-1.30">
                                        <span>Muy buena</span>
                                        <span class="coef-display">1.25-1.30</span>
                                    </div>

                                </div>

                            </div>
                        </div>

                        <div class="input-dividido-coef">
                            <input
                                type="number"
                                id="caracteristicaConstructivaCoef"
                                placeholder="Coef"
                                step="0.01"
                                min="0"
                                value="${datosTasacion.departamento.caracteristicaConstructivaCoef || ""}"
                            >
                        </div>

                    </div>

                </div>

                <!-- Ubicación del edificio -->
                <div class="input-group input-2-3">

                    <label>Ubicación del edificio</label>

                    <input
                        type="text"
                        id="ubicacionEdificioInput"
                        placeholder="Ingresar ubicación del edificio"
                        value="${datosTasacion.departamento.ubicacionEdificio || ""}"
                    >

                </div>

            </div>

            <!-- COLUMNA 2 (switch de ascensor) -->
            <div class="columna-departamento-centro">

                <!-- Switch de ascensor -->
                <div class="input-group input-2-3">

                    <label>Tiene ascensor</label>

                    <div class="switch-container-ascensor">

                        <label class="switch">

                            <input
                                type="checkbox"
                                id="tieneAscensorSwitch"
                                ${datosTasacion.departamento.tieneAscensor === "si" || !datosTasacion.departamento.tieneAscensor ? "checked" : ""}
                            >

                            <span class="slider"></span>

                        </label>

                    </div>

                </div>

            </div>

            <!-- COLUMNA 3 (inputs que estaban en columna 2) -->
            <div class="columna-departamento">

                <!-- Superficie cubierta propia -->
                <div class="input-group input-2-3">

                    <label>Superficie cubierta propia</label>

                    <div class="input-dividido-container">

                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">

                                <input
                                    type="text"
                                    id="superficieCubiertaInput"
                                    placeholder="Seleccionar rango"
                                    autocomplete="off"
                                    readonly
                                    value="${datosTasacion.departamento.superficieCubierta || ""}"
                                >

                                <div class="autocomplete-list" id="superficieCubiertaList">

                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10">
                                        <span>Hasta 30m²</span>
                                        <span class="coef-display">1.10</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05">
                                        <span>De 30 a 50m²</span>
                                        <span class="coef-display">1.05</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1">
                                        <span>De 50 a 100m²</span>
                                        <span class="coef-display">1</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95">
                                        <span>De 100 a 150m²</span>
                                        <span class="coef-display">0.95</span>
                                    </div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90">
                                        <span>Más de 150m²</span>
                                        <span class="coef-display">0.90</span>
                                    </div>

                                </div>

                            </div>
                        </div>

                        <div class="input-dividido-coef">
                            <input
                                type="number"
                                id="superficieCubiertaCoef"
                                placeholder="Coef"
                                step="0.01"
                                min="0"
                                value="${datosTasacion.departamento.superficieCubiertaCoef || ""}"
                            >
                        </div>

                    </div>

                </div>

                <!-- Antigüedad -->
                <div class="input-group input-2-3">

                    <label>Antigüedad (años)</label>

                    <input
                        type="number"
                        id="antiguedadInput"
                        placeholder="Ingresar antigüedad"
                        value="${datosTasacion.departamento.antiguedad || ""}"
                    >

                </div>

                <!-- Estado de conservación -->
                <div class="input-group input-2-3">

                    <label>Estado de conservación</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="estadoConservacionInput"
                            placeholder="Seleccionar estado"
                            autocomplete="off"
                            readonly
                            value="${datosTasacion.departamento.estadoConservacion || ""}"
                        >

                        <div class="autocomplete-list" id="estadoConservacionList">

                            <div class="autocomplete-item" data-valor="1">1 - Nuevo o muy bueno</div>
                            <div class="autocomplete-item" data-valor="2">2 - Conservación normal</div>
                            <div class="autocomplete-item" data-valor="3">3 - Necesitado de reparaciones sencillas</div>
                            <div class="autocomplete-item" data-valor="4">4 - Necesitado de reparaciones importantes</div>
                            <div class="autocomplete-item" data-valor="5">5 - Estado de demolición</div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    `;

    // Update button state using dynamic validation
    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarUbicacionPlanta();
    inicializarSwitchAscensor();
    inicializarUbicacionPiso();
    inicializarSuperficieCubierta();
    inicializarEstadoConservacion();
    inicializarCaracteristicaConstructiva();

    // Add real-time update for regular inputs
    const ubicacionEdificioInput = document.getElementById("ubicacionEdificioInput");
    if (ubicacionEdificioInput) {
        ubicacionEdificioInput.addEventListener("input", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.ubicacionEdificio = ubicacionEdificioInput.value;
            }
        });
    }

    const antiguedadInput = document.getElementById("antiguedadInput");
    if (antiguedadInput) {
        antiguedadInput.addEventListener("input", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.antiguedad = antiguedadInput.value;
                calcularCoeficienteAntiguedad();
            }
        });
    }

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);

}

function validarRangoCoeficiente(input, valor, coeficienteSeleccionado, rangoSeleccionado) {
    // Si hay un rango seleccionado, validar contra el rango
    if (rangoSeleccionado && rangoSeleccionado.includes('-')) {
        const [min, max] = rangoSeleccionado.split('-').map(parseFloat);
        // El coeficiente es válido si está dentro del rango (inclusive)
        if (valor >= min && valor <= max) {
            input.classList.remove("fuera-de-rango");
        } else {
            input.classList.add("fuera-de-rango");
        }
    } else {
        // Si no hay rango, validar contra el valor exacto
        if (Math.abs(valor - coeficienteSeleccionado) > 0.001) {
            input.classList.add("fuera-de-rango");
        } else {
            input.classList.remove("fuera-de-rango");
        }
    }
}

function inicializarSwitchAscensor() {
    const switchInput = document.getElementById("tieneAscensorSwitch");
    if (!switchInput) return;

    agregarListenerSeguro(switchInput, "change", () => {
        datosTasacion.departamento.tieneAscensor = switchInput.checked ? "si" : "no";
        actualizarListaPisos(switchInput.checked ? "si" : "no");
        
        // Reiniciar ubicación en piso al cambiar el switch
        const ubicacionPisoInput = document.getElementById("ubicacionPisoInput");
        const ubicacionPisoCoef = document.getElementById("ubicacionPisoCoef");
        if (ubicacionPisoInput) {
            ubicacionPisoInput.value = "";
            datosTasacion.departamento.ubicacionPiso = "";
        }
        if (ubicacionPisoCoef) {
            ubicacionPisoCoef.value = "";
            datosTasacion.departamento.ubicacionPisoCoef = "";
        }
    });

    // Inicializar lista según valor actual
    const valorActual = datosTasacion.departamento.tieneAscensor;
    if (valorActual) {
        actualizarListaPisos(valorActual);
    }
}

function actualizarListaPisos(tieneAscensor) {
    const list = document.getElementById("ubicacionPisoList");
    if (!list) return;

    let opciones = [];

    if (tieneAscensor === "si") {
        opciones = [
            { texto: "PB", coef: 0.90 },
            { texto: "PB con patio y jardín al fondo", coef: 1 },
            { texto: "1ro y 2do", coef: 0.95 },
            { texto: "3ro y 4to", coef: 1 },
            { texto: "5to y 6to", coef: 1.05 },
            { texto: "7mo y 8vo", coef: 1.10 },
            { texto: "Pisos superiores", coef: 1.5 },
            { texto: "Último piso", coef: 0.90 }
        ];
    } else {
        opciones = [
            { texto: "PB", coef: 1 },
            { texto: "PB con patio y jardín al fondo", coef: 1 },
            { texto: "1ro", coef: 1 },
            { texto: "2do", coef: 0.95 },
            { texto: "3ro y 4to", coef: 0.90 },
            { texto: "Último piso", coef: 0.90 }
        ];
    }

    list.innerHTML = opciones.map(op => `
        <div class="autocomplete-item" data-coef="${op.coef}">
            <span>${op.texto}</span>
            <span class="coef-display">${op.coef}</span>
        </div>
    `).join("");
}

function inicializarEstadoConservacion() {
    inicializarAutocomplete("estadoConservacionInput", "estadoConservacionList", {
        onSelect: (item, input) => {
            datosTasacion.departamento.estadoConservacion = item.textContent;
            datosTasacion.departamento.estadoConservacionCoef = parseInt(item.dataset.valor);
            calcularCoeficienteAntiguedad();
        }
    });
}

function calcularCoeficienteAntiguedad() {
    const antiguedad = parseInt(document.getElementById("antiguedadInput").value) || 0;
    const estado = datosTasacion.departamento.estadoConservacionCoef || 1;

    // Tabla de Ross-Heidecke simplificada
    // Estado 1 (Nuevo/muy bueno): coeficiente = 1 - (antiguedad * 0.01)
    // Estado 2 (Normal): coeficiente = 1 - (antiguedad * 0.015)
    // Estado 3 (Reparaciones sencillas): coeficiente = 1 - (antiguedad * 0.02)
    // Estado 4 (Reparaciones importantes): coeficiente = 1 - (antiguedad * 0.025)
    // Estado 5 (Demolición): coeficiente = 1 - (antiguedad * 0.03)

    let coeficiente = 1;
    const factor = [0.01, 0.015, 0.02, 0.025, 0.03][estado - 1] || 0.01;
    coeficiente = Math.max(0.5, 1 - (antiguedad * factor));

    datosTasacion.departamento.estadoConservacionCoef = coeficiente;
}

/* =========================
   CUARTA PANTALLA DEPARTAMENTO - HOMOGENEIZACIÓN SUPERFICIE
   (Implementada en tasacion-departamento.js)
========================= */

/* =========================
   SEXTA PANTALLA DEPARTAMENTO - RESULTADO
========================= */

function calcularYMostrarResultadoDepartamento() {

    // Por ahora, usamos la misma lógica que para lotes pero adaptada
    // En el futuro, esto debería llamar a un endpoint específico para departamentos
    const payload = armarPayloadTasacionDepartamento();
    console.log("Payload enviado al backend (departamento):", payload);

    const btnSiguiente = getBtnSiguiente();
    const loadingOverlay = document.getElementById("loadingOverlay");

    if (btnSiguiente) {
        btnSiguiente.disabled = true;
        btnSiguiente.classList.remove("activo");
    }

    // Show loading overlay
    if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
    }

    try {

        // Por ahora, usamos modo demo ya que no hay endpoint para departamentos
        console.log("Usando modo demo para departamento (sin backend específico)");

        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }

        // Modo demo: generar resultado simulado
        const hom = datosTasacion.departamento.homogeneizacion;
        const superficieHomogeneizada = hom.totalHomogeneizada || 0;

        // Calcular valor promedio de comparables
        const comparables = datosTasacion.comparables || [];
        let valorPromedio = 0;

        if (comparables.length > 0) {
            valorPromedio = comparables.reduce((sum, c) => {
                const valorM2 = c.valor / (c.superficie || superficieHomogeneizada);
                return sum + valorM2;
            }, 0) / comparables.length;
        }

        const valorFinal = valorPromedio * superficieHomogeneizada;

        resultadoTasacion = {
            valor_final: valorFinal,
            valor_m2: valorPromedio,
            superficie_homogeneizada: superficieHomogeneizada,
            comparables: comparables,
            ajuste_final_porcentaje: 0
        };

        datosTasacion.resultado = resultadoTasacion;

        mostrarPantallaResultadoDepartamento();

    } catch (e) {

        console.error("Error en la llamada al backend:", e);

        // Hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = "none";
        }

        alert("Error al calcular la tasación");

        if (btnSiguiente) {
            btnSiguiente.disabled = false;
            btnSiguiente.classList.add("activo");
        }
    }
}

function armarPayloadTasacionDepartamento() {
    // Esta función debería armar el payload específico para departamentos
    // Por ahora, retorna un objeto básico
    return {
        tipo: "departamento",
        ubicacion: datosTasacion.ubicacion,
        departamento: datosTasacion.departamento,
        comparables: datosTasacion.comparables
    };
}

function mostrarMenuOpcionesComparable(index, buttonElement) {
    // Cerrar cualquier menú existente
    const menuExistente = document.querySelector('.menu-opciones-comparable');
    if (menuExistente) {
        menuExistente.remove();
        return;
    }

    // Crear el menú
    const menu = document.createElement('div');
    menu.className = 'menu-opciones-comparable';
    menu.innerHTML = `
        <div class="menu-opciones-item" data-action="agregar-coeficiente" data-index="${index}">
            Agregar coeficiente
        </div>
        <div class="menu-opciones-item menu-opciones-eliminar" data-action="eliminar" data-index="${index}">
            Eliminar
        </div>
    `;

    // Posicionar el menú
    const rect = buttonElement.getBoundingClientRect();
    menu.style.position = 'absolute';
    menu.style.top = `${rect.bottom + 5}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;
    menu.style.zIndex = '1000';

    // Agregar al DOM
    document.body.appendChild(menu);

    // Agregar event listeners
    menu.querySelectorAll('.menu-opciones-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            const indexStr = e.target.dataset.index;
            const index = (indexStr === 'lote' || indexStr === 'esquina' || indexStr === 'medial') ? indexStr : parseInt(indexStr);
            
            if (action === 'eliminar') {
                if (confirm('¿Estás seguro de eliminar este comparable?')) {
                    datosTasacion.comparables.splice(index, 1);
                    mostrarPantallaResultadoDepartamento();
                }
            } else if (action === 'agregar-coeficiente') {
                alert('Función de agregar coeficiente - pendiente de implementar');
            }
            
            menu.remove();
        });
    });

    // Cerrar menú al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarMenu(e) {
            if (!menu.contains(e.target) && e.target !== buttonElement) {
                menu.remove();
                document.removeEventListener('click', cerrarMenu);
            }
        });
    }, 0);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function inicializarBotonesQuitarComparable() {
    document.querySelectorAll(".btn-quitar-comparable").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index) && datosTasacion.comparables[index]) {
                datosTasacion.comparables.splice(index, 1);
                renderComparablesDerecha();
                // Si estamos en la pantalla de resultado, recalcular
                const tipo = datosTasacion.tipo || 'lote';
                const pasos = pasosPorTipo[tipo] || [];
                const resultadoIndex = pasos.indexOf('resultado');
                const resultadoStep = resultadoIndex !== -1 ? resultadoIndex + 2 : (tipo === 'departamento' ? 6 : 5);
                
                if (pasoActual === resultadoStep) {
                    if (tipo === 'lote') {
                        calcularYMostrarResultado();
                    } else if (tipo === 'departamento') {
                        calcularYMostrarResultadoDepartamento();
                    }
                }
            }
        });
    });
}








function volverSeleccionTipo() {

    pasoActual = 1;
    actualizarTextoBotonSiguiente();
    actualizarIndicadoresProgreso();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {

        btnVolverPaso.style.display = "none";
    }

    const contenido = getContenidoTasacion();
    if (!contenido) {

        return;
    }

    contenido.innerHTML = `

        <div class="titulo-seccion">

            <h1>
                Selección tipo de inmueble
            </h1>

            <p>
                Elegí el tipo de propiedad que querés tasar.
            </p>

        </div>

        <div class="grid-tipos">

            <button
                class="card-tipo ${
                    datosTasacion.tipo === "lote"
                    ? "active seleccionado"
                    : ""
                }"
                data-tipo="lote"
            >
                <div class="card-tipo-icono">
                    <i class="fa-solid fa-map-pin"></i>
                </div>
                <div class="card-tipo-contenido">
                    <span class="card-tipo-nombre">Lote</span>
                    <span class="card-tipo-descripcion">Terreno sin construcción</span>
                </div>
            </button>

            <button
                class="card-tipo ${
                    datosTasacion.tipo === "casa"
                    ? "active seleccionado"
                    : ""
                }"
                data-tipo="casa"
            >
                <div class="card-tipo-icono">
                    <i class="fa-regular fa-house"></i>
                </div>
                <div class="card-tipo-contenido">
                    <span class="card-tipo-nombre">Casa</span>
                    <span class="card-tipo-descripcion">Vivienda unifamiliar</span>
                </div>
            </button>

            <button
                class="card-tipo ${
                    datosTasacion.tipo === "departamento"
                    ? "active seleccionado"
                    : ""
                }"
                data-tipo="departamento"
            >
                <div class="card-tipo-icono">
                    <i class="fa-regular fa-building"></i>
                </div>
                <div class="card-tipo-contenido">
                    <span class="card-tipo-nombre">Departamento / PH</span>
                    <span class="card-tipo-descripcion">Unidad funcional</span>
                </div>
            </button>

        </div>

    `;

    reinicializarCards();

    if (datosTasacion.tipo) {

        tipoSeleccionado = datosTasacion.tipo;

        const btnSiguiente = getBtnSiguiente();
        if (btnSiguiente) {

            btnSiguiente.disabled = false;

            btnSiguiente.classList.add("activo");
        }
    }

    else {

        const btnSiguiente = getBtnSiguiente();
        if (btnSiguiente) {

            btnSiguiente.disabled = true;

            btnSiguiente.classList.remove("activo");
        }
    }
}

function reinicializarCards() {

    sincronizarBotonesTipoVisuales();
}







function guardarDatosPantalla1() {

    datosTasacion.ubicacion.direccion =
        document.getElementById("direccionInput").value;

    datosTasacion.ubicacion.provincia =
        document.getElementById("provinciaInput").value;

    datosTasacion.ubicacion.localidad =
        document.getElementById("localidadInput").value;

    datosTasacion.lote.tipoLote =
        document.getElementById("tipoLoteInput").value;

    const serviciosSeleccionados = [];

    document
        .querySelectorAll(
            '.check-servicio input:checked'
        )
        .forEach(check => {

            serviciosSeleccionados.push(
                check.value
            );
        });

    datosTasacion.lote.servicios =
        serviciosSeleccionados;

    datosTasacion.lote.observaciones =
        document.getElementById("observacionesLoteInput").value;

    // Reset resultadoCalculado when screen 2 data changes
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    if (marcador) {

        const posicion = marcador.getLatLng();

        datosTasacion.ubicacion.lat =
            posicion.lat;

        datosTasacion.ubicacion.lon =
            posicion.lng;
    }

    console.log(datosTasacion);
}

function guardarDatosPantallaDepartamento() {

    datosTasacion.ubicacion.direccion =
        document.getElementById("direccionInput").value;

    datosTasacion.ubicacion.provincia =
        document.getElementById("provinciaInput").value;

    datosTasacion.ubicacion.localidad =
        document.getElementById("localidadInput").value;

    datosTasacion.ubicacion.orientacion =
        document.getElementById("orientacionInput").value;

    datosTasacion.departamento.ambientes =
        document.getElementById("ambientesInput").value;

    datosTasacion.departamento.dormitorios =
        document.getElementById("dormitoriosInput").value;

    datosTasacion.departamento.banos =
        document.getElementById("banosInput").value;

    const cocheraSwitch = document.getElementById("cocheraSwitch");
    datosTasacion.departamento.cochera = cocheraSwitch ? cocheraSwitch.checked : false;

    const bauleraSwitch = document.getElementById("bauleraSwitch");
    datosTasacion.departamento.baulera = bauleraSwitch ? bauleraSwitch.checked : false;

    const serviciosSeleccionados = [];
    document.querySelectorAll('.servicios-grid input:checked').forEach(check => {
        if (check.closest('div').previousElementSibling?.textContent === "Servicios") {
            serviciosSeleccionados.push(check.value);
        }
    });
    datosTasacion.departamento.servicios = serviciosSeleccionados;

    const infraestructuraSeleccionados = [];
    document.querySelectorAll('.servicios-grid input:checked').forEach(check => {
        if (check.closest('div').previousElementSibling?.textContent === "Infraestructura") {
            infraestructuraSeleccionados.push(check.value);
        }
    });
    datosTasacion.departamento.infraestructura = infraestructuraSeleccionados;

    const amenitiesSeleccionados = [];
    document.querySelectorAll('.servicios-grid input:checked').forEach(check => {
        if (check.closest('div').previousElementSibling?.textContent === "Amenities") {
            amenitiesSeleccionados.push(check.value);
        }
    });
    datosTasacion.departamento.amenities = amenitiesSeleccionados;

    datosTasacion.departamento.observaciones =
        document.getElementById("observacionesInput").value;

    // Reset resultadoCalculado when screen 2 data changes
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    if (marcador) {

        const posicion = marcador.getLatLng();

        datosTasacion.ubicacion.lat =
            posicion.lat;

        datosTasacion.ubicacion.lon =
            posicion.lng;
    }

    console.log(datosTasacion);
}

function guardarDatosCaracteristicasDepartamento() {

    datosTasacion.departamento.ubicacionPlanta =
        document.getElementById("ubicacionPlantaInput").value;

    const switchAscensor = document.getElementById("tieneAscensorSwitch");
    datosTasacion.departamento.tieneAscensor = switchAscensor ? (switchAscensor.checked ? "si" : "no") : "";

    datosTasacion.departamento.ubicacionPiso =
        document.getElementById("ubicacionPisoInput").value;

    datosTasacion.departamento.superficieCubierta =
        document.getElementById("superficieCubiertaInput").value;

    datosTasacion.departamento.antiguedad =
        document.getElementById("antiguedadInput").value;

    datosTasacion.departamento.estadoConservacion =
        document.getElementById("estadoConservacionInput").value;

    datosTasacion.departamento.caracteristicaConstructiva =
        document.getElementById("caracteristicaConstructivaInput").value;

    datosTasacion.departamento.ubicacionEdificio =
        document.getElementById("ubicacionEdificioInput").value;

    // Recalcular coeficiente de antigüedad
    calcularCoeficienteAntiguedad();

    // Reset resultadoCalculado when screen 3 data changes
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    console.log(datosTasacion);
}

/* =========================
   CHECKS
========================= */

async function cargarProvincias() {

    try {

        await asegurarDatasetProvincias();

        inicializarAutocompleteProvincia();

    } catch(error) {

        console.error(
            "Error cargando provincias:",
            error
        );
    }
}


async function cargarLocalidadesUI(provincia) {

    const inputLocalidad =
        document.getElementById("localidadInput");

    const listLocalidad =
        document.getElementById("localidadList");

    inputLocalidad.disabled = true;

    inputLocalidad.placeholder = "Cargando localidades...";

    await cargarLocalidades(provincia);

    inputLocalidad.disabled = false;

    inputLocalidad.placeholder = "Escribí una localidad";

    inputLocalidad.value = "";

    inicializarAutocompleteLocalidad();
}

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({

    iconRetinaUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',

    iconUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',

    shadowUrl:
        'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

let mapa;
let marcador;
let tilesLayer;

const TILE_URLS = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
};

function limpiarMapa() {
    if (mapa) {
        if (marcador) {
            mapa.removeLayer(marcador);
            marcador = null;
        }
        if (tilesLayer) {
            mapa.removeLayer(tilesLayer);
            tilesLayer = null;
        }
        mapa.remove();
        mapa = null;
    }
}

function inicializarMapa() {

    const contenedorMapa =
        document.getElementById("mapaTasacion");

    if (!contenedorMapa) return;

    // Limpiar mapa existente si hay uno
    limpiarMapa();

    // Cargar posición guardada si existe
    const latGuardado = datosTasacion.ubicacion.lat || -34.6037;
    const lonGuardado = datosTasacion.ubicacion.lon || -58.3816;

    mapa = L.map(contenedorMapa).setView(
        [latGuardado, lonGuardado],
        13
    );

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

    tilesLayer = L.tileLayer(
        tileUrl,
        {
            attribution: '© CartoDB, © OpenStreetMap'
        }
    ).addTo(mapa);

    marcador = L.marker(
        [latGuardado, lonGuardado],
        {
            draggable: true
        }
    ).addTo(mapa);

    setTimeout(() => {
        mapa.invalidateSize();
    }, 100);
}

function cambiarTelosMapa() {
    if (!mapa || !tilesLayer) return;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const tileUrl = isDarkMode ? TILE_URLS.dark : TILE_URLS.light;

    mapa.removeLayer(tilesLayer);
    tilesLayer = L.tileLayer(
        tileUrl,
        { attribution: '© CartoDB, © OpenStreetMap' }
    ).addTo(mapa);
}

function configurarBusquedaMapa() {

    const direccionInput =
        document.querySelector('.form-left input[type="text"]');

    const provinciaInput =
        document.getElementById("provinciaInput");

    const localidadInput =
        document.getElementById("localidadInput");

    const buscarConDelay = debounce(() => {
        actualizarMapa();
    }, 1200);

    agregarListenerSeguro(direccionInput, "input", buscarConDelay);

    agregarListenerSeguro(provinciaInput, "change", buscarConDelay);

    agregarListenerSeguro(localidadInput, "change", buscarConDelay);
}

async function actualizarMapa() {

    const direccion =
        document.querySelector('.form-left input[type="text"]').value;

    const provincia =
        document.getElementById("provinciaInput").value;

    const localidad =
        document.getElementById("localidadInput").value;

    if (
        !direccion ||
        !provincia ||
        !localidad
    ) return;

    const textoBusqueda =
    `${direccion}, ${localidad}, ${provincia}, Argentina`;

    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(textoBusqueda)}`
    );

    const data = await res.json();

    if (!data.length) return;

    const lat = parseFloat(data[0].lat);

    const lon = parseFloat(data[0].lon);

    mapa.setView([lat, lon], 17);

    marcador.setLatLng([lat, lon]);
}


/*pantalla 3*/
function mostrarCaracteristicasLote() {

    pasoActual = 3;

    actualizarIndicadoresProgreso();
    actualizarEstadoBotonSiguiente();

    cerrarModalComparables();

    const tipo =
        datosTasacion.lote.tipoLote;

    let camposExtra = "";

    if (
        tipo === "Esquina" ||
        tipo === "Esquina larga (+30m)"
    ) {

        camposExtra += `

            <div class="input-group">

                <label>Zona</label>

                <select id="zonaInput">

                    <option value="">
                        Seleccionar zona
                    </option>

                    <option
                        value="1"
                        ${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .zona === "1"
                            ? "selected"
                            : ""
                        }
                    >
                        Zona 1 — Centro comercial
                    </option>

                    <option
                        value="2"
                        ${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .zona === "2"
                            ? "selected"
                            : ""
                        }
                    >
                        Zona 2 — Mixta
                    </option>

                    <option
                        value="3"
                        ${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .zona === "3"
                            ? "selected"
                            : ""
                        }
                    >
                        Zona 3 — Residencial
                    </option>

                    <option
                        value="4"
                        ${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .zona === "4"
                            ? "selected"
                            : ""
                        }
                    >
                        Zona 4 — Barrio en desarrollo
                    </option>

                </select>

            </div>
        `;
    }

    if (tipo === "Salida a dos calles") {
        // No additional fields needed for salida a dos calles
    }

    if (tipo === "Irregular") {

        const contenido = getContenidoTasacion();
        contenido.innerHTML = `

            <div class="titulo-seccion">

                <h1>
                    Características del lote
                </h1>

            </div>

            <div class="form-grid">

                <div class="form-left">

                    <div class="input-group">

                        <label>Frente</label>

                        <input
                            type="number"
                            id="frenteInput"
                            value="${
                                datosTasacion
                                .lote
                                .caracteristicas
                                .frente || ""
                            }"
                        >

                    </div>

                    <div class="input-group">

                        <label>Superficie</label>

                        <input
                            type="number"
                            id="superficieInput"
                            value="${
                                datosTasacion
                                .lote
                                .caracteristicas
                                .superficie || ""
                            }"
                        >

                    </div>

                    <div class="input-group">

                        <label>Fondo ficticio</label>

                        <input
                            type="number"
                            id="fondoFicticioInput"
                            value="${
                                datosTasacion
                                .lote
                                .caracteristicas
                                .fondoFicticio || ""
                            }"
                        >

                    </div>

                </div>

            </div>
        `;

        inicializarCalculosLote();

        return;
    }

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `

        <div class="titulo-seccion">

            <h1>
                Características del lote
            </h1>

        </div>

        <div class="form-grid">

            <div class="form-left">

                <div class="input-group">

                    <label>Frente</label>

                    <input
                        type="number"
                        id="frenteInput"
                        value="${
                                datosTasacion
                                .lote
                                .caracteristicas
                                .frente || ""
                        }"
                    >

                </div>

                <div class="input-group">

                    <label>Fondo</label>

                    <input
                        type="number"
                        id="fondoInput"
                        value="${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .fondo || ""
                        }"
                    >

                </div>

                <div class="input-group">

                    <label>Superficie</label>

                    <input
                        type="number"
                        id="superficieInput"
                        value="${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .superficie || ""
                        }"
                    >

                </div>

                ${camposExtra}

                <div class="input-group">

                    <label>Orientación</label>

                    <div class="autocomplete-container">

                        <input
                            type="text"
                            id="orientacionLoteInput"
                            placeholder="Seleccionar orientación"
                            autocomplete="off"
                            readonly
                            value="${datosTasacion.ubicacion.orientacion || ""}"
                        >

                        <div class="autocomplete-list" id="orientacionLoteList">

                            <div class="autocomplete-item">Norte</div>
                            <div class="autocomplete-item">Noreste</div>
                            <div class="autocomplete-item">Este</div>
                            <div class="autocomplete-item">Sureste</div>
                            <div class="autocomplete-item">Sur</div>
                            <div class="autocomplete-item">Suroeste</div>
                            <div class="autocomplete-item">Oeste</div>
                            <div class="autocomplete-item">Noroeste</div>

                        </div>

                    </div>

                </div>

            </div>

            ${
                tipo === "Esquina" ||
                tipo === "Esquina larga (+30m)" ||
                tipo === "Salida a dos calles"
                ? `
            <div class="form-right">

                <div class="input-group">

                    <label>Calle principal</label>

                    <input
                        type="text"
                        id="callePrincipalInput"
                        value="${datosTasacion.ubicacion.direccion || ""}"
                        readonly
                        disabled
                    >

                </div>

                <div class="input-group">

                    <label>Calle secundaria</label>

                    <input
                        type="text"
                        id="segundaCalleInput"
                        value="${
                            datosTasacion
                            .lote
                            .caracteristicas
                            .segundaCalle || ""
                        }"
                    >

                </div>

                <div class="input-group">

                    <label>¿Qué lado corresponde a la calle de MAYOR valor?</label>

                    <select id="ladoMayorValorInput">

                        <option
                            value="frente"
                            ${
                                datosTasacion
                                .lote
                                .caracteristicas
                                .ladoMayorValor === "frente" ||
                                !datosTasacion
                                .lote
                                .caracteristicas
                                .ladoMayorValor
                                    ? "selected"
                                    : ""
                            }
                        >
                            Frente
                        </option>

                        <option
                            value="fondo"
                            ${
                                datosTasacion
                                .lote
                                .caracteristicas
                                .ladoMayorValor === "fondo"
                                    ? "selected"
                                    : ""
                            }
                        >
                            Fondo
                        </option>

                    </select>

                </div>

            </div>
                `
                : ""
            }

        </div>
    `;

    inicializarCalculosLote();

    inicializarOrientacionLote();

    // Setup botón volver
    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    // Update button state using dynamic validation
    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }
}

function inicializarCalculosLote() {

    const frenteInput =
        document.getElementById("frenteInput");

    const fondoInput =
        document.getElementById("fondoInput");

    const superficieInput =
        document.getElementById("superficieInput");

    const fondoFicticioInput =
        document.getElementById(
            "fondoFicticioInput"
        );

    /* =====================
       LOTES NORMALES
    ===================== */

    function calcularSuperficie() {

        if (
            !frenteInput ||
            !fondoInput ||
            !superficieInput
        ) return;

        const frente =
            parseFloat(frenteInput.value) || 0;

        const fondo =
            parseFloat(fondoInput.value) || 0;

        if (frente > 0 && fondo > 0) {

            superficieInput.value =
                (frente * fondo).toFixed(2);
        }
    }

    /* =====================
       LOTES IRREGULARES
    ===================== */

    function calcularFondoFicticio() {

        if (
            !frenteInput ||
            !superficieInput ||
            !fondoFicticioInput
        ) return;

        const frente =
            parseFloat(frenteInput.value) || 0;

        const superficie =
            parseFloat(superficieInput.value) || 0;

        if (
            frente > 0 &&
            superficie > 0
        ) {

            fondoFicticioInput.value =
                (
                    superficie / frente
                ).toFixed(2);
        }
    }

    /* =====================
       EVENTOS
    ===================== */

    frenteInput?.addEventListener(
        "input",
        () => {

            calcularSuperficie();
            calcularFondoFicticio();
            // Update datosTasacion in real-time
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.frente = frenteInput.value;
            }
            // Update button state dynamically
            if (typeof actualizarEstadoBotonSiguiente === 'function') {
                actualizarEstadoBotonSiguiente();
            }
        }
    );

    fondoInput?.addEventListener(
        "input",
        () => {
            calcularSuperficie();
            // Update datosTasacion in real-time
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.fondo = fondoInput.value;
            }
            // Update button state dynamically
            if (typeof actualizarEstadoBotonSiguiente === 'function') {
                actualizarEstadoBotonSiguiente();
            }
        }
    );

    superficieInput?.addEventListener(
        "input",
        () => {
            calcularFondoFicticio();
            // Update datosTasacion in real-time
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.superficie = superficieInput.value;
            }
            // Update button state dynamically
            if (typeof actualizarEstadoBotonSiguiente === 'function') {
                actualizarEstadoBotonSiguiente();
            }
        }
    );

    // Add real-time updates for irregular lot inputs
    if (fondoFicticioInput) {
        fondoFicticioInput.addEventListener("input", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.fondoFicticio = fondoFicticioInput.value;
            }
        });
    }

    const segundaCalleInput = document.getElementById("segundaCalleInput");
    if (segundaCalleInput) {
        segundaCalleInput.addEventListener("input", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.segundaCalle = segundaCalleInput.value;
            }
        });
    }

    const zonaInput = document.getElementById("zonaInput");
    if (zonaInput) {
        zonaInput.addEventListener("change", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.zona = zonaInput.value;
            }
        });
    }

    const ladoMayorValorInput = document.getElementById("ladoMayorValorInput");
    if (ladoMayorValorInput) {
        ladoMayorValorInput.addEventListener("change", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
                if (!datosTasacion.lote.caracteristicas) {
                    datosTasacion.lote.caracteristicas = {};
                }
                datosTasacion.lote.caracteristicas.ladoMayorValor = ladoMayorValorInput.value;
            }
        });
    }
}

function guardarDatosPantalla3() {

    datosTasacion.lote.caracteristicas = {

        frente:
            document.getElementById("frenteInput")?.value || "",

        fondo:
            document.getElementById("fondoInput")?.value || "",

        superficie:
            document.getElementById("superficieInput")?.value || "",

        fondoFicticio:
            document.getElementById("fondoFicticioInput")?.value || "",

        segundaCalle:
            document.getElementById("segundaCalleInput")?.value || "",

        zona:
            document.getElementById("zonaInput")?.value || ""
    };

    // Reset resultadoCalculado when screen 3 data changes
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();
}

/* =========================
   COMPARABLES
========================= */

function escapeHtml(str) {

    if (str == null) {

        return "";
    }

    return String(str)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;");
}

function formatearFechaRelativa(fecha) {

    const ahora = new Date();

    const creada = new Date(fecha);

    const diff =
        Math.floor(
            (ahora - creada) / 1000
        );

    const dias =
        Math.floor(diff / 86400);

    if (dias <= 0) {

        return "Hoy";
    }

    if (dias === 1) {

        return "Hace 1 día";
    }

    return `Hace ${dias} días`;
}

function etiquetaTipoInmueble(tipo) {

    const mapa = {

        lote: "Lote",

        casa: "Casa",

        departamento: "Departamento / PH"
    };

    if (!tipo) {

        return "—";
    }

    const t = String(tipo).toLowerCase();

    return mapa[t] || tipo;
}

async function leerHistorialDesdeAPI() {
    try {
        const tasaciones = await listarTasacionesAPI(1);
        return tasaciones.map(t => ({
            id: t.id,
            idNum: parseInt(t.id.split('-')[1]),
            tipo: t.tipo,
            estado: t.estado,
            ...t.datos,
            comparables: t.comparables_ids || [],
            datosCompletos: t.datos
        }));
    } catch (e) {
        console.error('Error al leer historial desde API:', e);
        return [];
    }
}

function limpiarComparableManualDocListeners() {

    comparableManualDocListeners.forEach(fn => {

        document.removeEventListener("click", fn);
    });

    comparableManualDocListeners.length = 0;
}

function registrarComparableManualDocListener(fn) {

    document.addEventListener("click", fn);

    comparableManualDocListeners.push(fn);
}

function hayDatosComparableManual() {
    const frente = document.getElementById("compManualFrenteInput")?.value;
    const fondo = document.getElementById("compManualFondoInput")?.value;
    const superficie = document.getElementById("compManualSuperficieInput")?.value;
    const valor = document.getElementById("compManualValorInput")?.value;
    const direccion = document.getElementById("compManualDireccionInput")?.value;

    return !!(frente || fondo || superficie || valor || direccion);
}

function cerrarModalComparables() {

    limpiarComparableManualDocListeners();

    const overlay =
        document.getElementById("comparablesModalOverlay");

    const cont =
        document.getElementById("comparablesModalContenido");

    if (overlay) {

        overlay.classList.remove("active");
    }

    if (cont) {

        cont.innerHTML = "";
    }

    comparablePanelModo = null;
}

function renderComparablesDerecha() {

    const wrap =
        document.getElementById("comparablesListaDinamica");

    const contador =
        document.getElementById("comparablesContador");

    if (!wrap) {

        return;
    }

    const n =
        datosTasacion.comparables.length;

    if (contador) {

        contador.textContent = n;
    }

    if (!n) {

        wrap.innerHTML = `

            <div class="comparables-vacio">

                <div class="comparables-vacio-icono">
                    ⊕
                </div>

                <h4>
                    No hay comparables agregados
                </h4>

                <p>
                    Se recomienda minimo 3 comparables para mas precision
                </p>

            </div>
        `;

        return;
    }

    wrap.innerHTML =
        datosTasacion.comparables

            .map((item, idx) => {

                if (item.fuente === "manual") {

                    const u = item.ubicacion || {};

                    const tipoLoteTxt =
                        item.tipoLote
                            ? escapeHtml(item.tipoLote)
                            : "—";

                    const valorFmt =
                        item.valor != null && item.valor !== ""
                            ? Number(item.valor).toLocaleString("es-AR")
                            : "—";

                    const tipoValorTxt =
                        item.tipoValor === "oferta"
                            ? "Oferta"
                            : "Venta";

                    return `

                        <div class="comparable-item-fila">

                            <div>

                                <h4>
                                    ${escapeHtml(u.direccion || "Sin dirección")}
                                </h4>

                                <div class="comparable-item-meta">

                                    ${escapeHtml(u.localidad || "")},
                                    ${escapeHtml(u.provincia || "")}
                                    <br>

                                    Tipo:
                                    ${escapeHtml(etiquetaTipoInmueble(item.tipoInmueble))}
                                    · Lote:
                                    ${tipoLoteTxt}
                                    <br>

                                    Valor (${tipoValorTxt}): $ ${valorFmt}
                                </div>

                                <span class="comparable-item-badge">
                                    Manual
                                </span>

                            </div>

                            <button
                                type="button"
                                class="btn-quitar-comparable"
                                data-quitar-comparable="${idx}">
                                Quitar
                            </button>

                        </div>
                    `;
                }

                const snap = item.snapshot || {};

                const u = snap.ubicacion || {};

                const tipoLoteSnap =
                    snap.lote &&
                    snap.lote.tipoLote
                        ? escapeHtml(snap.lote.tipoLote)
                        : "—";

                return `

                    <div class="comparable-item-fila">

                        <div>

                            <h4>
                                ${escapeHtml(u.direccion || "Sin dirección")}
                            </h4>

                            <div class="comparable-item-meta">

                                ${escapeHtml(u.localidad || "")},
                                ${escapeHtml(u.provincia || "")}
                                <br>

                                Tipo:
                                ${escapeHtml(snap.tipo || "—")}
                                · Lote:
                                ${tipoLoteSnap}
                            </div>

                            <span class="comparable-item-badge">
                                Desde historial
                            </span>

                        </div>

                        <button
                            type="button"
                            class="btn-quitar-comparable"
                            data-quitar-comparable="${idx}">
                            Quitar
                        </button>

                    </div>
                `;
            })

            .join("");

    // Update button state based on number of comparables
    const btn = getBtnSiguiente();
    if (btn) {
        btn.disabled = datosTasacion.comparables.length < 1;
        if (datosTasacion.comparables.length >= 1) {
            btn.classList.add("activo");
        } else {
            btn.classList.remove("activo");
        }
    }
}

function bindComparableManualUbicacion() {

    limpiarComparableManualDocListeners();

    const inputProv =
        document.getElementById("compManualProvinciaInput");

    const listProv =
        document.getElementById("compManualProvinciaList");

    const inputLoc =
        document.getElementById("compManualLocalidadInput");

    const listLoc =
        document.getElementById("compManualLocalidadList");

    if (
        !inputProv ||
        !listProv ||
        !inputLoc ||
        !listLoc
    ) {

        return;
    }

    function renderProv(filtro = "") {

        listProv.innerHTML = "";

        const filtradas =
            provinciasData.filter(p =>
                p.nombre
                    .toLowerCase()
                    .includes(filtro.toLowerCase())
            );

        if (!filtradas.length) {

            listProv.style.display = "none";

            return;
        }

        filtradas.forEach(provincia => {

            const item =
                document.createElement("div");

            item.className = "autocomplete-item";

            item.textContent = provincia.nombre;

            item.addEventListener("click", () => {

                inputProv.value = provincia.nombre;

                listProv.style.display = "none";

                cargarLocalidadesComparableManual(
                    provincia.nombre
                );
            });

            listProv.appendChild(item);
        });

        listProv.style.display = "block";
    }

    function renderLoc(filtro = "") {

        listLoc.innerHTML = "";

        const filtradas =
            localidadesData

                .filter(l =>
                    l.nombre
                        .toLowerCase()
                        .includes(filtro.toLowerCase())
                )

                .slice(0, 30);

        if (!filtradas.length) {

            listLoc.style.display = "none";

            return;
        }

        filtradas.forEach(localidad => {

            const item =
                document.createElement("div");

            item.className = "autocomplete-item";

            item.textContent = localidad.nombre;

            item.addEventListener("click", () => {

                inputLoc.value = localidad.nombre;

                listLoc.style.display = "none";
            });

            listLoc.appendChild(item);
        });

        listLoc.style.display = "block";
    }

    inputProv.addEventListener("focus", () => {

        renderProv();
    });

    inputProv.addEventListener("input", () => {

        renderProv(inputProv.value);

        // Auto-select if there's an exact match (case-insensitive)
        const valorInput = inputProv.value.trim().toLowerCase();
        if (valorInput) {
            const match = provinciasData.find(p =>
                p.nombre.toLowerCase() === valorInput
            );
            if (match) {
                inputProv.value = match.nombre;
                listProv.style.display = "none";
                cargarLocalidadesComparableManual(match.nombre);
            }
        }
    });

    inputLoc.addEventListener("focus", () => {

        if (!inputLoc.disabled) {

            renderLoc();
        }
    });

    inputLoc.addEventListener("input", () => {

        renderLoc(inputLoc.value);

        // Auto-select if there's an exact match (case-insensitive)
        const valorInput = inputLoc.value.trim().toLowerCase();
        if (valorInput && !inputLoc.disabled) {
            const match = localidadesData.find(l =>
                l.nombre.toLowerCase() === valorInput
            );
            if (match) {
                inputLoc.value = match.nombre;
                listLoc.style.display = "none";
            }
        }
    });

    const cerrarListas = e => {

        const rootProv = inputProv.parentElement;

        const rootLoc = inputLoc.parentElement;

        if (
            rootProv &&
            !rootProv.contains(e.target)
        ) {

            listProv.style.display = "none";
        }

        if (
            rootLoc &&
            !rootLoc.contains(e.target)
        ) {

            listLoc.style.display = "none";
        }
    };

    registrarComparableManualDocListener(cerrarListas);
}

async function cargarLocalidadesComparableManual(provinciaNombre) {

    const inputLoc =
        document.getElementById("compManualLocalidadInput");

    const listLoc =
        document.getElementById("compManualLocalidadList");

    if (!inputLoc || !listLoc) {

        return;
    }

    inputLoc.disabled = true;

    inputLoc.placeholder = "Cargando localidades...";

    listLoc.style.display = "none";

    try {
        await cargarLocalidades(provinciaNombre);

        inputLoc.disabled = false;

        inputLoc.placeholder = "Escribí una localidad";

        inputLoc.value = "";

    } catch (e) {

        console.error(e);

        inputLoc.disabled = false;

        inputLoc.placeholder = "Error al cargar localidades";
    }
}

function inicializarTipoLoteComparableManual() {

    const input =
        document.getElementById("compManualTipoLoteInput");

    const list =
        document.getElementById("compManualTipoLoteList");

    if (!input || !list) {

        return;
    }

    const items =
        list.querySelectorAll(".autocomplete-item");

    input.addEventListener("click", () => {

        list.style.display = "block";
    });

    items.forEach(item => {

        item.addEventListener("click", () => {

            input.value =
                item.textContent.trim();

            list.style.display = "none";
        });
    });

    const cerrar = e => {

        if (!input.parentElement.contains(e.target)) {

            list.style.display = "none";
        }
    };

    registrarComparableManualDocListener(cerrar);
}

function abrirPanelComparableManual() {

    const tipoActual = datosTasacion.tipo;

    if (!tipoActual) {
        alert("Seleccioná el tipo de inmueble antes de agregar un comparable.");
        return;
    }

    cerrarModalComparables();

    comparablePanelModo = "manual";

    // Usar ComparableEditor en modo crear
    if (window.comparableEditor) {
        window.comparableEditor.abrir({
            modo: 'crear',
            tipo: tipoActual,
            onGuardar: (datos) => {
                agregarComparableManualDesdeComparableEditor(datos);
            }
        });
    } else {
        console.error('ComparableEditor no está disponible');
    }
}

function agregarComparableManualDesdeComparableEditor(datos) {
    // Convertir datos de ComparableEditor al formato esperado por datosTasacion.comparables
    const comparable = {
        fuente: "manual",
        direccion: datos.ubicacion.direccion,
        valor: datos.valor.monto,
        tipoValor: datos.valor.tipo,
        ubicacion: datos.ubicacion
    };
    
    if (datos.tipo === 'lote') {
        comparable.frente = datos.lote.frente;
        comparable.fondo = datos.lote.fondo;
        comparable.superficie = datos.lote.superficie;
        comparable.tipoLote = datos.lote.tipoLote;
    } else if (datos.tipo === 'casa') {
        comparable.superficieCubierta = datos.casa.superficieCubierta;
        comparable.superficieTerreno = datos.casa.superficieTerreno;
        comparable.antiguedad = datos.casa.antiguedad;
    } else if (datos.tipo === 'departamento') {
        comparable.superficieTotal = datos.departamento.superficieTotal;
        comparable.antiguedad = datos.departamento.antiguedad;
        comparable.tieneAscensor = datos.departamento.tieneAscensor;
    }
    
    // Agregar a datosTasacion.comparables
    datosTasacion.comparables.push(comparable);
    
    // Actualizar UI
    renderComparablesDerecha();
    actualizarIndicadoresProgreso();
    actualizarEstadoBotonSiguiente();
}

async function abrirPanelComparableHistorial() {

    const cont =
        document.getElementById("comparablesModalContenido");

    const overlay =
        document.getElementById("comparablesModalOverlay");

    if (!cont || !overlay) {

        return;
    }

    cerrarModalComparables();

    comparablePanelModo = "historial";

    const tasaciones = await leerHistorialDesdeAPI();

    // Filtrar por estado completada y por tipo de inmueble (si ya está seleccionado)
    const tipoActual = datosTasacion.tipo;
    const tasacionesFiltradas = tasaciones.filter(t => 
        t.estado === "completada" && 
        (!tipoActual || t.tipo === tipoActual)
    );

    const listaHtml =
        tasacionesFiltradas.length
            ? tasacionesFiltradas

                .map(t => {
                    // Buscar el valor en múltiples lugares
                    let precio = "—";
                    if (t.resultado?.valor_final) {
                        precio = `USD ${(t.resultado.valor_final).toLocaleString('es-AR')}`;
                    } else if (t.datosCompletos?.resultado?.valor_final) {
                        precio = `USD ${(t.datosCompletos.resultado.valor_final).toLocaleString('es-AR')}`;
                    }

                    return construirCardMinimizada({
                        item: t,
                        precio,
                        fecha: formatearFechaRelativa(t.fechaCreacion),
                        tipoLabel: t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1),
                        estadoLabel: "Completada",
                        estadoBadgeClass: "card-minimizada-badge-completada",
                        dataAttributes: {
                            "data-historial-id": t.id
                        }
                    });
                })

                .join("")
            : `

                <p class="comparables-historial-vacio">
                    No hay tasaciones completadas en el historial.
                </p>
            `;

    cont.innerHTML = `

            <div class="modal-header">

                <div class="modal-titulo">

                        <h2>
                            Tasaciones del historial
                        </h2>

                        <p>
                            Tocá una tarjeta para sumarla como comparable.
                        </p>

                    </div>

                </div>

            <div class="modal-contenido-scroll">

                <div class="lista-propiedades comparables-lista-historial">

                    ${listaHtml}

                </div>

            </div>
    `;

    overlay.classList.add("active");
}

async function agregarComparableManualDesdeFormulario() {

    const direccion =
        document.getElementById("compManualDireccionInput")
            ?.value
            .trim();

    const provincia =
        document.getElementById("compManualProvinciaInput")
            ?.value
            .trim();

    const localidad =
        document.getElementById("compManualLocalidadInput")
            ?.value
            .trim();

    const tipoLoteInput =
        document.getElementById("compManualTipoLoteInput");

    const tipoLote =
        tipoLoteInput
            ? tipoLoteInput.value.trim()
            : "";

    const valorRaw =
        document.getElementById("compManualValorInput")
            ?.value;

    const tipoValor =
        document.querySelector(
            'input[name="compManualTipoValor"]:checked'
        )?.value || "venta";

    const esLote =
        datosTasacion.tipo === "lote";

    if (!direccion || !provincia || !localidad) {

        alert("Completá dirección, provincia y localidad.");

        return;
    }

    if (esLote && !tipoLote) {

        alert("Seleccioná el tipo de lote.");

        return;
    }

    const frenteComp =
        parseFloat(
            document.getElementById(
                "compManualFrenteInput"
            )?.value
        ) || 0;

    const fondoComp =
        parseFloat(
            document.getElementById(
                "compManualFondoInput"
            )?.value
        ) || 0;

    let superficieComp =
        parseFloat(
            document.getElementById(
                "compManualSuperficieInput"
            )?.value
        ) || 0;

    if (!frenteComp) {

        alert("Completá el frente del comparable.");

        return;
    }

    if (!superficieComp && fondoComp) {

        superficieComp = frenteComp * fondoComp;
    }

    if (!superficieComp) {

        alert("Completá la superficie del comparable.");

        return;
    }

    if (
        valorRaw === "" ||
        valorRaw == null ||
        Number.isNaN(Number(valorRaw))
    ) {

        alert("Ingresá un valor numérico válido.");

        return;
    }

    // Crear comparable como entidad independiente
    const comparable = await crearComparable({
        fuente: "manual",
        tipoInmueble: datosTasacion.tipo,
        tipoLote: esLote ? tipoLote : null,
        ubicacion: {
            direccion: formatearDireccion(direccion),
            provincia,
            localidad
        },
        frente: frenteComp,
        fondo: fondoComp || null,
        superficie: superficieComp,
        valor: Number(valorRaw),
        tipoValor
    });
    
    // Agregar el comparable completo a la tasación
    datosTasacion.comparables.push(comparable);

    // Reset resultadoCalculado when comparables change
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    cerrarModalComparables();

    renderComparablesDerecha();
}

async function agregarComparableDesdeHistorial(id) {

    const tasaciones = await leerHistorialDesdeAPI();

    const t =
        tasaciones.find(x => String(x.id) === String(id));

    if (!t) {

        console.error("No se encontró tasación con ID:", id, "en historial:", tasaciones);
        return;
    }

    const ya =
        datosTasacion.comparables.some(c =>
            c.fuente === "historial" &&
            c.historialId === id
        );

    if (ya) {

        alert("Esa tasación ya está en comparables.");

        return;
    }

    const snap = JSON.parse(JSON.stringify(t));

    // Buscar valor en múltiples ubicaciones posibles
    let valor =
        snap.valor ||
        snap.resultado?.valor_final ||
        snap.datosCompletos?.resultado?.valor_final ||
        0;

    if (!valor) {

        const ingresado = prompt(
            "Esta tasación no tiene valor guardado. " +
            "Ingresá el valor total del comparable (USD):"
        );

        if (
            ingresado === null ||
            ingresado === "" ||
            Number.isNaN(Number(ingresado))
        ) {

            return;
        }

        valor = Number(ingresado);
    }

    // Crear comparable como entidad independiente
    const comparable = await crearComparable({
        fuente: "deTasacion",
        tipoInmueble: snap.tipo || null,
        tipoLote: snap.lote?.tipoLote || null,
        ubicacion: snap.ubicacion || {},
        frente: snap.lote?.caracteristicas?.frente || null,
        fondo: snap.lote?.caracteristicas?.fondo || null,
        superficie: snap.lote?.caracteristicas?.superficie || null,
        valor,
        tipoValor: "venta",
        lote: snap.lote || null,
        departamento: snap.departamento || null,
        casa: snap.casa || null
    });
    
    // Agregar el comparable completo a la tasación
    datosTasacion.comparables.push(comparable);

    // Reset resultadoCalculado when comparables change
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    cerrarModalComparables();

    renderComparablesDerecha();
}

async function alternarPanelComparables(modo) {

    const overlay =
        document.getElementById("comparablesModalOverlay");

    const visible =
        overlay &&
        overlay.classList.contains("active");

    if (
        comparablePanelModo === modo &&
        visible
    ) {

        cerrarModalComparables();

        return;
    }

    if (modo === "manual") {

        abrirPanelComparableManual();
    }

    else {

        await abrirPanelComparableHistorial();
    }
}

function onComparablesContenidoClick(e) {
    const tipo = datosTasacion.tipo || 'lote';
    const pasos = pasosPorTipo[tipo] || [];
    const comparablesIndex = pasos.indexOf('comparables');
    const pasoComparables = comparablesIndex !== -1 ? comparablesIndex + 2 : (tipo === 'departamento' ? 5 : 4);

    if (pasoActual !== pasoComparables) {
        return;
    }

    const btnQuitar =
        e.target.closest("[data-quitar-comparable]");

    if (btnQuitar) {

        const idx =
            Number(btnQuitar.dataset.quitarComparable);

        if (!Number.isNaN(idx)) {

            datosTasacion.comparables.splice(idx, 1);

            renderComparablesDerecha();
        }

        return;
    }
}

function inicializarComparablesPantalla() {

    if (!comparablesContenidoClickInicializado) {

        const contenido = getContenidoTasacion();
        contenido.addEventListener(
            "click",
            onComparablesContenidoClick
        );

        comparablesContenidoClickInicializado = true;
    }

    renderComparablesDerecha();
}

function mostrarPantallaComparables() {

    // Establecer pasoActual usando estructura dinámica
    const tipo = datosTasacion.tipo || 'lote';
    const pasos = pasosPorTipo[tipo] || [];
    const comparablesIndex = pasos.indexOf('comparables');
    
    if (comparablesIndex !== -1) {
        pasoActual = comparablesIndex + 2; // +2 porque array empieza en 0 y paso 1 es común
    } else {
        // Fallback a lógica antigua si no encuentra el paso
        pasoActual = tipo === 'departamento' ? 5 : 4;
    }

    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    const btn = getBtnSiguiente();

    if (btn) {

        btn.textContent = "Siguiente";

        btn.disabled = datosTasacion.comparables.length < 1;

        if (datosTasacion.comparables.length >= 1) {

            btn.classList.add("activo");
        }

        else {

            btn.classList.remove("activo");
        }
    }

    cerrarModalComparables();

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `

        <div class="titulo-seccion">

            <h1>Comparables</h1>

            <p>
                Agregá propiedades comparables para calcular la tasación.
            </p>

        </div>

        <div class="comparables-layout">

            <div class="comparables-columna-izq">

                <div class="comparables-acciones">

                    <div
                        class="accion-comparable"
                        data-accion-comparable="manual"
                        role="button"
                        tabindex="0">

                        <div class="accion-icono">
                            +
                        </div>

                        <div>

                            <h3>
                                Agregar manualmente
                            </h3>

                            <p>
                                Crear un comparable cargando sus características.
                            </p>

                        </div>

                    </div>

                    <div
                        class="accion-comparable"
                        data-accion-comparable="historial"
                        role="button"
                        tabindex="0">

                        <div class="accion-icono">
                            🕘
                        </div>

                        <div>

                            <h3>
                                Usar tasación existente
                            </h3>

                            <p>
                                Seleccionar una tasación previa del historial.
                            </p>

                        </div>

                    </div>

                </div>

            </div>

            <div class="comparables-lista">

                <div class="comparables-header">

                    <h3>
                        Comparables seleccionados
                    </h3>

                    <span id="comparablesContador">
                        ${datosTasacion.comparables.length}
                    </span>

                </div>

                <div id="comparablesListaDinamica"></div>

            </div>

        </div>
    `;

    inicializarComparablesPantalla();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}

function inicializarComparablesModalListenersOnce() {

    const overlay =
        document.getElementById("comparablesModalOverlay");

    if (!overlay || overlay.dataset.initedComparablesModal) {

        return;
    }

    overlay.dataset.initedComparablesModal = "1";

    overlay.addEventListener("click", async e => {

        if (!overlay.classList.contains("active")) {

            return;
        }

        if (e.target === overlay) {

            if (comparablePanelModo === "manual" && hayDatosComparableManual()) {
                if (!confirm("¿Estás seguro de salir? Se perderán los datos ingresados.")) {
                    return;
                }
            }
            cerrarModalComparables();

            return;
        }

        if (
            e.target.closest("#comparablesModalCerrar")
        ) {

            if (comparablePanelModo === "manual" && hayDatosComparableManual()) {
                if (!confirm("¿Estás seguro de salir? Se perderán los datos ingresados.")) {
                    return;
                }
            }
            cerrarModalComparables();

            return;
        }

        if (
            e.target.closest("#btnAgregarComparableManual")
        ) {

            await agregarComparableManualDesdeFormulario();

            return;
        }

        const cardHist =
            e.target.closest(
                ".card-minimizada[data-historial-id]"
            );

        if (cardHist) {

            agregarComparableDesdeHistorial(
                cardHist.dataset.historialId
            );
        }
    });
}

function formatearDireccion(direccion) {
    if (!direccion) return direccion;
    return direccion
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

/* =========================
   GESTIÓN DE DATOS COMPLETOS
========================= */

function guardarTodosLosDatos() {
    // Guardar datos según el paso actual
    if (pasoActual === 2) {
        guardarDatosPantalla1();
    } else if (pasoActual === 3) {
        guardarDatosPantalla3();
    }
    // Los comparables ya se guardan en tiempo real
}

function capturarDatosCompletos() {
    const datos = {
        pasoActual: pasoActual,
        tipo: datosTasacion.tipo,
        ubicacion: { ...datosTasacion.ubicacion },
        comparables: JSON.parse(JSON.stringify(datosTasacion.comparables)),
        resultado: resultadoTasacion ? JSON.parse(JSON.stringify(resultadoTasacion)) : null
    };
    
    // Guardar datos según el tipo
    if (datosTasacion.tipo === 'lote') {
        datos.lote = {
            tipoLote: datosTasacion.lote.tipoLote,
            servicios: [...datosTasacion.lote.servicios],
            caracteristicas: { ...datosTasacion.lote.caracteristicas },
            observaciones: datosTasacion.lote.observaciones || ""
        };
    } else if (datosTasacion.tipo === 'departamento') {
        datos.departamento = { ...datosTasacion.departamento };
    }
    
    // Guardar coeficientes personalizados si existen
    if (typeof coeficientesPersonalizados !== 'undefined' && Object.keys(coeficientesPersonalizados).length > 0) {
        datos.coeficientesPersonalizados = JSON.parse(JSON.stringify(coeficientesPersonalizados));
    }

    return datos;
}

function limpiarDatosTasacion() {
    // Resetear todos los datos a valores iniciales
    datosTasacion.tipo = null;
    datosTasacion.ubicacion = {
        direccion: "",
        provincia: "",
        localidad: "",
        lat: null,
        lon: null
    };
    datosTasacion.lote = {
        tipoLote: "",
        servicios: [],
        caracteristicas: {}
    };
    datosTasacion.departamento = {
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
        ubicacionEdificio: ""
    };
    datosTasacion.casa = {};
    datosTasacion.comparables = [];
    datosTasacion.resultado = null;

    // Resetear ID a estado inicial (nueva tasación)
    tasacionId = 0;
    tasacionIdReal = null;

    // Resetear paso actual
    pasoActual = 1;
    tipoSeleccionado = null;
    resultadoTasacion = null;

    // Resetear coeficientes personalizados
    if (typeof coeficientesPersonalizados !== 'undefined') {
        coeficientesPersonalizados = {};
    }
    if (typeof coeficienteIdCounter !== 'undefined') {
        coeficienteIdCounter = 0;
    }
}

function cargarDatosCompletos(datosCompletos) {
    if (!datosCompletos) return;
    
    // Cargar datos desde la estructura guardada
    datosTasacion.tipo = datosCompletos.tipo;
    datosTasacion.ubicacion = { ...datosCompletos.ubicacion };
    
    // Cargar datos según el tipo
    if (datosCompletos.tipo === 'lote') {
        datosTasacion.lote = {
            tipoLote: datosCompletos.lote.tipoLote,
            servicios: [...datosCompletos.lote.servicios],
            caracteristicas: { ...datosCompletos.lote.caracteristicas },
            observaciones: datosCompletos.lote.observaciones || ""
        };
    } else if (datosCompletos.tipo === 'departamento') {
        datosTasacion.departamento = { ...datosCompletos.departamento };
    } else if (datosCompletos.tipo === 'casa') {
        datosTasacion.casa = { ...datosCompletos.casa };
    }
    
    // Cargar comparables - si son IDs, mantener como IDs; si son objetos completos (datos antiguos), extraer solo los IDs
    if (datosCompletos.comparables && datosCompletos.comparables.length > 0) {
        // Verificar si son IDs (strings) u objetos completos
        const primerComparable = datosCompletos.comparables[0];
        if (typeof primerComparable === 'string') {
            // Ya son IDs, cargar directamente
            datosTasacion.comparables = [...datosCompletos.comparables];
        } else {
            // Son objetos completos (datos antiguos), extraer solo los IDs
            datosTasacion.comparables = datosCompletos.comparables.map(c => c.id).filter(id => id);
        }
    } else {
        datosTasacion.comparables = [];
    }
    resultadoTasacion = datosCompletos.resultado ? JSON.parse(JSON.stringify(datosCompletos.resultado)) : null;
    
    // Cargar coeficientes personalizados si existen
    if (datosCompletos.coeficientesPersonalizados) {
        if (typeof coeficientesPersonalizados === 'undefined') {
            window.coeficientesPersonalizados = {};
        }
        coeficientesPersonalizados = JSON.parse(JSON.stringify(datosCompletos.coeficientesPersonalizados));
    }

    // Establecer el paso actual - siempre ir a pantalla 2 al editar
    pasoActual = 2;
    tipoSeleccionado = datosCompletos.tipo;
}

async function guardarTasacion() {
    try {
        // Guardar todos los datos actuales de los inputs
        guardarTodosLosDatos();

        // Formatear dirección antes de guardar
        if (datosTasacion.ubicacion && datosTasacion.ubicacion.direccion) {
            datosTasacion.ubicacion.direccion = formatearDireccion(
                datosTasacion.ubicacion.direccion
            );
        }

        // Capturar datos completos
        const datosCompletos = capturarDatosCompletos();

        // Determinar si es nueva o edición
        if (tasacionId === 0) {
            // Nueva tasación
            const tasacionCreada = await crearTasacionAPI({
                usuario_id: 1,
                tipo: datosTasacion.tipo || 'lote',
                estado: 'completada',
                datos: datosCompletos,
                comparables_ids: datosTasacion.comparables?.map(c => c.id || c) || []
            });
            
            // Actualizar ID de la tasación actual
            tasacionId = tasacionCreada.id;
            tasacionIdReal = tasacionCreada.id;
        } else if (tasacionId === 1) {
            // Edición
            await actualizarTasacionAPI(tasacionIdReal, {
                estado: 'completada',
                datos: datosCompletos,
                comparables_ids: datosTasacion.comparables?.map(c => c.id || c) || []
            });
        } else {
            // Fallback: usar ID actual
            await actualizarTasacionAPI(tasacionId, {
                estado: 'completada',
                datos: datosCompletos,
                comparables_ids: datosTasacion.comparables?.map(c => c.id || c) || []
            });
        }
    } catch (error) {
        console.error("Error al guardar tasación:", error);
        alert("Hubo un error al guardar la tasación. Por favor intenta nuevamente.");
    }
}

inicializarComparablesModalListenersOnce();

inicializarDelegacionSeleccionTipo();

/* =========================
   CONFIRMACIÓN SALIR
========================= */

let navegacionPendiente = null;

function mostrarConfirmacionSalir() {

    const modal = document.getElementById("confirmacionSalirModal");

    if (modal) {

        modal.classList.add("active");

    }

}

function ocultarConfirmacionSalir() {

    const modal = document.getElementById("confirmacionSalirModal");

    if (modal) {

        modal.classList.remove("active");

    }

    navegacionPendiente = null;

}

async function guardarBorrador() {

    // Guardar todos los datos actuales de los inputs
    guardarTodosLosDatos();

    const datosCompletos = capturarDatosCompletos();

    try {
        if (tasacionId === 0) {
            // Nueva tasación borrador
            const tasacionCreada = await crearTasacionAPI({
                usuario_id: 1,
                tipo: datosTasacion.tipo || 'lote',
                estado: 'borrador',
                datos: datosCompletos,
                comparables_ids: datosTasacion.comparables?.map(c => c.id || c) || []
            });
            tasacionId = tasacionCreada.id;
            tasacionIdReal = tasacionCreada.id;
        } else {
            // Actualizar borrador existente
            const idActual = tasacionId === 1 ? tasacionIdReal : tasacionId;
            await actualizarTasacionAPI(idActual, {
                estado: 'borrador',
                datos: datosCompletos,
                comparables_ids: datosTasacion.comparables?.map(c => c.id || c) || []
            });
        }
    } catch (error) {
        console.error("Error al guardar borrador:", error);
        alert("Hubo un error al guardar el borrador. Por favor intenta nuevamente.");
        return;
    }

    ocultarConfirmacionSalir();

    limpiarDatosTasacion();

    ejecutarNavegacionPendiente();

}

function ejecutarNavegacionPendiente() {

    // Limpiar datos antes de navegar
    limpiarDatosTasacion();

    if (navegacionPendiente === "VOLVER_A_PANTALLA_1") {
        navegacionPendiente = null;
        volverSeleccionTipo();
        return;
    }
    
    if (navegacionPendiente === "BROWSER_BACK") {
        navegacionPendiente = null;
        window.location.href = "TASADOR.html";
        return;
    }

    if (navegacionPendiente) {

        const url = navegacionPendiente;

        navegacionPendiente = null;

        console.log("Ejecutando navegación pendiente a:", url);
        window.location.href = url;

    } else {

        console.log("No hay navegación pendiente, yendo a TASADOR.html");
        window.location.href = "TASADOR.html";

    }

}

function interceptarNavegacion(event) {

    if (pasoActual < 2) {

        return;

    }

    const target = event.target;

    // Buscar href en el target o en elementos padre
    const linkElement = target.closest("a");
    const buttonElement = target.closest("[data-href]");
    
    let href = null;
    
    if (linkElement) {
        href = linkElement.href;
    } else if (buttonElement) {
        href = buttonElement.dataset.href;
    }

    // NO interceptar navegación dentro de tasacion.html (volver a pantalla 1, etc.)
    if (href && href.includes("tasacion.html")) {
        return; // Dejar pasar sin mostrar cartel
    }

    if (href && href !== window.location.href) {

        event.preventDefault();
        event.stopPropagation();

        navegacionPendiente = href;

        mostrarConfirmacionSalir();

    }

}

// Manejar el botón volver cuando va a pantalla 1
function interceptarVolverAPantalla1() {
    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso && pasoActual === 2) {
        // Clonar el botón para remover listeners anteriores
        const newBtn = btnVolverPaso.cloneNode(true);
        btnVolverPaso.parentNode.replaceChild(newBtn, btnVolverPaso);
        
        newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            navegacionPendiente = "VOLVER_A_PANTALLA_1";
            mostrarConfirmacionSalir();
        });
    }
}

// Manejar browser back button
window.addEventListener("popstate", (event) => {
    if (pasoActual >= 2) {
        event.preventDefault();
        event.stopPropagation();
        
        // Push state para prevenir navegación
        history.pushState(null, "", window.location.href);
        
        navegacionPendiente = "BROWSER_BACK";
        mostrarConfirmacionSalir();
    }
});

// Manejar cierre de pestaña y recarga
window.addEventListener("beforeunload", (event) => {
    if (pasoActual >= 2) {
        event.preventDefault();
        event.returnValue = "¿Estás seguro de salir? Los cambios no guardados se perderán.";
        return event.returnValue;
    }
});

function inicializarConfirmacionSalir() {

    const btnCancelar = document.getElementById("btnCancelarSalir");

    const btnGuardar = document.getElementById("btnGuardarBorrador");

    const btnNoGuardar = document.getElementById("btnNoGuardar");

    if (btnCancelar) {

        btnCancelar.addEventListener("click", (e) => {

            e.preventDefault();

            ocultarConfirmacionSalir();

        });

    }

    if (btnGuardar) {

        btnGuardar.addEventListener("click", (e) => {

            e.preventDefault();

            guardarBorrador();

        });

    }

    if (btnNoGuardar) {

        btnNoGuardar.addEventListener("click", (e) => {

            e.preventDefault();

            ocultarConfirmacionSalir();

            ejecutarNavegacionPendiente();

        });

    }

    document.addEventListener("click", interceptarNavegacion, true);
    
    // Push initial state for browser back button handling
    history.pushState(null, "", window.location.href);

}

document.addEventListener("DOMContentLoaded", () => {
    inicializarConfirmacionSalir();
});
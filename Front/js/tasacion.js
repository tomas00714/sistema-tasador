let provinciasData = [];

let localidadesData = [];

// USA ESTO PARA BUSCAR DINÁMICAMENTE:
function getBtnSiguiente() {
    return document.getElementById("btnSiguiente");
}

function getBtnVolverPaso() {
    return document.getElementById("btnVolverPaso");
}

function getContenidoTasacion() {
    // Esto asegura que busque dentro de la tarjeta expandida de TASADOR.html
    return document.querySelector("#tarjetaNuevaTasacion .tasacion-contenido") ||
           document.querySelector(".tasacion-contenido"); // Fallback para tasacion.html
}

let pasoActual = 1;

let tipoSeleccionado = null;

// Generar ID aleatorio para la tasación actual
let tasacionId = Math.random().toString(36).substring(2, 10).toUpperCase();

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

        caracteristicas: {}
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

    comparables: []
};

/* =========================
   SIGUIENTE
========================= */

function manejarBtnSiguiente() {
    const tipo = datosTasacion.tipo || 'lote';
    const totalSteps = typeof getTotalSteps === 'function' ? getTotalSteps(tipo) : 5;

    // Check if it's the last step (save tasation)
    if (pasoActual === totalSteps) {
        datosTasacion.resultado = resultadoTasacion;
        guardarTasacion();
        alert("Tasación guardada en el historial.");
        window.location.href = "TASADOR.html?view=historial";
        return;
    }

    // Step 1: Selection type
    if (pasoActual === 1) {
        if (tipoSeleccionado === "lote") {
            mostrarFormularioLote();
        } else if (tipoSeleccionado === "departamento") {
            mostrarFormularioDepartamento();
        } else if (tipoSeleccionado === "casa") {
            alert("El flujo de casa aún está en desarrollo.");
        }
        return;
    }

    // Get current step name using dynamic structure
    const nombrePasoActual = typeof getNombrePaso === 'function' ? getNombrePaso(tipo, getIndexPaso(tipo, pasoActual)) : null;

    // Validate current step criteria before proceeding
    if (nombrePasoActual && typeof validarCriterioPaso === 'function') {
        if (!validarCriterioPaso(tipo, nombrePasoActual)) {
            // Show appropriate error message based on step
            if (tipo === 'lote' && nombrePasoActual === 'datos') {
                alert("Seleccioná el tipo de lote para continuar.");
            } else if (tipo === 'lote' && nombrePasoActual === 'caracteristicas') {
                alert("El frente y fondo deben ser mayores a 0 para continuar.");
            } else if (nombrePasoActual === 'comparables') {
                alert("Agregá al menos 1 comparable para continuar.");
            }
            return;
        }
    }

    // Navigate based on step name
    if (nombrePasoActual === 'datos') {
        if (tipo === 'lote') {
            guardarDatosPantalla1();
            mostrarCaracteristicasLote();
        } else if (tipo === 'departamento') {
            guardarDatosPantallaDepartamento();
            mostrarCaracteristicasDepartamento();
        }
    } else if (nombrePasoActual === 'caracteristicas') {
        if (tipo === 'lote') {
            guardarDatosPantalla3();
            mostrarPantallaComparables();
        } else if (tipo === 'departamento') {
            guardarDatosCaracteristicasDepartamento();
            mostrarHomogeneizacionSuperficie();
        }
    } else if (nombrePasoActual === 'superficie') {
        if (tipo === 'departamento') {
            guardarDatosHomogeneizacion();
            mostrarPantallaComparables();
        }
    } else if (nombrePasoActual === 'comparables') {
        // Validate comparables count
        if (datosTasacion.comparables.length < 1) {
            alert("Agregá al menos 1 comparable para continuar.");
            return;
        }
        if (datosTasacion.comparables.length > 10) {
            alert("Máximo 10 comparables permitidos. Quitá algunos comparables antes de continuar.");
            return;
        }
        if (tipo === 'lote') {
            calcularYMostrarResultado();
        } else if (tipo === 'departamento') {
            calcularYMostrarResultadoDepartamento();
        }
    }
}

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
                datosTasacion.ubicacion = tasacion.ubicacion || { direccion: "", provincia: "", localidad: "", lat: null, lon: null };
                
                // Cargar datos según el tipo de inmueble
                if (tasacion.tipo === 'lote') {
                    datosTasacion.lote = tasacion.lote || { tipoLote: "", servicios: [], caracteristicas: {} };
                } else if (tasacion.tipo === 'departamento') {
                    datosTasacion.departamento = tasacion.departamento || { ambientes: "", dormitorios: "", banos: "", cochera: false, baulera: false, servicios: [], amenities: [], infraestructura: [], observaciones: "" };
                } else if (tasacion.tipo === 'casa') {
                    datosTasacion.casa = tasacion.casa || {};
                }
                
                datosTasacion.comparables = tasacion.comparables || [];
                resultadoTasacion = tasacion.resultado || null;
                pasoActual = tasacion.datosCompletos?.pasoActual || 2;
                tipoSeleccionado = tasacion.tipo;
            }
            
            // Limpiar localStorage
            localStorage.removeItem("tasacionEnEdicion");

            // Navegar a la pantalla correspondiente usando estructura dinámica
            if (pasoActual >= 2) {
                if (typeof navegarAPaso === 'function') {
                    navegarAPaso(pasoActual);
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

function inicializarOrientacion() {
    const input = document.getElementById("orientacionInput");
    const list = document.getElementById("orientacionList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarOrientacionLote() {
    const input = document.getElementById("orientacionLoteInput");
    const list = document.getElementById("orientacionLoteList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            datosTasacion.ubicacion.orientacion = item.textContent;
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
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

function inicializarAmbientes() {
    const input = document.getElementById("ambientesInput");
    const list = document.getElementById("ambientesList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            list.style.display = "none";

            // Update datosTasacion in real-time
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.ambientes = item.textContent;
            }

            // Si es monoambiente, desactivar dormitorios
            const dormitoriosInput = document.getElementById("dormitoriosInput");
            if (item.textContent === "Monoambiente" && dormitoriosInput) {
                dormitoriosInput.disabled = true;
                dormitoriosInput.value = "";
                if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                    datosTasacion.departamento.dormitorios = "";
                }
            } else if (dormitoriosInput) {
                dormitoriosInput.disabled = false;
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarDormitorios() {
    const input = document.getElementById("dormitoriosInput");
    const list = document.getElementById("dormitoriosList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            list.style.display = "none";

            // Update datosTasacion in real-time
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.dormitorios = item.textContent;
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarBanos() {
    const input = document.getElementById("banosInput");
    const list = document.getElementById("banosList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            list.style.display = "none";

            // Update datosTasacion in real-time
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.banos = item.textContent;
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarSwitchCochera() {
    const switchInput = document.getElementById("cocheraSwitch");
    if (!switchInput) return;

    switchInput.addEventListener("change", () => {
        datosTasacion.departamento.cochera = switchInput.checked;
    });
}

function inicializarSwitchBaulera() {
    const switchInput = document.getElementById("bauleraSwitch");
    if (!switchInput) return;

    switchInput.addEventListener("change", () => {
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

                            <div class="autocomplete-item" data-coef="1">Frente (1)</div>
                            <div class="autocomplete-item" data-coef="0.95">Contrafrente (0.95)</div>
                            <div class="autocomplete-item" data-coef="0.90">Patio interior (0.90)</div>
                            <div class="autocomplete-item" data-coef="0.93">Lateral (0.93)</div>

                        </div>

                    </div>

                </div>

                <!-- Ubicación en piso -->
                <div class="input-group input-2-3">

                    <label>Ubicación en piso</label>

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

                <!-- Switch de ascensor -->
                <div class="input-group input-2-3">

                    <label></label>

                    <div class="switch-container-ascensor">

                        <label class="switch-label">Tiene<br>ascensor</label>

                        <label class="switch">

                            <input
                                type="checkbox"
                                id="tieneAscensorSwitch"
                                ${datosTasacion.departamento.tieneAscensor === "si" ? "checked" : ""}
                            >

                            <span class="slider"></span>

                        </label>

                    </div>

                </div>

                <!-- Característica constructiva -->
                <div class="input-group input-2-3">

                    <label>Característica constructiva</label>

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

                            <div class="autocomplete-item" data-coef="0.90">Económica (0.90)</div>
                            <div class="autocomplete-item" data-coef="1">Buena económica (1)</div>
                            <div class="autocomplete-item" data-coef="1.07">Buena sin servicios (1.05-1.10)</div>
                            <div class="autocomplete-item" data-coef="1.17">Buena con servicios (1.15-1.20)</div>
                            <div class="autocomplete-item" data-coef="1.27">Muy buena (1.25-1.30)</div>

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

            <!-- COLUMNA 2 (3 inputs) -->
            <div class="columna-departamento">

                <!-- Superficie cubierta propia -->
                <div class="input-group input-2-3">

                    <label>Superficie cubierta propia</label>

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

                            <div class="autocomplete-item" data-coef="1.10">Hasta 30m² (1.10)</div>
                            <div class="autocomplete-item" data-coef="1.05">De 30 a 50m² (1.05)</div>
                            <div class="autocomplete-item" data-coef="1">De 50 a 100m² (1)</div>
                            <div class="autocomplete-item" data-coef="0.95">De 100 a 150m² (0.95)</div>
                            <div class="autocomplete-item" data-coef="0.90">Más de 150m² (0.90)</div>

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

function inicializarUbicacionPlanta() {
    const input = document.getElementById("ubicacionPlantaInput");
    const list = document.getElementById("ubicacionPlantaList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            datosTasacion.departamento.ubicacionPlanta = item.textContent;
            datosTasacion.departamento.ubicacionPlantaCoef = parseFloat(item.dataset.coef);
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarSwitchAscensor() {
    const switchInput = document.getElementById("tieneAscensorSwitch");
    if (!switchInput) return;

    switchInput.addEventListener("change", () => {
        datosTasacion.departamento.tieneAscensor = switchInput.checked ? "si" : "no";
        actualizarListaPisos(switchInput.checked ? "si" : "no");
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
            { texto: "PB (0.90)", coef: 0.90 },
            { texto: "PB con patio y jardín al fondo (1)", coef: 1 },
            { texto: "1ro y 2do (0.95)", coef: 0.95 },
            { texto: "3ro y 4to (1)", coef: 1 },
            { texto: "5to y 6to (1.05)", coef: 1.05 },
            { texto: "7mo y 8vo (1.10)", coef: 1.10 },
            { texto: "Pisos superiores (1.5)", coef: 1.5 },
            { texto: "Último piso (0.90)", coef: 0.90 }
        ];
    } else {
        opciones = [
            { texto: "PB (1)", coef: 1 },
            { texto: "PB con patio y jardín al fondo (1)", coef: 1 },
            { texto: "1ro (1)", coef: 1 },
            { texto: "2do (0.95)", coef: 0.95 },
            { texto: "3ro y 4to (0.90)", coef: 0.90 },
            { texto: "Último piso (0.90)", coef: 0.90 }
        ];
    }

    list.innerHTML = opciones.map(op => `
        <div class="autocomplete-item" data-coef="${op.coef}">${op.texto}</div>
    `).join("");
}

function inicializarUbicacionPiso() {
    const input = document.getElementById("ubicacionPisoInput");
    const list = document.getElementById("ubicacionPisoList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.addEventListener("click", (e) => {
        if (e.target.classList.contains("autocomplete-item")) {
            input.value = e.target.textContent;
            datosTasacion.departamento.ubicacionPiso = e.target.textContent;
            datosTasacion.departamento.ubicacionPisoCoef = parseFloat(e.target.dataset.coef);
            list.style.display = "none";
        }
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarSuperficieCubierta() {
    const input = document.getElementById("superficieCubiertaInput");
    const list = document.getElementById("superficieCubiertaList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            datosTasacion.departamento.superficieCubierta = item.textContent;
            datosTasacion.departamento.superficieCubiertaCoef = parseFloat(item.dataset.coef);
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

function inicializarEstadoConservacion() {
    const input = document.getElementById("estadoConservacionInput");
    const list = document.getElementById("estadoConservacionList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            datosTasacion.departamento.estadoConservacion = item.textContent;
            datosTasacion.departamento.estadoConservacionCoef = parseInt(item.dataset.valor);
            list.style.display = "none";

            // Calcular coeficiente de antigüedad usando tabla Ross-Heidecke
            calcularCoeficienteAntiguedad();
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
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

function inicializarCaracteristicaConstructiva() {
    const input = document.getElementById("caracteristicaConstructivaInput");
    const list = document.getElementById("caracteristicaConstructivaList");

    if (!input || !list) return;

    input.addEventListener("focus", () => {
        list.style.display = "block";
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            datosTasacion.departamento.caracteristicaConstructiva = item.textContent;
            datosTasacion.departamento.caracteristicaConstructivaCoef = parseFloat(item.dataset.coef);
            list.style.display = "none";
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

/* =========================
   CUARTA PANTALLA DEPARTAMENTO - HOMOGENEIZACIÓN SUPERFICIE
========================= */

function mostrarHomogeneizacionSuperficie() {

    pasoActual = 4;
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

            <h1>Homogeneización de superficie</h1>

        </div>

        <div class="homogeneizacion-container">

            <table class="tabla-homogeneizacion">

                <thead>

                    <tr>

                        <th>Tipo de Superficie</th>

                        <th>Superficie (m²)</th>

                        <th>Coeficiente</th>

                        <th>Superficie Homogeneizada (m²)</th>

                    </tr>

                </thead>

                <tbody>

                    <tr>

                        <td>Cubierto</td>

                        <td>
                            <input
                                type="number"
                                id="superficieCubierto"
                                class="input-tabla"
                                placeholder="Ej: 60"
                                value="${datosTasacion.departamento.homogeneizacion.cubierto.superficie || ''}"
                            >
                        </td>

                        <td>1</td>

                        <td>
                            <input
                                type="number"
                                id="homogeneizadaCubierto"
                                class="input-tabla"
                                value="${datosTasacion.departamento.homogeneizacion.cubierto.homogeneizada || 0}"
                                disabled
                            >
                        </td>

                    </tr>

                    <tr>

                        <td>Semicubierto</td>

                        <td>
                            <input
                                type="number"
                                id="superficieSemicubierto"
                                class="input-tabla"
                                placeholder="Ej: 8"
                                value="${datosTasacion.departamento.homogeneizacion.semicubierto.superficie || ''}"
                            >
                        </td>

                        <td>0.50</td>

                        <td>
                            <input
                                type="number"
                                id="homogeneizadaSemicubierto"
                                class="input-tabla"
                                value="${datosTasacion.departamento.homogeneizacion.semicubierto.homogeneizada || 0}"
                                disabled
                            >
                        </td>

                    </tr>

                    <tr>

                        <td>Balcón</td>

                        <td>
                            <input
                                type="number"
                                id="superficieBalcon"
                                class="input-tabla"
                                placeholder="Ej: 8"
                                value="${datosTasacion.departamento.homogeneizacion.balcon.superficie || ''}"
                            >
                        </td>

                        <td>0.30</td>

                        <td>
                            <input
                                type="number"
                                id="homogeneizadaBalcon"
                                class="input-tabla"
                                value="${datosTasacion.departamento.homogeneizacion.balcon.homogeneizada || 0}"
                                disabled
                            >
                        </td>

                    </tr>

                    <tr>

                        <td>Descubierta</td>

                        <td>
                            <input
                                type="number"
                                id="superficieDescubierta"
                                class="input-tabla"
                                placeholder="Ej: 10"
                                value="${datosTasacion.departamento.homogeneizacion.descubierto.superficie || ''}"
                            >
                        </td>

                        <td>0.20</td>

                        <td>
                            <input
                                type="number"
                                id="homogeneizadaDescubierta"
                                class="input-tabla"
                                value="${datosTasacion.departamento.homogeneizacion.descubierto.homogeneizada || 0}"
                                disabled
                            >
                        </td>

                    </tr>

                    <tr class="fila-total">

                        <td>Total</td>

                        <td>
                            <input
                                type="number"
                                id="totalSuperficie"
                                class="input-tabla"
                                value="${datosTasacion.departamento.homogeneizacion.totalSuperficie || 0}"
                                disabled
                            >
                        </td>

                        <td></td>

                        <td>
                            <input
                                type="number"
                                id="totalHomogeneizada"
                                class="input-tabla"
                                value="${datosTasacion.departamento.homogeneizacion.totalHomogeneizada || 0}"
                                disabled
                            >
                        </td>

                    </tr>

                </tbody>

            </table>

        </div>

    `;

    // Update button state using dynamic validation
    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarHomogeneizacion();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);

}

function inicializarHomogeneizacion() {

    // Inicializar eventos para inputs editables
    const inputs = [
        { superficie: "superficieCubierto", homogeneizada: "homogeneizadaCubierto", tipo: "cubierto", coef: 1 },
        { superficie: "superficieSemicubierto", homogeneizada: "homogeneizadaSemicubierto", tipo: "semicubierto", coef: 0.50 },
        { superficie: "superficieBalcon", homogeneizada: "homogeneizadaBalcon", tipo: "balcon", coef: 0.30 },
        { superficie: "superficieDescubierta", homogeneizada: "homogeneizadaDescubierta", tipo: "descubierto", coef: 0.20 }
    ];

    inputs.forEach(config => {
        const inputSuperficie = document.getElementById(config.superficie);
        const inputHomogeneizada = document.getElementById(config.homogeneizada);

        if (inputSuperficie && inputHomogeneizada) {
            inputSuperficie.addEventListener("input", () => {
                const valor = parseFloat(inputSuperficie.value) || 0;
                datosTasacion.departamento.homogeneizacion[config.tipo].superficie = valor;
                datosTasacion.departamento.homogeneizacion[config.tipo].homogeneizada = valor * config.coef;
                inputHomogeneizada.value = datosTasacion.departamento.homogeneizacion[config.tipo].homogeneizada.toFixed(2);
                calcularTotales();
            });
        }
    });

    // Calcular totales iniciales
    calcularTotales();
}

function calcularHomogeneizadaCubierto() {
    const superficie = datosTasacion.departamento.homogeneizacion.cubierto.superficie;
    datosTasacion.departamento.homogeneizacion.cubierto.homogeneizada = superficie * 1;

    const inputHomogeneizada = document.getElementById("homogeneizadaCubierto");
    if (inputHomogeneizada) {
        inputHomogeneizada.value = datosTasacion.departamento.homogeneizacion.cubierto.homogeneizada.toFixed(2);
    }

    calcularTotales();
}

function calcularTotales() {
    const hom = datosTasacion.departamento.homogeneizacion;

    // Suma de superficies
    const totalSuperficie =
        hom.cubierto.superficie +
        hom.semicubierto.superficie +
        hom.balcon.superficie +
        hom.descubierto.superficie;

    // Suma de superficies homogeneizadas
    const totalHomogeneizada =
        hom.cubierto.homogeneizada +
        hom.semicubierto.homogeneizada +
        hom.balcon.homogeneizada +
        hom.descubierto.homogeneizada;

    hom.totalSuperficie = totalSuperficie;
    hom.totalHomogeneizada = totalHomogeneizada;

    const inputTotalSuperficie = document.getElementById("totalSuperficie");
    const inputTotalHomogeneizada = document.getElementById("totalHomogeneizada");

    if (inputTotalSuperficie) {
        inputTotalSuperficie.value = totalSuperficie.toFixed(2);
    }

    if (inputTotalHomogeneizada) {
        inputTotalHomogeneizada.value = totalHomogeneizada.toFixed(2);
    }
}

function guardarDatosHomogeneizacion() {

    const hom = datosTasacion.departamento.homogeneizacion;

    hom.cubierto.superficie = parseFloat(document.getElementById("superficieCubierto").value) || 0;
    hom.semicubierto.superficie = parseFloat(document.getElementById("superficieSemicubierto").value) || 0;
    hom.balcon.superficie = parseFloat(document.getElementById("superficieBalcon").value) || 0;
    hom.descubierto.superficie = parseFloat(document.getElementById("superficieDescubierta").value) || 0;

    // Recalcular homogeneizadas
    hom.cubierto.homogeneizada = hom.cubierto.superficie * 1;
    hom.semicubierto.homogeneizada = hom.semicubierto.superficie * 0.50;
    hom.balcon.homogeneizada = hom.balcon.superficie * 0.30;
    hom.descubierto.homogeneizada = hom.descubierto.superficie * 0.20;

    hom.totalSuperficie = parseFloat(document.getElementById("totalSuperficie").value) || 0;
    hom.totalHomogeneizada = parseFloat(document.getElementById("totalHomogeneizada").value) || 0;

    // Reset resultadoCalculado when screen 4 data changes
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    console.log(datosTasacion);
}

/* =========================
   SEXTA PANTALLA DEPARTAMENTO - RESULTADO
========================= */

async function calcularYMostrarResultadoDepartamento() {

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

function mostrarPantallaResultadoDepartamento() {

    pasoActual = 6;
    actualizarIndicadoresProgreso();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    cerrarModalComparables();

    const contenido = getContenidoTasacion();
    if (!contenido) {
        return;
    }

    const r = resultadoTasacion;

    if (!r) {
        return;
    }

    // Calcular datos del departamento a tasar para mostrar como primera fila
    const valorM2Depto = r.valor_m2 || 0;
    const valorTotalDepto = r.valor_final || 0;
    const superficieDepto = r.superficie_homogeneizada || 0;

    const filaDeptoTasar = `
        <tr class="fila-depto-tasar" style="color: #0066cc;">
            <td><strong>${escapeHtml(datosTasacion.ubicacion.direccion || 'Departamento a tasar')}</strong></td>
            <td><strong>${formatearMoneda(valorTotalDepto)}</strong></td>
            <td><strong>${formatearMoneda(valorM2Depto)}</strong></td>
            <td><strong>${superficieDepto.toFixed(2)}</strong></td>
            <td><strong>${formatearMoneda(valorM2Depto)}</strong></td>
            <td><strong>1.00</strong></td>
            <td><input type="number" class="coef-ubicacion-input" data-index="-1" value="1.00" step="0.01" min="0"></td>
            <td><input type="number" class="coef-act-input" data-index="-1" value="1.00" step="0.01" min="0"></td>
            <td><strong>${formatearMoneda(valorM2Depto)}</strong></td>
            <td></td>
        </tr>
    `;

    const filasComp = (r.comparables || [])
        .map((c, index) => `
        <tr data-comparable-index="${index}">
            <td>${escapeHtml(c.direccion)}</td>
            <td>${formatearMoneda(c.valor)}</td>
            <td>${formatearMoneda(c.valor / (c.superficie || 1))}</td>
            <td>${c.superficie || '-'}</td>
            <td><strong>${formatearMoneda(c.valor / (c.superficie || 1))}</strong></td>
            <td>${c.coeficiente ? c.coeficiente.toFixed(2) : '1.00'}</td>
            <td><input type="number" class="coef-ubicacion-input" data-index="${index}" value="1.00" step="0.01" min="0"></td>
            <td><input type="number" class="coef-act-input" data-index="${index}" value="1.00" step="0.01" min="0"></td>
            <td><strong>${formatearMoneda(c.valor / (c.superficie || 1))}</strong></td>
            <td>
                <button type="button" class="btn-opciones-comparable" data-index="${index}">
                    •••
                </button>
            </td>
        </tr>
    `)
        .join("");

    const d = "div";

    contenido.innerHTML = `

        <${d} class="titulo-seccion">

            <h1>Resultado de la tasación</h1>

            <p>
                Valor estimado según comparables homogeneizados.
            </p>

        </${d}>

        <${d} class="resultado-layout-vertical">

            <${d} class="resultado-valor-card">

                <${d} class="resultado-valor-top">
                    <${d} class="resultado-valor-left">
                        <span class="resultado-etiqueta">Valor final</span>
                        <span class="resultado-valor">$ ${formatearMoneda(r.valor_final)}</span>
                    </${d}>
                </${d}>

                <${d} class="resultado-separador"></${d}>

                <${d} class="resultado-meta">
                    <${d}>
                        <span>Valor por m² homogeneizado</span>
                        <strong>$ ${formatearMoneda(r.valor_m2)}</strong>
                    </${d}>
                    <${d}>
                        <span>Superficie homogeneizada</span>
                        <strong>${r.superficie_homogeneizada.toFixed(2)} m²</strong>
                    </${d}>
                </${d}>

            </${d}>

            <${d} class="resultado-comparables-card">

                <h3>Comparables</h3>

                <table class="tabla-comparables-resultado">

                    <thead>

                        <tr>

                            <th>Dirección</th>

                            <th>Valor</th>

                            <th>Valor m²</th>

                            <th>Superficie</th>

                            <th>Valor m² homogeneizado</th>

                            <th>Coeficiente</th>

                            <th>Ubicacion</th>

                            <th>ACT</th>

                            <th>Valor m² final</th>

                            <th></th>

                        </tr>

                    </thead>

                    <tbody>

                        ${filaDeptoTasar}${filasComp}

                    </tbody>

                </table>

                <button type="button" class="btn-recalcular" id="btnRecalcular" disabled>
                    Recalcular
                </button>

            </${d}>

        </${d}>

    `;

    const btnSiguiente = getBtnSiguiente();
    if (btnSiguiente) {
        btnSiguiente.textContent = "Guardar tasación";
        btnSiguiente.disabled = false;
        btnSiguiente.classList.add("activo");
    }

    // Inicializar botones de quitar comparables
    inicializarBotonesQuitarComparable();

    // Add event listeners for coeficiente inputs
    document.querySelectorAll(".coef-ubicacion-input, .coef-act-input").forEach(input => {
        input.addEventListener("input", () => {
            const btnRecalcular = document.getElementById("btnRecalcular");
            if (btnRecalcular) {
                btnRecalcular.disabled = false;
            }
        });
    });

    // Add event listener for recalcular button
    const btnRecalcular = document.getElementById("btnRecalcular");
    if (btnRecalcular) {
        btnRecalcular.addEventListener("click", () => {
            // Aquí iría la lógica para recalcular con los nuevos coeficientes
            alert("Función de recalcular con nuevos coeficientes - pendiente de implementar");
            btnRecalcular.disabled = true;
        });
    }

    // Add event listeners for opciones buttons
    document.querySelectorAll(".btn-opciones-comparable").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const index = parseInt(e.target.dataset.index);
            mostrarMenuOpcionesComparable(index, e.target);
        });
    });

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
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
            const index = parseInt(e.target.dataset.index);
            
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

async function asegurarDatasetProvincias() {

    if (provinciasData.length) {

        return;
    }

    const res = await fetch(
        "https://apis.datos.gob.ar/georef/api/provincias"
    );

    const data = await res.json();

    provinciasData = data.provincias.sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
    );
}

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


function inicializarAutocompleteProvincia() {

    const input = document.getElementById("provinciaInput");

    const list = document.getElementById("provinciaList");

    function renderLista(filtro = "") {

        list.innerHTML = "";

        const filtradas = provinciasData.filter(p =>
            p.nombre.toLowerCase().includes(filtro.toLowerCase())
        );

        if (!filtradas.length) {

            list.style.display = "none";

            return;
        }

        filtradas.forEach(provincia => {

            const item = document.createElement("div");

            item.className = "autocomplete-item";

            item.textContent = provincia.nombre;

            item.addEventListener("click", () => {

                input.value = provincia.nombre;

                list.style.display = "none";

                cargarLocalidades(provincia.nombre);

                actualizarMapa();
            });

            list.appendChild(item);
        });

        list.style.display = "block";
    }

    input.addEventListener("focus", () => {

        renderLista();
    });

    input.addEventListener("input", () => {

        renderLista(input.value);

        // Auto-select if there's an exact match (case-insensitive)
        const valorInput = input.value.trim().toLowerCase();
        if (valorInput) {
            const match = provinciasData.find(p =>
                p.nombre.toLowerCase() === valorInput
            );
            if (match) {
                input.value = match.nombre;
                list.style.display = "none";
                cargarLocalidades(match.nombre);
                actualizarMapa();
            }
        }
    });

    document.addEventListener("click", (e) => {

        if (!input.parentElement.contains(e.target)) {

            list.style.display = "none";
        }
    });
}

async function cargarLocalidades(provincia) {

    const inputLocalidad =
        document.getElementById("localidadInput");

    const listLocalidad =
        document.getElementById("localidadList");

    inputLocalidad.disabled = true;

    inputLocalidad.placeholder = "Cargando localidades...";

    const res = await fetch(
        `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provincia)}&max=5000`
    );

    const data = await res.json();

    localidadesData = data.localidades.sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
    );

    inputLocalidad.disabled = false;

    inputLocalidad.placeholder = "Escribí una localidad";

    inputLocalidad.value = "";

    inicializarAutocompleteLocalidad();
}

function inicializarAutocompleteLocalidad() {

    const input = document.getElementById("localidadInput");

    const list = document.getElementById("localidadList");

    function renderLista(filtro = "") {

        list.innerHTML = "";

        const filtradas = localidadesData
            .filter(l =>
                l.nombre.toLowerCase().includes(filtro.toLowerCase())
            )
            .slice(0, 30);

        if (!filtradas.length) {

            list.style.display = "none";

            return;
        }

        filtradas.forEach(localidad => {

            const item = document.createElement("div");

            item.className = "autocomplete-item";

            item.textContent = localidad.nombre;

            item.addEventListener("click", () => {

                input.value = localidad.nombre;

                list.style.display = "none";

                actualizarMapa();
            });

            list.appendChild(item);
        });

        list.style.display = "block";
    }

    input.addEventListener("focus", () => {

        renderLista();
    });

    input.addEventListener("input", () => {

        renderLista(input.value);

        // Auto-select if there's an exact match (case-insensitive)
        const valorInput = input.value.trim().toLowerCase();
        if (valorInput) {
            const match = localidadesData.find(l =>
                l.nombre.toLowerCase() === valorInput
            );
            if (match) {
                input.value = match.nombre;
                list.style.display = "none";
                actualizarMapa();
            }
        }
    });

    document.addEventListener("click", (e) => {

        if (!input.parentElement.contains(e.target)) {

            list.style.display = "none";
        }
    });
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
    light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
};

function inicializarMapa() {

    const contenedorMapa =
        document.getElementById("mapaTasacion");

    if (!contenedorMapa) return;

    mapa = L.map(contenedorMapa).setView(
        [-34.6037, -58.3816],
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
        [-34.6037, -58.3816],
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

    let timeoutBusqueda;

    function buscarConDelay() {

        clearTimeout(timeoutBusqueda);

        timeoutBusqueda = setTimeout(() => {

            actualizarMapa();

        }, 1200);
    }

    direccionInput.addEventListener(
        "input",
        buscarConDelay
    );

    provinciaInput.addEventListener(
        "change",
        buscarConDelay
    );

    localidadInput.addEventListener(
        "change",
        buscarConDelay
    );
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

function inicializarTipoLote() {

    const input =
        document.getElementById("tipoLoteInput");

    const list =
        document.getElementById("tipoLoteList");

    const items =
        list.querySelectorAll(".autocomplete-item");

    input.addEventListener("click", () => {

        list.style.display = "block";
    });

    items.forEach(item => {

        item.addEventListener("click", () => {

            const nuevoTipo =
                item.textContent.trim();

            /* =====================
            SI CAMBIO EL TIPO
            RESETEA PASO 3
            ===================== */

            if (
                datosTasacion.lote.tipoLote &&
                datosTasacion.lote.tipoLote !== nuevoTipo
            ) {

                datosTasacion.lote.caracteristicas = {};
            }

            input.value = nuevoTipo;

            datosTasacion.lote.tipoLote =
                nuevoTipo;

            list.style.display = "none";

            // Update button state using dynamic validation
            if (typeof actualizarEstadoBotonSiguiente === 'function') {
                actualizarEstadoBotonSiguiente();
            }
        });
    });

    document.addEventListener("click", (e) => {

        if (!input.parentElement.contains(e.target)) {

            list.style.display = "none";
        }
    });
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

                <label>Segunda calle</label>

                <input
                    type="text"
                    id="segundaCalleInput"
                >

            </div>

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

        camposExtra += `

            <div class="input-group">

                <label>Segunda calle</label>

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
        `;
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

function leerHistorialDesdeStorage() {

    try {

        const raw =
            localStorage.getItem("historialTasaciones");

        if (!raw) {

            return [];
        }

        const arr = JSON.parse(raw);

        return Array.isArray(arr) ? arr : [];

    } catch (e) {

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

        const res = await fetch(
            `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provinciaNombre)}&max=5000`
        );

        const data = await res.json();

        localidadesData = data.localidades.sort((a, b) =>
            a.nombre.localeCompare(b.nombre)
        );

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

async function abrirPanelComparableManual() {

    const cont =
        document.getElementById("comparablesModalContenido");

    const overlay =
        document.getElementById("comparablesModalOverlay");

    if (!cont || !overlay) {

        return;
    }

    cerrarModalComparables();

    comparablePanelModo = "manual";

    const tipoActual =
        datosTasacion.tipo;

    const esLote =
        tipoActual === "lote";

    const bloqueTipoLote = esLote
        ? `

            <div class="input-group">

                <label>Tipo de lote</label>

                <div class="autocomplete-container">

                    <input
                        type="text"
                        id="compManualTipoLoteInput"
                        placeholder="Seleccionar tipo"
                        autocomplete="off"
                        readonly
                    >

                    <div
                        class="autocomplete-list"
                        id="compManualTipoLoteList"
                        style="display:none"
                    >

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
        `
        : `

            <div class="comparables-tipo-inmueble-leido">

                <span>Tipo de lote</span>

                <strong>
                    No aplica para este tipo de inmueble
                </strong>

            </div>
        `;

    cont.innerHTML = `

            <div class="modal-header">

                <div class="modal-titulo">

                        <h2>
                            Nuevo comparable manual
                        </h2>

                        <p>
                            Completá los datos de la propiedad comparable.
                        </p>

                    </div>

                </div>

            <div class="modal-contenido-scroll">

                <div class="modal-seccion">

                    <h3>
                        Ubicación
                    </h3>

                    <div class="input-group">

                        <label>Dirección</label>

                        <input
                            type="text"
                            id="compManualDireccionInput"
                            autocomplete="off"
                        >

                    </div>

                    <div class="input-group">

                        <label>Provincia</label>

                        <div class="autocomplete-container">

                            <input
                                type="text"
                                id="compManualProvinciaInput"
                                placeholder="Escribí una provincia"
                                autocomplete="off"
                            >

                            <div
                                class="autocomplete-list"
                                id="compManualProvinciaList">
                            </div>

                        </div>

                    </div>

                    <div class="input-group">

                        <label>Localidad</label>

                        <div class="autocomplete-container">

                            <input
                                type="text"
                                id="compManualLocalidadInput"
                                placeholder="Seleccioná provincia primero"
                                autocomplete="off"
                                disabled
                            >

                            <div
                                class="autocomplete-list"
                                id="compManualLocalidadList">
                            </div>

                        </div>

                    </div>

                </div>


                <div class="modal-seccion">

                    <h3>
                        Medidas del lote
                    </h3>

                    <div class="input-group">

                        <label>Frente (m)</label>

                        <input
                            type="number"
                            id="compManualFrenteInput"
                            min="0"
                            step="any"
                        >

                    </div>

                    <div class="input-group">

                        <label>Fondo (m)</label>

                        <input
                            type="number"
                            id="compManualFondoInput"
                            min="0"
                            step="any"
                        >

                    </div>

                    <div class="input-group">

                        <label>Superficie (m²)</label>

                        <input
                            type="number"
                            id="compManualSuperficieInput"
                            min="0"
                            step="any"
                        >

                    </div>

                </div>

                <div class="modal-seccion">

                    <h3>
                        Inmueble
                    </h3>

                    <div class="comparables-tipo-inmueble-leido">

                        <span>
                            Tipo de inmueble (de esta tasación)
                        </span>

                        <strong>
                            ${escapeHtml(etiquetaTipoInmueble(tipoActual))}
                        </strong>

                    </div>

                    ${bloqueTipoLote}

                </div>

                <div class="modal-seccion">

                    <h3>
                        Valor
                    </h3>

                    <div class="comparables-valor-fila">

                        <div class="input-group">

                            <label>Valor total (USD)</label>

                            <input
                                type="number"
                                id="compManualValorInput"
                                min="0"
                                step="any"
                                placeholder="0"
                            >

                        </div>

                        <div class="comparables-tipo-valor">

                            <label>

                                <input
                                    type="radio"
                                    name="compManualTipoValor"
                                    value="venta"
                                    checked>

                                Valor de venta

                            </label>

                            <label>

                                <input
                                    type="radio"
                                    name="compManualTipoValor"
                                    value="oferta">

                                Valor de oferta

                            </label>

                        </div>

                    </div>

                </div>

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn-modal btn-editar"
                    id="btnAgregarComparableManual">
                    Agregar a comparables
                </button>

            </div>
    `;

    overlay.classList.add("active");

    try {

        await asegurarDatasetProvincias();

        bindComparableManualUbicacion();

        if (esLote) {

            inicializarTipoLoteComparableManual();
        }

    } catch (e) {

        console.error(e);
    }
}

function abrirPanelComparableHistorial() {

    const cont =
        document.getElementById("comparablesModalContenido");

    const overlay =
        document.getElementById("comparablesModalOverlay");

    if (!cont || !overlay) {

        return;
    }

    cerrarModalComparables();

    comparablePanelModo = "historial";

    const tasaciones =
        leerHistorialDesdeStorage();

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

                    return `
                    <div
                        class="card-historial"
                        data-historial-id="${t.id}"
                        role="button"
                        tabindex="0">

                        <div class="card-grid">
                            <div class="card-left">
                                <div class="card-image">
                                    <i class="fa-solid fa-camera"></i>
                                </div>
                            </div>

                            <div class="card-main">
                                <div class="card-header">
                                    <div class="card-date-time">
                                        <i class="fa-solid fa-calendar"></i>
                                        <span>${formatearFechaRelativa(t.fechaCreacion)}</span>
                                    </div>
                                    <span class="card-badge card-badge-tipo">${t.tipo.charAt(0).toUpperCase() + t.tipo.slice(1)}</span>
                                </div>

                                <div class="card-address">
                                    <i class="fa-solid fa-location-dot"></i>
                                    <span>${escapeHtml(t.ubicacion?.direccion || "Sin dirección")}</span>
                                </div>

                                <div class="card-location">
                                    <span>${escapeHtml(t.ubicacion?.localidad || "")}, ${escapeHtml(t.ubicacion?.provincia || "")}</span>
                                </div>
                            </div>
                        </div>

                        <div class="card-divider"></div>

                        <div class="card-price">
                            <i class="fa-solid fa-dollar-sign"></i>
                            <span>${precio}</span>
                        </div>

                    </div>
                `})

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

function agregarComparableManualDesdeFormulario() {

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

    datosTasacion.comparables.push({

        id: Date.now(),

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

    // Reset resultadoCalculado when comparables change
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    cerrarModalComparables();

    renderComparablesDerecha();
}

function agregarComparableDesdeHistorial(id) {

    const tasaciones =
        leerHistorialDesdeStorage();

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

    datosTasacion.comparables.push({

        id: Date.now(),

        fuente: "historial",

        historialId: id,

        snapshot: snap,

        valor,

        tipoValor: "venta",

        tipoLote: snap.lote?.tipoLote || null,

        // Extract fields to top level for consistent rendering
        ubicacion: snap.ubicacion || {},

        tipoInmueble: snap.tipo || null,

        frente: snap.lote?.caracteristicas?.frente || null,

        fondo: snap.lote?.caracteristicas?.fondo || null,

        superficie: snap.lote?.caracteristicas?.superficie || null
    });

    // Reset resultadoCalculado when comparables change
    resultadoCalculado = false;

    actualizarIndicadoresProgreso();

    cerrarModalComparables();

    renderComparablesDerecha();
}

function alternarPanelComparables(modo) {

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

        abrirPanelComparableHistorial();
    }
}

function onComparablesContenidoClick(e) {

    if (pasoActual !== 4) {

        return;
    }

    const accion =
        e.target.closest("[data-accion-comparable]");

    if (accion) {

        alternarPanelComparables(
            accion.dataset.accionComparable
        );

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
}

function inicializarComparablesModalListenersOnce() {

    const overlay =
        document.getElementById("comparablesModalOverlay");

    if (!overlay || overlay.dataset.initedComparablesModal) {

        return;
    }

    overlay.dataset.initedComparablesModal = "1";

    overlay.addEventListener("click", e => {

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

            agregarComparableManualDesdeFormulario();

            return;
        }

        const cardHist =
            e.target.closest(
                ".card-historial[data-historial-id]"
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
    return {
        pasoActual: pasoActual,
        tipo: datosTasacion.tipo,
        ubicacion: { ...datosTasacion.ubicacion },
        lote: {
            tipoLote: datosTasacion.lote.tipoLote,
            servicios: [...datosTasacion.lote.servicios],
            caracteristicas: { ...datosTasacion.lote.caracteristicas }
        },
        comparables: JSON.parse(JSON.stringify(datosTasacion.comparables)),
        resultado: resultadoTasacion ? { ...resultadoTasacion } : null
    };
}

function limpiarDatosTasacion() {
    // Resetear todos los datos
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
    datosTasacion.comparables = [];
    datosTasacion.resultado = null;
    
    // Generar nuevo ID para la próxima tasación
    tasacionId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Resetear paso actual
    pasoActual = 1;
    tipoSeleccionado = null;
    resultadoTasacion = null;
}

function cargarDatosCompletos(datosCompletos) {
    if (!datosCompletos) return;
    
    // Cargar datos desde la estructura guardada
    datosTasacion.tipo = datosCompletos.tipo;
    datosTasacion.ubicacion = { ...datosCompletos.ubicacion };
    datosTasacion.lote = {
        tipoLote: datosCompletos.lote.tipoLote,
        servicios: [...datosCompletos.lote.servicios],
        caracteristicas: { ...datosCompletos.lote.caracteristicas }
    };
    datosTasacion.comparables = JSON.parse(JSON.stringify(datosCompletos.comparables));
    resultadoTasacion = datosCompletos.resultado ? { ...datosCompletos.resultado } : null;
    
    // Establecer el paso actual
    pasoActual = datosCompletos.pasoActual || 2;
    tipoSeleccionado = datosCompletos.tipo;
}

function guardarTasacion() {

    // Guardar todos los datos actuales de los inputs
    guardarTodosLosDatos();

    // Formatear dirección antes de guardar
    if (datosTasacion.ubicacion && datosTasacion.ubicacion.direccion) {
        datosTasacion.ubicacion.direccion = formatearDireccion(
            datosTasacion.ubicacion.direccion
        );
    }

    let historial =
        (() => {

            try {

                return (
                    JSON.parse(
                        localStorage.getItem(
                            "historialTasaciones"
                        )
                    ) || []
                );

            } catch (e) {

                return [];
            }

        })();

    if (!Array.isArray(historial)) {

        historial = [];
    }

    // Verificar si ya existe una tasación con este ID (edición)
    const indiceExistente = historial.findIndex(t => t.id === tasacionId);
    
    const tasacionParaGuardar = {
        id: tasacionId,
        fechaCreacion: new Date(),
        estado: "completada",
        ...datosTasacion,
        // Guardar datos completos de todos los inputs
        datosCompletos: capturarDatosCompletos()
    };

    if (indiceExistente !== -1) {
        // Reemplazar la existente
        historial[indiceExistente] = tasacionParaGuardar;
    } else {
        // Agregar nueva
        historial.unshift(tasacionParaGuardar);
    }

    localStorage.setItem(
        "historialTasaciones",
        JSON.stringify(historial)
    );
}

inicializarComparablesModalListenersOnce();

inicializarDelegacionSeleccionTipo();

/* =========================
   CONFIRMACIÓN SALIR
========================= */

let navegacionPendiente = null;

/* =========================
   CONFIRMACIÓN CAMBIAR TIPO
========================= */

let tipoPendiente = null;
let cardPendiente = null;
let hostPendiente = null;

function mostrarConfirmacionCambiarTipo() {
    const modal = document.getElementById("confirmacionCambiarTipoModal");
    if (modal) {
        modal.classList.add("active");
    }
}

function ocultarConfirmacionCambiarTipo() {
    const modal = document.getElementById("confirmacionCambiarTipoModal");
    if (modal) {
        modal.classList.remove("active");
    }
    tipoPendiente = null;
    cardPendiente = null;
    hostPendiente = null;
}

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

function guardarBorrador() {

    // Guardar todos los datos actuales de los inputs
    guardarTodosLosDatos();

    let historial =

        (() => {

            try {

                return (

                    JSON.parse(

                        localStorage.getItem(

                            "historialTasaciones"

                        )

                    ) || []

                );

            } catch (e) {

                return [];

            }

        })();

    if (!Array.isArray(historial)) {

        historial = [];

    }

    // Verificar si ya existe una tasación con este ID (edición)
    const indiceExistente = historial.findIndex(t => t.id === tasacionId);
    
    const tasacionParaGuardar = {
        id: tasacionId,
        fechaCreacion: new Date(),
        estado: "borrador",
        ...datosTasacion,
        // Guardar datos completos de todos los inputs
        datosCompletos: capturarDatosCompletos()
    };

    if (indiceExistente !== -1) {
        // Reemplazar la existente
        historial[indiceExistente] = tasacionParaGuardar;
    } else {
        // Agregar nueva
        historial.unshift(tasacionParaGuardar);
    }

    localStorage.setItem(

        "historialTasaciones",

        JSON.stringify(historial)

    );

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

function inicializarConfirmacionCambiarTipo() {
    const btnCancelar = document.getElementById("btnCancelarCambiarTipo");
    const btnConfirmar = document.getElementById("btnConfirmarCambiarTipo");

    if (btnCancelar) {
        btnCancelar.addEventListener("click", (e) => {
            e.preventDefault();
            ocultarConfirmacionCambiarTipo();
        });
    }

    if (btnConfirmar) {
        btnConfirmar.addEventListener("click", (e) => {
            e.preventDefault();
            // Limpiar datos de pantallas posteriores
            limpiarDatosPantallasPosterioresSinVolver();
            // Aplicar el cambio de tipo
            if (cardPendiente && hostPendiente && tipoPendiente) {
                aplicarCambioTipo(cardPendiente, hostPendiente, tipoPendiente);
            }
            ocultarConfirmacionCambiarTipo();
        });
    }
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarConfirmacionSalir();
    inicializarConfirmacionCambiarTipo();
});
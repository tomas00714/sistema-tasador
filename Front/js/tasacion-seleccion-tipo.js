/* =========================
   TASACION SELECCION TIPO
   Lógica de selección de tipo de inmueble
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
    const scope = contenido || rootDelegacionSeleccionTipo();

    if (!scope) {
        return;
    }

    let botonesTipo = null;

    if (contenido) {
        botonesTipo = contenido.querySelectorAll("button.card-tipo");
    }

    if (!botonesTipo || botonesTipo.length === 0) {
        botonesTipo = scope.querySelectorAll(".tasacion-contenido button.card-tipo");
    }

    if (!botonesTipo || botonesTipo.length === 0) {
        botonesTipo = scope.querySelectorAll("button.card-tipo");
    }

    botonesTipo.forEach(btn => {
        const marcado = btn.dataset.tipo === datosTasacion.tipo;
        btn.classList.toggle("active", marcado);
        btn.classList.toggle("seleccionado", marcado);
    });
}

function resolverBotonTipoDesdeEvento(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : null;

    if (path && path.length) {
        for (let i = 0; i < path.length; i++) {
            const n = path[i];
            if (n && n.nodeType === Node.ELEMENT_NODE && typeof n.matches === "function" && n.matches("button.card-tipo")) {
                return n;
            }
        }
    }

    const raw = event.target;
    const origin = raw instanceof Element ? raw : raw && raw.parentElement;

    return origin && typeof origin.closest === "function" ? origin.closest("button.card-tipo") : null;
}

function hostFlujoSeleccionTipo(card) {
    const tarjetaHome = document.getElementById("tarjetaNuevaTasacion");
    if (tarjetaHome && tarjetaHome.contains(card)) {
        return tarjetaHome;
    }

    const panel = document.querySelector(".panel-principal");
    if (panel && panel.contains(card)) {
        return panel;
    }

    return null;
}

function aplicarSeleccionTipoInmueble(card, host) {
    const nuevoTipo = card.dataset.tipo;
    
    if (datosTasacion.tipo && datosTasacion.tipo !== nuevoTipo && hayDatosEnPantalla2Mas()) {
        tipoPendiente = nuevoTipo;
        cardPendiente = card;
        hostPendiente = host;
        mostrarConfirmacionCambiarTipo();
        return;
    }

    aplicarCambioTipo(card, host, nuevoTipo);
}

function aplicarCambioTipo(card, host, nuevoTipo) {
    console.log('[aplicarCambioTipo] START - nuevoTipo:', nuevoTipo);
    console.log('[aplicarCambioTipo] pasoActual antes:', pasoActual);
    console.log('[aplicarCambioTipo] datosTasacion.tipo antes:', datosTasacion.tipo);
    
    host.querySelectorAll("button.card-tipo").forEach(c => {
        c.classList.remove("active", "seleccionado");
    });

    card.classList.add("active", "seleccionado");

    tipoSeleccionado = nuevoTipo;
    datosTasacion.tipo = tipoSeleccionado;
    resultadoCalculado = false;

    console.log('[aplicarCambioTipo] tipoSeleccionado después:', tipoSeleccionado);
    console.log('[aplicarCambioTipo] datosTasacion.tipo después:', datosTasacion.tipo);

    actualizarIndicadoresProgreso();

    const btnSiguiente = getBtnSiguiente();
    if (btnSiguiente) {
        btnSiguiente.disabled = false;
        btnSiguiente.classList.add("activo");
    }
    
    console.log('[aplicarCambioTipo] END - pasoActual:', pasoActual);
}

function hayDatosEnPantalla2Mas() {
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
    
    if (pasoActual >= 2) {
        pasoActual = 1;
        actualizarIndicadoresProgreso();
        volverSeleccionTipo();
    }
}

function limpiarDatosPantallasPosterioresSinVolver() {
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
    if (document.documentElement.dataset.delegacionTipoGlobal === "1") {
        return;
    }

    document.documentElement.dataset.delegacionTipoGlobal = "1";

    agregarListenerSeguro(document, "click", event => {
        if (pasoActual !== 1) {
            return;
        }

        const card = resolverBotonTipoDesdeEvento(event);
        if (!card) {
            return;
        }

        const host = hostFlujoSeleccionTipo(card);
        if (!host) {
            return;
        }

        aplicarSeleccionTipoInmueble(card, host);
    }, true);
}

function volverSeleccionTipo() {
    pasoActual = 1;
    actualizarTextoBotonSiguiente();
    actualizarIndicadoresProgreso();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
        btnVolverPaso.disabled = true;
        btnVolverPaso.classList.add("btn-volver-paso--inicio");
    }

    const contenido = getContenidoTasacion();
    if (!contenido) {
        return;
    }

    contenido.innerHTML = `
        <div class="titulo-seccion">
            <h1>Selección tipo de inmueble</h1>
            <p>Elegí el tipo de propiedad que querés tasar.</p>
        </div>

        <div class="grid-tipos">
            <button class="card-tipo ${datosTasacion.tipo === "lote" ? "active seleccionado" : ""}" data-tipo="lote">
                <div class="card-tipo-icono">
                    <i class="fa-solid fa-map-pin"></i>
                </div>
                <div class="card-tipo-contenido">
                    <span class="card-tipo-nombre">Lote</span>
                    <span class="card-tipo-descripcion">Terreno sin construcción</span>
                </div>
            </button>

            <button class="card-tipo ${datosTasacion.tipo === "casa" ? "active seleccionado" : ""}" data-tipo="casa">
                <div class="card-tipo-icono">
                    <i class="fa-regular fa-house"></i>
                </div>
                <div class="card-tipo-contenido">
                    <span class="card-tipo-nombre">Casa</span>
                    <span class="card-tipo-descripcion">Vivienda unifamiliar</span>
                </div>
            </button>

            <button class="card-tipo ${datosTasacion.tipo === "departamento" ? "active seleccionado" : ""}" data-tipo="departamento">
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
    } else {
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

// Variables para confirmación de cambio de tipo
let tipoPendiente = null;
let cardPendiente = null;
let hostPendiente = null;

function mostrarConfirmacionCambiarTipo() {
    mostrarModalGenerico({
        titulo: "¿Cambiar tipo de inmueble?",
        mensaje: "Al cambiar el tipo de inmueble se borrarán todos los datos de las pantallas posteriores (ubicación, lote, comparables).",
        botones: [
            {
                texto: "Cancelar",
                clase: "btn-confirmacion-cancelar",
                onClick: () => {
                    ocultarModalGenerico();
                    tipoPendiente = null;
                    cardPendiente = null;
                    hostPendiente = null;
                }
            },
            {
                texto: "Continuar",
                clase: "btn-confirmacion-guardar",
                onClick: () => {
                    ocultarModalGenerico();
                    limpiarDatosTasacion();
                    if (cardPendiente && hostPendiente && tipoPendiente) {
                        aplicarCambioTipo(cardPendiente, hostPendiente, tipoPendiente);
                    }
                    tipoPendiente = null;
                    cardPendiente = null;
                    hostPendiente = null;
                }
            }
        ],
        cerrarAlClick: false
    });
}

inicializarDelegacionSeleccionTipo();

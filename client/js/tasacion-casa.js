/* =========================
   TASACION CASA
   Lógica específica para casas
========================= */

function mostrarFormularioCasa() {
    pasoActual = 2;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
        btnVolverPaso.disabled = false;
        btnVolverPaso.classList.remove("btn-volver-paso--inicio");
    }

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `
        <div class="titulo-seccion">
            <h1>Datos de la casa</h1>
        </div>

        <div class="form-grid">
            ${generarHTMLUbicacionConMapa({ incluirOrientacion: true, orientacion: datosTasacion.ubicacion.orientacion || "" })}
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Características</h3>
            <div class="form-grid-departamento">
                ${generarInputAmbientes({ value: datosTasacion.casa.ambientes })}

                ${generarInputDormitorios({ value: datosTasacion.casa.dormitorios, disabled: datosTasacion.casa.ambientes === 'Monoambiente' })}

                ${generarInputBanos({ value: datosTasacion.casa.banos })}

                <div class="input-group">
                    <label>Cochera</label>
                    <div class="switch-container-ascensor">
                        <label class="switch">
                            <input type="checkbox" id="cocheraSwitch" ${datosTasacion.casa.cochera ? "checked" : ""}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="input-group">
                    <label>Baulera</label>
                    <div class="switch-container-ascensor">
                        <label class="switch">
                            <input type="checkbox" id="bauleraSwitch" ${datosTasacion.casa.baulera ? "checked" : ""}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Servicios</h3>
            <div class="servicios-grid">
                ${generarHTMLServicios(datosTasacion.casa.servicios)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Infraestructura</h3>
            <div class="servicios-grid">
                ${generarHTMLInfraestructura(datosTasacion.casa.infraestructura)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Observaciones</h3>
            <div class="input-group">
                <textarea id="observacionesInput" placeholder="Escribe cualquier observación adicional..." rows="4">${datosTasacion.casa.observaciones || ""}</textarea>
            </div>
        </div>
    `;

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    cargarProvincias();

    // Si ya hay provincia seleccionada, cargar sus localidades
    if (datosTasacion.ubicacion.provincia) {
        cargarLocalidadesUI(datosTasacion.ubicacion.provincia);
    }

    requestAnimationFrame(() => {
        inicializarMapa();
        configurarBusquedaMapa();
        inicializarOrientacion();
        inicializarAmbientes('casa');
        inicializarDormitorios('casa');
        inicializarBanos('casa');
        inicializarSwitchCochera();
        inicializarSwitchBaulera();
        inicializarServicios();
        inicializarInfraestructura();
    });
}

function mostrarCaracteristicasCasa() {
    pasoActual = 3;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const contenido = getContenidoTasacion();
    contenido.innerHTML = `
        <div class="titulo-seccion">
            <h1>Características de la casa</h1>
        </div>

        <div class="form-grid-caracteristicas" id="caracteristicasCasaGrid">
            ${generarInputSuperficieCubierta({ inputId: 'superficieCubiertaInput', listId: 'superficieCubiertaList', coefInputId: 'superficieCubiertaCoef', label: 'Superficie cubierta', value: datosTasacion.casa.superficieCubierta, coefValue: datosTasacion.casa.superficieCubiertaCoef, claseInputGroup: 'input-2-3' })}

            ${generarInputCaracteristicaConstructiva({ inputId: 'caracteristicaConstructivaInput', listId: 'caracteristicaConstructivaList', coefInputId: 'caracteristicaConstructivaCoef', value: datosTasacion.casa.caracteristicaConstructiva, coefValue: datosTasacion.casa.caracteristicaConstructivaCoef, claseInputGroup: 'input-2-3' })}

            ${generarInputEstadoConservacion({ inputId: 'estadoConservacionInput', listId: 'estadoConservacionList', value: datosTasacion.casa.estadoConservacion, claseInputGroup: 'input-2-3' })}

            <div class="input-group input-2-3">
                <label>Antigüedad (años)</label>
                <input type="number" id="antiguedadInput" placeholder="Ingresar antigüedad" value="${datosTasacion.casa.antiguedad || ""}">
            </div>

            ${generarInputVidaUtil({ inputId: 'vidaUtilInput', value: datosTasacion.casa.vidaUtil, claseInputGroup: 'input-2-3' })}

            <div class="input-group input-2-3">
                <label>FOT</label>
                <input type="number" id="fotCasaInput" placeholder="Factor de ocupación total" step="0.01" min="0" value="${datosTasacion.casa.fot != null ? datosTasacion.casa.fot : ''}">
            </div>

            <div class="input-group input-2-3">
                <label>FOS</label>
                <input type="number" id="fosCasaInput" placeholder="Factor de ocupación de suelo" step="0.01" min="0" value="${datosTasacion.casa.fos != null ? datosTasacion.casa.fos : ''}">
            </div>

            <div class="input-group input-2-3">
                <label>Zonificación</label>
                <input type="text" id="zonificacionCasaInput" placeholder="Ej: Residencial R1" value="${datosTasacion.casa.zonificacion || ''}">
            </div>
        </div>
    `;

    ajustarDistribucionCaracteristicas('#caracteristicasCasaGrid');

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    requestAnimationFrame(() => {
        inicializarSuperficieCubierta('casa');
        inicializarEstadoConservacion('casa');
        inicializarAntiguedad('casa');
        inicializarCaracteristicaConstructiva('casa');
    });
}

function mostrarHomogeneizacionSuperficieCasa() {
    pasoActual = 4;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
        btnVolverPaso.disabled = false;
        btnVolverPaso.classList.remove("btn-volver-paso--inicio");
    }

    const contenido = getContenidoTasacion();
    contenido.innerHTML = generarHTMLHomogeneizacion('casa', datosTasacion.casa.homogeneizacion, '');

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarHomogeneizacionCasa();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}

function inicializarHomogeneizacionCasa() {
    inicializarHomogeneizacionSuperficie('casa', datosTasacion.casa.homogeneizacion, '');
    datosTasacion.casa.superficieHomogeneizada = datosTasacion.casa.homogeneizacion.totalHomogeneizada;
}

function calcularTotalesCasa() {
    calcularTotalesHomogeneizacion('casa', datosTasacion.casa.homogeneizacion, '');
    datosTasacion.casa.superficieHomogeneizada = datosTasacion.casa.homogeneizacion.totalHomogeneizada;
}

function guardarDatosHomogeneizacionCasa() {
    const total = guardarHomogeneizacionSuperficie('casa', datosTasacion.casa.homogeneizacion, '');
    if (total > 0) {
        datosTasacion.casa.superficieHomogeneizada = total;
    } else {
        // Fallback a la estimación por rango de superficie cubierta
        const homoStr = calcularSuperficieHomogeneizada();
        const homoNum = parseFloat(homoStr);
        if (!isNaN(homoNum)) {
            datosTasacion.casa.superficieHomogeneizada = homoNum;
        }
    }
}

function mostrarComparablesCasa() {
    // Use the same comparables screen as lote and departamento
    mostrarPantallaComparables();
}

function calcularYMostrarResultadoCasa() {
    // Ahora se usa el endpoint unificado /tasar
    return calcularYMostrarResultado();
}

/* =========================
   FUNCIONES DE INICIALIZACIÓN
========================= */

function inicializarSwitchCochera() {
    const switchInput = document.getElementById("cocheraSwitch");
    if (!switchInput) return;

    agregarListenerSeguro(switchInput, "change", () => {
        datosTasacion.casa.cochera = switchInput.checked;
    });
}

function inicializarSwitchBaulera() {
    const switchInput = document.getElementById("bauleraSwitch");
    if (!switchInput) return;

    agregarListenerSeguro(switchInput, "change", () => {
        datosTasacion.casa.baulera = switchInput.checked;
    });
}

function inicializarServicios() {
    if (!Array.isArray(datosTasacion.casa.servicios)) {
        datosTasacion.casa.servicios = [];
    }
    const checkboxes = document.querySelectorAll('.servicios-grid input[type="checkbox"][data-servicio]');
    checkboxes.forEach(checkbox => {
        agregarListenerSeguro(checkbox, "change", () => {
            const servicio = checkbox.dataset.servicio;
            if (servicio) {
                if (checkbox.checked) {
                    if (!datosTasacion.casa.servicios.includes(servicio)) {
                        datosTasacion.casa.servicios.push(servicio);
                    }
                } else {
                    datosTasacion.casa.servicios = datosTasacion.casa.servicios.filter(s => s !== servicio);
                }
            }
        });
    });
}

function inicializarInfraestructura() {
    if (!Array.isArray(datosTasacion.casa.infraestructura)) {
        datosTasacion.casa.infraestructura = [];
    }
    const checkboxes = document.querySelectorAll('.servicios-grid input[type="checkbox"][data-infraestructura]');
    checkboxes.forEach(checkbox => {
        agregarListenerSeguro(checkbox, "change", () => {
            const infra = checkbox.dataset.infraestructura;
            if (infra) {
                if (checkbox.checked) {
                    if (!datosTasacion.casa.infraestructura.includes(infra)) {
                        datosTasacion.casa.infraestructura.push(infra);
                    }
                } else {
                    datosTasacion.casa.infraestructura = datosTasacion.casa.infraestructura.filter(i => i !== infra);
                }
            }
        });
    });
}

function inicializarBotonAgregarComparable() {
    const btn = document.getElementById("btnAgregarComparable");
    if (!btn) return;

    agregarListenerSeguro(btn, "click", () => {
        abrirModalComparable('casa');
    });
}

function inicializarAccionesComparables() {
    const botones = document.querySelectorAll('[data-accion-comparable]');
    botones.forEach(boton => {
        agregarListenerSeguro(boton, "click", () => {
            const accion = boton.dataset.accionComparable;
            const id = boton.dataset.id;
            
            if (accion === 'ver') {
                verComparable(id);
            } else if (accion === 'eliminar') {
                eliminarComparable(id);
            }
        });
    });
}

/* =========================
   FUNCIONES DE CÁLCULO
========================= */

function calcularSuperficieHomogeneizada() {
    const superficieCubierta = datosTasacion.casa.superficieCubierta;
    const coeficiente = datosTasacion.casa.superficieCubiertaCoef || 1;

    if (!superficieCubierta) return "No calculable";

    const rango = superficieCubierta.match(/\d+/g);
    if (!rango) return "No calculable";

    const valorMedio = rango.reduce((sum, val) => sum + parseInt(val), 0) / rango.length;
    const resultado = valorMedio * coeficiente;

    return resultado.toFixed(2) + " m²";
}

// Cálculo demo eliminado: ahora todo pasa por el backend /tasar

/* =========================
   FUNCIONES DE GUARDADO
========================= */

function guardarDatosPantallaCasa() {
    // Campos de ubicacion (compartidos con todos los tipos)
    const direccionInput = document.getElementById("direccionInput");
    const provinciaInput = document.getElementById("provinciaInput");
    const localidadInput = document.getElementById("localidadInput");

    if (direccionInput) {
        datosTasacion.ubicacion.direccion = direccionInput.value;
    }
    if (provinciaInput) {
        datosTasacion.ubicacion.provincia = provinciaInput.value;
    }
    if (localidadInput) {
        datosTasacion.ubicacion.localidad = localidadInput.value;
    }

    if (marcador) {
        const posicion = marcador.getLatLng();
        datosTasacion.ubicacion.lat = posicion.lat;
        datosTasacion.ubicacion.lon = posicion.lng;
    }

    const orientacionInput = document.getElementById("orientacionInput");
    const ambientesInput = document.getElementById("ambientesInput");
    const dormitoriosInput = document.getElementById("dormitoriosInput");
    const banosInput = document.getElementById("banosInput");
    const cocheraSwitch = document.getElementById("cocheraSwitch");
    const bauleraSwitch = document.getElementById("bauleraSwitch");
    const observacionesInput = document.getElementById("observacionesInput");

    if (orientacionInput) {
        datosTasacion.ubicacion.orientacion = orientacionInput.value;
    }
    if (ambientesInput) {
        datosTasacion.casa.ambientes = ambientesInput.value;
    }
    if (dormitoriosInput) {
        datosTasacion.casa.dormitorios = dormitoriosInput.value;
    }
    if (banosInput) {
        datosTasacion.casa.banos = banosInput.value;
    }
    if (cocheraSwitch) {
        datosTasacion.casa.cochera = cocheraSwitch.checked;
    }
    if (bauleraSwitch) {
        datosTasacion.casa.baulera = bauleraSwitch.checked;
    }
    if (observacionesInput) {
        datosTasacion.casa.observaciones = observacionesInput.value;
    }

    // Guardar servicios
    const serviciosCheckboxes = document.querySelectorAll('.servicios-grid input[type="checkbox"][data-servicio]');
    datosTasacion.casa.servicios = [];
    serviciosCheckboxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.dataset.servicio) {
            datosTasacion.casa.servicios.push(checkbox.dataset.servicio);
        }
    });

    // Guardar infraestructura
    const infraCheckboxes = document.querySelectorAll('.servicios-grid input[type="checkbox"][data-infraestructura]');
    datosTasacion.casa.infraestructura = [];
    infraCheckboxes.forEach(checkbox => {
        if (checkbox.checked && checkbox.dataset.infraestructura) {
            datosTasacion.casa.infraestructura.push(checkbox.dataset.infraestructura);
        }
    });
}

function guardarDatosCaracteristicasCasa() {
    const superficieCubiertaInput = document.getElementById("superficieCubiertaInput");
    const superficieCubiertaCoef = document.getElementById("superficieCubiertaCoef");
    const estadoConservacionInput = document.getElementById("estadoConservacionInput");
    const antiguedadInput = document.getElementById("antiguedadInput");
    const caracteristicaConstructivaInput = document.getElementById("caracteristicaConstructivaInput");
    const caracteristicaConstructivaCoef = document.getElementById("caracteristicaConstructivaCoef");

    if (superficieCubiertaInput) {
        datosTasacion.casa.superficieCubierta = superficieCubiertaInput.value;
    }
    if (superficieCubiertaCoef) {
        datosTasacion.casa.superficieCubiertaCoef = parseFloat(superficieCubiertaCoef.value) || 1;
    }
    if (estadoConservacionInput) {
        datosTasacion.casa.estadoConservacion = estadoConservacionInput.value;
    }
    if (antiguedadInput) {
        datosTasacion.casa.antiguedad = antiguedadInput.value;
    }
    const vidaUtilInput = document.getElementById("vidaUtilInput");
    if (vidaUtilInput) {
        datosTasacion.casa.vidaUtil = vidaUtilInput.value || 80;
    }
    if (caracteristicaConstructivaInput) {
        datosTasacion.casa.caracteristicaConstructiva = caracteristicaConstructivaInput.value;
    }
    if (caracteristicaConstructivaCoef) {
        datosTasacion.casa.caracteristicaConstructivaCoef = parseFloat(caracteristicaConstructivaCoef.value) || 1;
    }

    const zonificacionCasaInput = document.getElementById("zonificacionCasaInput");
    const fotCasaInput = document.getElementById("fotCasaInput");
    const fosCasaInput = document.getElementById("fosCasaInput");

    if (zonificacionCasaInput) {
        datosTasacion.casa.zonificacion = zonificacionCasaInput.value || null;
    }
    if (fotCasaInput) {
        datosTasacion.casa.fot = fotCasaInput.value ? parseFloat(fotCasaInput.value) : null;
    }
    if (fosCasaInput) {
        datosTasacion.casa.fos = fosCasaInput.value ? parseFloat(fosCasaInput.value) : null;
    }
}




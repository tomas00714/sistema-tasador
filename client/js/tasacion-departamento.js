/* =========================
   TASACION DEPARTAMENTO
   Lógica específica para departamentos
========================= */

function mostrarFormularioDepartamento() {
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
            <h1>Datos del departamento</h1>
        </div>

        <div class="form-grid">
            ${generarHTMLUbicacionConMapa({ incluirOrientacion: true, orientacion: datosTasacion.ubicacion.orientacion || "" })}
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Características</h3>
            <div class="form-grid-departamento">
                ${generarInputAmbientes({ value: datosTasacion.departamento.ambientes })}

                ${generarInputDormitorios({ value: datosTasacion.departamento.dormitorios, disabled: datosTasacion.departamento.ambientes === 'Monoambiente' })}

                ${generarInputBanos({ value: datosTasacion.departamento.banos })}

                <div class="input-group">
                    <label>Cochera</label>
                    <div class="switch-container-ascensor">
                        <label class="switch">
                            <input type="checkbox" id="cocheraSwitch" ${datosTasacion.departamento.cochera ? "checked" : ""}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>

                <div class="input-group">
                    <label>Baulera</label>
                    <div class="switch-container-ascensor">
                        <label class="switch">
                            <input type="checkbox" id="bauleraSwitch" ${datosTasacion.departamento.baulera ? "checked" : ""}>
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
                ${generarHTMLServicios(datosTasacion.departamento.servicios)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Infraestructura</h3>
            <div class="servicios-grid">
                ${generarHTMLInfraestructura(datosTasacion.departamento.infraestructura)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Amenities</h3>
            <div class="servicios-grid">
                ${generarHTMLAmenities(datosTasacion.departamento.amenities)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div class="seccion-campos">
            <h3>Observaciones</h3>
            <div class="input-group">
                <textarea id="observacionesInput" placeholder="Escribe cualquier observación adicional..." rows="4">${datosTasacion.departamento.observaciones || ""}</textarea>
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
        inicializarAmbientes('departamento');
        inicializarDormitorios('departamento');
        inicializarBanos('departamento');
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
            <div class="columna-departamento">
                <div class="input-group input-2-3">
                    <label>Ubicación en planta</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="ubicacionPlantaInput" placeholder="Seleccionar ubicación" autocomplete="off" readonly value="${datosTasacion.departamento.ubicacionPlanta || ""}">
                                <div class="autocomplete-list" id="ubicacionPlantaList">
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>Frente</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>Contrafrente</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Patio interior</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="0.93" data-rango="0.93"><span>Lateral</span><span class="coef-display">0.93</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="ubicacionPlantaCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.departamento.ubicacionPlantaCoef || ""}">
                        </div>
                    </div>
                </div>

                <div class="input-group input-2-3">
                    <label>Ubicación en piso</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="ubicacionPisoInput" placeholder="Seleccionar piso" autocomplete="off" readonly value="${datosTasacion.departamento.ubicacionPiso || ""}">
                                <div class="autocomplete-list" id="ubicacionPisoList"></div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="ubicacionPisoCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.departamento.ubicacionPisoCoef || ""}">
                        </div>
                    </div>
                </div>

                ${generarInputCaracteristicaConstructiva({ inputId: 'caracteristicaConstructivaInput', listId: 'caracteristicaConstructivaList', coefInputId: 'caracteristicaConstructivaCoef', value: datosTasacion.departamento.caracteristicaConstructiva, coefValue: datosTasacion.departamento.caracteristicaConstructivaCoef, claseInputGroup: 'input-2-3' })}

                ${generarInputSuperficieCubierta({ inputId: 'superficieCubiertaInput', listId: 'superficieCubiertaList', coefInputId: 'superficieCubiertaCoef', label: 'Superficie cubierta propia', value: datosTasacion.departamento.superficieCubierta, coefValue: datosTasacion.departamento.superficieCubiertaCoef, claseInputGroup: 'input-2-3' })}

            </div>

            <div class="columna-departamento-centro">
                <div class="input-group input-2-3">
                    <label>Tiene ascensor</label>
                    <div class="switch-container-ascensor">
                        <label class="switch">
                            <input type="checkbox" id="tieneAscensorSwitch" ${datosTasacion.departamento.tieneAscensor === "si" || !datosTasacion.departamento.tieneAscensor ? "checked" : ""}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="columna-departamento">
                <div class="input-group input-2-3">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="antiguedadInput" placeholder="Ingresar antigüedad" value="${datosTasacion.departamento.antiguedad || ""}">
                </div>

                <div class="input-group input-2-3">
                    <label>Vida útil (años)</label>
                    <input type="number" id="vidaUtilInput" placeholder="80" min="1" value="${datosTasacion.departamento.vidaUtil || 80}">
                </div>

                ${generarInputEstadoConservacion({ inputId: 'estadoConservacionInput', listId: 'estadoConservacionList', value: datosTasacion.departamento.estadoConservacion, claseInputGroup: 'input-2-3' })}
            </div>
        </div>
    `;

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarUbicacionPlanta();
    inicializarSwitchAscensor();
    inicializarSuperficieCubierta('departamento');
    inicializarEstadoConservacion('departamento');
    inicializarCaracteristicaConstructiva();

    // Inicializar ubicación en piso después de que el switch de ascensor haya poblado la lista
    requestAnimationFrame(() => {
        inicializarUbicacionPiso();
    });

    const antiguedadInput = document.getElementById("antiguedadInput");
    if (antiguedadInput) {
        antiguedadInput.addEventListener("input", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.antiguedad = antiguedadInput.value;
            }
        });
    }

    const vidaUtilInput = document.getElementById("vidaUtilInput");
    if (vidaUtilInput) {
        vidaUtilInput.addEventListener("input", () => {
            if (typeof datosTasacion !== 'undefined' && datosTasacion.departamento) {
                datosTasacion.departamento.vidaUtil = vidaUtilInput.value;
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

    switchInput.addEventListener("change", () => {
        datosTasacion.departamento.tieneAscensor = switchInput.checked ? "si" : "no";
        actualizarListaPisos(switchInput.checked ? "si" : "no");

        // Re-inicializar event listeners de la lista después de actualizar el HTML
        inicializarUbicacionPiso();

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

    // Inicializar lista según el estado actual del switch (checked o no)
    const estadoInicial = switchInput.checked ? "si" : "no";
    datosTasacion.departamento.tieneAscensor = estadoInicial;
    actualizarListaPisos(estadoInicial);
    // Inicializar event listeners después de poblar la lista inicial
    inicializarUbicacionPiso();
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
    contenido.innerHTML = generarHTMLHomogeneizacion('departamento', datosTasacion.departamento.homogeneizacion, '');

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarHomogeneizacion();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}

function inicializarHomogeneizacion() {
    inicializarHomogeneizacionSuperficie('departamento', datosTasacion.departamento.homogeneizacion, '');
}

function calcularTotales() {
    calcularTotalesHomogeneizacion('departamento', datosTasacion.departamento.homogeneizacion, '');
}

function guardarDatosHomogeneizacion() {
    guardarHomogeneizacionSuperficie('departamento', datosTasacion.departamento.homogeneizacion, '');

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    console.log(datosTasacion);
}

function calcularYMostrarResultadoDepartamento() {
    // Ahora se usa el endpoint unificado /tasar
    return calcularYMostrarResultado();
}

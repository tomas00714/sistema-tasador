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

        <div style="margin-top: 32px;">
            <h3>Características</h3>
            <div class="form-grid-departamento">
                <div class="input-group">
                    <label>Ambientes</label>
                    <div class="autocomplete-container">
                        <input type="text" id="ambientesInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly value="${datosTasacion.departamento.ambientes || ""}">
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
                        <input type="text" id="dormitoriosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly value="${datosTasacion.departamento.dormitorios || ""}" ${datosTasacion.departamento.ambientes === "Monoambiente" ? "disabled" : ""}>
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
                        <input type="text" id="banosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly value="${datosTasacion.departamento.banos || ""}">
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
                <textarea id="observacionesInput" placeholder="Escribe cualquier observación adicional..." rows="4">${datosTasacion.departamento.observaciones || ""}</textarea>
            </div>
        </div>
    `;

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    cargarProvincias();

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

                <div class="input-group input-2-3">
                    <label>Característica constructiva</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="caracteristicaConstructivaInput" placeholder="Seleccionar característica" autocomplete="off" readonly value="${datosTasacion.departamento.caracteristicaConstructiva || ""}">
                                <div class="autocomplete-list" id="caracteristicaConstructivaList">
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Económica</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>Buena económica</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05-1.10"><span>Buena sin servicios</span><span class="coef-display">1.05-1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.15" data-rango="1.15-1.20"><span>Buena con servicios</span><span class="coef-display">1.15-1.20</span></div>
                                    <div class="autocomplete-item" data-coef="1.25" data-rango="1.25-1.30"><span>Muy buena</span><span class="coef-display">1.25-1.30</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="caracteristicaConstructivaCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.departamento.caracteristicaConstructivaCoef || ""}">
                        </div>
                    </div>
                </div>

                <div class="input-group input-2-3">
                    <label>Ubicación del edificio</label>
                    <input type="text" id="ubicacionEdificioInput" placeholder="Ingresar ubicación del edificio" value="${datosTasacion.departamento.ubicacionEdificio || ""}">
                </div>
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
                    <label>Superficie cubierta propia</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="superficieCubiertaInput" placeholder="Seleccionar rango" autocomplete="off" readonly value="${datosTasacion.departamento.superficieCubierta || ""}">
                                <div class="autocomplete-list" id="superficieCubiertaList">
                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10"><span>Hasta 30m²</span><span class="coef-display">1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05"><span>De 30 a 50m²</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>De 50 a 100m²</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>De 100 a 150m²</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Más de 150m²</span><span class="coef-display">0.90</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="superficieCubiertaCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.departamento.superficieCubiertaCoef || ""}">
                        </div>
                    </div>
                </div>

                <div class="input-group input-2-3">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="antiguedadInput" placeholder="Ingresar antigüedad" value="${datosTasacion.departamento.antiguedad || ""}">
                </div>

                <div class="input-group input-2-3">
                    <label>Estado de conservación</label>
                    <div class="autocomplete-container">
                        <input type="text" id="estadoConservacionInput" placeholder="Seleccionar estado" autocomplete="off" readonly value="${datosTasacion.departamento.estadoConservacion || ""}">
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
                        <td><input type="number" id="superficieCubierto" class="input-tabla" placeholder="Ej: 60" value="${datosTasacion.departamento.homogeneizacion.cubierto.superficie || ''}"></td>
                        <td>1</td>
                        <td><input type="number" id="homogeneizadaCubierto" class="input-tabla" value="${datosTasacion.departamento.homogeneizacion.cubierto.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr>
                        <td>Semicubierto</td>
                        <td><input type="number" id="superficieSemicubierto" class="input-tabla" placeholder="Ej: 8" value="${datosTasacion.departamento.homogeneizacion.semicubierto.superficie || ''}"></td>
                        <td>0.50</td>
                        <td><input type="number" id="homogeneizadaSemicubierto" class="input-tabla" value="${datosTasacion.departamento.homogeneizacion.semicubierto.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr>
                        <td>Balcón</td>
                        <td><input type="number" id="superficieBalcon" class="input-tabla" placeholder="Ej: 8" value="${datosTasacion.departamento.homogeneizacion.balcon.superficie || ''}"></td>
                        <td>0.30</td>
                        <td><input type="number" id="homogeneizadaBalcon" class="input-tabla" value="${datosTasacion.departamento.homogeneizacion.balcon.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr>
                        <td>Descubierta</td>
                        <td><input type="number" id="superficieDescubierta" class="input-tabla" placeholder="Ej: 10" value="${datosTasacion.departamento.homogeneizacion.descubierto.superficie || ''}"></td>
                        <td>0.20</td>
                        <td><input type="number" id="homogeneizadaDescubierta" class="input-tabla" value="${datosTasacion.departamento.homogeneizacion.descubierto.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr class="fila-total">
                        <td>Total</td>
                        <td><input type="number" id="totalSuperficie" class="input-tabla" value="${datosTasacion.departamento.homogeneizacion.totalSuperficie || 0}" disabled></td>
                        <td></td>
                        <td><input type="number" id="totalHomogeneizada" class="input-tabla" value="${datosTasacion.departamento.homogeneizacion.totalHomogeneizada || 0}" disabled></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarHomogeneizacion();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}

function inicializarHomogeneizacion() {
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

    calcularTotales();
}

function calcularTotales() {
    const hom = datosTasacion.departamento.homogeneizacion;

    const totalSuperficie = hom.cubierto.superficie + hom.semicubierto.superficie + hom.balcon.superficie + hom.descubierto.superficie;
    const totalHomogeneizada = hom.cubierto.homogeneizada + hom.semicubierto.homogeneizada + hom.balcon.homogeneizada + hom.descubierto.homogeneizada;

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

    hom.cubierto.homogeneizada = hom.cubierto.superficie * 1;
    hom.semicubierto.homogeneizada = hom.semicubierto.superficie * 0.50;
    hom.balcon.homogeneizada = hom.balcon.superficie * 0.30;
    hom.descubierto.homogeneizada = hom.descubierto.superficie * 0.20;

    hom.totalSuperficie = parseFloat(document.getElementById("totalSuperficie").value) || 0;
    hom.totalHomogeneizada = parseFloat(document.getElementById("totalHomogeneizada").value) || 0;

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    console.log(datosTasacion);
}

function calcularYMostrarResultadoDepartamento() {
    // Ahora se usa el endpoint unificado /tasar
    return calcularYMostrarResultado();
}

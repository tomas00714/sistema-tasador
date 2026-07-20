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

        <div style="margin-top: 32px;">
            <h3>Características</h3>
            <div class="form-grid-departamento">
                <div class="input-group">
                    <label>Ambientes</label>
                    <div class="autocomplete-container">
                        <input type="text" id="ambientesInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly value="${datosTasacion.casa.ambientes || ""}">
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
                        <input type="text" id="dormitoriosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly value="${datosTasacion.casa.dormitorios || ""}" ${datosTasacion.casa.ambientes === "Monoambiente" ? "disabled" : ""}>
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
                        <input type="text" id="banosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly value="${datosTasacion.casa.banos || ""}">
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

        <div style="margin-top: 32px;">
            <h3>Servicios</h3>
            <div class="servicios-grid">
                ${generarHTMLServicios(datosTasacion.casa.servicios)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top: 32px;">
            <h3>Infraestructura</h3>
            <div class="servicios-grid">
                ${generarHTMLInfraestructura(datosTasacion.casa.infraestructura)}
            </div>
        </div>

        <div class="separador-formulario"></div>

        <div style="margin-top: 32px;">
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

        <div class="form-grid-departamento">
            <div class="columna-departamento">
                <div class="input-group input-2-3">
                    <label>Superficie cubierta</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="superficieCubiertaInput" placeholder="Seleccionar rango" autocomplete="off" readonly value="${datosTasacion.casa.superficieCubierta || ""}">
                                <div class="autocomplete-list" id="superficieCubiertaList">
                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10"><span>Hasta 50 m²</span><span class="coef-display">1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05"><span>51-70 m²</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>71-90 m²</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>91-110 m²</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>111-130 m²</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="0.85" data-rango="0.85"><span>131-150 m²</span><span class="coef-display">0.85</span></div>
                                    <div class="autocomplete-item" data-coef="0.80" data-rango="0.80"><span>151-200 m²</span><span class="coef-display">0.80</span></div>
                                    <div class="autocomplete-item" data-coef="0.75" data-rango="0.75"><span>Más de 200 m²</span><span class="coef-display">0.75</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="superficieCubiertaCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.casa.superficieCubiertaCoef || ""}">
                        </div>
                    </div>
                </div>

                <div class="input-group input-2-3">
                    <label>Estado de conservación</label>
                    <div class="autocomplete-container">
                        <input type="text" id="estadoConservacionInput" placeholder="Seleccionar estado" autocomplete="off" readonly value="${datosTasacion.casa.estadoConservacion || ""}">
                        <div class="autocomplete-list" id="estadoConservacionList">
                            <div class="autocomplete-item" data-valor="1">1 - Nuevo o muy bueno</div>
                            <div class="autocomplete-item" data-valor="2">2 - Conservación normal</div>
                            <div class="autocomplete-item" data-valor="3">3 - Necesitado de reparaciones sencillas</div>
                            <div class="autocomplete-item" data-valor="4">4 - Necesitado de reparaciones importantes</div>
                            <div class="autocomplete-item" data-valor="5">5 - Estado de demolición</div>
                        </div>
                    </div>
                </div>

                <div class="input-group input-2-3">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="antiguedadInput" placeholder="Ingresar antigüedad" value="${datosTasacion.casa.antiguedad || ""}">
                </div>
            </div>

            <div class="columna-departamento">
                <div class="input-group input-2-3">
                    <label>Superficie total</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="superficieTotalInput" placeholder="Seleccionar rango" autocomplete="off" readonly value="${datosTasacion.casa.superficieTotal || ""}">
                                <div class="autocomplete-list" id="superficieTotalList">
                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10"><span>Hasta 50 m²</span><span class="coef-display">1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05"><span>51-70 m²</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>71-90 m²</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>91-110 m²</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>111-130 m²</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="0.85" data-rango="0.85"><span>131-150 m²</span><span class="coef-display">0.85</span></div>
                                    <div class="autocomplete-item" data-coef="0.80" data-rango="0.80"><span>151-200 m²</span><span class="coef-display">0.80</span></div>
                                    <div class="autocomplete-item" data-coef="0.75" data-rango="0.75"><span>Más de 200 m²</span><span class="coef-display">0.75</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="superficieTotalCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.casa.superficieTotalCoef || ""}">
                        </div>
                    </div>
                </div>

                <div class="input-group input-2-3">
                    <label>Calidad de construcción</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="calidadConstruccionInput" placeholder="Seleccionar calidad" autocomplete="off" readonly value="${datosTasacion.casa.calidadConstruccion || ""}">
                                <div class="autocomplete-list" id="calidadConstruccionList">
                                    <div class="autocomplete-item" data-coef="0.85" data-rango="0.85-0.95"><span>Económica</span><span class="coef-display">0.85</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95-1.05"><span>Standard</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>Media</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05-1.15"><span>Buena</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1.15" data-rango="1.15-1.25"><span>Alta</span><span class="coef-display">1.15</span></div>
                                    <div class="autocomplete-item" data-coef="1.25" data-rango="1.25-1.35"><span>Premium</span><span class="coef-display">1.25</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="calidadConstruccionCoef" placeholder="Coef" step="0.01" min="0" value="${datosTasacion.casa.calidadConstruccionCoef || ""}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    requestAnimationFrame(() => {
        inicializarSuperficieCubierta('casa');
        inicializarSuperficieTotal();
        inicializarEstadoConservacion('casa');
        inicializarAntiguedad('casa');
        inicializarCalidadConstruccion();
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

    const hom = datosTasacion.casa.homogeneizacion;
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
                        <td><input type="number" id="superficieCubierto" class="input-tabla" placeholder="Ej: 60" value="${hom.cubierto.superficie || ''}"></td>
                        <td>1</td>
                        <td><input type="number" id="homogeneizadaCubierto" class="input-tabla" value="${hom.cubierto.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr>
                        <td>Semicubierto</td>
                        <td><input type="number" id="superficieSemicubierto" class="input-tabla" placeholder="Ej: 8" value="${hom.semicubierto.superficie || ''}"></td>
                        <td>0.50</td>
                        <td><input type="number" id="homogeneizadaSemicubierto" class="input-tabla" value="${hom.semicubierto.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr>
                        <td>Balcón</td>
                        <td><input type="number" id="superficieBalcon" class="input-tabla" placeholder="Ej: 8" value="${hom.balcon.superficie || ''}"></td>
                        <td>0.30</td>
                        <td><input type="number" id="homogeneizadaBalcon" class="input-tabla" value="${hom.balcon.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr>
                        <td>Descubierta</td>
                        <td><input type="number" id="superficieDescubierta" class="input-tabla" placeholder="Ej: 10" value="${hom.descubierto.superficie || ''}"></td>
                        <td>0.20</td>
                        <td><input type="number" id="homogeneizadaDescubierta" class="input-tabla" value="${hom.descubierto.homogeneizada || 0}" disabled></td>
                    </tr>
                    <tr class="fila-total">
                        <td>Total</td>
                        <td><input type="number" id="totalSuperficie" class="input-tabla" value="${hom.totalSuperficie || 0}" disabled></td>
                        <td></td>
                        <td><input type="number" id="totalHomogeneizada" class="input-tabla" value="${hom.totalHomogeneizada || 0}" disabled></td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }

    inicializarHomogeneizacionCasa();

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
}

function inicializarHomogeneizacionCasa() {
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
                datosTasacion.casa.homogeneizacion[config.tipo].superficie = valor;
                datosTasacion.casa.homogeneizacion[config.tipo].homogeneizada = valor * config.coef;
                inputHomogeneizada.value = datosTasacion.casa.homogeneizacion[config.tipo].homogeneizada.toFixed(2);
                calcularTotalesCasa();
            });
        }
    });

    calcularTotalesCasa();
}

function calcularTotalesCasa() {
    const hom = datosTasacion.casa.homogeneizacion;

    const totalSuperficie = hom.cubierto.superficie + hom.semicubierto.superficie + hom.balcon.superficie + hom.descubierto.superficie;
    const totalHomogeneizada = hom.cubierto.homogeneizada + hom.semicubierto.homogeneizada + hom.balcon.homogeneizada + hom.descubierto.homogeneizada;

    hom.totalSuperficie = totalSuperficie;
    hom.totalHomogeneizada = totalHomogeneizada;
    datosTasacion.casa.superficieHomogeneizada = totalHomogeneizada;

    const inputTotalSuperficie = document.getElementById("totalSuperficie");
    const inputTotalHomogeneizada = document.getElementById("totalHomogeneizada");

    if (inputTotalSuperficie) {
        inputTotalSuperficie.value = totalSuperficie.toFixed(2);
    }

    if (inputTotalHomogeneizada) {
        inputTotalHomogeneizada.value = totalHomogeneizada.toFixed(2);
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
    const superficieTotalInput = document.getElementById("superficieTotalInput");
    const superficieTotalCoef = document.getElementById("superficieTotalCoef");
    const estadoConservacionInput = document.getElementById("estadoConservacionInput");
    const antiguedadInput = document.getElementById("antiguedadInput");
    const calidadConstruccionInput = document.getElementById("calidadConstruccionInput");
    const calidadConstruccionCoef = document.getElementById("calidadConstruccionCoef");

    if (superficieCubiertaInput) {
        datosTasacion.casa.superficieCubierta = superficieCubiertaInput.value;
    }
    if (superficieCubiertaCoef) {
        datosTasacion.casa.superficieCubiertaCoef = parseFloat(superficieCubiertaCoef.value) || 1;
    }
    if (superficieTotalInput) {
        datosTasacion.casa.superficieTotal = superficieTotalInput.value;
    }
    if (superficieTotalCoef) {
        datosTasacion.casa.superficieTotalCoef = parseFloat(superficieTotalCoef.value) || 1;
    }
    if (estadoConservacionInput) {
        datosTasacion.casa.estadoConservacion = estadoConservacionInput.value;
    }
    if (antiguedadInput) {
        datosTasacion.casa.antiguedad = antiguedadInput.value;
    }
    if (calidadConstruccionInput) {
        datosTasacion.casa.calidadConstruccion = calidadConstruccionInput.value;
    }
    if (calidadConstruccionCoef) {
        datosTasacion.casa.calidadConstruccionCoef = parseFloat(calidadConstruccionCoef.value) || 1;
    }
}


function guardarDatosHomogeneizacionCasa() {
    // La homogeneización de superficie para casa usa la tabla de tipos
    calcularTotalesCasa();
    const total = datosTasacion.casa.homogeneizacion.totalHomogeneizada;
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

/* =========================
   TASACION LOTE
   Lógica específica para lotes
========================= */

function mostrarFormularioLote() {
    console.log('[mostrarFormularioLote] START');
    pasoActual = 2;
    console.log('[mostrarFormularioLote] Set pasoActual to 2');
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
                <textarea id="observacionesLoteInput" placeholder="Escribe cualquier observación adicional..." rows="4">${datosTasacion.lote.observaciones || ""}</textarea>
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
        inicializarTipoLote();
    });

    setTimeout(() => {
        inicializarBotonesTasacion();
    }, 100);
    console.log('[mostrarFormularioLote] END');
}

function mostrarCaracteristicasLote() {
    pasoActual = 3;
    actualizarIndicadoresProgreso();
    actualizarTextoBotonSiguiente();
    actualizarEstadoBotonSiguiente();

    cerrarModalComparables();

    const tipo = datosTasacion.lote.tipoLote;
    let camposExtra = "";

    if (tipo === "Esquina" || tipo === "Esquina larga (+30m)") {
        camposExtra += `
            <div class="input-group">
                <label>Zona</label>
                <select id="zonaInput">
                    <option value="">Seleccionar zona</option>
                    <option value="1" ${datosTasacion.lote.caracteristicas.zona === "1" ? "selected" : ""}>Zona 1 — Centro comercial</option>
                    <option value="2" ${datosTasacion.lote.caracteristicas.zona === "2" ? "selected" : ""}>Zona 2 — Mixta</option>
                    <option value="3" ${datosTasacion.lote.caracteristicas.zona === "3" ? "selected" : ""}>Zona 3 — Residencial</option>
                    <option value="4" ${datosTasacion.lote.caracteristicas.zona === "4" ? "selected" : ""}>Zona 4 — Barrio en desarrollo</option>
                </select>
            </div>
        `;
    }

    if (tipo === "Irregular") {
        const contenido = getContenidoTasacion();
        contenido.innerHTML = `
            <div class="titulo-seccion">
                <h1>Características del lote</h1>
            </div>
            <div class="form-grid">
                <div class="form-left">
                    <div class="input-group">
                        <label>Frente</label>
                        <input type="number" id="frenteInput" value="${datosTasacion.lote.caracteristicas.frente || ""}">
                    </div>
                    <div class="input-group">
                        <label>Superficie</label>
                        <input type="number" id="superficieInput" value="${datosTasacion.lote.caracteristicas.superficie || ""}">
                    </div>
                    <div class="input-group">
                        <label>Fondo ficticio</label>
                        <input type="number" id="fondoFicticioInput" value="${datosTasacion.lote.caracteristicas.fondoFicticio || ""}">
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
            <h1>Características del lote</h1>
        </div>
        <div class="form-grid">
            <div class="form-left">
                <div class="input-group">
                    <label>Frente</label>
                    <input type="number" id="frenteInput" value="${datosTasacion.lote.caracteristicas.frente || ""}">
                </div>
                <div class="input-group">
                    <label>Fondo</label>
                    <input type="number" id="fondoInput" value="${datosTasacion.lote.caracteristicas.fondo || ""}">
                </div>
                <div class="input-group">
                    <label>Superficie</label>
                    <input type="number" id="superficieInput" value="${datosTasacion.lote.caracteristicas.superficie || ""}">
                </div>
                ${camposExtra}
                <div class="input-group">
                    <label>Orientación</label>
                    <div class="autocomplete-container">
                        <input type="text" id="orientacionLoteInput" placeholder="Seleccionar orientación" autocomplete="off" readonly value="${datosTasacion.ubicacion.orientacion || ""}">
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
            ${tipo === "Esquina" || tipo === "Esquina larga (+30m)" || tipo === "Salida a dos calles" ? `
            <div class="form-right">
                <div class="input-group">
                    <label>Calle principal</label>
                    <input type="text" id="callePrincipalInput" value="${datosTasacion.ubicacion.direccion || ""}" readonly disabled>
                </div>
                <div class="input-group">
                    <label>Calle secundaria</label>
                    <input type="text" id="segundaCalleInput" value="${datosTasacion.lote.caracteristicas.segundaCalle || ""}">
                </div>
                <div class="input-group">
                    <label>¿Qué lado corresponde a la calle de MAYOR valor?</label>
                    <select id="ladoMayorValorInput">
                        <option value="frente" ${datosTasacion.lote.caracteristicas.ladoMayorValor === "frente" || !datosTasacion.lote.caracteristicas.ladoMayorValor ? "selected" : ""}>Frente</option>
                        <option value="fondo" ${datosTasacion.lote.caracteristicas.ladoMayorValor === "fondo" ? "selected" : ""}>Fondo</option>
                    </select>
                </div>
            </div>
            ` : ""}
        </div>
    `;

    inicializarCalculosLote();
    inicializarOrientacionLote();

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        btnVolverPaso.style.display = "block";
    }

    if (typeof actualizarEstadoBotonSiguiente === 'function') {
        actualizarEstadoBotonSiguiente();
    }
}

function inicializarCalculosLote() {
    const frenteInput = document.getElementById("frenteInput");
    const fondoInput = document.getElementById("fondoInput");
    const superficieInput = document.getElementById("superficieInput");
    const fondoFicticioInput = document.getElementById("fondoFicticioInput");

    function calcularSuperficie() {
        if (!frenteInput || !fondoInput || !superficieInput) return;
        const frente = parseFloat(frenteInput.value) || 0;
        const fondo = parseFloat(fondoInput.value) || 0;
        if (frente > 0 && fondo > 0) {
            superficieInput.value = (frente * fondo).toFixed(2);
        }
    }

    function calcularFondoFicticio() {
        if (!frenteInput || !superficieInput || !fondoFicticioInput) return;
        const frente = parseFloat(frenteInput.value) || 0;
        const superficie = parseFloat(superficieInput.value) || 0;
        if (frente > 0 && superficie > 0) {
            fondoFicticioInput.value = (superficie / frente).toFixed(2);
        }
    }

    frenteInput?.addEventListener("input", () => {
        calcularSuperficie();
        calcularFondoFicticio();
        if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
            if (!datosTasacion.lote.caracteristicas) {
                datosTasacion.lote.caracteristicas = {};
            }
            datosTasacion.lote.caracteristicas.frente = frenteInput.value;
        }
        if (typeof actualizarEstadoBotonSiguiente === 'function') {
            actualizarEstadoBotonSiguiente();
        }
    });

    fondoInput?.addEventListener("input", () => {
        calcularSuperficie();
        if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
            if (!datosTasacion.lote.caracteristicas) {
                datosTasacion.lote.caracteristicas = {};
            }
            datosTasacion.lote.caracteristicas.fondo = fondoInput.value;
        }
        if (typeof actualizarEstadoBotonSiguiente === 'function') {
            actualizarEstadoBotonSiguiente();
        }
    });

    superficieInput?.addEventListener("input", () => {
        calcularFondoFicticio();
        if (typeof datosTasacion !== 'undefined' && datosTasacion.lote) {
            if (!datosTasacion.lote.caracteristicas) {
                datosTasacion.lote.caracteristicas = {};
            }
            datosTasacion.lote.caracteristicas.superficie = superficieInput.value;
        }
        if (typeof actualizarEstadoBotonSiguiente === 'function') {
            actualizarEstadoBotonSiguiente();
        }
    });

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

// Las funciones calcularYMostrarResultado, armarPayloadTasacion, mostrarMenuOpcionesComparable
// e inicializarBotonesQuitarComparable ahora están centralizadas en tasacion-resultado.js y
// tasacion-comparables.js para usar el endpoint unificado /tasar.

/* =========================
   COMPARABLE FORMULARIO
   Generador de formularios para cargar comparables
========================= */

// Variables globales para el mapa y marcador
let comparableMapa = null;
let comparableMarcador = null;

// Configurar iconos de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

/**
 * Obtiene el objeto de homogeneización de los datos de edición del comparable
 * @param {string} tipoInmueble - 'departamento' o 'casa'
 * @param {Object} datosEdicion - Datos del comparable a editar
 * @returns {Object} Objeto homogeneización
 */
function obtenerDatosEdicionHomogeneizacion(tipoInmueble, datosEdicion = null) {
    if (!datosEdicion) return {};
    const inmueble = datosEdicion[tipoInmueble] || datosEdicion.inmueble || {};
    return inmueble.homogeneizacion || datosEdicion.homogeneizacion || {};
}

/**
 * Genera el HTML del formulario para un tipo de inmueble específico
 * @param {string} tipoInmueble - 'lote', 'departamento', 'casa'
 * @returns {string} HTML del formulario
 */
function generarFormularioComparable(tipoInmueble, datosEdicion = null) {
    let secciones = '';
    
    // Campos comunes a todos los tipos
    const seccionUbicacion = generarSeccionUbicacion(tipoInmueble);
    
    // Campos específicos por tipo
    let seccionCaracteristicas = '';
    if (tipoInmueble === 'lote') {
        seccionCaracteristicas = generarSeccionCaracteristicasLote();
    } else if (tipoInmueble === 'departamento') {
        seccionCaracteristicas = generarSeccionCaracteristicasDepartamento();
    } else if (tipoInmueble === 'casa') {
        seccionCaracteristicas = generarSeccionCaracteristicasCasa();
    }
    
    // Homogeneización de superficie (departamento y casa)
    let seccionHomogeneizacion = '';
    if (tipoInmueble === 'departamento' || tipoInmueble === 'casa') {
        const homData = obtenerDatosEdicionHomogeneizacion(tipoInmueble, datosEdicion);
        seccionHomogeneizacion = generarSeccionHomogeneizacionModal(tipoInmueble, homData, 'compForm-');
    }
    
    // Sección de fuente (común a todos)
    const seccionFuente = generarSeccionFuente();
    
    // Sección de valor (común a todos)
    const seccionValor = generarSeccionValor();
    
    secciones += seccionUbicacion;
    secciones += seccionCaracteristicas;
    secciones += seccionHomogeneizacion;
    secciones += seccionFuente;
    secciones += seccionValor;
    
    return secciones;
}

/**
 * Genera la sección de ubicación (común a todos los tipos)
 * @param {string} tipoInmueble - Tipo de inmueble
 * @returns {string} HTML de la sección
 */
function generarSeccionUbicacion(tipoInmueble) {
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>Ubicación</h3>
            </div>
            <div class="comparable-form-grid-2-columnas">
                <div class="comparable-form-columna-izq">
                    <div class="input-group">
                        <label>Dirección</label>
                        <input type="text" id="compFormDireccionInput" placeholder="Escribí la dirección" autocomplete="off">
                    </div>
                    <div class="input-group">
                        <label>Provincia</label>
                        <div class="autocomplete-container">
                            <input type="text" id="compFormProvinciaInput" placeholder="Escribí una provincia" autocomplete="off">
                            <div id="compFormProvinciaList" class="autocomplete-list"></div>
                        </div>
                    </div>
                    <div class="input-group">
                        <label>Localidad</label>
                        <div class="autocomplete-container">
                            <input type="text" id="compFormLocalidadInput" placeholder="Seleccionar provincia primero" autocomplete="off" disabled>
                            <div id="compFormLocalidadList" class="autocomplete-list"></div>
                        </div>
                    </div>
                    ${tipoInmueble === 'lote' ? `
                    ${generarInputTipoLote({ inputId: 'compFormTipoLoteInput', listId: 'compFormTipoLoteList' })}
                    ` : ''}
                </div>
                <div class="comparable-form-columna-der">
                    <div class="comparable-form-mapa">
                        <div id="compFormMapa" class="mapa-placeholder"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera la sección de características para lote
 * @returns {string} HTML de la sección
 */
function generarSeccionCaracteristicasLote() {
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>Características</h3>
            </div>
            <div class="comparable-form-grid-caracteristicas-lote">
                <div class="input-group">
                    <label>Frente (m)</label>
                    <input type="number" id="compFormFrenteInput" placeholder="0" step="0.01" min="0">
                </div>
                <div class="input-group">
                    <label>Fondo (m)</label>
                    <input type="number" id="compFormFondoInput" placeholder="0" step="0.01" min="0">
                </div>
                <div class="input-group">
                    <label>Superficie (m²)</label>
                    <input type="number" id="compFormSuperficieInput" placeholder="0" step="0.01" min="0">
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera la sección de características para departamento reutilizando los mismos inputs de tasación
 * @returns {string} HTML de la sección
 */
function generarSeccionCaracteristicasDepartamento() {
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>Características</h3>
            </div>
            <div class="comparable-form-grid-2-columnas">
                <div class="input-group">
                    <label>Superficie total (m²)</label>
                    <input type="number" id="compFormSuperficieInput" placeholder="0" step="0.01" min="0">
                </div>
                ${generarInputSuperficieCubierta({ inputId: 'compFormSuperficieCubiertaInput', listId: 'compFormSuperficieCubiertaList', coefInputId: 'compFormSuperficieCubiertaCoef', label: 'Superficie cubierta propia' })}
                ${generarInputUbicacionPlanta({ inputId: 'compFormUbicacionPlantaInput', listId: 'compFormUbicacionPlantaList', coefInputId: 'compFormUbicacionPlantaCoef' })}
                <div class="input-group">
                    <label>Ubicación en piso</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormUbicacionPisoInput" placeholder="Seleccionar piso" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormUbicacionPisoList"></div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormUbicacionPisoCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                ${generarInputCaracteristicaConstructiva({ inputId: 'compFormCaracteristicaConstructivaInput', listId: 'compFormCaracteristicaConstructivaList', coefInputId: 'compFormCaracteristicaConstructivaCoef' })}
                <div class="input-group">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="compFormAntiguedadInput" placeholder="0" min="0" step="1">
                </div>
                ${generarInputVidaUtil({ inputId: 'compFormVidaUtilInput', label: 'Vida útil (años)' })}
                ${generarInputEstadoConservacion({ inputId: 'compFormEstadoConservacionInput', listId: 'compFormEstadoConservacionList' })}
                ${generarInputAmbientes({ inputId: 'compFormAmbientesInput', listId: 'compFormAmbientesList' })}

                ${generarInputDormitorios({ inputId: 'compFormDormitoriosInput', listId: 'compFormDormitoriosList' })}

                ${generarInputBanos({ inputId: 'compFormBanosInput', listId: 'compFormBanosList' })}
                <div class="input-group">
                    <label>Cochera</label>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="compFormCocheraInput">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Ascensor</label>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="compFormTieneAscensorInput" checked>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera la sección de características para casa reutilizando los mismos inputs de tasación
 * @returns {string} HTML de la sección
 */
function generarSeccionCaracteristicasCasa() {
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>Características</h3>
            </div>
            <div class="comparable-form-grid-2-columnas">
                <div class="input-group">
                    <label>Superficie cubierta (m²)</label>
                    <input type="number" id="compFormSuperficieInput" placeholder="0" step="0.01" min="0">
                </div>
                <div class="input-group">
                    <label>Superficie terreno (m²)</label>
                    <input type="number" id="compFormSuperficieTerrenoInput" placeholder="0" step="0.01" min="0">
                </div>
                ${generarInputSuperficieCubierta({ inputId: 'compFormSuperficieCubiertaInput', listId: 'compFormSuperficieCubiertaList', coefInputId: 'compFormSuperficieCubiertaCoef', label: 'Superficie cubierta (rango)' })}
                <div class="input-group">
                    <label>Superficie total (rango)</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormSuperficieTotalInput" placeholder="Seleccionar rango" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormSuperficieTotalList">
                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10"><span>Hasta 100 m²</span><span class="coef-display">1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05"><span>100-200 m²</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>200-300 m²</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>300-500 m²</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Más de 500 m²</span><span class="coef-display">0.90</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormSuperficieTotalCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                ${generarInputCaracteristicaConstructiva({ inputId: 'compFormCaracteristicaConstructivaInput', listId: 'compFormCaracteristicaConstructivaList', coefInputId: 'compFormCaracteristicaConstructivaCoef' })}
                <div class="input-group">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="compFormAntiguedadInput" placeholder="0" min="0" step="1">
                </div>
                ${generarInputVidaUtil({ inputId: 'compFormVidaUtilInput', label: 'Vida útil (años)' })}
                ${generarInputEstadoConservacion({ inputId: 'compFormEstadoConservacionInput', listId: 'compFormEstadoConservacionList' })}
                ${generarInputAmbientes({ inputId: 'compFormAmbientesInput', listId: 'compFormAmbientesList' })}

                ${generarInputDormitorios({ inputId: 'compFormDormitoriosInput', listId: 'compFormDormitoriosList' })}

                ${generarInputBanos({ inputId: 'compFormBanosInput', listId: 'compFormBanosList' })}
                <div class="input-group">
                    <label>Cochera</label>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="compFormCocheraInput">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Pileta</label>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="compFormTienePiletaInput">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                <div class="input-group">
                    <label>Jardín</label>
                    <div class="switch-container">
                        <label class="switch">
                            <input type="checkbox" id="compFormTieneJardinInput">
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera la sección de valor (común a todos los tipos)
 * @returns {string} HTML de la sección
 */
function generarSeccionValor() {
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>Valor</h3>
            </div>
            <div class="comparable-form-grid-valor">
                <div class="input-group">
                    <label>Valor total (USD)</label>
                    <input type="number" id="compFormValorInput" placeholder="0" step="1" min="0">
                </div>
                <div class="input-group">
                    <label>Tipo de valor</label>
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="compFormTipoValor" value="venta" checked>
                            <span>Venta</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="compFormTipoValor" value="oferta">
                            <span>Oferta</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera la secci\u00f3n de fuente (com\u00fan a todos los tipos)
 * @returns {string} HTML de la secci\u00f3n
 */
function generarSeccionFuente() {
    return `
        <div class="comparable-form-seccion">
            <div class="comparable-form-seccion-titulo">
                <h3>Fuente</h3>
            </div>
            <div class="comparable-form-grid-valor">
                <div class="input-group">
                    <label>Origen de la informaci\u00f3n</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormFuenteInput" placeholder="Seleccionar fuente" autocomplete="off" readonly>
                        <div id="compFormFuenteList" class="autocomplete-list">
                            <div class="autocomplete-item">Propia</div>
                            <div class="autocomplete-item">Inmobiliaria</div>
                            <div class="autocomplete-item">Particular</div>
                            <div class="autocomplete-item">Otro</div>
                        </div>
                    </div>
                </div>
                <div class="input-group" id="compFormFuenteDetalleGroup" style="display: none;">
                    <label>Nombre de la inmobiliaria</label>
                    <input type="text" id="compFormFuenteDetalleInput" placeholder="Nombre de la inmobiliaria" autocomplete="off">
                </div>
            </div>
        </div>
    `;
}

/**
 * Inicializa el formulario de comparable
 * @param {string} tipoInmueble - Tipo de inmueble
 * @param {Object} opciones - Opciones de configuración
 */
async function inicializarFormularioComparable(tipoInmueble, opciones = {}) {
    const datos = opciones.datos || null;
    const latInicial = datos?.ubicacion?.lat ?? null;
    const lonInicial = datos?.ubicacion?.lon ?? null;

    // Inicializar autocomplete de provincia
    inicializarAutocompleteProvinciaComparable();

    // Inicializar autocomplete de localidad
    inicializarAutocompleteLocalidadComparable();

    // Inicializar mapa centrado en la ubicación del comparable, si la hay
    await inicializarMapaComparable(latInicial, lonInicial);

    // Configurar búsqueda del mapa
    configurarBusquedaMapaComparable();

    // Inicializar características específicas por tipo
    if (tipoInmueble === 'lote') {
        inicializarCaracteristicasLote();
    } else if (tipoInmueble === 'departamento') {
        inicializarCaracteristicasDepartamento();
    } else if (tipoInmueble === 'casa') {
        inicializarCaracteristicasCasa();
    }

    // Inicializar homogeneización de superficie (departamento y casa)
    if (tipoInmueble === 'departamento' || tipoInmueble === 'casa') {
        const homData = obtenerDatosEdicionHomogeneizacion(tipoInmueble, datos);
        inicializarHomogeneizacionSuperficie(tipoInmueble, homData, 'compForm-');
    }

    // Inicializar campo fuente
    inicializarFuenteComparable();

    // Rellenar datos si es edición
    if (datos) {
        await cargarDatosEnFormularioComparable(datos);
    }
}

async function cargarDatosEnFormularioComparable(datos) {
    if (!datos) return;

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
    };
    const setChecked = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
    };

    const ubicacion = datos.ubicacion || {};
    setVal('compFormDireccionInput', ubicacion.direccion);
    setVal('compFormProvinciaInput', ubicacion.provincia);

    if (ubicacion.provincia) {
        await cargarLocalidadesComparable(ubicacion.provincia);
    }
    setVal('compFormLocalidadInput', ubicacion.localidad);

    const valor = (typeof datos.valor === 'object' && datos.valor !== null) ? datos.valor.monto : datos.valor;
    setVal('compFormValorInput', valor);

    const tipoValor = datos.tipoValor || (typeof datos.valor === 'object' ? datos.valor?.tipo : null) || 'venta';
    const radioTipoValor = document.querySelector(`input[name="compFormTipoValor"][value="${tipoValor}"]`);
    if (radioTipoValor) radioTipoValor.checked = true;

    const fuenteTipo = datos.fuenteInformacion?.tipo ?? datos.fuente ?? '';
    // Convertir a título para mostrar en el autocomplete (primera letra mayúscula)
    const fuenteTipoDisplay = fuenteTipo.charAt(0).toUpperCase() + fuenteTipo.slice(1).toLowerCase();
    setVal('compFormFuenteInput', fuenteTipoDisplay);
    setVal('compFormFuenteDetalleInput', datos.fuenteInformacion?.detalle ?? datos.fuenteDetalle ?? '');
    document.getElementById('compFormFuenteInput')?.dispatchEvent(new Event('change'));

    const tipo = datos.tipoInmueble || datos.tipo;

    if (tipo === 'lote') {
        const lote = datos.lote || {};
        const car = lote.caracteristicas || {};
        const tipoLote = datos.tipoLote ?? lote.tipoLote;
        const esIrregular = tipoLote === 'Irregular';
        setVal('compFormTipoLoteInput', tipoLote);
        setVal('compFormFrenteInput', datos.frente ?? car.frente);
        setVal('compFormFondoInput', esIrregular ? (datos.superficie ?? car.superficie) : (datos.fondo ?? car.fondo));
        setVal('compFormSuperficieInput', esIrregular ? (datos.fondo ?? car.fondo) : (datos.superficie ?? car.superficie));
        actualizarLabelsMedidasLoteForm(tipoLote ?? '');
    } else if (tipo === 'departamento') {
        const depto = datos.departamento || {};
        setVal('compFormSuperficieInput', datos.superficie ?? depto.superficie ?? depto.superficieTotal);
        setVal('compFormAntiguedadInput', datos.antiguedad ?? depto.antiguedad);
        setVal('compFormVidaUtilInput', datos.vidaUtil || depto.vidaUtil || 80);
        setVal('compFormEstadoConservacionInput', datos.estadoConservacion ?? depto.estadoConservacion);
        setVal('compFormAmbientesInput', datos.ambientes ?? depto.ambientes);
        setVal('compFormDormitoriosInput', datos.dormitorios ?? depto.dormitorios);
        setVal('compFormBanosInput', datos.banos ?? depto.banos);
        setChecked('compFormCocheraInput', datos.cochera ?? depto.cochera ?? false);
        setVal('compFormSuperficieTotalInput', datos.superficieTotal ?? depto.superficieTotal);
        setVal('compFormSuperficieTotalCoef', datos.superficieTotalCoef ?? depto.superficieTotalCoef ?? 1);
        setVal('compFormSuperficieCubiertaInput', datos.superficieCubierta ?? depto.superficieCubierta);
        setVal('compFormSuperficieCubiertaCoef', datos.superficieCubiertaCoef ?? depto.superficieCubiertaCoef ?? 1);
        setVal('compFormUbicacionPlantaInput', datos.ubicacionPlanta ?? depto.ubicacionPlanta);
        setVal('compFormUbicacionPlantaCoef', datos.ubicacionPlantaCoef ?? depto.ubicacionPlantaCoef ?? 1);
        setVal('compFormUbicacionPisoInput', datos.ubicacionPiso ?? depto.ubicacionPiso);
        setVal('compFormUbicacionPisoCoef', datos.ubicacionPisoCoef ?? depto.ubicacionPisoCoef ?? 1);
        setVal('compFormCaracteristicaConstructivaInput', datos.caracteristicaConstructiva ?? depto.caracteristicaConstructiva);
        setVal('compFormCaracteristicaConstructivaCoef', datos.caracteristicaConstructivaCoef ?? depto.caracteristicaConstructivaCoef ?? 1);
        setChecked('compFormTieneAscensorInput', datos.tieneAscensor ?? depto.tieneAscensor ?? false);
    } else if (tipo === 'casa') {
        const casa = datos.casa || {};
        setVal('compFormSuperficieInput', datos.superficie ?? casa.superficie);
        setVal('compFormSuperficieTerrenoInput', datos.superficieTerreno ?? casa.superficieTerreno);
        setVal('compFormAntiguedadInput', datos.antiguedad ?? casa.antiguedad);
        setVal('compFormVidaUtilInput', datos.vidaUtil || casa.vidaUtil || 80);
        setVal('compFormEstadoConservacionInput', datos.estadoConservacion ?? casa.estadoConservacion);
        setVal('compFormAmbientesInput', datos.ambientes ?? casa.ambientes);
        setVal('compFormDormitoriosInput', datos.dormitorios ?? casa.dormitorios);
        setVal('compFormBanosInput', datos.banos ?? casa.banos);
        setChecked('compFormCocheraInput', datos.cochera ?? casa.cochera ?? false);
        setVal('compFormSuperficieCubiertaInput', datos.superficieCubierta ?? casa.superficieCubiertaTexto ?? casa.superficieCubierta);
        setVal('compFormSuperficieCubiertaCoef', datos.superficieCubiertaCoef ?? casa.superficieCubiertaCoef ?? 1);
        setVal('compFormSuperficieTotalInput', datos.superficieTotal ?? casa.superficieTotalTexto ?? casa.superficieTotal);
        setVal('compFormSuperficieTotalCoef', datos.superficieTotalCoef ?? casa.superficieTotalCoef ?? 1);
        setVal('compFormCaracteristicaConstructivaInput', datos.caracteristicaConstructiva ?? casa.caracteristicaConstructiva);
        setVal('compFormCaracteristicaConstructivaCoef', datos.caracteristicaConstructivaCoef ?? casa.caracteristicaConstructivaCoef ?? 1);
        setChecked('compFormTienePiletaInput', datos.tienePileta ?? casa.tienePileta ?? false);
        setChecked('compFormTieneJardinInput', datos.tieneJardin ?? casa.tieneJardin ?? false);
    }

    if (comparableMarcador && comparableMapa && ubicacion.lat != null && ubicacion.lon != null) {
        comparableMarcador.setLatLng([ubicacion.lat, ubicacion.lon]);
        comparableMapa.setView([ubicacion.lat, ubicacion.lon], 15);
    }
}

/**
 * Inicializa el campo fuente y su detalle condicional
 */
function inicializarFuenteComparable() {
    const input = document.getElementById("compFormFuenteInput");
    const list = document.getElementById("compFormFuenteList");
    const detalleGroup = document.getElementById("compFormFuenteDetalleGroup");
    const detalleInput = document.getElementById("compFormFuenteDetalleInput");

    if (!input || !list || !detalleGroup || !detalleInput) return;

    const items = list.querySelectorAll(".autocomplete-item");

    input.addEventListener("click", () => {
        list.style.display = "block";
    });

    items.forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent.trim();
            list.style.display = "none";
            input.dispatchEvent(new Event("input"));
            input.dispatchEvent(new Event("change"));
        });
    });

    const cerrar = e => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    };

    document.addEventListener("click", cerrar);

    const actualizarVisibilidad = () => {
        const valor = input.value.toLowerCase();
        const esInmobiliaria = valor === 'inmobiliaria';
        detalleGroup.style.display = esInmobiliaria ? 'block' : 'none';
        if (!esInmobiliaria) detalleInput.value = '';
    };

    input.addEventListener("change", actualizarVisibilidad);
    actualizarVisibilidad();
}

/**
 * Inicializa el autocomplete de provincia para el formulario de comparable
 */
function inicializarAutocompleteProvinciaComparable() {
    const input = document.getElementById("compFormProvinciaInput");
    const list = document.getElementById("compFormProvinciaList");
    
    if (!input || !list) return;
    
    function renderLista(filtro = "") {
        list.innerHTML = "";
        const filtradas = filtrarProvincias(filtro);
        
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
                input.dispatchEvent(new Event("input"));
                cargarLocalidadesComparable(provincia.nombre);
            });
            list.appendChild(item);
        });
        
        list.style.display = "block";
    }
    
    input.addEventListener("focus", () => renderLista());
    input.addEventListener("input", () => {
        renderLista(input.value);
        
        // Auto-select if there's an exact match (case-insensitive, sin acentos)
        const valorInput = input.value.trim();
        if (valorInput) {
            const match = buscarProvincia(valorInput);
            if (match) {
                input.value = match.nombre;
                list.style.display = "none";
                cargarLocalidadesComparable(match.nombre);
            }
        }
    });
    
    const cerrar = e => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    };
    
    document.addEventListener("click", cerrar);
}

/**
 * Inicializa el autocomplete de localidad para el formulario de comparable
 */
function inicializarAutocompleteLocalidadComparable() {
    const input = document.getElementById("compFormLocalidadInput");
    const list = document.getElementById("compFormLocalidadList");
    
    if (!input || !list) return;
    
    function renderLista(filtro = "") {
        list.innerHTML = "";
        const filtradas = filtrarLocalidades(filtro, 30);
        
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
                input.dispatchEvent(new Event("input"));
            });
            list.appendChild(item);
        });
        
        list.style.display = "block";
    }
    
    input.addEventListener("focus", () => {
        if (!input.disabled) renderLista();
    });
    
    input.addEventListener("input", () => {
        if (!input.disabled) {
            renderLista(input.value);

            // Auto-select if there's an exact match (case-insensitive, sin acentos)
            const valorInput = input.value.trim();
            if (valorInput) {
                const match = buscarLocalidad(valorInput);
                if (match) {
                    input.value = match.nombre;
                    list.style.display = "none";
                }
            }
        }
    });

    const cerrar = e => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    };

    document.addEventListener("click", cerrar);
}

/**
 * Carga las localidades para el formulario de comparable
 */
async function cargarLocalidadesComparable(provinciaNombre) {
    const input = document.getElementById("compFormLocalidadInput");
    const list = document.getElementById("compFormLocalidadList");
    
    if (!input || !list) return;
    
    input.disabled = true;
    input.placeholder = "Cargando localidades...";
    list.style.display = "none";
    
    try {
        await cargarLocalidades(provinciaNombre);
        
        input.disabled = false;
        input.placeholder = "Escribí una localidad";
        input.value = "";
        
    } catch (e) {
        console.error(e);
        input.disabled = false;
        input.placeholder = "Error al cargar localidades";
    }
}

/**
 * Inicializa el tipo de lote para el formulario de comparable
 */
function inicializarTipoLoteComparable() {
    const input = document.getElementById("compFormTipoLoteInput");
    const list = document.getElementById("compFormTipoLoteList");
    
    if (!input || !list) return;
    
    const items = list.querySelectorAll(".autocomplete-item");
    
    input.addEventListener("click", () => {
        list.style.display = "block";
    });
    
    items.forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent.trim();
            list.style.display = "none";
            input.dispatchEvent(new Event("input"));
            actualizarLabelsMedidasLoteForm(item.textContent.trim());
        });
    });
    
    const cerrar = e => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    };
    
    document.addEventListener("click", cerrar);
}

function actualizarLabelsMedidasLoteForm(tipoLote) {
    const fondoInput = document.getElementById('compFormFondoInput');
    const superficieInput = document.getElementById('compFormSuperficieInput');
    if (!fondoInput || !superficieInput) return;

    const esIrregular = tipoLote === 'Irregular';
    const fondoLabel = fondoInput.previousElementSibling;
    const superficieLabel = superficieInput.previousElementSibling;
    if (!fondoLabel || !superficieLabel) return;

    if (esIrregular) {
        fondoLabel.textContent = 'Superficie (m²)';
        superficieLabel.textContent = 'Fondo ficticio (m)';
    } else {
        fondoLabel.textContent = 'Fondo (m)';
        superficieLabel.textContent = 'Superficie (m²)';
    }
}

/**
 * Inicializa el mapa para el formulario de comparable
 */
async function inicializarMapaComparable(latInicial = null, lonInicial = null) {
    const mapaContainer = document.getElementById("compFormMapa");
    if (!mapaContainer) return;

    let zoomInicial = 15;

    if (latInicial == null || lonInicial == null) {
        latInicial = -34.6037;
        lonInicial = -58.3816;
        zoomInicial = 13;

        const ubicacionUsuario = await obtenerUbicacionUsuario();
        if (ubicacionUsuario) {
            latInicial = ubicacionUsuario.lat;
            lonInicial = ubicacionUsuario.lon;
            zoomInicial = 12;
        }
    }

    // Inicializar mapa Leaflet
    if (typeof L !== 'undefined') {
        comparableMapa = L.map('compFormMapa').setView([latInicial, lonInicial], zoomInicial);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(comparableMapa);
        
        // Agregar marcador draggable
        comparableMarcador = L.marker([latInicial, lonInicial], {
            draggable: true
        }).addTo(comparableMapa);

        comparableMapa.on('click', (e) => {
            comparableMarcador.setLatLng(e.latlng);
        });
        
        // Event listener cuando se mueve el marcador
        comparableMarcador.on('dragend', function(e) {
            const position = e.target.getLatLng();
            console.log('Marcador movido a:', position.lat, position.lng);
            // Aquí se podría actualizar la dirección inversa si se desea
        });
        
        // Guardar referencia al mapa
        mapaContainer._mapa = comparableMapa;
    }
}

/**
 * Configura la búsqueda del mapa para el formulario de comparable
 */
function configurarBusquedaMapaComparable() {
    const direccionInput = document.getElementById("compFormDireccionInput");
    const provinciaInput = document.getElementById("compFormProvinciaInput");
    const localidadInput = document.getElementById("compFormLocalidadInput");
    
    if (!direccionInput || !provinciaInput || !localidadInput) return;
    
    const buscarConDelay = debounce(() => {
        actualizarMapaComparable();
    }, 1200);
    
    agregarListenerSeguro(direccionInput, "input", buscarConDelay);
    agregarListenerSeguro(provinciaInput, "change", buscarConDelay);
    agregarListenerSeguro(localidadInput, "change", buscarConDelay);
}

/**
 * Actualiza el mapa con la dirección ingresada
 */
async function actualizarMapaComparable() {
    const direccion = document.getElementById("compFormDireccionInput")?.value;
    const provincia = document.getElementById("compFormProvinciaInput")?.value;
    const localidad = document.getElementById("compFormLocalidadInput")?.value;
    const mapaContainer = document.getElementById("compFormMapa");
    
    if (!direccion || !provincia || !localidad) return;
    
    const resultado = await geocodificarConFallback(direccion, localidad, provincia, 'Argentina');
    
    if (!resultado) {
        mostrarMensajeMapa(mapaContainer, 'No se pudo ubicar la dirección en el mapa.');
        return;
    }
    
    const { lat, lon, exacto, query } = resultado;
    
    if (!exacto) {
        mostrarMensajeMapa(mapaContainer, `No se encontró la dirección exacta. Mostrando: ${query}`);
    }
    
    if (comparableMapa && comparableMarcador) {
        comparableMapa.setView([lat, lon], exacto ? 15 : 12);
        comparableMarcador.setLatLng([lat, lon]);
    }
}

/**
 * Inicializa los cálculos automáticos para lote
 */
function inicializarCalculosLoteComparable() {
    const frenteInput = document.getElementById("compFormFrenteInput");
    const fondoInput = document.getElementById("compFormFondoInput");
    const superficieInput = document.getElementById("compFormSuperficieInput");
    const tipoInput = document.getElementById("compFormTipoLoteInput");
    
    if (!frenteInput || !fondoInput || !superficieInput || !tipoInput) return;
    
    function calcular() {
        const esIrregular = tipoInput.value.trim() === 'Irregular';
        const frente = parseFloat(frenteInput.value) || 0;
        const otro = parseFloat(fondoInput.value) || 0;

        if (frente > 0 && otro > 0) {
            if (esIrregular) {
                // fondoInput contiene la superficie; superficieInput es el fondo ficticio
                superficieInput.value = (otro / frente).toFixed(2);
            } else {
                superficieInput.value = (frente * otro).toFixed(2);
            }
            superficieInput.dispatchEvent(new Event("input"));
        }
    }
    
    frenteInput.addEventListener("input", calcular);
    fondoInput.addEventListener("input", calcular);
}

/**
 * Obtiene los datos del formulario de comparable
 * @param {string} tipoInmueble - Tipo de inmueble
 * @returns {Object} Datos del formulario
 */
function obtenerDatosFormularioComparable(tipoInmueble) {
    const direccion = document.getElementById("compFormDireccionInput")?.value.trim() || "";
    const provincia = document.getElementById("compFormProvinciaInput")?.value.trim() || "";
    const localidad = document.getElementById("compFormLocalidadInput")?.value.trim() || "";
    const valor = parseFloat(document.getElementById("compFormValorInput")?.value) || 0;
    const tipoValor = document.querySelector('input[name="compFormTipoValor"]:checked')?.value || "venta";
    const fuenteTipo = document.getElementById("compFormFuenteInput")?.value.toLowerCase() || "";
    const fuenteDetalle = fuenteTipo === 'inmobiliaria'
        ? (document.getElementById("compFormFuenteDetalleInput")?.value.trim() || "")
        : "";
    
    // Coordenadas del marcador o valores por defecto
    let lat = 0;
    let lon = 0;
    if (comparableMarcador && comparableMarcador.getLatLng) {
        const pos = comparableMarcador.getLatLng();
        lat = pos?.lat ?? 0;
        lon = pos?.lng ?? 0;
    }
    
    const datos = {
        tipoInmueble,
        ubicacion: {
            direccion,
            provincia,
            localidad,
            lat,
            lon
        },
        valor,
        tipoValor,
        fuenteInformacion: fuenteTipo
            ? { tipo: fuenteTipo, detalle: fuenteDetalle }
            : null
    };
    
    if (tipoInmueble === 'lote') {
        datos.tipoLote = document.getElementById("compFormTipoLoteInput")?.value.trim() || "";
        const esIrregular = datos.tipoLote === 'Irregular';
        const frente = parseFloat(document.getElementById("compFormFrenteInput")?.value) || 0;
        const fondoInput = parseFloat(document.getElementById("compFormFondoInput")?.value) || 0;
        const superficieInput = parseFloat(document.getElementById("compFormSuperficieInput")?.value) || 0;
        datos.frente = frente;
        datos.fondo = esIrregular ? superficieInput : fondoInput;
        datos.superficie = esIrregular ? fondoInput : superficieInput;
        datos.lote = {
            tipoLote: datos.tipoLote,
            caracteristicas: {
                frente: datos.frente,
                fondo: datos.fondo,
                superficie: datos.superficie
            }
        };
    } else if (tipoInmueble === 'departamento' || tipoInmueble === 'casa') {
        const superficie = parseFloat(document.getElementById("compFormSuperficieInput")?.value) || 0;
        const antiguedad = parseInt(document.getElementById("compFormAntiguedadInput")?.value) || 0;
        const vidaUtil = parseInt(document.getElementById("compFormVidaUtilInput")?.value) || 80;
        const estadoConservacion = document.getElementById("compFormEstadoConservacionInput")?.value || "";
        const ambientes = document.getElementById("compFormAmbientesInput")?.value || "";
        const dormitorios = document.getElementById("compFormDormitoriosInput")?.value || "";
        const banos = document.getElementById("compFormBanosInput")?.value || "";
        const cochera = document.getElementById("compFormCocheraInput")?.checked || false;

        datos.superficie = superficie;
        datos.antiguedad = antiguedad;
        datos.vidaUtil = vidaUtil;
        datos.estadoConservacion = estadoConservacion;
        datos.ambientes = ambientes ? ambientes : null;
        datos.dormitorios = dormitorios ? dormitorios : null;
        datos.banos = banos ? banos : null;
        datos.cochera = cochera;

        // Crear estructura departamento para consistencia con lotes
        datos.departamento = {
            superficie: superficie,
            antiguedad: antiguedad,
            vidaUtil: vidaUtil,
            estadoConservacion: estadoConservacion,
            ambientes: datos.ambientes,
            dormitorios: datos.dormitorios,
            banos: datos.banos,
            cochera: cochera
        };

        if (tipoInmueble === 'departamento') {
            datos.superficieTotal = superficie;
            datos.tieneAscensor = document.getElementById("compFormTieneAscensorInput")?.checked || false;
            datos.ubicacionPlanta = document.getElementById("compFormUbicacionPlantaInput")?.value || "";
            datos.ubicacionPlantaCoef = parseFloat(document.getElementById("compFormUbicacionPlantaCoef")?.value) || 1;
            datos.ubicacionPiso = document.getElementById("compFormUbicacionPisoInput")?.value || "";
            datos.ubicacionPisoCoef = parseFloat(document.getElementById("compFormUbicacionPisoCoef")?.value) || 1;
            datos.caracteristicaConstructiva = document.getElementById("compFormCaracteristicaConstructivaInput")?.value || "";
            datos.caracteristicaConstructivaCoef = parseFloat(document.getElementById("compFormCaracteristicaConstructivaCoef")?.value) || 1;
            datos.superficieCubierta = document.getElementById("compFormSuperficieCubiertaInput")?.value || "";
            datos.superficieCubiertaCoef = parseFloat(document.getElementById("compFormSuperficieCubiertaCoef")?.value) || 1;
            datos.departamento = {
                superficie: superficie,
                superficieTotal: superficie,
                superficieCubierta: datos.superficieCubierta,
                superficieCubiertaCoef: datos.superficieCubiertaCoef,
                antiguedad: antiguedad,
                vidaUtil: vidaUtil,
                estadoConservacion: estadoConservacion,
                ambientes: datos.ambientes,
                dormitorios: datos.dormitorios,
                banos: datos.banos,
                cochera: cochera,
                tieneAscensor: datos.tieneAscensor,
                ubicacionPlanta: datos.ubicacionPlanta,
                ubicacionPlantaCoef: datos.ubicacionPlantaCoef,
                ubicacionPiso: datos.ubicacionPiso,
                ubicacionPisoCoef: datos.ubicacionPisoCoef,
                caracteristicaConstructiva: datos.caracteristicaConstructiva,
                caracteristicaConstructivaCoef: datos.caracteristicaConstructivaCoef
            };
        } else {
            const superficieTerreno = parseFloat(document.getElementById("compFormSuperficieTerrenoInput")?.value) || 0;
            datos.superficieCubierta = document.getElementById("compFormSuperficieCubiertaInput")?.value || "";
            datos.superficieCubiertaCoef = parseFloat(document.getElementById("compFormSuperficieCubiertaCoef")?.value) || 1;
            datos.superficieTotal = document.getElementById("compFormSuperficieTotalInput")?.value || "";
            datos.superficieTotalCoef = parseFloat(document.getElementById("compFormSuperficieTotalCoef")?.value) || 1;
            datos.caracteristicaConstructiva = document.getElementById("compFormCaracteristicaConstructivaInput")?.value || "";
            datos.caracteristicaConstructivaCoef = parseFloat(document.getElementById("compFormCaracteristicaConstructivaCoef")?.value) || 1;
            datos.superficieTerreno = superficieTerreno;
            datos.tienePileta = document.getElementById("compFormTienePiletaInput")?.checked || false;
            datos.tieneJardin = document.getElementById("compFormTieneJardinInput")?.checked || false;
            datos.casa = {
                superficie: superficie,
                superficieCubierta: superficie,
                superficieCubiertaTexto: datos.superficieCubierta,
                superficieCubiertaCoef: datos.superficieCubiertaCoef,
                superficieTotal: superficie,
                superficieTotalTexto: datos.superficieTotal,
                superficieTotalCoef: datos.superficieTotalCoef,
                superficieTerreno: superficieTerreno,
                antiguedad: antiguedad,
                vidaUtil: vidaUtil,
                estadoConservacion: estadoConservacion,
                ambientes: datos.ambientes,
                dormitorios: datos.dormitorios,
                banos: datos.banos,
                cochera: cochera,
                tienePileta: datos.tienePileta,
                tieneJardin: datos.tieneJardin,
                caracteristicaConstructiva: datos.caracteristicaConstructiva,
                caracteristicaConstructivaCoef: datos.caracteristicaConstructivaCoef
            };
        }
    }

    // Homogeneización de superficie (departamento y casa)
    if (tipoInmueble === 'departamento' || tipoInmueble === 'casa') {
        const homData = {};
        const total = guardarHomogeneizacionSuperficie(tipoInmueble, homData, 'compForm-');
        datos.homogeneizacion = homData;
        datos.superficieHomogeneizada = total;
        if (tipoInmueble === 'departamento') {
            datos.departamento.homogeneizacion = homData;
            datos.departamento.superficieHomogeneizada = total;
        } else if (tipoInmueble === 'casa') {
            datos.casa.homogeneizacion = homData;
            datos.casa.superficieHomogeneizada = total;
        }
    }

    // El formulario devuelve la estructura original.
    // La normalización a { inmueble: ... } se realiza únicamente
    // en los flujos de renderizado y reporte.
    return datos;
}

/**
 * Valida los datos del formulario de comparable
 * @param {string} tipoInmueble - Tipo de inmueble
 * @returns {Object} { valido: boolean, errores: string[] }
 */
function validarFormularioComparable(tipoInmueble) {
    const errores = [];
    const datos = obtenerDatosFormularioComparable(tipoInmueble);

    // Validaciones comunes
    if (!datos.ubicacion.direccion) {
        errores.push("La dirección es requerida");
    }
    if (!datos.ubicacion.provincia) {
        errores.push("La provincia es requerida");
    }
    if (!datos.ubicacion.localidad) {
        errores.push("La localidad es requerida");
    }
    if (datos.valor <= 0) {
        errores.push("El valor debe ser mayor a 0");
    }

    // Validaciones específicas por tipo
    if (tipoInmueble === 'lote') {
        if (!datos.tipoLote) {
            errores.push("El tipo de lote es requerido");
        }
        if (datos.frente <= 0) {
            errores.push("El frente debe ser mayor a 0");
        }
        if (datos.tipoLote === 'Irregular' && datos.fondo <= 0) {
            errores.push("El fondo ficticio debe ser mayor a 0");
        }
    }

    if (tipoInmueble === 'lote' || tipoInmueble === 'departamento' || tipoInmueble === 'casa') {
        if (datos.superficie <= 0) {
            errores.push("La superficie debe ser mayor a 0");
        }
    }

    return {
        valido: errores.length === 0,
        errores
    };
}

/* =========================
   INICIALIZACIÓN COMPARTIDA DE CARACTERÍSTICAS (reutiliza inputs de tasación)
========================= */

/**
 * Inicializa un autocomplete simple en el formulario de comparable
 */
function inicializarAutocompleteCompForm(inputId, listId, opciones = {}) {
    if (typeof inicializarAutocomplete !== 'function') {
        console.warn('inicializarAutocomplete no está disponible');
        return;
    }
    inicializarAutocomplete(inputId, listId, opciones);
}

/**
 * Inicializa un autocomplete con input de coeficiente en el formulario de comparable
 */
function inicializarAutocompleteConCoeficienteCompForm(inputId, listId, coefInputId, opciones = {}) {
    const input = document.getElementById(inputId);
    const coefInput = document.getElementById(coefInputId);
    if (!input) return;

    let coeficienteSeleccionado = 1;
    let rangoSeleccionado = null;

    inicializarAutocompleteCompForm(inputId, listId, {
        onSelect: (item, input) => {
            const textSpan = item.querySelector('span:first-child');
            const coefSpan = item.querySelector('.coef-display');

            input.value = textSpan ? textSpan.textContent : item.textContent;
            if (coefInput && coefSpan) {
                // Si el coeficiente tiene rango (ej: "1.05-1.10"), usar el valor más chico
                const coefText = coefSpan.textContent;
                if (coefText.includes('-')) {
                    const rangoValores = coefText.split('-').map(v => parseFloat(v.trim()));
                    if (rangoValores.length === 2 && !isNaN(rangoValores[0])) {
                        coefInput.value = rangoValores[0]; // Usar el valor más chico
                    } else {
                        coefInput.value = coefText;
                    }
                } else {
                    coefInput.value = coefText;
                }
            }

            coeficienteSeleccionado = parseFloat(item.dataset.coef) || 1;
            rangoSeleccionado = item.dataset.rango || null;

            if (opciones.onSelect) {
                opciones.onSelect(item, input, coeficienteSeleccionado);
            }
        }
    });

    if (coefInput) {
        coefInput.addEventListener('input', () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor) && typeof validarRangoCoeficiente === 'function') {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });
        coefInput.addEventListener('focus', () => {
            const valor = parseFloat(coefInput.value);
            if (!isNaN(valor) && typeof validarRangoCoeficiente === 'function') {
                validarRangoCoeficiente(coefInput, valor, coeficienteSeleccionado, rangoSeleccionado);
            }
        });
        coefInput.addEventListener('blur', () => {
            coefInput.classList.remove('fuera-de-rango');
        });
    }
}

/**
 * Inicializa las características del lote en el formulario de comparable
 */
function inicializarCaracteristicasLote() {
    inicializarTipoLoteComparable();
    inicializarCalculosLoteComparable();
}

/**
 * Actualiza la lista de pisos para el comparable de departamento
 */
function actualizarListaPisosCompForm(tieneAscensor) {
    const list = document.getElementById('compFormUbicacionPisoList');
    if (!list) return;

    const opciones = (tieneAscensor === 'si' || tieneAscensor === true || tieneAscensor === 'true')
        ? OPCIONES_UBICACION_PISO_CON_ASCENSOR
        : OPCIONES_UBICACION_PISO_SIN_ASCENSOR;

    list.innerHTML = opciones.map(op => `
        <div class="autocomplete-item" data-coef="${op.coef}">
            <span>${op.texto}</span>
            <span class="coef-display">${op.coef}</span>
        </div>
    `).join('');
}

/**
 * Inicializa la ubicación en piso para el comparable de departamento
 */
function inicializarUbicacionPisoCompForm() {
    inicializarAutocompleteConCoeficienteCompForm('compFormUbicacionPisoInput', 'compFormUbicacionPisoList', 'compFormUbicacionPisoCoef');
}

/**
 * Inicializa las características del departamento en el formulario de comparable
 */
function inicializarCaracteristicasDepartamento() {
    // Autocompletes con coeficiente
    inicializarAutocompleteConCoeficienteCompForm('compFormUbicacionPlantaInput', 'compFormUbicacionPlantaList', 'compFormUbicacionPlantaCoef');
    inicializarAutocompleteConCoeficienteCompForm('compFormCaracteristicaConstructivaInput', 'compFormCaracteristicaConstructivaList', 'compFormCaracteristicaConstructivaCoef');
    inicializarAutocompleteConCoeficienteCompForm('compFormSuperficieCubiertaInput', 'compFormSuperficieCubiertaList', 'compFormSuperficieCubiertaCoef');

    // Autocompletes simples
    inicializarAutocompleteCompForm('compFormEstadoConservacionInput', 'compFormEstadoConservacionList');
    inicializarAutocompleteCompForm('compFormBanosInput', 'compFormBanosList');
    inicializarAutocompleteCompForm('compFormDormitoriosInput', 'compFormDormitoriosList');
    inicializarAutocompleteCompForm('compFormAmbientesInput', 'compFormAmbientesList', {
        onSelect: (item, input) => {
            const dormitoriosInput = document.getElementById('compFormDormitoriosInput');
            if (dormitoriosInput) {
                if (item.textContent.trim() === 'Monoambiente') {
                    dormitoriosInput.value = '';
                    dormitoriosInput.disabled = true;
                } else {
                    dormitoriosInput.disabled = false;
                }
            }
        }
    });

    const compFormAmbientesInput = document.getElementById('compFormAmbientesInput');
    const compFormDormitoriosInput = document.getElementById('compFormDormitoriosInput');
    if (compFormAmbientesInput && compFormDormitoriosInput && compFormAmbientesInput.value === 'Monoambiente') {
        compFormDormitoriosInput.value = '';
        compFormDormitoriosInput.disabled = true;
    }

    // Switch de ascensor: actualiza lista de pisos y reinicia ubicación en piso
    const ascensorSwitch = document.getElementById('compFormTieneAscensorInput');
    if (ascensorSwitch) {
        const actualizar = () => {
            const estado = ascensorSwitch.checked ? 'si' : 'no';
            actualizarListaPisosCompForm(estado);
            const pisoInput = document.getElementById('compFormUbicacionPisoInput');
            const pisoCoef = document.getElementById('compFormUbicacionPisoCoef');
            if (pisoInput) pisoInput.value = '';
            if (pisoCoef) pisoCoef.value = '';
            inicializarUbicacionPisoCompForm();
        };
        ascensorSwitch.addEventListener('change', actualizar);
        actualizar();
    } else {
        actualizarListaPisosCompForm('si');
        inicializarUbicacionPisoCompForm();
    }
}

/**
 * Inicializa las características de la casa en el formulario de comparable
 */
function inicializarCaracteristicasCasa() {
    // Autocompletes con coeficiente
    inicializarAutocompleteConCoeficienteCompForm('compFormSuperficieCubiertaInput', 'compFormSuperficieCubiertaList', 'compFormSuperficieCubiertaCoef');
    inicializarAutocompleteConCoeficienteCompForm('compFormSuperficieTotalInput', 'compFormSuperficieTotalList', 'compFormSuperficieTotalCoef');
    inicializarAutocompleteConCoeficienteCompForm('compFormCaracteristicaConstructivaInput', 'compFormCaracteristicaConstructivaList', 'compFormCaracteristicaConstructivaCoef');

    // Autocompletes simples
    inicializarAutocompleteCompForm('compFormEstadoConservacionInput', 'compFormEstadoConservacionList');
    inicializarAutocompleteCompForm('compFormBanosInput', 'compFormBanosList');
    inicializarAutocompleteCompForm('compFormDormitoriosInput', 'compFormDormitoriosList');
    inicializarAutocompleteCompForm('compFormAmbientesInput', 'compFormAmbientesList', {
        onSelect: (item, input) => {
            const dormitoriosInput = document.getElementById('compFormDormitoriosInput');
            if (dormitoriosInput) {
                if (item.textContent.trim() === 'Monoambiente') {
                    dormitoriosInput.value = '';
                    dormitoriosInput.disabled = true;
                } else {
                    dormitoriosInput.disabled = false;
                }
            }
        }
    });

    const compFormAmbientesInput = document.getElementById('compFormAmbientesInput');
    const compFormDormitoriosInput = document.getElementById('compFormDormitoriosInput');
    if (compFormAmbientesInput && compFormDormitoriosInput && compFormAmbientesInput.value === 'Monoambiente') {
        compFormDormitoriosInput.value = '';
        compFormDormitoriosInput.disabled = true;
    }
}

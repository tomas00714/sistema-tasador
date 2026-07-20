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
 * Genera el HTML del formulario para un tipo de inmueble específico
 * @param {string} tipoInmueble - 'lote', 'departamento', 'casa'
 * @returns {string} HTML del formulario
 */
function generarFormularioComparable(tipoInmueble) {
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
    
    // Sección de valor (común a todos)
    const seccionValor = generarSeccionValor();
    
    secciones += seccionUbicacion;
    secciones += seccionCaracteristicas;
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
                    <div class="input-group">
                        <label>Tipo de lote</label>
                        <div class="autocomplete-container">
                            <input type="text" id="compFormTipoLoteInput" placeholder="Seleccionar tipo" autocomplete="off" readonly>
                            <div id="compFormTipoLoteList" class="autocomplete-list">
                                <div class="autocomplete-item">Medial</div>
                                <div class="autocomplete-item">Esquina</div>
                                <div class="autocomplete-item">Esquina larga (+30m)</div>
                                <div class="autocomplete-item">Salida a dos calles</div>
                                <div class="autocomplete-item">Irregular</div>
                            </div>
                        </div>
                    </div>
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
                <div class="input-group">
                    <label>Superficie cubierta propia</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormSuperficieCubiertaInput" placeholder="Seleccionar rango" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormSuperficieCubiertaList">
                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10"><span>Hasta 30m²</span><span class="coef-display">1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05"><span>De 30 a 50m²</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>De 50 a 100m²</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>De 100 a 150m²</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Más de 150m²</span><span class="coef-display">0.90</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormSuperficieCubiertaCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Ubicación en planta</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormUbicacionPlantaInput" placeholder="Seleccionar ubicación" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormUbicacionPlantaList">
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>Frente</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>Contrafrente</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Patio interior</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="0.93" data-rango="0.93"><span>Lateral</span><span class="coef-display">0.93</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormUbicacionPlantaCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
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
                <div class="input-group">
                    <label>Característica constructiva</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormCaracteristicaConstructivaInput" placeholder="Seleccionar característica" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormCaracteristicaConstructivaList">
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Económica</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>Buena económica</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05-1.10"><span>Buena sin servicios</span><span class="coef-display">1.05-1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.15" data-rango="1.15-1.20"><span>Buena con servicios</span><span class="coef-display">1.15-1.20</span></div>
                                    <div class="autocomplete-item" data-coef="1.25" data-rango="1.25-1.30"><span>Muy buena</span><span class="coef-display">1.25-1.30</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormCaracteristicaConstructivaCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="compFormAntiguedadInput" placeholder="0" min="0" step="1">
                </div>
                <div class="input-group">
                    <label>Estado de conservación</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormEstadoConservacionInput" placeholder="Seleccionar estado" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormEstadoConservacionList">
                            <div class="autocomplete-item" data-valor="1">1 - Nuevo o muy bueno</div>
                            <div class="autocomplete-item" data-valor="2">2 - Conservación normal</div>
                            <div class="autocomplete-item" data-valor="3">3 - Necesitado de reparaciones sencillas</div>
                            <div class="autocomplete-item" data-valor="4">4 - Necesitado de reparaciones importantes</div>
                            <div class="autocomplete-item" data-valor="5">5 - Estado de demolición</div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Ambientes</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormAmbientesInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormAmbientesList">
                            <div class="autocomplete-item">Monoambiente</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5</div>
                            <div class="autocomplete-item">6+</div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Dormitorios</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormDormitoriosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormDormitoriosList">
                            <div class="autocomplete-item">1</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5+</div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Baños</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormBanosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormBanosList">
                            <div class="autocomplete-item">1</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5+</div>
                        </div>
                    </div>
                </div>
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
                <div class="input-group">
                    <label>Superficie cubierta (rango)</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormSuperficieCubiertaInput" placeholder="Seleccionar rango" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormSuperficieCubiertaList">
                                    <div class="autocomplete-item" data-coef="1.10" data-rango="1.10"><span>Hasta 50 m²</span><span class="coef-display">1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05"><span>51-70 m²</span><span class="coef-display">1.05</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>71-90 m²</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="0.95" data-rango="0.95"><span>91-120 m²</span><span class="coef-display">0.95</span></div>
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Más de 120 m²</span><span class="coef-display">0.90</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormSuperficieCubiertaCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
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
                <div class="input-group">
                    <label>Calidad de construcción</label>
                    <div class="input-dividido-container">
                        <div class="input-dividido-principal">
                            <div class="autocomplete-container">
                                <input type="text" id="compFormCalidadConstruccionInput" placeholder="Seleccionar calidad" autocomplete="off" readonly>
                                <div class="autocomplete-list" id="compFormCalidadConstruccionList">
                                    <div class="autocomplete-item" data-coef="0.90" data-rango="0.90"><span>Económica</span><span class="coef-display">0.90</span></div>
                                    <div class="autocomplete-item" data-coef="1" data-rango="1"><span>Buena económica</span><span class="coef-display">1</span></div>
                                    <div class="autocomplete-item" data-coef="1.05" data-rango="1.05-1.10"><span>Buena sin servicios</span><span class="coef-display">1.05-1.10</span></div>
                                    <div class="autocomplete-item" data-coef="1.15" data-rango="1.15-1.20"><span>Buena con servicios</span><span class="coef-display">1.15-1.20</span></div>
                                    <div class="autocomplete-item" data-coef="1.25" data-rango="1.25-1.30"><span>Muy buena</span><span class="coef-display">1.25-1.30</span></div>
                                </div>
                            </div>
                        </div>
                        <div class="input-dividido-coef">
                            <input type="number" id="compFormCalidadConstruccionCoef" placeholder="Coef" step="0.01" min="0">
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Antigüedad (años)</label>
                    <input type="number" id="compFormAntiguedadInput" placeholder="0" min="0" step="1">
                </div>
                <div class="input-group">
                    <label>Estado de conservación</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormEstadoConservacionInput" placeholder="Seleccionar estado" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormEstadoConservacionList">
                            <div class="autocomplete-item" data-valor="1">1 - Nuevo o muy bueno</div>
                            <div class="autocomplete-item" data-valor="2">2 - Conservación normal</div>
                            <div class="autocomplete-item" data-valor="3">3 - Necesitado de reparaciones sencillas</div>
                            <div class="autocomplete-item" data-valor="4">4 - Necesitado de reparaciones importantes</div>
                            <div class="autocomplete-item" data-valor="5">5 - Estado de demolición</div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Ambientes</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormAmbientesInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormAmbientesList">
                            <div class="autocomplete-item">Monoambiente</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5</div>
                            <div class="autocomplete-item">6+</div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Dormitorios</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormDormitoriosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormDormitoriosList">
                            <div class="autocomplete-item">1</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5+</div>
                        </div>
                    </div>
                </div>
                <div class="input-group">
                    <label>Baños</label>
                    <div class="autocomplete-container">
                        <input type="text" id="compFormBanosInput" placeholder="Seleccionar cantidad" autocomplete="off" readonly>
                        <div class="autocomplete-list" id="compFormBanosList">
                            <div class="autocomplete-item">1</div>
                            <div class="autocomplete-item">2</div>
                            <div class="autocomplete-item">3</div>
                            <div class="autocomplete-item">4</div>
                            <div class="autocomplete-item">5+</div>
                        </div>
                    </div>
                </div>
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
 * Inicializa el formulario de comparable
 * @param {string} tipoInmueble - Tipo de inmueble
 * @param {Object} opciones - Opciones de configuración
 */
function inicializarFormularioComparable(tipoInmueble, opciones = {}) {
    // Inicializar autocomplete de provincia
    inicializarAutocompleteProvinciaComparable();
    
    // Inicializar autocomplete de localidad
    inicializarAutocompleteLocalidadComparable();
    
    // Inicializar mapa
    inicializarMapaComparable();
    
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
        });
    });
    
    const cerrar = e => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    };
    
    document.addEventListener("click", cerrar);
}

/**
 * Inicializa el mapa para el formulario de comparable
 */
function inicializarMapaComparable() {
    const mapaContainer = document.getElementById("compFormMapa");
    if (!mapaContainer) return;
    
    // Inicializar mapa Leaflet
    if (typeof L !== 'undefined') {
        comparableMapa = L.map('compFormMapa').setView([-34.6037, -58.3816], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(comparableMapa);
        
        // Agregar marcador draggable
        comparableMarcador = L.marker([-34.6037, -58.3816], {
            draggable: true
        }).addTo(comparableMapa);
        
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
    
    if (!direccion || !provincia || !localidad) return;
    
    const textoBusqueda = `${direccion}, ${localidad}, ${provincia}, Argentina`;
    
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(textoBusqueda)}`
        );
        const data = await res.json();
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            if (comparableMapa && comparableMarcador) {
                comparableMapa.setView([lat, lon], 15);
                comparableMarcador.setLatLng([lat, lon]);
            }
        }
    } catch (e) {
        console.error('Error al actualizar el mapa:', e);
    }
}

/**
 * Inicializa los cálculos automáticos para lote
 */
function inicializarCalculosLoteComparable() {
    const frenteInput = document.getElementById("compFormFrenteInput");
    const fondoInput = document.getElementById("compFormFondoInput");
    const superficieInput = document.getElementById("compFormSuperficieInput");
    
    if (!frenteInput || !fondoInput || !superficieInput) return;
    
    function calcularSuperficie() {
        const frente = parseFloat(frenteInput.value) || 0;
        const fondo = parseFloat(fondoInput.value) || 0;

        if (frente > 0 && fondo > 0) {
            superficieInput.value = (frente * fondo).toFixed(2);
            superficieInput.dispatchEvent(new Event("input"));
        }
    }
    
    frenteInput.addEventListener("input", calcularSuperficie);
    fondoInput.addEventListener("input", calcularSuperficie);
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
        tipoValor
    };
    
    if (tipoInmueble === 'lote') {
        datos.tipoLote = document.getElementById("compFormTipoLoteInput")?.value.trim() || "";
        datos.frente = parseFloat(document.getElementById("compFormFrenteInput")?.value) || 0;
        datos.fondo = parseFloat(document.getElementById("compFormFondoInput")?.value) || 0;
        datos.superficie = parseFloat(document.getElementById("compFormSuperficieInput")?.value) || 0;
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
        const estadoConservacion = document.getElementById("compFormEstadoConservacionInput")?.value || "";
        const ambientes = document.getElementById("compFormAmbientesInput")?.value || "";
        const dormitorios = document.getElementById("compFormDormitoriosInput")?.value || "";
        const banos = document.getElementById("compFormBanosInput")?.value || "";
        const cochera = document.getElementById("compFormCocheraInput")?.checked || false;

        datos.superficie = superficie;
        datos.antiguedad = antiguedad;
        datos.estadoConservacion = estadoConservacion;
        datos.ambientes = ambientes;
        datos.dormitorios = dormitorios;
        datos.banos = banos;
        datos.cochera = cochera;

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
                estadoConservacion: estadoConservacion,
                ambientes: ambientes,
                dormitorios: dormitorios,
                banos: banos,
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
            datos.calidadConstruccion = document.getElementById("compFormCalidadConstruccionInput")?.value || "";
            datos.calidadConstruccionCoef = parseFloat(document.getElementById("compFormCalidadConstruccionCoef")?.value) || 1;
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
                estadoConservacion: estadoConservacion,
                ambientes: ambientes,
                dormitorios: dormitorios,
                banos: banos,
                cochera: cochera,
                tienePileta: datos.tienePileta,
                tieneJardin: datos.tieneJardin,
                calidadConstruccion: datos.calidadConstruccion,
                calidadConstruccionCoef: datos.calidadConstruccionCoef
            };
        }
    }

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

    let opciones = [];
    if (tieneAscensor === 'si' || tieneAscensor === true || tieneAscensor === 'true') {
        opciones = [
            { texto: 'PB', coef: 0.90 },
            { texto: 'PB con patio y jardín al fondo', coef: 1 },
            { texto: '1ro y 2do', coef: 0.95 },
            { texto: '3ro y 4to', coef: 1 },
            { texto: '5to y 6to', coef: 1.05 },
            { texto: '7mo y 8vo', coef: 1.10 },
            { texto: 'Pisos superiores', coef: 1.5 },
            { texto: 'Último piso', coef: 0.90 }
        ];
    } else {
        opciones = [
            { texto: 'PB', coef: 1 },
            { texto: 'PB con patio y jardín al fondo', coef: 1 },
            { texto: '1ro', coef: 1 },
            { texto: '2do', coef: 0.95 },
            { texto: '3ro y 4to', coef: 0.90 },
            { texto: 'Último piso', coef: 0.90 }
        ];
    }

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
    inicializarAutocompleteConCoeficienteCompForm('compFormCalidadConstruccionInput', 'compFormCalidadConstruccionList', 'compFormCalidadConstruccionCoef');

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
}

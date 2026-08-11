/* Reservado para utilidades globales compartidas. */

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function construirCardMinimizada({
    item = {},
    precio = "—",
    fecha = "",
    tipoLabel = "",
    estadoLabel = "",
    estadoBadgeClass = "card-minimizada-badge-completada",
    tipoBadgeClass = "card-minimizada-badge-tipo",
    origenLabel = "",
    origenBadgeClass = "card-minimizada-badge-origen",
    onClick = "",
    dataAttributes = {},
    extraClass = "",
    role = "button",
    tabIndex = "0",
    mostrarEstado = true,
    mostrarIconos = true
} = {}) {
    const estadoBadge = mostrarEstado && estadoLabel
        ? `<div class="card-minimizada-state"><span class="card-minimizada-badge ${estadoBadgeClass}">${escapeHtml(estadoLabel)}</span></div>`
        : "";

    const tipoBadge = tipoLabel
        ? `<span class="card-minimizada-badge ${tipoBadgeClass}">${escapeHtml(tipoLabel)}</span>`
        : "";

    const origenBadge = origenLabel
        ? `<span class="card-minimizada-badge ${origenBadgeClass}">${escapeHtml(origenLabel)}</span>`
        : "";

    const esCompartida = item?.origen === 'compartida';

    const iconoHtml = esCompartida
        ? `<i class="fa-solid fa-link card-minimizada-icono-compartido" title="Recibida por compartir"></i>`
        : `<i class="fa-solid fa-link card-minimizada-icono-compartido card-minimizada-icono-oculto"></i>`;

    const iconos = mostrarIconos
        ? `<div class="card-minimizada-icons">${iconoHtml}</div>`
        : "";

    const dataAttrs = Object.entries(dataAttributes)
        .map(([key, value]) => ` ${key}="${escapeHtml(value)}"`)
        .join("");

    const clickAttr = onClick ? ` onclick="${onClick}"` : "";

    return `
        <div class="card-minimizada ${extraClass}"${dataAttrs}${clickAttr} role="${role}" tabindex="${tabIndex}">
            <div class="card-minimizada-main">
                <div class="card-minimizada-top">
                    <div class="card-minimizada-top-left">
                        <div class="card-minimizada-date-time">
                            <i class="fa-solid fa-calendar"></i>
                            <span>${escapeHtml(fecha)}</span>
                        </div>

                        <div class="card-minimizada-address">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>${escapeHtml(item?.ubicacion?.direccion || "Sin dirección")}</span>
                        </div>

                        <div class="card-minimizada-location">
                            <span>${escapeHtml(`${item?.ubicacion?.localidad || ""}${item?.ubicacion?.localidad && item?.ubicacion?.provincia ? ", " : ""}${item?.ubicacion?.provincia || ""}`)}</span>
                        </div>
                    </div>

                    <div class="card-minimizada-top-right">
                        <div class="card-minimizada-pill-stack">
                            ${tipoBadge}
                            ${origenBadge}
                            ${iconos}
                            ${estadoBadge}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card-minimizada-divider"></div>

            <div class="card-minimizada-price">
                <i class="fa-solid fa-dollar-sign"></i>
                <span>${escapeHtml(precio)}</span>
            </div>
        </div>
    `;
}

/* Dark Mode Toggle */
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = darkModeToggle?.querySelector('i');

// Check for saved dark mode preference or default to light mode
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
    document.body.classList.add('dark-mode');
    if (darkModeIcon) {
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
    }
}

// Toggle dark mode
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);

        if (darkModeIcon) {
            if (isDarkMode) {
                darkModeIcon.classList.remove('fa-sun');
                darkModeIcon.classList.add('fa-moon');
            } else {
                darkModeIcon.classList.remove('fa-moon');
                darkModeIcon.classList.add('fa-sun');
            }
        }

        // Update map tiles for dark mode
        if (typeof cambiarTelosMapa === 'function') {
            cambiarTelosMapa();
        }
        if (typeof cambiarTilesMapaHistorial === 'function') {
            cambiarTilesMapaHistorial();
        }
    });
}

/* Progress Indicators for Navigation Pill */
// Get navPillContainer dynamically since sidebar is injected dynamically

// Define dynamic step arrays for each property type
// Position 0 in array = visual step 2 (since step 1 is common to all)
const pasosPorTipo = {
    'lote': ['datos', 'caracteristicas', 'comparables', 'resultado'],
    'departamento': ['datos', 'caracteristicas', 'superficie', 'comparables', 'resultado'],
    'casa': ['datos', 'caracteristicas', 'superficie', 'comparables', 'resultado']
};

// Get total steps for a type (array.length + 1 because step 1 is common and array starts at step 2)
function getTotalSteps(tipo) {
    const pasos = pasosPorTipo[tipo] || [];
    return pasos.length + 1;
}

// Get step name from array index (index 0 = visual step 2)
function getNombrePaso(tipo, index) {
    const pasos = pasosPorTipo[tipo] || [];
    return pasos[index] || null;
}

/* =========================
   CONFIGURACION DE INPUTS
   Sets de opciones reutilizables
========================= */

const OPCIONES_AMBIENTES = ['Monoambiente', '2', '3', '4', '5', '6+'];
const OPCIONES_DORMITORIOS = ['1', '2', '3', '4', '5+'];
const OPCIONES_BANOS = ['1', '2', '3', '4', '5+'];

const OPCIONES_SUPERFICIE_CUBIERTA = [
    { label: 'Hasta 30m²', coef: 1.10, rango: '1.10', coefDisplay: '1.10' },
    { label: 'De 30 a 50m²', coef: 1.05, rango: '1.05', coefDisplay: '1.05' },
    { label: 'De 50 a 100m²', coef: 1.00, rango: '1', coefDisplay: '1' },
    { label: 'De 100 a 150m²', coef: 0.95, rango: '0.95', coefDisplay: '0.95' },
    { label: 'Más de 150m²', coef: 0.90, rango: '0.90', coefDisplay: '0.90' }
];

const OPCIONES_CARACTERISTICA_CONSTRUCTIVA = [
    { label: 'Económica', coef: 0.90, rango: '0.90', coefDisplay: '0.90' },
    { label: 'Buena económica', coef: 1.00, rango: '1', coefDisplay: '1' },
    { label: 'Buena sin servicios', coef: 1.05, rango: '1.05-1.10', coefDisplay: '1.05-1.10' },
    { label: 'Buena con servicios', coef: 1.15, rango: '1.15-1.20', coefDisplay: '1.15-1.20' },
    { label: 'Muy buena', coef: 1.25, rango: '1.25-1.30', coefDisplay: '1.25-1.30' }
];

const OPCIONES_ESTADO_CONSERVACION = [
    { label: '1 - Excelente', valor: '1' },
    { label: '2 - Bueno', valor: '2' },
    { label: '3 - Regular', valor: '3' },
    { label: '4 - Malo', valor: '4' },
    { label: '5 - Muy malo', valor: '5' }
];

const OPCIONES_TIPO_LOTE = ['Medial', 'Esquina', 'Esquina larga (+30m)', 'Salida a dos calles', 'Irregular'];

const OPCIONES_UBICACION_PLANTA = [
    { label: 'Frente', coef: 1.00, rango: '1', coefDisplay: '1' },
    { label: 'Contrafrente', coef: 0.95, rango: '0.95', coefDisplay: '0.95' },
    { label: 'Patio interior', coef: 0.90, rango: '0.90', coefDisplay: '0.90' },
    { label: 'Lateral', coef: 0.93, rango: '0.93', coefDisplay: '0.93' }
];

const OPCIONES_UBICACION_PISO_SIN_ASCENSOR = [
    { texto: 'PB', coef: 1 },
    { texto: 'PB con patio y jardín al fondo', coef: 1 },
    { texto: '1ro', coef: 1 },
    { texto: '2do', coef: 0.95 },
    { texto: '3ro y 4to', coef: 0.90 },
    { texto: 'Último piso', coef: 0.90 }
];

const OPCIONES_UBICACION_PISO_CON_ASCENSOR = [
    { texto: 'PB', coef: 0.90 },
    { texto: 'PB con patio y jardín al fondo', coef: 1 },
    { texto: '1ro y 2do', coef: 0.95 },
    { texto: '3ro y 4to', coef: 1 },
    { texto: '5to y 6to', coef: 1.05 },
    { texto: '7mo y 8vo', coef: 1.10 },
    { texto: 'Pisos superiores', coef: 1.5 },
    { texto: 'Último piso', coef: 0.90 }
];

/**
 * Genera un input simple de autocomplete con las opciones indicadas.
 * @param {Object} p
 * @returns {string} HTML del input
 */
function generarInputAutocompletado({ label, inputId, listId, opciones, placeholder = 'Seleccionar', value = '', disabled = false, claseInputGroup = '' }) {
    const items = opciones.map(opcion => {
        if (typeof opcion === 'string') {
            return `<div class="autocomplete-item">${escapeHtml(opcion)}</div>`;
        }
        const attrs = Object.entries(opcion.attrs || {})
            .map(([k, v]) => `data-${k}="${escapeHtml(String(v))}"`)
            .join(' ');
        return `<div class="autocomplete-item" ${attrs}>${escapeHtml(opcion.label)}</div>`;
    }).join('');

    const disabledAttr = disabled ? ' disabled' : '';
    const clase = claseInputGroup ? `input-group ${claseInputGroup}` : 'input-group';

    return `
        <div class="${clase}">
            <label>${escapeHtml(label)}</label>
            <div class="autocomplete-container">
                <input type="text" id="${inputId}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" readonly value="${escapeHtml(value || '')}"${disabledAttr}>
                <div class="autocomplete-list" id="${listId}">
                    ${items}
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera un input de autocomplete con coeficiente anexo.
 * @param {Object} p
 * @returns {string} HTML del input
 */
function generarInputAutocompletadoConCoef({ label, inputId, listId, coefInputId, opciones, placeholder = 'Seleccionar', value = '', coefValue = '', claseInputGroup = '' }) {
    const items = opciones.map(opcion => {
        const attrs = Object.entries({
            coef: opcion.coef,
            rango: opcion.rango,
            ...(opcion.attrs || {})
        })
            .map(([k, v]) => `data-${k}="${escapeHtml(String(v))}"`)
            .join(' ');
        return `<div class="autocomplete-item" ${attrs}><span>${escapeHtml(opcion.label)}</span><span class="coef-display">${escapeHtml(opcion.coefDisplay)}</span></div>`;
    }).join('');

    const clase = claseInputGroup ? `input-group ${claseInputGroup}` : 'input-group';

    return `
        <div class="${clase}">
            <label>${escapeHtml(label)}</label>
            <div class="input-dividido-container">
                <div class="input-dividido-principal">
                    <div class="autocomplete-container">
                        <input type="text" id="${inputId}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" readonly value="${escapeHtml(value || '')}">
                        <div class="autocomplete-list" id="${listId}">
                            ${items}
                        </div>
                    </div>
                </div>
                <div class="input-dividido-coef">
                    <input type="number" id="${coefInputId}" placeholder="Coef" step="0.01" min="0" value="${coefValue ?? ''}">
                </div>
            </div>
        </div>
    `;
}

/* Generadores concretos para inputs comunes */

function generarInputAmbientes({ inputId = 'ambientesInput', listId = 'ambientesList', label = 'Ambientes', value = '', disabled = false } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar cantidad',
        opciones: OPCIONES_AMBIENTES,
        value,
        disabled
    });
}

function generarInputDormitorios({ inputId = 'dormitoriosInput', listId = 'dormitoriosList', label = 'Dormitorios', value = '', disabled = false } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar cantidad',
        opciones: OPCIONES_DORMITORIOS,
        value: disabled ? '' : value,
        disabled
    });
}

function generarInputBanos({ inputId = 'banosInput', listId = 'banosList', label = 'Baños', value = '' } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar cantidad',
        opciones: OPCIONES_BANOS,
        value
    });
}

function generarInputVidaUtil({ inputId = 'vidaUtilInput', label = 'Vida útil (años)', value = '80', placeholder = '80', min = 1, step = 1, claseInputGroup = '' } = {}) {
    const clase = claseInputGroup ? `input-group ${claseInputGroup}` : 'input-group';
    return `
        <div class="${clase}">
            <label>${escapeHtml(label)}</label>
            <input type="number" id="${inputId}" placeholder="${escapeHtml(placeholder)}" min="${min}" step="${step}" value="${escapeHtml(value || '80')}">
        </div>
    `;
}

function generarInputSuperficieCubierta({ inputId, listId, coefInputId, label = 'Superficie cubierta propia', placeholder = 'Seleccionar rango', value = '', coefValue = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletadoConCoef({
        label,
        inputId,
        listId,
        coefInputId,
        placeholder,
        opciones: OPCIONES_SUPERFICIE_CUBIERTA,
        value,
        coefValue,
        claseInputGroup
    });
}

function generarInputCaracteristicaConstructiva({ inputId, listId, coefInputId, label = 'Característica constructiva', value = '', coefValue = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletadoConCoef({
        label,
        inputId,
        listId,
        coefInputId,
        placeholder: 'Seleccionar característica',
        opciones: OPCIONES_CARACTERISTICA_CONSTRUCTIVA,
        value,
        coefValue,
        claseInputGroup
    });
}

function generarInputEstadoConservacion({ inputId, listId, label = 'Estado de conservación', value = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar estado',
        opciones: OPCIONES_ESTADO_CONSERVACION.map(opcion => ({ ...opcion, attrs: { valor: opcion.valor } })),
        value,
        claseInputGroup
    });
}

function generarInputTipoLote({ inputId, listId, label = 'Tipo de lote', value = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar tipo',
        opciones: OPCIONES_TIPO_LOTE,
        value,
        claseInputGroup
    });
}

function generarInputUbicacionPlanta({ inputId, listId, coefInputId, label = 'Ubicación en planta', value = '', coefValue = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletadoConCoef({
        label,
        inputId,
        listId,
        coefInputId,
        placeholder: 'Seleccionar ubicación',
        opciones: OPCIONES_UBICACION_PLANTA,
        value,
        coefValue,
        claseInputGroup
    });
}

// Get array index from visual step number (step 2 = index 0)
function getIndexPaso(tipo, stepNumber) {
    return stepNumber - 2;
}

// Validation criteria for each step and type
// REMOVED: Now handled by individual validators (LoteValidator, DepartamentoValidator, CasaValidator)

// Check if a step is unlocked based on previous step's criteria
function pasoEstaDesbloqueado(tipo, stepNumber) {
    // Step 1 is always unlocked (selection type)
    if (stepNumber === 1) return true;
    
    // Step 2 is always unlocked (datos/ubicacion)
    if (stepNumber === 2) return true;
    
    // For steps 3+, check if previous step meets its criteria using new validators
    const previousStepNumber = stepNumber - 1;
    const previousIndex = getIndexPaso(tipo, previousStepNumber);

    if (typeof configuracionFlujos === 'undefined') return true;
    const flujo = configuracionFlujos[tipo];
    if (!flujo || !flujo.pasos[previousIndex] || !flujo.pasos[previousIndex].validator) {
        // If no validator defined, consider it unlocked
        return true;
    }
    
    const resultadoValidacion = flujo.pasos[previousIndex].validator.validar(datosTasacion);
    return resultadoValidacion.valido;
}

function actualizarIndicadoresProgreso() {
    // Check if we're in a tasation flow (pasoActual should be defined)
    if (typeof pasoActual === 'undefined' || pasoActual < 2) {
        const navPillContainer = document.getElementById('navPillContainer');
        if (navPillContainer) {
            navPillContainer.innerHTML = '';
            navPillContainer.classList.remove('has-content');
        }
        return;
    }

    console.log('[actualizarIndicadoresProgreso] START - pasoActual:', pasoActual);
    console.log('[actualizarIndicadoresProgreso] datosTasacion.tipo:', datosTasacion?.tipo);

    const navPillContainer = document.getElementById('navPillContainer');
    if (!navPillContainer) return;

    // Try to get the tipo from datosTasacion, default to 'lote' if not available
    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    console.log('[actualizarIndicadoresProgreso] tipo usado:', tipo);

    const totalSteps = getTotalSteps(tipo);
    console.log('[actualizarIndicadoresProgreso] totalSteps:', totalSteps);

    // Generate progress indicators inside nav-pill
    let html = '<div class="nav-pill">';
    for (let i = 1; i <= totalSteps; i++) {
        const estaDesbloqueado = pasoEstaDesbloqueado(tipo, i);

        let clase = '';
        if (i === pasoActual) {
            clase = 'active';
        } else if (i < pasoActual) {
            clase = 'completed';
        }

        const disabled = !estaDesbloqueado ? 'disabled' : '';

        html += `<button class="progress-indicator ${clase} ${disabled}" data-step="${i}" ${disabled ? 'disabled' : ''}>${i}</button>`;
    }
    html += '</div>';

    navPillContainer.innerHTML = html;
    navPillContainer.classList.add('has-content');

    // Add click handlers
    navPillContainer.querySelectorAll('.progress-indicator').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = parseInt(btn.dataset.step);
            navegarAPaso(step);
        });
    });
}

function actualizarTextoBotonSiguiente() {
    if (typeof pasoActual === 'undefined') return;

    const btnSiguiente = document.getElementById("btnSiguiente");
    if (!btnSiguiente) return;

    // Get the tipo from datosTasacion, default to 'lote' if not available
    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    const totalSteps = getTotalSteps(tipo);

    // Check if current step is the last step
    if (pasoActual === totalSteps) {
        btnSiguiente.textContent = "Guardar tasación";
    } else {
        btnSiguiente.textContent = "Siguiente";
    }
}

function actualizarEstadoBotonSiguiente() {
    if (typeof pasoActual === 'undefined') return;

    const btnSiguiente = document.getElementById("btnSiguiente");
    if (!btnSiguiente) return;

    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';

    // Step 1 is always enabled once a type is selected
    if (pasoActual === 1) {
        btnSiguiente.disabled = !tipoSeleccionado;
        if (tipoSeleccionado) {
            btnSiguiente.classList.add("activo");
        } else {
            btnSiguiente.classList.remove("activo");
        }
        return;
    }

    // For comparables step, disable if no comparables added
    if (typeof configuracionFlujos === 'undefined') return;
    const flujo = configuracionFlujos[tipo];
    if (flujo) {
        const pasoIndex = pasoActual - 2;
        const pasoActualConfig = flujo.pasos[pasoIndex];
        
        if (pasoActualConfig && pasoActualConfig.nombre === 'comparables') {
            const tieneComparables = datosTasacion.comparables && datosTasacion.comparables.length >= 1;
            btnSiguiente.disabled = !tieneComparables;
            if (tieneComparables) {
                btnSiguiente.classList.add("activo");
            } else {
                btnSiguiente.classList.remove("activo");
            }
            return;
        }
    }

    // For all other steps, always enable button
    // Validation happens when button is pressed, showing red borders on invalid fields
    btnSiguiente.disabled = false;
    btnSiguiente.classList.add("activo");
}

function navegarAPaso(step) {
    if (typeof pasoActual === 'undefined') return;
    if (step === pasoActual) return;

    console.log('[navegarAPaso] START - step:', step, 'pasoActual:', pasoActual);

    // Step 1: go to type selection
    if (step === 1) {
        if (typeof volverSeleccionTipo === 'function') {
            volverSeleccionTipo();
        }
        return;
    }

    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    if (typeof configuracionFlujos === 'undefined') {
        console.warn('[navegarAPaso] configuracionFlujos no está definido');
        return;
    }
    const flujo = configuracionFlujos[tipo];

    if (!flujo) {
        console.error('[navegarAPaso] flujo is undefined for tipo:', tipo);
        return;
    }

    const pasoIndex = step - 2;

    // Validate step exists
    if (!flujo.pasos[pasoIndex]) {
        console.error('[navegarAPaso] paso is undefined for pasoIndex:', pasoIndex);
        return;
    }

    // Save data from current step before navigating
    const currentStepIndex = pasoActual - 2;
    if (flujo.pasos[currentStepIndex]?.guardar) {
        console.log('[navegarAPaso] Saving current step before navigation');
        flujo.pasos[currentStepIndex].guardar();
    }

    // Validate current step only when navigating FORWARD (to later steps)
    if (step > pasoActual && flujo.pasos[currentStepIndex]?.validator) {
        console.log('[navegarAPaso] Validating current step before forward navigation');
        const resultadoValidacion = flujo.pasos[currentStepIndex].validator.validar(datosTasacion);
        console.log('[navegarAPaso] resultadoValidacion:', resultadoValidacion);
        
        if (!resultadoValidacion.valido) {
            console.log('[navegarAPaso] Validation failed, showing errors:', resultadoValidacion.errores);
            // Show errors
            if (typeof ValidationUI !== 'undefined') {
                resultadoValidacion.errores.forEach(error => {
                    if (error.campo) {
                        ValidationUI.marcarCampoError(error.campo, error.mensaje);
                    } else {
                        // Global errors (no specific field)
                        alert(error.mensaje);
                    }
                });
            }
            return; // Don't navigate if validation fails
        }
    }

    // Render new step
    if (flujo.pasos[pasoIndex]?.render) {
        console.log('[navegarAPaso] Calling render() for step:', step);
        flujo.pasos[pasoIndex].render();
    }
}

// Initialize progress indicators on DOM load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof pasoActual === 'undefined') return;
    actualizarIndicadoresProgreso();
});

/* =========================
   MAPA CORE
   Utilidades unificadas de mapa (Leaflet)
========================= */

var MapaCore = (function() {
    'use strict';

    const TILE_URLS = {
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    };

    const VISTA_POR_DEFECTO = { lat: -34.6037, lon: -58.3816, zoom: 13 };

    const instancias = new Map();

    const PIN_ICON = typeof L !== 'undefined' ? L.divIcon({
        className: 'pin-mapa',
        html: `<i class="fa-solid fa-location-dot" style="
            display: inline-block;
            width: 24px;
            height: 32px;
            line-height: 32px;
            font-size: 24px;
            text-align: center;
            color: var(--color-primary);
            filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.5));
        "></i>`,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32]
    }) : null;

    function _crearIconoCluster(cluster) {
        const cantidad = cluster.getChildCount();
        return L.divIcon({
            className: 'pin-mapa-cluster',
            html: `<div style="
                position: relative;
                display: inline-block;
                width: 32px;
                height: 40px;
                text-align: center;
                color: var(--color-primary);
                filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.5));
            ">
                <i class="fa-solid fa-location-dot" style="font-size: 32px; line-height: 40px;"></i>
                <span style="
                    position: absolute;
                    top: 3px;
                    left: 0;
                    right: 0;
                    font-size: 14px;
                    font-weight: 700;
                    transform: translateX(11px);
                    color: var(--color-primary);
                    line-height: 20px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 18px;
                    height: 18px;
                    background-color: var(--color-info-light);
                    border-radius: 50%;
                ">${cantidad}</span>
            </div>`,
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40]
        });
    }

    function _crearTiles(modo) {
        const isDark = modo === 'dark' || (modo !== 'light' && document.body.classList.contains('dark-mode'));
        const url = isDark ? TILE_URLS.dark : TILE_URLS.light;
        return L.tileLayer(url, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        });
    }

    async function _resolverUbicacionInicial(lat, lon) {
        if (lat != null && lon != null) {
            return { lat, lon, desdeUsuario: false };
        }
        if (typeof obtenerUbicacionUsuario === 'function') {
            try {
                const ubicacion = await obtenerUbicacionUsuario();
                if (ubicacion && ubicacion.lat != null && ubicacion.lon != null) {
                    return { lat: ubicacion.lat, lon: ubicacion.lon, desdeUsuario: true };
                }
            } catch (e) {
                console.warn('No se pudo obtener ubicación del usuario:', e);
            }
        }
        return { ...VISTA_POR_DEFECTO, desdeUsuario: false };
    }

    function _obtenerZoomEdicion(desdeUsuario, zoomManual) {
        if (zoomManual != null) return zoomManual;
        return desdeUsuario ? 12 : 13;
    }

    function _guardarRef(container, mapa) {
        if (container) container._mapa = mapa;
    }

    function _limpiar(containerId) {
        const instancia = instancias.get(containerId);
        if (!instancia) return;
        if (instancia.mapa) instancia.mapa.remove();
        if (instancia.container) instancia.container._mapa = null;
        instancias.delete(containerId);
    }

    return {
        TILE_URLS,

        async inicializarEdicion(containerId, { lat = null, lon = null, zoom = null, draggable = true, onMapClick, onMarkerDrag } = {}) {
            if (typeof L === 'undefined' || !PIN_ICON) return null;

            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`[MapaCore] Contenedor #${containerId} no encontrado`);
                return null;
            }

            _limpiar(containerId);

            const inicial = await _resolverUbicacionInicial(lat, lon);
            const zoomFinal = _obtenerZoomEdicion(inicial.desdeUsuario, zoom);

            const mapa = L.map(containerId).setView([inicial.lat, inicial.lon], zoomFinal);
            const tiles = _crearTiles().addTo(mapa);
            const opcionesMarcador = { draggable: !!draggable, icon: PIN_ICON };
            const marcador = L.marker([inicial.lat, inicial.lon], opcionesMarcador).addTo(mapa);

            mapa.on('click', (e) => {
                marcador.setLatLng(e.latlng);
                if (typeof onMapClick === 'function') onMapClick(e.latlng);
            });

            if (draggable && typeof onMarkerDrag === 'function') {
                marcador.on('dragend', (e) => onMarkerDrag(e.target.getLatLng()));
            }

            _guardarRef(container, mapa);

            const instancia = { mapa, tiles, marcador, container, tipo: 'edicion' };
            instancias.set(containerId, instancia);

            setTimeout(() => mapa.invalidateSize(), 100);

            return instancia;
        },

        inicializarLectura(containerId, { lat = null, lon = null, zoom = null } = {}) {
            if (typeof L === 'undefined' || !PIN_ICON) return null;

            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`[MapaCore] Contenedor #${containerId} no encontrado`);
                return null;
            }

            _limpiar(containerId);

            const latInicial = lat != null ? lat : VISTA_POR_DEFECTO.lat;
            const lonInicial = lon != null ? lon : VISTA_POR_DEFECTO.lon;
            const zoomInicial = zoom != null ? zoom : VISTA_POR_DEFECTO.zoom;

            const mapa = L.map(containerId).setView([latInicial, lonInicial], zoomInicial);
            const tiles = _crearTiles().addTo(mapa);
            const capaMarcadores = typeof L.markerClusterGroup === 'function'
                ? L.markerClusterGroup({
                    iconCreateFunction: _crearIconoCluster,
                    showCoverageOnHover: false,
                    zoomToBoundsOnClick: true,
                    spiderfyOnMaxZoom: true,
                    maxClusterRadius: 20
                }).addTo(mapa)
                : L.layerGroup().addTo(mapa);

            _guardarRef(container, mapa);

            const instancia = { mapa, tiles, capaMarcadores, container, tipo: 'lectura' };
            instancias.set(containerId, instancia);

            setTimeout(() => mapa.invalidateSize(), 100);

            return instancia;
        },

        agregarMarcador(containerId, { lat, lon, popupHtml = '', icon = null }) {
            const instancia = instancias.get(containerId);
            if (!instancia || !instancia.capaMarcadores) {
                console.error(`[MapaCore] No existe capa de marcadores para #${containerId}`);
                return null;
            }
            if (lat == null || lon == null) return null;

            const opciones = { icon: icon || PIN_ICON };
            const marcador = L.marker([lat, lon], opciones).addTo(instancia.capaMarcadores);
            if (popupHtml) marcador.bindPopup(popupHtml);
            return marcador;
        },

        limpiarMarcadores(containerId) {
            const instancia = instancias.get(containerId);
            if (instancia && instancia.capaMarcadores) instancia.capaMarcadores.clearLayers();
        },

        actualizarMarcador(containerId, { lat, lon, zoom = 15 } = {}) {
            const instancia = instancias.get(containerId);
            if (!instancia || !instancia.marcador) return;
            instancia.marcador.setLatLng([lat, lon]);
            instancia.mapa.setView([lat, lon], zoom);
        },

        obtenerPosicion(containerId) {
            const instancia = instancias.get(containerId);
            const marcador = instancia?.marcador;
            if (!marcador || typeof marcador.getLatLng !== 'function') return null;
            const pos = marcador.getLatLng();
            return { lat: pos.lat, lng: pos.lng };
        },

        redimensionar(containerId) {
            const instancia = instancias.get(containerId);
            if (instancia && instancia.mapa && typeof instancia.mapa.invalidateSize === 'function') {
                instancia.mapa.invalidateSize();
            }
        },

        cambiarTiles(modo) {
            if (typeof L === 'undefined') return;
            for (const [containerId, instancia] of instancias) {
                if (!instancia || !instancia.tiles || !instancia.mapa) continue;
                const isDark = modo === 'dark' || (modo !== 'light' && document.body.classList.contains('dark-mode'));
                const url = isDark ? TILE_URLS.dark : TILE_URLS.light;
                instancia.mapa.removeLayer(instancia.tiles);
                instancia.tiles = _crearTiles(isDark ? 'dark' : 'light').addTo(instancia.mapa);
            }
        },

        limpiar(containerId) {
            _limpiar(containerId);
        }
    };
})();

window.MapaCore = window.MapaCore || MapaCore;
window.TILE_URLS = window.TILE_URLS || MapaCore.TILE_URLS;

window.cambiarTelosMapa = function() {
    MapaCore.cambiarTiles();
};

window.cambiarTilesMapaHistorial = function() {
    MapaCore.cambiarTiles();
};

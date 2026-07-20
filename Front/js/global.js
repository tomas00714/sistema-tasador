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

    const iconos = mostrarIconos
        ? `<div class="card-minimizada-icons">
                <i class="fa-solid fa-house"></i>
                <i class="fa-solid fa-ruler-combined"></i>
                <i class="fa-solid fa-layer-group"></i>
            </div>`
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

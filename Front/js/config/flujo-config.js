/* =========================
   FLUJO CONFIG
   Helper functions for flow configuration
   Note: configuracionFlujos is defined in tasacion-resultado.js
   This file adds validators to the existing configuration
========================= */

console.log('[flujo-config.js] Script loading...');

/**
 * Adds validators to the existing configuracionFlujos
 * This function is called after validators are loaded
 */
function agregarValidadoresAConfiguracion() {
    console.log('[agregarValidadoresAConfiguracion] START');
    console.log('[agregarValidadoresAConfiguracion] configuracionFlujos exists:', typeof configuracionFlujos !== 'undefined');
    
    if (typeof configuracionFlujos === 'undefined') {
        console.warn('configuracionFlujos not defined yet, validators will be added later');
        return;
    }

    console.log('[agregarValidadoresAConfiguracion] LoteValidator exists:', !!LoteValidator);
    console.log('[agregarValidadoresAConfiguracion] DepartamentoValidator exists:', !!DepartamentoValidator);
    console.log('[agregarValidadoresAConfiguracion] CasaValidator exists:', !!CasaValidator);

    // Add validators for lote
    if (configuracionFlujos.lote && configuracionFlujos.lote.pasos) {
        configuracionFlujos.lote.pasos[0].validator = LoteValidator?.datos || null;
        configuracionFlujos.lote.pasos[1].validator = LoteValidator?.caracteristicas || null;
        configuracionFlujos.lote.pasos[2].validator = LoteValidator?.comparables || null;
        configuracionFlujos.lote.pasos[3].validator = null; // resultado - no validation
        console.log('[agregarValidadoresAConfiguracion] Lote validators added');
    }

    // Add validators for departamento
    if (configuracionFlujos.departamento && configuracionFlujos.departamento.pasos) {
        configuracionFlujos.departamento.pasos[0].validator = DepartamentoValidator?.datos || null;
        configuracionFlujos.departamento.pasos[1].validator = DepartamentoValidator?.caracteristicas || null;
        configuracionFlujos.departamento.pasos[2].validator = DepartamentoValidator?.superficie || null;
        configuracionFlujos.departamento.pasos[3].validator = DepartamentoValidator?.comparables || null;
        configuracionFlujos.departamento.pasos[4].validator = null; // resultado - no validation
        console.log('[agregarValidadoresAConfiguracion] Departamento validators added');
    }

    // Add validators for casa
    if (configuracionFlujos.casa && configuracionFlujos.casa.pasos) {
        configuracionFlujos.casa.pasos[0].validator = CasaValidator?.datos || null;
        configuracionFlujos.casa.pasos[1].validator = CasaValidator?.caracteristicas || null;
        configuracionFlujos.casa.pasos[2].validator = CasaValidator?.superficie || null;
        configuracionFlujos.casa.pasos[3].validator = CasaValidator?.comparables || null;
        configuracionFlujos.casa.pasos[4].validator = null; // resultado - no validation
        console.log('[agregarValidadoresAConfiguracion] Casa validators added');
    }

    console.log('[agregarValidadoresAConfiguracion] Validators added to configuracionFlujos');
}

/**
 * Gets the flow configuration for a specific property type
 * @param {string} tipo - The property type
 * @returns {Object|null} The flow configuration or null if not found
 */
function obtenerConfiguracionFlujo(tipo) {
    return configuracionFlujos[tipo] || null;
}

/**
 * Gets the total number of steps for a property type
 * @param {string} tipo - The property type
 * @returns {number} Total steps (including step 1 for type selection)
 */
function getTotalPasos(tipo) {
    const config = configuracionFlujos[tipo];
    if (!config) return 0;
    return config.pasos.length + 1; // +1 for step 1 (type selection)
}

/**
 * Gets a step configuration by index
 * @param {string} tipo - The property type
 * @param {number} index - The step index (0-based)
 * @returns {Object|null} The step configuration or null if not found
 */
function obtenerPaso(tipo, index) {
    const config = configuracionFlujos[tipo];
    if (!config || !config.pasos[index]) return null;
    return config.pasos[index];
}

// Make available globally
window.agregarValidadoresAConfiguracion = agregarValidadoresAConfiguracion;
window.obtenerConfiguracionFlujo = obtenerConfiguracionFlujo;
window.getTotalPasos = getTotalPasos;
window.obtenerPaso = obtenerPaso;

// Try to add validators immediately if configuracionFlujos exists
// Otherwise, it will be called after tasacion-resultado.js loads
if (typeof configuracionFlujos !== 'undefined') {
    agregarValidadoresAConfiguracion();
}

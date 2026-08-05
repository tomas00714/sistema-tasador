/* =========================
   CASA VALIDATOR
   Specific validations for house properties
========================= */

console.log('[casa-validator.js] Script loading...');

const CasaValidator = {
    /**
     * Validates the datos step (location)
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    datos: {
        validar(datos) {
            const errores = [];

            // Validate direccion
            if (!datos.ubicacion?.direccion || datos.ubicacion.direccion.trim() === '') {
                errores.push({ campo: 'direccionInput', mensaje: 'Ingresá la dirección' });
            }

            // Validate provincia
            if (!datos.ubicacion?.provincia || datos.ubicacion.provincia === '') {
                errores.push({ campo: 'provinciaInput', mensaje: 'Seleccioná la provincia' });
            }

            // Validate localidad
            if (!datos.ubicacion?.localidad || datos.ubicacion.localidad === '') {
                errores.push({ campo: 'localidadInput', mensaje: 'Seleccioná la localidad' });
            }

            return ValidatorBase.crearResultado(errores.length === 0, errores);
        }
    },

    /**
     * Validates the caracteristicas step (house details)
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    caracteristicas: {
        validar(datos) {
            const errores = [];
            const casa = datos.casa || {};

            // Validate superficie cubierta
            if (!casa.superficieCubierta || casa.superficieCubierta === '') {
                errores.push({ campo: 'superficieCubiertaInput', mensaje: 'Seleccioná la superficie cubierta' });
            }

            // Validate estado de conservación
            if (!casa.estadoConservacion || casa.estadoConservacion === '') {
                errores.push({ campo: 'estadoConservacionInput', mensaje: 'Seleccioná el estado de conservación' });
            }

            // Validate antiguedad
            if (!casa.antiguedad || casa.antiguedad === '' || casa.antiguedad === '0') {
                errores.push({ campo: 'antiguedadInput', mensaje: 'Ingresá la antigüedad' });
            } else {
                const antiguedad = parseFloat(casa.antiguedad) || 0;
                const vidaUtil = parseFloat(casa.vidaUtil) || 80;
                
                if (antiguedad > vidaUtil) {
                    errores.push({ campo: 'antiguedadInput', mensaje: `La antigüedad (${antiguedad} años) no puede superar la vida útil (${vidaUtil} años)` });
                }
            }

            // Validate vida útil
            if (!casa.vidaUtil || casa.vidaUtil === '' || casa.vidaUtil === '0') {
                errores.push({ campo: 'vidaUtilInput', mensaje: 'Ingresá la vida útil' });
            }

            // Validate característica constructiva
            if (!casa.caracteristicaConstructiva || casa.caracteristicaConstructiva === '') {
                errores.push({ campo: 'caracteristicaConstructivaInput', mensaje: 'Seleccioná la característica constructiva' });
            }

            return ValidatorBase.crearResultado(errores.length === 0, errores);
        }
    },

    /**
     * Validates the superficie step (homogenization)
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    superficie: {
        validar(datos) {
            const errores = [];
            const casa = datos.casa || {};
            const hom = casa.homogeneizacion || {};
            let total = parseFloat(hom.totalHomogeneizada) || 0;

            if (total <= 0) {
                errores.push({ campo: null, mensaje: 'El total de superficie homogeneizada debe ser mayor a 0' });
            }

            return ValidatorBase.crearResultado(errores.length === 0, errores);
        }
    },

    /**
     * Validates the comparables step
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    comparables: {
        validar(datos) {
            const errores = [];

            if (!datos.comparables || datos.comparables.length < 1) {
                errores.push({ campo: null, mensaje: 'Agregá al menos 1 comparable para continuar' });
            }

            if (datos.comparables.length > 10) {
                errores.push({ campo: null, mensaje: 'Máximo 10 comparables permitidos' });
            }

            return ValidatorBase.crearResultado(errores.length === 0, errores);
        }
    }
};

// Make available globally
window.CasaValidator = CasaValidator;

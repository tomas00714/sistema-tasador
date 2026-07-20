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

            // For now, all characteristics are optional
            // Add specific validations as needed

            return ValidatorBase.crearResultado(true, errores);
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
            let total = parseFloat(casa.superficieHomogeneizada) || 0;

            if (total <= 0) {
                const rango = (casa.superficieCubierta || "").match(/\d+/g);
                const coef = parseFloat(casa.superficieCubiertaCoef) || 1;
                if (rango) {
                    const valorMedio = rango.reduce((sum, val) => sum + parseInt(val), 0) / rango.length;
                    total = valorMedio * coef;
                }
            }

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

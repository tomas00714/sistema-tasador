/* =========================
   DEPARTAMENTO VALIDATOR
   Specific validations for apartment properties
========================= */

console.log('[departamento-validator.js] Script loading...');

const DepartamentoValidator = {
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
     * Validates the caracteristicas step (apartment details)
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    caracteristicas: {
        validar(datos) {
            console.log('[DepartamentoValidator.caracteristicas.validar] START');
            console.log('[DepartamentoValidator.caracteristicas.validar] datos.departamento:', datos.departamento);
            const errores = [];
            const depto = datos.departamento || {};

            console.log('[DepartamentoValidator.caracteristicas.validar] estadoConservacion:', depto.estadoConservacion);
            // Validate estadoConservacion
            if (!depto.estadoConservacion || depto.estadoConservacion === '') {
                console.log('[DepartamentoValidator.caracteristicas.validar] estadoConservacion missing');
                errores.push({ campo: 'estadoConservacionInput', mensaje: 'Seleccioná el estado de conservación' });
            }

            console.log('[DepartamentoValidator.caracteristicas.validar] ubicacionPlanta:', depto.ubicacionPlanta);
            // Validate ubicacionPlanta
            if (!depto.ubicacionPlanta || depto.ubicacionPlanta === '') {
                console.log('[DepartamentoValidator.caracteristicas.validar] ubicacionPlanta missing');
                errores.push({ campo: 'ubicacionPlantaInput', mensaje: 'Seleccioná la planta' });
            }

            console.log('[DepartamentoValidator.caracteristicas.validar] ubicacionPiso:', depto.ubicacionPiso);
            // Validate ubicacionPiso
            if (!depto.ubicacionPiso || depto.ubicacionPiso === '') {
                console.log('[DepartamentoValidator.caracteristicas.validar] ubicacionPiso missing');
                errores.push({ campo: 'ubicacionPisoInput', mensaje: 'Seleccioná el piso' });
            }

            console.log('[DepartamentoValidator.caracteristicas.validar] caracteristicaConstructiva:', depto.caracteristicaConstructiva);
            // Validate caracteristicaConstructiva
            if (!depto.caracteristicaConstructiva || depto.caracteristicaConstructiva === '') {
                console.log('[DepartamentoValidator.caracteristicas.validar] caracteristicaConstructiva missing');
                errores.push({ campo: 'caracteristicaConstructivaInput', mensaje: 'Seleccioná la característica constructiva' });
            }

            console.log('[DepartamentoValidator.caracteristicas.validar] superficieCubierta:', depto.superficieCubierta);
            // Validate superficieCubierta
            if (!depto.superficieCubierta || depto.superficieCubierta === '') {
                console.log('[DepartamentoValidator.caracteristicas.validar] superficieCubierta missing');
                errores.push({ campo: 'superficieCubiertaInput', mensaje: 'Ingresá la superficie cubierta' });
            }

            // superficieTotal is validated in the superficie step, not here
            const result = ValidatorBase.crearResultado(errores.length === 0, errores);
            console.log('[DepartamentoValidator.caracteristicas.validar] result:', result);
            return result;
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
            const hom = datos.departamento?.homogeneizacion || {};
            const total = parseFloat(hom.totalHomogeneizada) || 0;

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
window.DepartamentoValidator = DepartamentoValidator;

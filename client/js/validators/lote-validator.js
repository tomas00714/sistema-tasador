/* =========================
   LOTE VALIDATOR
   Specific validations for lot properties
========================= */

console.log('[lote-validator.js] Script loading...');

const LoteValidator = {
    /**
     * Validates the datos step (type and location)
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    datos: {
        validar(datos) {
            console.log('[LoteValidator.datos.validar] START');
            console.log('[LoteValidator.datos.validar] datos:', datos);
            console.log('[LoteValidator.datos.validar] datos.lote:', datos.lote);
            console.log('[LoteValidator.datos.validar] datos.ubicacion:', datos.ubicacion);
            const errores = [];

            // Validate tipoLote
            if (!datos.lote?.tipoLote || datos.lote.tipoLote === '') {
                console.log('[LoteValidator.datos.validar] tipoLote missing or empty, value:', datos.lote?.tipoLote);
                errores.push({ campo: 'tipoLoteInput', mensaje: 'Seleccioná el tipo de lote' });
            } else {
                console.log('[LoteValidator.datos.validar] tipoLote OK:', datos.lote.tipoLote);
            }

            // Validate direccion
            if (!datos.ubicacion?.direccion || datos.ubicacion.direccion.trim() === '') {
                console.log('[LoteValidator.datos.validar] direccion missing or empty, value:', datos.ubicacion?.direccion);
                errores.push({ campo: 'direccionInput', mensaje: 'Ingresá la dirección' });
            } else {
                console.log('[LoteValidator.datos.validar] direccion OK:', datos.ubicacion.direccion);
            }

            // Validate provincia
            if (!datos.ubicacion?.provincia || datos.ubicacion.provincia === '') {
                console.log('[LoteValidator.datos.validar] provincia missing or empty, value:', datos.ubicacion?.provincia);
                errores.push({ campo: 'provinciaInput', mensaje: 'Seleccioná la provincia' });
            } else {
                console.log('[LoteValidator.datos.validar] provincia OK:', datos.ubicacion.provincia);
            }

            // Validate localidad
            if (!datos.ubicacion?.localidad || datos.ubicacion.localidad === '') {
                console.log('[LoteValidator.datos.validar] localidad missing or empty, value:', datos.ubicacion?.localidad);
                errores.push({ campo: 'localidadInput', mensaje: 'Seleccioná la localidad' });
            } else {
                console.log('[LoteValidator.datos.validar] localidad OK:', datos.ubicacion.localidad);
            }

            const result = ValidatorBase.crearResultado(errores.length === 0, errores);
            console.log('[LoteValidator.datos.validar] result:', result);
            return result;
        }
    },

    /**
     * Validates the caracteristicas step (dimensions and zone)
     * @param {Object} datos - The tasation data object
     * @returns {Object} Validation result with valido and errores
     */
    caracteristicas: {
        validar(datos) {
            const errores = [];
            const car = datos.lote?.caracteristicas || {};
            const tipoLote = datos.lote?.tipoLote || '';

            const frente = parseFloat(car.frente) || 0;
            const fondo = parseFloat(car.fondo) || 0;
            const fondoFicticio = parseFloat(car.fondoFicticio) || 0;
            const superficie = parseFloat(car.superficie) || 0;
            const zona = car.zona || '';

            // Validate frente
            if (frente <= 0) {
                errores.push({ campo: 'frenteInput', mensaje: 'El frente debe ser mayor a 0' });
            }

            // Validate fondo (except for irregular lots)
            if (tipoLote !== 'Irregular' && fondo <= 0) {
                errores.push({ campo: 'fondoInput', mensaje: 'El fondo debe ser mayor a 0' });
            }

            // For irregular lots: validate superficie and fondoFicticio
            if (tipoLote === 'Irregular') {
                if (superficie <= 0) {
                    errores.push({ campo: 'superficieInput', mensaje: 'La superficie debe ser mayor a 0' });
                }
                if (fondoFicticio <= 0) {
                    errores.push({ campo: 'fondoFicticioInput', mensaje: 'El fondo ficticio debe ser mayor a 0' });
                }
            }

            // For corner lots: validate zona
            if (tipoLote === 'Esquina' || tipoLote === 'Esquina larga (+30m)') {
                if (!zona || zona === '') {
                    errores.push({ campo: 'zonaInput', mensaje: 'Seleccioná la zona' });
                }
            }

            // For esquina larga (+30m): validate that one side is greater than 30
            if (tipoLote === 'Esquina larga (+30m)') {
                if (frente <= 30 && fondo <= 30) {
                    errores.push({ campo: null, mensaje: 'Para esquina larga (+30m), uno de los lados debe ser mayor a 30m' });
                }
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
window.LoteValidator = LoteValidator;

/* =========================
   COMPARABLE NORMALIZER
   Capa de normalización de comparables
   Convierte comparables de cualquier fuente a un modelo canónico
========================= */

/**
 * Normaliza un comparable a la forma canónica
 * @param {Object} datos - Datos crudos del comparable
 * @param {string} tipo - Tipo de inmueble ('lote', 'departamento', 'casa')
 * @returns {Object} Comparable normalizado en forma canónica
 */
function normalizarComparable(datos, tipo) {
    if (!datos) return null;

    const fuente = datos.fuente || 'manual';
    let normalizado = {
        id: datos.id,
        direccion: datos.ubicacion?.direccion || datos.direccion || 'Sin dirección',
        ubicacion: datos.ubicacion || {},
        fuente: fuente,
        tasacionOrigenId: datos.tasacionOrigenId || null,
        valor: datos.valor || datos.valor_total || 0,
        valor_total: datos.valor_total || datos.valor || 0,
        valor_m2: datos.valor_m2 || ((datos.superficie > 0) ? datos.valor / datos.superficie : 0),
        superficie: datos.superficie || 0,
        superficie_homogeneizada: datos.superficie_homogeneizada ?? datos.superficie ?? 0,
        tipo_valor: datos.tipoValor || datos.tipo_valor || 'venta',
        tipoInmueble: datos.tipoInmueble || tipo,
        inmueble: {}
    };

    // Normalizar según fuente
    if (fuente === 'de_tasacion' || fuente === 'derivado_tasacion') {
        return normalizarDesdeTasacion(normalizado, datos, tipo);
    } else if (fuente === 'manual') {
        return normalizarDesdeManual(normalizado, datos, tipo);
    } else if (fuente === 'compartido') {
        return normalizarDesdeCompartido(normalizado, datos, tipo);
    }

    // Fallback: intentar extraer datos del objeto anidado si existe
    return normalizarDesdeObjetoAnidado(normalizado, datos, tipo);
}

/**
 * Normaliza un comparable derivado de una tasación previa
 */
function normalizarDesdeTasacion(normalizado, datos, tipo) {
    // Para comparables de tasación, los datos específicos están en el objeto anidado
    // que se debería haber copiado al crear el comparable desde la tasación
    const datosInmueble = datos[tipo] || datos.inmueble || {};

    if (tipo === 'lote') {
        normalizado.inmueble = {
            tipoLote: datos.tipoLote || datosInmueble.tipoLote || '',
            frente: datos.frente || datosInmueble.caracteristicas?.frente || datosInmueble.frente || 0,
            fondo: datos.fondo || datosInmueble.caracteristicas?.fondo || datosInmueble.fondo || 0,
            superficie: datos.superficie || datosInmueble.caracteristicas?.superficie || datosInmueble.superficie || 0,
            fos: datos.fos || datosInmueble.caracteristicas?.fos || datosInmueble.fos || null,
            fot: datos.fot || datosInmueble.caracteristicas?.fot || datosInmueble.fot || null
        };
    } else if (tipo === 'departamento') {
        normalizado.inmueble = {
            ubicacionPlantaCoef: datos.ubicacionPlantaCoef || datosInmueble.ubicacionPlantaCoef || null,
            ubicacionPisoCoef: datos.ubicacionPisoCoef || datosInmueble.ubicacionPisoCoef || null,
            caracteristicaConstructivaCoef: datos.caracteristicaConstructivaCoef || datosInmueble.caracteristicaConstructivaCoef || null,
            superficieCubiertaCoef: datos.superficieCubiertaCoef || datosInmueble.superficieCubiertaCoef || null,
            antiguedad: datos.antiguedad ?? datosInmueble.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion ?? datosInmueble.estadoConservacion ?? null,
            superficie: datos.superficie || datosInmueble.superficie || datosInmueble.superficieTotal || 0,
            superficieTotal: datos.superficieTotal || datosInmueble.superficieTotal || datos.superficie || 0
        };
    } else if (tipo === 'casa') {
        normalizado.inmueble = {
            superficieCubiertaCoef: datos.superficieCubiertaCoef || datosInmueble.superficieCubiertaCoef || null,
            superficieTotalCoef: datos.superficieTotalCoef || datosInmueble.superficieTotalCoef || null,
            calidadConstruccionCoef: datos.calidadConstruccionCoef || datosInmueble.calidadConstruccionCoef || null,
            antiguedad: datos.antiguedad ?? datosInmueble.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion ?? datosInmueble.estadoConservacion ?? null,
            superficie: datos.superficie || datosInmueble.superficie || 0
        };
    }

    return normalizado;
}

/**
 * Normaliza un comparable manual (del formulario)
 */
function normalizarDesdeManual(normalizado, datos, tipo) {
    if (tipo === 'lote') {
        normalizado.inmueble = {
            tipoLote: datos.tipoLote || '',
            frente: datos.frente || 0,
            fondo: datos.fondo || 0,
            superficie: datos.superficie || 0,
            fos: datos.fos || null,
            fot: datos.fot || null
        };
    } else if (tipo === 'departamento') {
        normalizado.inmueble = {
            ubicacionPlantaCoef: datos.ubicacionPlantaCoef || null,
            ubicacionPisoCoef: datos.ubicacionPisoCoef || null,
            caracteristicaConstructivaCoef: datos.caracteristicaConstructivaCoef || null,
            superficieCubiertaCoef: datos.superficieCubiertaCoef || null,
            antiguedad: datos.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion ?? null,
            superficie: datos.superficie || 0,
            superficieTotal: datos.superficieTotal || datos.superficie || 0
        };
    } else if (tipo === 'casa') {
        normalizado.inmueble = {
            superficieCubiertaCoef: datos.superficieCubiertaCoef || null,
            superficieTotalCoef: datos.superficieTotalCoef || null,
            calidadConstruccionCoef: datos.calidadConstruccionCoef || null,
            antiguedad: datos.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion ?? null,
            superficie: datos.superficie || 0
        };
    }

    return normalizado;
}

/**
 * Normaliza un comparable compartido
 */
function normalizarDesdeCompartido(normalizado, datos, tipo) {
    // Los comparables compartidos ya deberían tener estructura canónica
    // Solo aseguramos que el objeto inmueble exista
    if (!datos.inmueble) {
        datos.inmueble = {};
    }
    normalizado.inmueble = datos.inmueble;
    return normalizado;
}

/**
 * Fallback: intenta extraer datos de objetos anidados (departamento, casa, lote)
 */
function normalizarDesdeObjetoAnidado(normalizado, datos, tipo) {
    const datosInmueble = datos[tipo] || datos.lote || datos.departamento || datos.casa || {};

    if (tipo === 'lote') {
        normalizado.inmueble = {
            tipoLote: datos.tipoLote || datosInmueble.tipoLote || '',
            frente: datos.frente || datosInmueble.caracteristicas?.frente || datosInmueble.frente || 0,
            fondo: datos.fondo || datosInmueble.caracteristicas?.fondo || datosInmueble.fondo || 0,
            superficie: datos.superficie || datosInmueble.caracteristicas?.superficie || datosInmueble.superficie || 0,
            fos: datos.fos || datosInmueble.caracteristicas?.fos || datosInmueble.fos || null,
            fot: datos.fot || datosInmueble.caracteristicas?.fot || datosInmueble.fot || null
        };
    } else if (tipo === 'departamento') {
        normalizado.inmueble = {
            ubicacionPlantaCoef: datos.ubicacionPlantaCoef || datosInmueble.ubicacionPlantaCoef || null,
            ubicacionPisoCoef: datos.ubicacionPisoCoef || datosInmueble.ubicacionPisoCoef || null,
            caracteristicaConstructivaCoef: datos.caracteristicaConstructivaCoef || datosInmueble.caracteristicaConstructivaCoef || null,
            superficieCubiertaCoef: datos.superficieCubiertaCoef || datosInmueble.superficieCubiertaCoef || null,
            antiguedad: datos.antiguedad ?? datosInmueble.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion ?? datosInmueble.estadoConservacion ?? null,
            superficie: datos.superficie || datosInmueble.superficie || datosInmueble.superficieTotal || 0,
            superficieTotal: datos.superficieTotal || datosInmueble.superficieTotal || datos.superficie || 0
        };
    } else if (tipo === 'casa') {
        normalizado.inmueble = {
            superficieCubiertaCoef: datos.superficieCubiertaCoef || datosInmueble.superficieCubiertaCoef || null,
            superficieTotalCoef: datos.superficieTotalCoef || datosInmueble.superficieTotalCoef || null,
            calidadConstruccionCoef: datos.calidadConstruccionCoef || datosInmueble.calidadConstruccionCoef || null,
            antiguedad: datos.antiguedad ?? datosInmueble.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion ?? datosInmueble.estadoConservacion ?? null,
            superficie: datos.superficie || datosInmueble.superficie || 0
        };
    }

    return normalizado;
}

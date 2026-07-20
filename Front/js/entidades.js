/* =========================
   SISTEMA DE ENTIDADES
   Gestión de Tasaciones, Comparables y Solicitudes
========================= */

/* =========================
   GENERADORES DE IDS
========================= */

/**
 * Genera un ID único para una entidad (prefijo + número secuencial)
 * @param {string} prefijo - Prefijo del ID (T, C, U, S)
 * @returns {Promise<string>} ID único (ej: T-15432)
 */
async function generarId(prefijo) {
    const API_URL = 'http://127.0.0.1:8080';
    const response = await fetch(`${API_URL}/api/ids/generar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: prefijo })
    });
    
    if (!response.ok) {
        throw new Error(`Error al generar ID: ${response.status}`);
    }
    
    const data = await response.json();
    return data.id;
}

/* =========================
   ALMACENAMIENTO DE ENTIDADES
========================= */


/**
 * Lee todas las tasaciones del almacenamiento
 * @returns {Promise<Array>} Array de tasaciones
 */
async function leerTasaciones() {
    try {
        const tasaciones = await listarTasacionesAPI(1);
        // Convertir formato de API al formato esperado por el frontend
        return tasaciones.map(t => ({
            id: t.id,
            idNum: parseInt(t.id.split('-')[1]),
            tipo: t.tipo,
            estado: t.estado,
            fechaCreacion: t.fecha_creacion,
            fechaModificacion: t.fecha_modificacion,
            ...t.datos,
            comparables: t.comparables_ids || [],
            datosCompletos: t.datos
        }));
    } catch (e) {
        console.error('Error al leer tasaciones:', e);
        return [];
    }
}

/**
 * Guarda todas las tasaciones en el almacenamiento
 * @param {Array} tasaciones - Array de tasaciones
 */
function guardarTasaciones(tasaciones) {
    // Esta función ya no se usa directamente, las tasaciones se guardan individualmente
    console.warn('guardarTasaciones está deprecado, usar crearTasacionAPI o actualizarTasacionAPI');
}

/**
 * Lee todas las comparables del almacenamiento
 * @returns {Promise<Array>} Array de comparables
 */
async function leerComparables() {
    try {
        const comparables = await listarComparablesAPI(1);
        // Convertir formato de API al formato esperado por el frontend
        return comparables.map(c => ({
            id: c.id,
            fechaCreacion: c.fecha_creacion,
            fechaModificacion: c.fecha_modificacion,
            ...c.datos
        }));
    } catch (e) {
        console.error('Error al leer comparables:', e);
        return [];
    }
}

/**
 * Guarda todas las comparables en el almacenamiento
 * @param {Array} comparables - Array de comparables
 */
function guardarComparables(comparables) {
    // Esta función ya no se usa directamente, los comparables se guardan individualmente
    console.warn('guardarComparables está deprecado, usar crearComparableAPI o actualizarComparableAPI');
}

/**
 * Crea un nuevo comparable como entidad independiente
 * @param {Object} datos - Datos del comparable
 * @returns {Promise<Object>} Comparable creado con ID
 */
async function crearComparable(datos) {
    try {
        // Normalizar fuente para que coincida con el CHECK de la base de datos
        const fuente = (datos.fuente === 'deTasacion' || datos.fuente === 'de_tasacion')
            ? 'de_tasacion'
            : (datos.fuente || 'manual');

        // Asegurar lat/lon no nulos (la tabla comparables tiene NOT NULL)
        const ubicacion = datos.ubicacion || {};
        if (ubicacion.lat === undefined || ubicacion.lat === null || ubicacion.lat === '') ubicacion.lat = 0;
        if (ubicacion.lon === undefined || ubicacion.lon === null || ubicacion.lon === '') ubicacion.lon = 0;

        // Usar ?? en campos numericos para no perder el 0
        const datosPayload = {
            fuente: fuente,
            tipoInmueble: datos.tipoInmueble,
            ubicacion: ubicacion,
            valor: datos.valor,
            tipoValor: datos.tipoValor || 'venta',
            tasacionOrigenId: datos.tasacionOrigenId || null,
            tipoLote: datos.tipoLote || null,
            frente: datos.frente ?? null,
            fondo: datos.fondo ?? null,
            superficie: datos.superficie ?? null,
            superficieCubierta: datos.superficieCubierta ?? null,
            superficieTerreno: datos.superficieTerreno ?? null,
            superficieTotal: datos.superficieTotal ?? null,
            antiguedad: datos.antiguedad ?? null,
            estadoConservacion: datos.estadoConservacion || null,
            ambientes: datos.ambientes ?? null,
            dormitorios: datos.dormitorios ?? null,
            banos: datos.banos ?? null,
            cochera: datos.cochera ?? null,
            tieneAscensor: datos.tieneAscensor ?? null,
            tienePileta: datos.tienePileta ?? null,
            tieneJardin: datos.tieneJardin ?? null,
            idEnviador: datos.idEnviador || null,
            idCreador: datos.idCreador || null,
            nombreCreador: datos.nombreCreador || null,
            lote: datos.lote || null,
            departamento: datos.departamento || null,
            casa: datos.casa || null,
            observaciones: datos.observaciones || '',
            fechaCreacion: new Date().toISOString()
        };

        const comparableAPI = await crearComparableAPI({
            usuario_id: 1,
            tipo_inmueble: datos.tipoInmueble,
            fuente: fuente,
            datos: datosPayload
        });
        
        return {
            id: comparableAPI.id,
            idNum: parseInt(comparableAPI.id.split('-')[1]),
            ...datosPayload
        };
    } catch (error) {
        console.error('Error al crear comparable en API:', error);
        throw error;
    }
}

/**
 * Crea un comparable compartido desde un link o envío
 * @param {Object} datos - Datos del comparable
 * @param {string} metodo - 'link' o 'enviado'
 * @param {string} idEnviador - ID del usuario que lo compartió (solo para 'enviado')
 * @param {string} idCreador - ID del usuario que lo creó
 * @param {string} nombreCreador - Nombre del creador (obligatorio para links sin cuenta)
 * @returns {Promise<Object>} Comparable compartido creado
 */
async function crearComparableCompartido(datos, metodo, idEnviador, idCreador, nombreCreador) {
    const comparable = await crearComparable({
        ...datos,
        fuente: 'compartido',
        idEnviador: metodo === 'enviado' ? idEnviador : null,
        idCreador: idCreador || 0,
        nombreCreador: nombreCreador || 'Anónimo'
    });
    
    return comparable;
}

/**
 * Obtiene un comparable por su ID
 * @param {string} id - ID del comparable
 * @returns {Promise<Object|null>} Comparable o null si no existe
 */
async function obtenerComparablePorId(id) {
    try {
        const comparable = await obtenerComparableAPI(id);
        if (!comparable) return null;
        
        return {
            id: comparable.id,
            ...comparable.datos
        };
    } catch (error) {
        console.error('Error al obtener comparable:', error);
        return null;
    }
}

/**
 * Actualiza un comparable existente
 * @param {string} id - ID del comparable
 * @param {Object} datos - Datos actualizados
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
async function actualizarComparable(id, datos) {
    try {
        await actualizarComparableAPI(id, { datos });
        return true;
    } catch (error) {
        console.error('Error al actualizar comparable:', error);
        return false;
    }
}

/**
 * Elimina un comparable por su ID
 * @param {string} id - ID del comparable
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
async function eliminarComparable(id) {
    try {
        await eliminarComparableAPI(id);
        return true;
    } catch (error) {
        console.error('Error al eliminar comparable:', error);
        return false;
    }
}

/**
 * Lee todas las solicitudes del almacenamiento
 * @returns {Promise<Array>} Array de solicitudes
 */
async function leerSolicitudes() {
    try {
        const solicitudes = await listarSolicitudesAPI(1);
        // Convertir formato de API al formato esperado por el frontend
        return solicitudes.map(s => ({
            id: s.id,
            tasacionId: s.tasacion_id,
            linkPublico: s.link_publico,
            estado: s.estado,
            ...s.datos
        }));
    } catch (e) {
        console.error('Error al leer solicitudes:', e);
        return [];
    }
}

/**
 * Guarda todas las solicitudes en el almacenamiento
 * @param {Array} solicitudes - Array de solicitudes
 */
function guardarSolicitudes(solicitudes) {
    // Esta función ya no se usa directamente, las solicitudes se guardan individualmente
    console.warn('guardarSolicitudes está deprecado, usar crearSolicitudAPI o actualizarSolicitudAPI');
}

/* =========================
   MODELOS DE DATOS
========================= */

/**
 * Crea una nueva entidad Tasación
 * @param {Object} datos - Datos de la tasación
 * @returns {Promise<Object>} Entidad Tasación
 */
async function crearTasacion(datos = {}) {
    try {
        const datosCompletos = datos.datos || {
            tipo: null,
            ubicacion: {
                direccion: "",
                provincia: "",
                localidad: "",
                lat: null,
                lon: null,
                orientacion: ""
            },
            lote: {
                tipoLote: "",
                servicios: [],
                caracteristicas: {},
                observaciones: ""
            },
            departamento: {
                ambientes: "",
                dormitorios: "",
                banos: "",
                cochera: false,
                baulera: false,
                servicios: [],
                amenities: [],
                infraestructura: [],
                observaciones: "",
                ubicacionPlanta: "",
                ubicacionPlantaCoef: 0,
                tieneAscensor: "",
                ubicacionPiso: "",
                ubicacionPisoCoef: 0,
                superficieCubierta: "",
                superficieCubiertaCoef: 0,
                antiguedad: "",
                estadoConservacion: "",
                estadoConservacionCoef: 0,
                caracteristicaConstructiva: "",
                caracteristicaConstructivaCoef: 0,
                ubicacionEdificio: "",
                homogeneizacion: {
                    cubierto: { superficie: 0, coeficiente: 1, homogeneizada: 0 },
                    semicubierto: { superficie: 0, coeficiente: 0.50, homogeneizada: 0 },
                    balcon: { superficie: 0, coeficiente: 0.30, homogeneizada: 0 },
                    descubierto: { superficie: 0, coeficiente: 0.20, homogeneizada: 0 },
                    totalSuperficie: 0,
                    totalHomogeneizada: 0
                }
            },
            comparables: []
        };
        
        const tasacionAPI = await crearTasacionAPI({
            usuario_id: 1,
            tipo: datos.tipo || 'lote',
            estado: datos.estado || 'borrador',
            datos: datosCompletos,
            comparables_ids: datos.comparables || []
        });
        
        return {
            id: tasacionAPI.id,
            idNum: parseInt(tasacionAPI.id.split('-')[1]),
            tipo: datos.tipo || 'lote',
            estado: datos.estado || 'borrador',
            origen: datos.origen || 'propia',
            origenId: datos.origenId || null,
            propietarioId: datos.propietarioId || null,
            fechaCreacion: tasacionAPI.fecha_creacion,
            fechaModificacion: tasacionAPI.fecha_modificacion,
            datos: datosCompletos,
            resultado: datos.resultado || null,
            comparables: datos.comparables || [],
            datosCompletos: datosCompletos
        };
    } catch (error) {
        console.error('Error al crear tasación en API:', error);
        throw error;
    }
}

/**
 * Crea una nueva entidad Solicitud
 * @param {Object} datos - Datos de la solicitud
 * @returns {Promise<Object>} Entidad Solicitud
 */
async function crearSolicitud(datos = {}) {
    try {
        const solicitudAPI = await crearSolicitudAPI({
            usuario_id: 1,
            tasacion_id: datos.tasacionId,
            estado: datos.estado || 'pendiente',
            datos: datos.datosSolicitados || {}
        });
        
        return {
            id: solicitudAPI.id,
            idNum: parseInt(solicitudAPI.id.split('-')[1]),
            tipo: datos.tipo || 'lote',
            estado: solicitudAPI.estado,
            creadorId: datos.creadorId || null,
            fechaCreacion: solicitudAPI.fecha_creacion,
            linkPublico: solicitudAPI.link_publico,
            datosSolicitados: datos.datosSolicitados || {},
            tasacionId: solicitudAPI.tasacion_id
        };
    } catch (error) {
        console.error('Error al crear solicitud en API:', error);
        throw error;
    }
}

/* =========================
   OPERACIONES DE ENTIDADES
========================= */

/**
 * Guarda una tasación en el almacenamiento
 * @param {Object} tasacion - Tasación a guardar
 */
async function guardarTasacionEntidad(tasacion) {
    try {
        await actualizarTasacionAPI(tasacion.id, {
            estado: tasacion.estado,
            datos: tasacion.datos,
            comparables_ids: tasacion.comparables || []
        });
    } catch (error) {
        console.error('Error al guardar tasación:', error);
        throw error;
    }
}

/**
 * Elimina una tasación del almacenamiento
 * @param {string} id - ID de la tasación a eliminar
 */
async function eliminarTasacionEntidad(id) {
    try {
        await eliminarTasacionAPI(id);
    } catch (error) {
        console.error('Error al eliminar tasación:', error);
        throw error;
    }
}

/**
 * Obtiene una tasación por su ID público
 * @param {string} id - ID público de la tasación
 * @returns {Promise<Object|null>} Tasación encontrada o null
 */
async function obtenerTasacionPorID(id) {
    try {
        const tasacion = await obtenerTasacionAPI(id);
        if (!tasacion) return null;
        
        return {
            id: tasacion.id,
            idNum: parseInt(tasacion.id.split('-')[1]),
            tipo: tasacion.tipo,
            estado: tasacion.estado,
            ...tasacion.datos,
            comparables: tasacion.comparables_ids || [],
            datosCompletos: tasacion.datos
        };
    } catch (error) {
        console.error('Error al obtener tasación por ID:', error);
        return null;
    }
}

/**
 * Guarda un comparable en el almacenamiento
 * @param {Object} comparable - Comparable a guardar
 */
async function guardarComparableEntidad(comparable) {
    try {
        await actualizarComparableAPI(comparable.id, { datos: comparable });
    } catch (error) {
        console.error('Error al guardar comparable:', error);
        throw error;
    }
}

/**
 * Elimina un comparable del almacenamiento
 * @param {string} uuid - UUID del comparable a eliminar
 */
async function eliminarComparableEntidad(id) {
    try {
        await eliminarComparableAPI(id);
    } catch (error) {
        console.error('Error al eliminar comparable:', error);
        throw error;
    }
}

/**
 * Obtiene un comparable por su ID público
 * @param {string} id - ID público del comparable
 * @returns {Object|null} Comparable encontrado o null
 */
async function obtenerComparablePorID(id) {
    try {
        const comparable = await obtenerComparableAPI(id);
        if (!comparable) return null;
        
        return {
            id: comparable.id,
            ...comparable.datos
        };
    } catch (error) {
        console.error('Error al obtener comparable por ID:', error);
        return null;
    }
}

/**
 * Guarda una solicitud en el almacenamiento
 * @param {Object} solicitud - Solicitud a guardar
 */
async function guardarSolicitudEntidad(solicitud) {
    try {
        await actualizarSolicitudAPI(solicitud.id, {
            estado: solicitud.estado,
            datos: solicitud.datosSolicitados || {}
        });
    } catch (error) {
        console.error('Error al guardar solicitud:', error);
        throw error;
    }
}

/**
 * Elimina una solicitud del almacenamiento
 * @param {string} uuid - UUID de la solicitud a eliminar
 */
async function eliminarSolicitudEntidad(id) {
    try {
        await eliminarSolicitudAPI(id);
    } catch (error) {
        console.error('Error al eliminar solicitud:', error);
        throw error;
    }
}

/**
 * Obtiene una solicitud por su ID público
 * @param {string} id - ID público de la solicitud
 * @returns {Object|null} Solicitud encontrada o null
 */
async function obtenerSolicitudPorID(id) {
    try {
        const solicitud = await obtenerSolicitudAPI(id);
        if (!solicitud) return null;
        
        return {
            id: solicitud.id,
            tasacionId: solicitud.tasacion_id,
            linkPublico: solicitud.link_publico,
            estado: solicitud.estado,
            ...solicitud.datos
        };
    } catch (error) {
        console.error('Error al obtener solicitud por ID:', error);
        return null;
    }
}

/* =========================
   OPERACIONES DE COMPARTIR
========================= */

/**
 * Comparte una tasación creando una copia con nuevo ID y UUID
 * @param {string} tasacionId - ID público de la tasación a compartir
 * @returns {Promise<Object|null>} Nueva tasación compartida o null
 */
async function compartirTasacion(tasacionId) {
    const original = await obtenerTasacionPorID(tasacionId);
    if (!original) return null;
    
    const copia = JSON.parse(JSON.stringify(original));
    
    // Actualizar metadatos
    copia.datosCompletos = copia.datosCompletos || {};
    copia.datosCompletos.origen = 'compartida';
    copia.datosCompletos.origenId = original.id;
    copia.estado = 'borrador';
    copia.fechaCreacion = new Date().toISOString();
    copia.fechaModificacion = new Date().toISOString();
    
    // Crear nueva copia en la API
    const nuevaTasacion = await crearTasacionAPI({
        usuario_id: 1,
        tipo: copia.tipo || 'lote',
        estado: 'borrador',
        datos: copia.datosCompletos,
        comparables_ids: copia.comparables || []
    });
    
    copia.id = nuevaTasacion.id;
    copia.idNum = parseInt(nuevaTasacion.id.split('-')[1]);
    
    return copia;
}

/**
 * Comparte un comparable creando una copia con nuevo ID y UUID
 * @param {string} comparableId - ID público del comparable a compartir
 * @returns {Promise<Object|null>} Nuevo comparable compartido o null
 */
async function compartirComparable(comparableId) {
    const original = await obtenerComparablePorID(comparableId);
    if (!original) return null;
    
    const copia = JSON.parse(JSON.stringify(original));
    
    // Actualizar metadatos
    copia.fuente = 'compartido';
    copia.origenId = original.id;
    copia.fechaCreacion = new Date().toISOString();
    copia.fechaModificacion = new Date().toISOString();
    
    // Crear nueva copia en la API
    const nuevoComparable = await crearComparableAPI({
        usuario_id: 1,
        tipo_inmueble: copia.tipoInmueble || copia.tipo || 'lote',
        fuente: 'compartido',
        datos: copia
    });
    
    copia.id = nuevoComparable.id;
    copia.idNum = parseInt(nuevoComparable.id.split('-')[1]);
    
    return copia;
}

/* =========================
   OPERACIONES DE SOLICITUDES
========================= */

/**
 * Responde una solicitud creando un comparable guardado
 * @param {string} solicitudId - ID público de la solicitud
 * @param {Object} datosRespuesta - Datos ingresados en la respuesta
 * @returns {Object|null} Nuevo comparable creado o null
 */
async function responderSolicitud(solicitudId, datosRespuesta) {
    const solicitud = await obtenerSolicitudPorID(solicitudId);
    if (!solicitud) return null;
    
    // Crear comparable guardado desde los datos de respuesta
    const comparable = await crearComparable({
        tipoInmueble: solicitud.tipo || datosRespuesta?.tipoInmueble || 'lote',
        fuente: 'solicitado',
        tasacionOrigenId: solicitud.tasacionId,
        ...datosRespuesta
    });
    
    // Eliminar la solicitud
    await eliminarSolicitudEntidad(solicitud.id);
    
    return comparable;
}

/* =========================
   COMPARABLES TEMPORALES Y DERIVADOS
========================= */

/**
 * Guarda un comparable temporal como guardado
 * @param {Object} comparableTemporal - Comparable temporal a guardar
 * @returns {Promise<Object|null>} Nuevo comparable guardado o null
 */
async function guardarComparableTemporalComoGuardado(comparableTemporal) {
    const datos = JSON.parse(JSON.stringify(comparableTemporal.datos || comparableTemporal));
    datos.fuente = comparableTemporal.fuente || 'manual';
    datos.tipoInmueble = comparableTemporal.tipoInmueble || comparableTemporal.tipo || datos.tipoInmueble || 'lote';
    if (comparableTemporal.origen) datos.origen = comparableTemporal.origen;
    if (comparableTemporal.clase) datos.clase = comparableTemporal.clase;
    
    // Crear nuevo comparable guardado en la API
    const comparableAPI = await crearComparableAPI({
        usuario_id: 1,
        tipo_inmueble: datos.tipoInmueble,
        fuente: datos.fuente,
        datos
    });
    
    return {
        id: comparableAPI.id,
        ...datos
    };
}

/**
 * Crea un comparable derivado desde una tasación
 * @param {string} tasacionId - ID público de la tasación origen
 * @returns {Promise<Object|null>} Nuevo comparable derivado o null
 */
async function crearComparableDerivadoDesdeTasacion(tasacionId) {
    const tasacion = await obtenerTasacionPorID(tasacionId);
    if (!tasacion) return null;
    
    // Crear comparable derivado (referencia a la tasación)
    const comparableDerivado = await crearComparable({
        tipoInmueble: tasacion.tipo,
        fuente: 'derivado_tasacion',
        tasacionOrigenId: tasacionId,
        datos: {
            origen: 'derivado_tasacion',
            tasacionOrigenId: tasacionId
        }
    });
    
    // Guardar la referencia a la tasación origen
    comparableDerivado.tasacionOrigenId = tasacionId;
    
    return comparableDerivado;
}

/**
 * Obtiene los datos completos de un comparable derivado
 * @param {Object} comparable - Comparable derivado
 * @returns {Object|null} Datos completos del comparable o null
 */
async function obtenerDatosComparableDerivado(comparable) {
    if (comparable.clase !== 'derivado' || !comparable.tasacionOrigenId) {
        return null;
    }
    
    const tasacion = await obtenerTasacionPorID(comparable.tasacionOrigenId);
    if (!tasacion) return null;
    
    const datos = tasacion.datosCompletos || tasacion.datos || {};
    
    // Retornar los datos de la tasación origen
    return {
        ubicacion: datos.ubicacion,
        lote: datos.lote,
        departamento: datos.departamento,
        valor: tasacion.resultado?.valor_final || datos.resultado?.valor_final || 0,
        tipoValor: 'venta'
    };
}

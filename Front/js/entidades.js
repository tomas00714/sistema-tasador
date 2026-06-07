/* =========================
   SISTEMA DE ENTIDADES
   Gestión de Tasaciones, Comparables y Solicitudes
========================= */

/* =========================
   GENERADORES DE IDs
========================= */

/**
 * Genera un ID público único para una entidad
 * @param {string} prefijo - Prefijo del ID (T, C, S)
 * @param {Function} existeFn - Función para verificar si el ID ya existe
 * @returns {string} ID público único
 */
function generarIdPublico(prefijo, existeFn) {
    const caracteres = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id;
    let intentos = 0;
    const maxIntentos = 100;

    do {
        id = prefijo + '-';
        for (let i = 0; i < 6; i++) {
            id += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        intentos++;
        
        if (intentos >= maxIntentos) {
            throw new Error(`No se pudo generar un ID único después de ${maxIntentos} intentos`);
        }
    } while (existeFn && existeFn(id));

    return id;
}

/**
 * Genera un UUID v4
 * @returns {string} UUID único
 */
function generarUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/* =========================
   ALMACENAMIENTO DE ENTIDADES
========================= */

const STORAGE_KEYS = {
    TASACIONES: 'tasador_tasaciones_v2',
    COMPARABLES: 'tasador_comparables_v2',
    SOLICITUDES: 'tasador_solicitudes_v2'
};

/**
 * Lee todas las tasaciones del almacenamiento
 * @returns {Array} Array de tasaciones
 */
function leerTasaciones() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.TASACIONES);
        return data ? JSON.parse(data) : [];
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
    try {
        localStorage.setItem(STORAGE_KEYS.TASACIONES, JSON.stringify(tasaciones));
    } catch (e) {
        console.error('Error al guardar tasaciones:', e);
    }
}

/**
 * Lee todas las comparables del almacenamiento
 * @returns {Array} Array de comparables
 */
function leerComparables() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.COMPARABLES);
        return data ? JSON.parse(data) : [];
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
    try {
        localStorage.setItem(STORAGE_KEYS.COMPARABLES, JSON.stringify(comparables));
    } catch (e) {
        console.error('Error al guardar comparables:', e);
    }
}

/**
 * Lee todas las solicitudes del almacenamiento
 * @returns {Array} Array de solicitudes
 */
function leerSolicitudes() {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.SOLICITUDES);
        return data ? JSON.parse(data) : [];
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
    try {
        localStorage.setItem(STORAGE_KEYS.SOLICITUDES, JSON.stringify(solicitudes));
    } catch (e) {
        console.error('Error al guardar solicitudes:', e);
    }
}

/* =========================
   MODELOS DE DATOS
========================= */

/**
 * Crea una nueva entidad Tasación
 * @param {Object} datos - Datos de la tasación
 * @returns {Object} Entidad Tasación
 */
function crearTasacion(datos = {}) {
    const tasaciones = leerTasaciones();
    
    const tasacion = {
        // Identificadores
        id: generarIdPublico('T', (id) => tasaciones.some(t => t.id === id)),
        uuid: generarUUID(),
        
        // Metadatos
        tipo: datos.tipo || 'lote',
        estado: datos.estado || 'borrador',
        origen: datos.origen || 'propia',
        origenId: datos.origenId || null,
        propietarioId: datos.propietarioId || null,
        
        // Fechas
        fechaCreacion: datos.fechaCreacion || new Date().toISOString(),
        fechaModificacion: datos.fechaModificacion || new Date().toISOString(),
        
        // Datos de la tasación (estructura existente)
        datos: datos.datos || {
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
        },
        
        // Resultado de la tasación
        resultado: datos.resultado || null,
        
        // Referencias a comparables (IDs públicos)
        comparables: datos.comparables || []
    };
    
    return tasacion;
}

/**
 * Crea una nueva entidad Comparable
 * @param {Object} datos - Datos del comparable
 * @returns {Object} Entidad Comparable
 */
function crearComparable(datos = {}) {
    const comparables = leerComparables();
    
    const comparable = {
        // Identificadores
        id: generarIdPublico('C', (id) => comparables.some(c => c.id === id)),
        uuid: generarUUID(),
        
        // Metadatos
        tipo: datos.tipo || 'lote',
        clase: datos.clase || 'guardado',
        origen: datos.origen || 'manual',
        origenId: datos.origenId || null,
        propietarioId: datos.propietarioId || null,
        
        // Fechas
        fechaCreacion: datos.fechaCreacion || new Date().toISOString(),
        fechaModificacion: datos.fechaModificacion || new Date().toISOString(),
        
        // Datos del comparable (estructura existente)
        datos: datos.datos || {
            ubicacion: {
                direccion: "",
                provincia: "",
                localidad: "",
                lat: null,
                lon: null
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
            valor: 0,
            tipoValor: 'venta'
        },
        
        // Para comparables derivados: referencia a la tasación origen
        tasacionOrigenId: datos.tasacionOrigenId || null
    };
    
    return comparable;
}

/**
 * Crea una nueva entidad Solicitud
 * @param {Object} datos - Datos de la solicitud
 * @returns {Object} Entidad Solicitud
 */
function crearSolicitud(datos = {}) {
    const solicitudes = leerSolicitudes();
    
    const solicitud = {
        // Identificadores
        id: generarIdPublico('S', (id) => solicitudes.some(s => s.id === id)),
        uuid: generarUUID(),
        
        // Metadatos
        tipo: datos.tipo || 'lote',
        estado: datos.estado || 'pendiente',
        creadorId: datos.creadorId || null,
        
        // Fechas
        fechaCreacion: datos.fechaCreacion || new Date().toISOString(),
        
        // Link público para compartir
        linkPublico: datos.linkPublico || null,
        
        // Datos solicitados
        datosSolicitados: datos.datosSolicitados || {}
    };
    
    return solicitud;
}

/* =========================
   OPERACIONES DE ENTIDADES
========================= */

/**
 * Guarda una tasación en el almacenamiento
 * @param {Object} tasacion - Tasación a guardar
 */
function guardarTasacionEntidad(tasacion) {
    const tasaciones = leerTasaciones();
    const index = tasaciones.findIndex(t => t.uuid === tasacion.uuid);
    
    tasacion.fechaModificacion = new Date().toISOString();
    
    if (index !== -1) {
        tasaciones[index] = tasacion;
    } else {
        tasaciones.push(tasacion);
    }
    
    guardarTasaciones(tasaciones);
}

/**
 * Elimina una tasación del almacenamiento
 * @param {string} uuid - UUID de la tasación a eliminar
 */
function eliminarTasacionEntidad(uuid) {
    const tasaciones = leerTasaciones();
    const filtradas = tasaciones.filter(t => t.uuid !== uuid);
    guardarTasaciones(filtradas);
}

/**
 * Obtiene una tasación por su UUID
 * @param {string} uuid - UUID de la tasación
 * @returns {Object|null} Tasación encontrada o null
 */
function obtenerTasacionPorUUID(uuid) {
    const tasaciones = leerTasaciones();
    return tasaciones.find(t => t.uuid === uuid) || null;
}

/**
 * Obtiene una tasación por su ID público
 * @param {string} id - ID público de la tasación
 * @returns {Object|null} Tasación encontrada o null
 */
function obtenerTasacionPorID(id) {
    const tasaciones = leerTasaciones();
    return tasaciones.find(t => t.id === id) || null;
}

/**
 * Guarda un comparable en el almacenamiento
 * @param {Object} comparable - Comparable a guardar
 */
function guardarComparableEntidad(comparable) {
    const comparables = leerComparables();
    const index = comparables.findIndex(c => c.uuid === comparable.uuid);
    
    comparable.fechaModificacion = new Date().toISOString();
    
    if (index !== -1) {
        comparables[index] = comparable;
    } else {
        comparables.push(comparable);
    }
    
    guardarComparables(comparables);
}

/**
 * Elimina un comparable del almacenamiento
 * @param {string} uuid - UUID del comparable a eliminar
 */
function eliminarComparableEntidad(uuid) {
    const comparables = leerComparables();
    const filtrados = comparables.filter(c => c.uuid !== uuid);
    guardarComparables(filtrados);
}

/**
 * Obtiene un comparable por su UUID
 * @param {string} uuid - UUID del comparable
 * @returns {Object|null} Comparable encontrado o null
 */
function obtenerComparablePorUUID(uuid) {
    const comparables = leerComparables();
    return comparables.find(c => c.uuid === uuid) || null;
}

/**
 * Obtiene un comparable por su ID público
 * @param {string} id - ID público del comparable
 * @returns {Object|null} Comparable encontrado o null
 */
function obtenerComparablePorID(id) {
    const comparables = leerComparables();
    return comparables.find(c => c.id === id) || null;
}

/**
 * Guarda una solicitud en el almacenamiento
 * @param {Object} solicitud - Solicitud a guardar
 */
function guardarSolicitudEntidad(solicitud) {
    const solicitudes = leerSolicitudes();
    const index = solicitudes.findIndex(s => s.uuid === solicitud.uuid);
    
    if (index !== -1) {
        solicitudes[index] = solicitud;
    } else {
        solicitudes.push(solicitud);
    }
    
    guardarSolicitudes(solicitudes);
}

/**
 * Elimina una solicitud del almacenamiento
 * @param {string} uuid - UUID de la solicitud a eliminar
 */
function eliminarSolicitudEntidad(uuid) {
    const solicitudes = leerSolicitudes();
    const filtradas = solicitudes.filter(s => s.uuid !== uuid);
    guardarSolicitudes(filtradas);
}

/**
 * Obtiene una solicitud por su UUID
 * @param {string} uuid - UUID de la solicitud
 * @returns {Object|null} Solicitud encontrada o null
 */
function obtenerSolicitudPorUUID(uuid) {
    const solicitudes = leerSolicitudes();
    return solicitudes.find(s => s.uuid === uuid) || null;
}

/**
 * Obtiene una solicitud por su ID público
 * @param {string} id - ID público de la solicitud
 * @returns {Object|null} Solicitud encontrada o null
 */
function obtenerSolicitudPorID(id) {
    const solicitudes = leerSolicitudes();
    return solicitudes.find(s => s.id === id) || null;
}

/* =========================
   OPERACIONES DE COMPARTIR
========================= */

/**
 * Comparte una tasación creando una copia con nuevo ID y UUID
 * @param {string} tasacionId - ID público de la tasación a compartir
 * @returns {Object|null} Nueva tasación compartida o null
 */
function compartirTasacion(tasacionId) {
    const original = obtenerTasacionPorID(tasacionId);
    if (!original) return null;
    
    const copia = JSON.parse(JSON.stringify(original));
    
    // Generar nuevos identificadores
    const tasaciones = leerTasaciones();
    copia.id = generarIdPublico('T', (id) => tasaciones.some(t => t.id === id));
    copia.uuid = generarUUID();
    
    // Actualizar metadatos
    copia.origen = 'compartida';
    copia.origenId = original.id;
    copia.estado = 'borrador';
    copia.fechaCreacion = new Date().toISOString();
    copia.fechaModificacion = new Date().toISOString();
    
    // Guardar la copia
    guardarTasacionEntidad(copia);
    
    return copia;
}

/**
 * Comparte un comparable creando una copia con nuevo ID y UUID
 * @param {string} comparableId - ID público del comparable a compartir
 * @returns {Object|null} Nuevo comparable compartido o null
 */
function compartirComparable(comparableId) {
    const original = obtenerComparablePorID(comparableId);
    if (!original) return null;
    
    const copia = JSON.parse(JSON.stringify(original));
    
    // Generar nuevos identificadores
    const comparables = leerComparables();
    copia.id = generarIdPublico('C', (id) => comparables.some(c => c.id === id));
    copia.uuid = generarUUID();
    
    // Actualizar metadatos
    copia.origenId = original.id;
    copia.fechaCreacion = new Date().toISOString();
    copia.fechaModificacion = new Date().toISOString();
    
    // Guardar la copia
    guardarComparableEntidad(copia);
    
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
function responderSolicitud(solicitudId, datosRespuesta) {
    const solicitud = obtenerSolicitudPorID(solicitudId);
    if (!solicitud) return null;
    
    // Crear comparable guardado desde los datos de respuesta
    const comparable = crearComparable({
        tipo: solicitud.tipo,
        clase: 'guardado',
        origen: 'solicitado',
        datos: datosRespuesta
    });
    
    // Guardar el comparable
    guardarComparableEntidad(comparable);
    
    // Eliminar la solicitud
    eliminarSolicitudEntidad(solicitud.uuid);
    
    return comparable;
}

/* =========================
   COMPARABLES TEMPORALES Y DERIVADOS
========================= */

/**
 * Guarda un comparable temporal como guardado
 * @param {Object} comparableTemporal - Comparable temporal a guardar
 * @returns {Object|null} Nuevo comparable guardado o null
 */
function guardarComparableTemporalComoGuardado(comparableTemporal) {
    // Crear nuevo comparable guardado
    const comparableGuardado = crearComparable({
        tipo: comparableTemporal.tipo,
        clase: 'guardado',
        origen: comparableTemporal.origen || 'manual',
        datos: JSON.parse(JSON.stringify(comparableTemporal.datos))
    });
    
    // Guardar el comparable
    guardarComparableEntidad(comparableGuardado);
    
    return comparableGuardado;
}

/**
 * Crea un comparable derivado desde una tasación
 * @param {string} tasacionId - ID público de la tasación origen
 * @returns {Object|null} Nuevo comparable derivado o null
 */
function crearComparableDerivadoDesdeTasacion(tasacionId) {
    const tasacion = obtenerTasacionPorID(tasacionId);
    if (!tasacion) return null;
    
    // Crear comparable derivado (referencia a la tasación)
    const comparableDerivado = crearComparable({
        tipo: tasacion.tipo,
        clase: 'derivado',
        origen: 'derivado_tasacion',
        origenId: tasacionId,
        datos: {} // No tiene datos propios, referencia a la tasación
    });
    
    // Guardar la referencia a la tasación origen
    comparableDerivado.tasacionOrigenId = tasacionId;
    
    // Guardar el comparable
    guardarComparableEntidad(comparableDerivado);
    
    return comparableDerivado;
}

/**
 * Obtiene los datos completos de un comparable derivado
 * @param {Object} comparable - Comparable derivado
 * @returns {Object|null} Datos completos del comparable o null
 */
function obtenerDatosComparableDerivado(comparable) {
    if (comparable.clase !== 'derivado' || !comparable.tasacionOrigenId) {
        return null;
    }
    
    const tasacion = obtenerTasacionPorID(comparable.tasacionOrigenId);
    if (!tasacion) return null;
    
    // Retornar los datos de la tasación origen
    return {
        ubicacion: tasacion.datos.ubicacion,
        lote: tasacion.datos.lote,
        departamento: tasacion.datos.departamento,
        valor: tasacion.resultado?.valor_final || 0,
        tipoValor: 'venta'
    };
}

/* =========================
   MIGRACIÓN DE DATOS
========================= */

const STORAGE_KEY_ANTIGUO = 'tasador_historial';

/**
 * Verifica si hay datos antiguos que necesitan migración
 * @returns {boolean} True si hay datos antiguos
 */
function hayDatosAntiguos() {
    const datosAntiguos = localStorage.getItem(STORAGE_KEY_ANTIGUO);
    const datosNuevos = localStorage.getItem(STORAGE_KEYS.TASACIONES);
    return datosAntiguos && !datosNuevos;
}

/**
 * Migración de datos antiguos al nuevo formato de entidades
 * @returns {Object} Resultado de la migración
 */
function migrarDatosAntiguos() {
    try {
        // Leer datos antiguos
        const datosAntiguosStr = localStorage.getItem(STORAGE_KEY_ANTIGUO);
        if (!datosAntiguosStr) {
            return { exito: false, mensaje: 'No hay datos antiguos para migrar' };
        }
        
        const datosAntiguos = JSON.parse(datosAntiguosStr);
        if (!Array.isArray(datosAntiguos) || datosAntiguos.length === 0) {
            return { exito: false, mensaje: 'Datos antiguos vacíos o inválidos' };
        }
        
        // Verificar si ya se migró
        if (localStorage.getItem(STORAGE_KEYS.TASACIONES)) {
            return { exito: false, mensaje: 'Los datos ya fueron migrados previamente' };
        }
        
        const tasacionesMigradas = [];
        const comparablesMigrados = [];
        const mapaComparablesAntiguos = new Map(); // Mapa de ID antiguo -> ID nuevo
        
        // Migrar cada tasación
        for (const tasacionAntigua of datosAntiguos) {
            // Migrar comparables embebidos a entidades independientes
            const idsComparablesNuevos = [];
            
            if (tasacionAntigua.comparables && Array.isArray(tasacionAntigua.comparables)) {
                for (const compAntiguo of tasacionAntigua.comparables) {
                    // Crear comparable guardado
                    const comparableNuevo = crearComparable({
                        tipo: compAntiguo.tipoInmueble || tasacionAntigua.tipo,
                        clase: 'guardado',
                        origen: compAntiguo.fuente === 'historial' ? 'manual' : 'manual',
                        datos: {
                            ubicacion: compAntiguo.ubicacion || {},
                            lote: compAntiguo.snapshot?.lote || {},
                            departamento: compAntiguo.snapshot?.departamento || {},
                            valor: compAntiguo.valor || 0,
                            tipoValor: compAntiguo.tipoValor || 'venta'
                        }
                    });
                    
                    // Guardar el comparable
                    guardarComparableEntidad(comparableNuevo);
                    comparablesMigrados.push(comparableNuevo);
                    
                    // Guardar referencia
                    idsComparablesNuevos.push(comparableNuevo.id);
                    
                    // Guardar en mapa para referencia futura
                    if (compAntiguo.id) {
                        mapaComparablesAntiguos.set(compAntiguo.id, comparableNuevo.id);
                    }
                }
            }
            
            // Crear tasación nueva
            const tasacionNueva = crearTasacion({
                tipo: tasacionAntigua.tipo,
                estado: tasacionAntigua.estado === 'completada' ? 'completada' : 'borrador',
                origen: 'propia',
                origenId: null,
                datos: {
                    tipo: tasacionAntigua.tipo,
                    ubicacion: tasacionAntigua.ubicacion || {},
                    lote: tasacionAntigua.lote || {},
                    departamento: tasacionAntigua.departamento || {},
                    comparables: [] // Los comparables ahora son referencias externas
                },
                resultado: tasacionAntigua.resultado || null,
                comparables: idsComparablesNuevos // Referencias a comparables
            });
            
            // Guardar la tasación
            guardarTasacionEntidad(tasacionNueva);
            tasacionesMigradas.push(tasacionNueva);
        }
        
        // Marcar migración como completada
        localStorage.setItem('tasador_migracion_completada', new Date().toISOString());
        
        return {
            exito: true,
            mensaje: `Migración completada: ${tasacionesMigradas.length} tasaciones y ${comparablesMigrados.length} comparables migrados`,
            tasaciones: tasacionesMigradas.length,
            comparables: comparablesMigrados.length
        };
        
    } catch (e) {
        console.error('Error durante migración:', e);
        return { exito: false, mensaje: `Error durante migración: ${e.message}` };
    }
}

/**
 * Ejecuta la migración si hay datos antiguos
 * @returns {Object} Resultado de la migración
 */
function ejecutarMigracionSiNecesaria() {
    if (hayDatosAntiguos()) {
        console.log('Iniciando migración de datos antiguos...');
        const resultado = migrarDatosAntiguos();
        console.log(resultado.mensaje);
        return resultado;
    }
    return { exito: true, mensaje: 'No se requiere migración' };
}

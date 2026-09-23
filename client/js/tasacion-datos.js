/* =========================
   TASACION DATOS
   Guardado/carga de datos y localStorage
========================= */

let guardandoTasacion = false;

// Nuevos campos para informe
let datosInforme = {
    nomenclaturaCatastral: "",
    clienteNombre: "",
    finalidad: "Tasación comercial",
    entorno: {
        descripcion: "",
        transporte: "",
        comercios: "",
        universidades: "",
        puntosInteres: ""
    },
    ambientes: []
};

function guardarTodosLosDatos() {
    if (pasoActual === 2) {
        if (datosTasacion.tipo === 'lote') {
            guardarDatosPantalla1();
        } else if (datosTasacion.tipo === 'departamento') {
            guardarDatosPantallaDepartamento();
        } else if (datosTasacion.tipo === 'casa') {
            guardarDatosPantallaCasa();
        }
    } else if (pasoActual === 3) {
        if (datosTasacion.tipo === 'lote') {
            guardarDatosPantalla3();
        } else if (datosTasacion.tipo === 'departamento') {
            guardarDatosCaracteristicasDepartamento();
        } else if (datosTasacion.tipo === 'casa') {
            guardarDatosCaracteristicasCasa();
        }
    } else if (pasoActual === 4) {
        if (datosTasacion.tipo === 'departamento') {
            guardarDatosHomogeneizacion();
        } else if (datosTasacion.tipo === 'casa') {
            guardarDatosHomogeneizacionCasa();
        }
    }
}

function capturarDatosCompletos() {
    const datos = {
        pasoActual: pasoActual,
        tipo: datosTasacion.tipo,
        ubicacion: { ...datosTasacion.ubicacion },
        comparables: JSON.parse(JSON.stringify(datosTasacion.comparables)),
        resultado: resultadoTasacion ? JSON.parse(JSON.stringify(resultadoTasacion)) : null
    };
    
    if (datosTasacion.tipo === 'lote') {
        datos.lote = {
            tipoLote: datosTasacion.lote.tipoLote,
            servicios: [...datosTasacion.lote.servicios],
            caracteristicas: { ...datosTasacion.lote.caracteristicas },
            observaciones: datosTasacion.lote.observaciones || "",
            mejoras: datosTasacion.lote.mejoras || ""
        };
    } else if (datosTasacion.tipo === 'departamento') {
        datos.departamento = JSON.parse(JSON.stringify(datosTasacion.departamento));
    } else if (datosTasacion.tipo === 'casa') {
        datos.casa = JSON.parse(JSON.stringify(datosTasacion.casa));
    }
    
    if (typeof coeficientesPersonalizados !== 'undefined' && Object.keys(coeficientesPersonalizados).length > 0) {
        datos.coeficientesPersonalizados = JSON.parse(JSON.stringify(coeficientesPersonalizados));
    }

    console.log('[CAPTURAR] datosCompletos.coeficientesPersonalizados:', JSON.stringify(datos.coeficientesPersonalizados, null, 2));

    // Agregar datos de informe
    datos.ambientes = datosInforme.ambientes || [];
    datos.entorno = datosInforme.entorno || {};

    console.log('[CAPTURAR] datosCompletos con informe:', JSON.stringify({
        ambientes: datos.ambientes,
        entorno: datos.entorno
    }, null, 2));

    return datos;
}

function limpiarDatosTasacion() {
    try {
        datosTasacion.tipo = null;
        datosTasacion.cantDeEdiciones = 0;
        datosTasacion.ubicacion = {
            direccion: "",
            provincia: "",
            localidad: "",
            lat: null,
            lon: null,
            orientacion: ""
        };
        
        // Resetear datos de informe
        datosInforme = {
            nomenclaturaCatastral: "",
            clienteNombre: "",
            finalidad: "Tasación comercial",
            entorno: {
                descripcion: "",
                transporte: "",
                comercios: "",
                universidades: "",
                puntosInteres: ""
            },
            ambientes: []
        };
        datosTasacion.lote = {
            tipoLote: "",
            servicios: [],
            caracteristicas: {},
            observaciones: "",
            mejoras: ""
        };
        datosTasacion.departamento = {
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
            fot: null,
            fos: null,
            homogeneizacion: {
                cubierto: { superficie: 0, coeficiente: 1, homogeneizada: 0 },
                semicubierto: { superficie: 0, coeficiente: 0.50, homogeneizada: 0 },
                balcon: { superficie: 0, coeficiente: 0.30, homogeneizada: 0 },
                descubierto: { superficie: 0, coeficiente: 0.20, homogeneizada: 0 },
                totalSuperficie: 0,
                totalHomogeneizada: 0
            }
        };
        datosTasacion.casa = {
            ambientes: "",
            dormitorios: "",
            banos: "",
            cochera: false,
            baulera: false,
            servicios: [],
            observaciones: "",
            superficieCubierta: "",
            superficieCubiertaCoef: 0,
            superficieTotal: "",
            superficieTotalCoef: 0,
            superficieTerreno: "",
            antiguedad: "",
            estadoConservacion: "",
            caracteristicaConstructiva: "",
            caracteristicaConstructivaCoef: 0,
            zonificacion: "",
            fot: null,
            fos: null,
            superficieHomogeneizada: 0,
            homogeneizacion: {
                cubierto: { superficie: 0, coeficiente: 1, homogeneizada: 0 },
                semicubierto: { superficie: 0, coeficiente: 0.50, homogeneizada: 0 },
                balcon: { superficie: 0, coeficiente: 0.30, homogeneizada: 0 },
                descubierto: { superficie: 0, coeficiente: 0.20, homogeneizada: 0 },
                totalSuperficie: 0,
                totalHomogeneizada: 0
            }
        };
        datosTasacion.comparables = [];
        datosTasacion.resultado = null;

        // Resetear ID a estado inicial (nueva tasación)
        tasacionId = 0;
        tasacionIdReal = null;
        pasoActual = 1;
        tipoSeleccionado = null;
        resultadoTasacion = null;

        // Resetear coeficientes personalizados
        if (typeof coeficientesPersonalizados !== 'undefined') {
            coeficientesPersonalizados = {};
            datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;
        }
        if (typeof coeficienteIdCounter !== 'undefined') {
            coeficienteIdCounter = 0;
        }
    } catch (error) {
        console.error("Error al limpiar datos de tasación:", error);
    }
}

async function cargarDatosCompletos(datosCompletos) {
    console.log('[CARGAR DATOS] datosCompletos.coeficientesPersonalizados:', JSON.stringify(datosCompletos?.coeficientesPersonalizados, null, 2));
    if (!datosCompletos) return;
    
    datosTasacion.tipo = datosCompletos.tipo;
    datosTasacion.ubicacion = { ...datosCompletos.ubicacion };
    
    if (datosCompletos.tipo === 'lote') {
        datosTasacion.lote = {
            tipoLote: datosCompletos.lote.tipoLote,
            servicios: [...datosCompletos.lote.servicios],
            caracteristicas: { ...datosCompletos.lote.caracteristicas },
            observaciones: datosCompletos.lote.observaciones || "",
            mejoras: datosCompletos.lote.mejoras || ""
        };
    } else if (datosCompletos.tipo === 'departamento') {
        datosTasacion.departamento = JSON.parse(JSON.stringify(datosCompletos.departamento));
    } else if (datosCompletos.tipo === 'casa') {
        datosTasacion.casa = datosCompletos.casa ? JSON.parse(JSON.stringify(datosCompletos.casa)) : {};
    }
    
    // Cargar comparables: usar datosCompletos.comparables como snapshots
    // NOTA: Los snapshots ahora vienen del backend via tasacion_comparable.snapshot
    // Ya no necesitamos obtenerComparablesBatchAPI porque el backend devuelve snapshots
    if (datosCompletos.comparables && datosCompletos.comparables.length > 0) {
        // Usar directamente los objetos (snapshots) que vienen del backend
        datosTasacion.comparables = JSON.parse(JSON.stringify(datosCompletos.comparables));
    } else {
        datosTasacion.comparables = [];
    }

    resultadoTasacion = datosCompletos.resultado ? JSON.parse(JSON.stringify(datosCompletos.resultado)) : null;
    
    if (datosCompletos.coeficientesPersonalizados) {
        if (typeof coeficientesPersonalizados === 'undefined') {
            window.coeficientesPersonalizados = {};
        }
        coeficientesPersonalizados = JSON.parse(JSON.stringify(datosCompletos.coeficientesPersonalizados));
    }
    // Mantener la misma referencia en datosTasacion (única fuente de verdad)
    datosTasacion.coeficientesPersonalizados = coeficientesPersonalizados;

    // Cargar datos de informe (compatibilidad con datos antiguos)
    datosInforme.nomenclaturaCatastral = datosCompletos.nomenclaturaCatastral || "";
    datosInforme.clienteNombre = datosCompletos.clienteNombre || "";
    datosInforme.finalidad = datosCompletos.finalidad || "Tasación comercial";
    datosInforme.ambientes = datosCompletos.ambientes || [];
    datosInforme.entorno = datosCompletos.entorno || {
        descripcion: "",
        transporte: "",
        comercios: "",
        universidades: "",
        puntosInteres: ""
    };

    console.log('[CARGAR DATOS] datosInforme cargados:', JSON.stringify(datosInforme, null, 2));

    // Establecer el paso actual - siempre ir a pantalla 2 al editar
    pasoActual = 2;
    tipoSeleccionado = datosCompletos.tipo;
}

async function guardarTasacion(estado = 'completada') {
    if (guardandoTasacion) {
        console.warn('[guardarTasacion] Guardado ya en progreso; ignorando doble llamada.');
        return;
    }
    guardandoTasacion = true;

    try {
        guardarTodosLosDatos();

        if (datosTasacion.ubicacion && datosTasacion.ubicacion.direccion) {
        datosTasacion.ubicacion.direccion = formatearDireccion(
            datosTasacion.ubicacion.direccion
        );
    }

    // Determinar ID de la tasación
    let idFinal;
    let esNueva = false;
    
    if (tasacionId === 0) {
        // Nueva tasación
        esNueva = true;
    } else if (tasacionId === 1) {
        // Edición: usar ID real
        idFinal = tasacionIdReal;
        // Incrementar contador de ediciones
        datosTasacion.cantDeEdiciones = (datosTasacion.cantDeEdiciones || 0) + 1;
    } else {
        // Fallback: usar el ID actual (por compatibilidad)
        idFinal = tasacionId;
    }

    // Guardar comparables en la API
    // Regla: si tiene id, ya existe; si no, se crea exactamente una vez.
    const comparablesIds = [];
    for (const comparable of datosTasacion.comparables) {
        try {
            if (comparable.id) {
                // Comparable ya persistido: reutilizar su id
                comparablesIds.push(comparable.id);
            } else {
                // Nuevo comparable: crearlo una sola vez
                const nuevoComparable = await crearComparable({
                    tipoInmueble: datosTasacion.tipo,
                    fuente: comparable.fuente || 'manual',
                    ...comparable
                });
                comparablesIds.push(nuevoComparable.id);
                // Sincronizar el id en memoria para futuras guardadas
                comparable.id = nuevoComparable.id;
                comparable.fechaCreacion = nuevoComparable.fechaCreacion;
            }
        } catch (e) {
            console.error(`Error al guardar comparable ${comparable.id}:`, e);
        }
    }

    // Capturar datos completos
    console.log('[GUARDAR] window.coeficientesPersonalizados antes de capturar:', JSON.stringify(window.coeficientesPersonalizados, null, 2));
    const datosCompletos = capturarDatosCompletos();

    if (esNueva) {
        // Crear nueva tasación en la API
        try {
            const tasacionCreada = await crearTasacionAPI({
                tipo: datosTasacion.tipo,
                estado: estado,
                datos: datosCompletos,
                comparables_ids: comparablesIds,
                nomenclatura_catastral: datosInforme.nomenclaturaCatastral,
                cliente_nombre: datosInforme.clienteNombre,
                finalidad: datosInforme.finalidad
            });
            idFinal = tasacionCreada.id;
        } catch (e) {
            console.error('Error al crear tasación en API:', e);
            throw e;
        }
    } else {
        // Actualizar tasación existente en la API
        try {
            console.log('[DEBUG tasacion-datos] Construyendo comparablesSnapshots desde datosTasacion.comparables');
            console.log('[DEBUG tasacion-datos] datosTasacion.comparables:', datosTasacion.comparables);
            
            // Enviar snapshots actuales para preservar ediciones
            const comparablesSnapshots = datosTasacion.comparables.map(c => {
                const u = c.ubicacion || {};
                const snapshot = {
                    ubicacion: {
                        direccion: u.direccion,
                        lat: u.lat,
                        lon: u.lon,
                        provincia: u.provincia,
                        localidad: u.localidad
                    },
                    tipoInmueble: c.tipoInmueble,
                    tipoValor: c.tipoValor,
                    valor: c.valor,
                    valorM2: c.valorM2,
                    superficie: c.superficie,
                    frente: c.frente,
                    fondo: c.fondo,
                    tipoLote: c.tipoLote,
                    ambientes: c.ambientes,
                    dormitorios: c.dormitorios,
                    banos: c.banos,
                    cochera: c.cochera,
                    tieneAscensor: c.tieneAscensor,
                    tienePileta: c.tienePileta,
                    tieneJardin: c.tieneJardin,
                    datos: c.datos || {},
                    fuente: c.fuente,
                    id: c.id,
                    lote: c.lote,
                    departamento: c.departamento,
                    casa: c.casa,
                    observaciones: c.observaciones || '',
                    fechaCreacion: c.fechaCreacion,
                    fechaModificacion: c.fechaModificacion
                };
                console.log('[DEBUG tasacion-datos] Snapshot construido para comparable', c.id, ':', snapshot);
                return snapshot;
            });
            
            console.log('[DEBUG tasacion-datos] comparablesSnapshots finales:', comparablesSnapshots);
            
            await actualizarTasacionAPI(idFinal, {
                estado: estado,
                datos: datosCompletos,
                comparables_ids: comparablesIds,
                comparables_snapshots: comparablesSnapshots,
                nomenclatura_catastral: datosInforme.nomenclaturaCatastral,
                cliente_nombre: datosInforme.clienteNombre,
                finalidad: datosInforme.finalidad
            });
        } catch (e) {
            console.error('Error al actualizar tasación en API:', e);
            throw e;
        }
    }

    // Actualizar IDs de la sesión actual
    tasacionId = idFinal;
    tasacionIdReal = idFinal;

    return idFinal;
    } finally {
        guardandoTasacion = false;
    }
}

function formatearDireccion(direccion) {
    if (!direccion) return direccion;
    return direccion
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
}

function guardarDatosInforme() {
    // Estos campos ya no se renderizan en la pantalla de datos (se editan
    // en la vista previa del informe): solo se guardan si el input existe,
    // para no pisar valores cargados desde el informe.
    const leerInput = (id) => document.getElementById(id);
    const nomEl = leerInput("nomenclaturaCatastralInput");
    if (nomEl) datosInforme.nomenclaturaCatastral = nomEl.value || "";
    const cliEl = leerInput("clienteNombreInput");
    if (cliEl) datosInforme.clienteNombre = cliEl.value || "";
    const finEl = leerInput("finalidadInput");
    if (finEl) datosInforme.finalidad = finEl.value || "Tasación comercial";

    const entDesc = leerInput("entornoDescripcionInput");
    if (entDesc) datosInforme.entorno.descripcion = entDesc.value || "";
    const entTrans = leerInput("entornoTransporteInput");
    if (entTrans) datosInforme.entorno.transporte = entTrans.value || "";
    const entCom = leerInput("entornoComerciosInput");
    if (entCom) datosInforme.entorno.comercios = entCom.value || "";
    const entUniv = leerInput("entornoUniversidadesInput");
    if (entUniv) datosInforme.entorno.universidades = entUniv.value || "";
    const entPuntos = leerInput("entornoPuntosInteresInput");
    if (entPuntos) datosInforme.entorno.puntosInteres = entPuntos.value || "";
    
    // Guardar ambientes: el detalle por ambiente se edita en la vista
    // previa del informe. Si la UI no existe (siempre), se conserva lo
    // que ya estaba cargado en datosInforme.
    const ambienteItems = document.querySelectorAll('.ambiente-item');
    if (ambienteItems.length > 0) {
        datosInforme.ambientes = [];
        ambienteItems.forEach((item) => {
            const nombre = item.querySelector('.ambiente-nombre')?.value || "";
            const medidas = item.querySelector('.ambiente-medidas')?.value || "";
            const descripcion = item.querySelector('.ambiente-descripcion')?.value || "";

            if (nombre || medidas || descripcion) {
                datosInforme.ambientes.push({
                    nombre,
                    medidas,
                    descripcion
                });
            }
        });
    }

    console.log('[guardarDatosInforme] datosInforme:', JSON.stringify(datosInforme, null, 2));
}

// Funciones para guardar datos de pantallas específicas
function guardarDatosPantalla1() {
    console.log('[guardarDatosPantalla1] START');
    
    const direccionInput = document.getElementById("direccionInput");
    const provinciaInput = document.getElementById("provinciaInput");
    const localidadInput = document.getElementById("localidadInput");
    const tipoLoteInput = document.getElementById("tipoLoteInput");
    
    console.log('[guardarDatosPantalla1] direccionInput:', direccionInput, 'value:', direccionInput?.value);
    console.log('[guardarDatosPantalla1] provinciaInput:', provinciaInput, 'value:', provinciaInput?.value);
    console.log('[guardarDatosPantalla1] localidadInput:', localidadInput, 'value:', localidadInput?.value);
    console.log('[guardarDatosPantalla1] tipoLoteInput:', tipoLoteInput, 'value:', tipoLoteInput?.value);
    
    datosTasacion.ubicacion.direccion = direccionInput ? direccionInput.value : '';
    datosTasacion.ubicacion.provincia = provinciaInput ? provinciaInput.value : '';
    datosTasacion.ubicacion.localidad = localidadInput ? localidadInput.value : '';
    datosTasacion.lote.tipoLote = tipoLoteInput ? tipoLoteInput.value : '';

    const serviciosSeleccionados = [];
    document.querySelectorAll('.check-servicio input:checked').forEach(check => {
        serviciosSeleccionados.push(check.value);
    });
    datosTasacion.lote.servicios = serviciosSeleccionados;
    datosTasacion.lote.observaciones = document.getElementById("observacionesLoteInput").value;
    datosTasacion.lote.mejoras = document.getElementById("mejorasLoteInput").value;

    // Guardar datos de informe
    guardarDatosInforme();

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    const posicion = MapaCore.obtenerPosicion('mapaTasacion');
    if (posicion) {
        datosTasacion.ubicacion.lat = posicion.lat;
        datosTasacion.ubicacion.lon = posicion.lng;
    }

    console.log('[guardarDatosPantalla1] datosTasacion after save:', datosTasacion);
    console.log('[guardarDatosPantalla1] datosTasacion.ubicacion:', datosTasacion.ubicacion);
    console.log('[guardarDatosPantalla1] datosTasacion.lote:', datosTasacion.lote);
}

function guardarDatosPantallaDepartamento() {
    datosTasacion.ubicacion.direccion = document.getElementById("direccionInput").value;
    datosTasacion.ubicacion.provincia = document.getElementById("provinciaInput").value;
    datosTasacion.ubicacion.localidad = document.getElementById("localidadInput").value;
    datosTasacion.ubicacion.orientacion = document.getElementById("orientacionInput").value;
    datosTasacion.departamento.ambientes = document.getElementById("ambientesInput").value;
    datosTasacion.departamento.dormitorios = document.getElementById("dormitoriosInput").value;
    datosTasacion.departamento.banos = document.getElementById("banosInput").value;

    const cocheraSwitch = document.getElementById("cocheraSwitch");
    datosTasacion.departamento.cochera = cocheraSwitch ? cocheraSwitch.checked : false;

    const bauleraSwitch = document.getElementById("bauleraSwitch");
    datosTasacion.departamento.baulera = bauleraSwitch ? bauleraSwitch.checked : false;

    datosTasacion.departamento.servicios = [];
    document.querySelectorAll('.servicios-grid input[type="checkbox"][data-servicio]:checked').forEach(checkbox => {
        if (checkbox.dataset.servicio) {
            datosTasacion.departamento.servicios.push(checkbox.dataset.servicio);
        }
    });

    datosTasacion.departamento.infraestructura = [];
    document.querySelectorAll('.servicios-grid input[type="checkbox"][data-infraestructura]:checked').forEach(checkbox => {
        if (checkbox.dataset.infraestructura) {
            datosTasacion.departamento.infraestructura.push(checkbox.dataset.infraestructura);
        }
    });

    datosTasacion.departamento.amenities = [];
    document.querySelectorAll('.servicios-grid input[type="checkbox"][data-amenity]:checked').forEach(checkbox => {
        if (checkbox.dataset.amenity) {
            datosTasacion.departamento.amenities.push(checkbox.dataset.amenity);
        }
    });

    datosTasacion.departamento.observaciones = document.getElementById("observacionesInput").value;

    // Guardar datos de informe
    guardarDatosInforme();

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    const posicion = MapaCore.obtenerPosicion('mapaTasacion');
    if (posicion) {
        datosTasacion.ubicacion.lat = posicion.lat;
        datosTasacion.ubicacion.lon = posicion.lng;
    }

    console.log(datosTasacion);
}

function guardarDatosCaracteristicasDepartamento() {
    datosTasacion.departamento.ubicacionPlanta = document.getElementById("ubicacionPlantaInput").value;
    const switchAscensor = document.getElementById("tieneAscensorSwitch");
    datosTasacion.departamento.tieneAscensor = switchAscensor ? (switchAscensor.checked ? "si" : "no") : "";
    datosTasacion.departamento.ubicacionPiso = document.getElementById("ubicacionPisoInput").value;
    datosTasacion.departamento.superficieCubierta = document.getElementById("superficieCubiertaInput").value;
    datosTasacion.departamento.antiguedad = document.getElementById("antiguedadInput").value;
    datosTasacion.departamento.vidaUtil = document.getElementById("vidaUtilInput")?.value || 80;
    datosTasacion.departamento.estadoConservacion = document.getElementById("estadoConservacionInput").value;
    datosTasacion.departamento.caracteristicaConstructiva = document.getElementById("caracteristicaConstructivaInput").value;

    // Guardar coeficientes numéricos
    datosTasacion.departamento.ubicacionPlantaCoef = parseFloat(document.getElementById("ubicacionPlantaCoef").value) || 1;
    datosTasacion.departamento.ubicacionPisoCoef = parseFloat(document.getElementById("ubicacionPisoCoef").value) || 1;
    datosTasacion.departamento.superficieCubiertaCoef = parseFloat(document.getElementById("superficieCubiertaCoef").value) || 1;
    datosTasacion.departamento.caracteristicaConstructivaCoef = parseFloat(document.getElementById("caracteristicaConstructivaCoef").value) || 1;

    const fotDeptoInput = document.getElementById("fotDeptoInput");
    const fosDeptoInput = document.getElementById("fosDeptoInput");
    if (fotDeptoInput) {
        datosTasacion.departamento.fot = fotDeptoInput.value ? parseFloat(fotDeptoInput.value) : null;
    }
    if (fosDeptoInput) {
        datosTasacion.departamento.fos = fosDeptoInput.value ? parseFloat(fosDeptoInput.value) : null;
    }

    // El cálculo de Ross-Heidecke ahora es responsabilidad exclusiva del backend
    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    console.log(datosTasacion);
}

function guardarDatosPantalla3() {
    datosTasacion.lote.caracteristicas = {
        frente: document.getElementById("frenteInput")?.value || "",
        fondo: document.getElementById("fondoInput")?.value || "",
        superficie: document.getElementById("superficieInput")?.value || "",
        fondoFicticio: document.getElementById("fondoFicticioInput")?.value || "",
        segundaCalle: document.getElementById("segundaCalleInput")?.value || "",
        zona: document.getElementById("zonaInput")?.value || "",
        zonificacion: document.getElementById("zonificacionLoteInput")?.value || "",
        fot: document.getElementById("fotLoteInput")?.value ? parseFloat(document.getElementById("fotLoteInput").value) : null,
        fos: document.getElementById("fosLoteInput")?.value ? parseFloat(document.getElementById("fosLoteInput").value) : null
    };

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();
}

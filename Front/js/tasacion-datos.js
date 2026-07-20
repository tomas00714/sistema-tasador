/* =========================
   TASACION DATOS
   Guardado/carga de datos y localStorage
========================= */

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
            observaciones: datosTasacion.lote.observaciones || ""
        };
    } else if (datosTasacion.tipo === 'departamento') {
        datos.departamento = JSON.parse(JSON.stringify(datosTasacion.departamento));
    } else if (datosTasacion.tipo === 'casa') {
        datos.casa = JSON.parse(JSON.stringify(datosTasacion.casa));
    }
    
    if (typeof coeficientesPersonalizados !== 'undefined' && Object.keys(coeficientesPersonalizados).length > 0) {
        datos.coeficientesPersonalizados = JSON.parse(JSON.stringify(coeficientesPersonalizados));
    }

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
        datosTasacion.lote = {
            tipoLote: "",
            servicios: [],
            caracteristicas: {},
            observaciones: ""
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
            ubicacionEdificio: "",
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
            infraestructura: [],
            observaciones: "",
            superficieCubierta: "",
            superficieCubiertaCoef: 0,
            superficieTotal: "",
            superficieTotalCoef: 0,
            antiguedad: "",
            estadoConservacion: "",
            calidadConstruccion: "",
            calidadConstruccionCoef: 0,
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
        }
        if (typeof coeficienteIdCounter !== 'undefined') {
            coeficienteIdCounter = 0;
        }
    } catch (error) {
        console.error("Error al limpiar datos de tasación:", error);
    }
}

async function cargarDatosCompletos(datosCompletos) {
    if (!datosCompletos) return;
    
    datosTasacion.tipo = datosCompletos.tipo;
    datosTasacion.ubicacion = { ...datosCompletos.ubicacion };
    
    if (datosCompletos.tipo === 'lote') {
        datosTasacion.lote = {
            tipoLote: datosCompletos.lote.tipoLote,
            servicios: [...datosCompletos.lote.servicios],
            caracteristicas: { ...datosCompletos.lote.caracteristicas },
            observaciones: datosCompletos.lote.observaciones || ""
        };
    } else if (datosCompletos.tipo === 'departamento') {
        datosTasacion.departamento = JSON.parse(JSON.stringify(datosCompletos.departamento));
    } else if (datosCompletos.tipo === 'casa') {
        datosTasacion.casa = datosCompletos.casa ? JSON.parse(JSON.stringify(datosCompletos.casa)) : {};
    }
    
    // Cargar comparables: si son IDs, obtener objetos de la API por batch
    if (datosCompletos.comparables && datosCompletos.comparables.length > 0) {
        // Verificar si son IDs u objetos
        if (typeof datosCompletos.comparables[0] === 'string') {
            // Son IDs, obtener todos de la API en una sola llamada
            try {
                const comparables = await obtenerComparablesBatchAPI(datosCompletos.comparables);
                datosTasacion.comparables = comparables.map(c => ({
                    id: c.id,
                    ...c.datos
                }));
            } catch (e) {
                console.error('Error al cargar comparables batch:', e);
                datosTasacion.comparables = [];
            }
        } else {
            // Ya son objetos, usar directamente
            datosTasacion.comparables = JSON.parse(JSON.stringify(datosCompletos.comparables));
        }
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

    // Establecer el paso actual - siempre ir a pantalla 2 al editar
    pasoActual = 2;
    tipoSeleccionado = datosCompletos.tipo;
}

async function guardarTasacion(estado = 'completada') {
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
    const comparablesIds = [];
    for (const comparable of datosTasacion.comparables) {
        try {
            // Verificar si el comparable ya existe en la API
            const comparableExistente = await obtenerComparablePorId(comparable.id);
            if (!comparableExistente) {
                // Crear nuevo comparable
                const nuevoComparable = await crearComparable({
                    tipoInmueble: datosTasacion.tipo,
                    fuente: 'manual',
                    ...comparable
                });
                comparablesIds.push(nuevoComparable.id);
            } else {
                // Ya existe, usar su ID
                comparablesIds.push(comparable.id);
            }
        } catch (e) {
            console.error(`Error al guardar comparable ${comparable.id}:`, e);
        }
    }

    // Capturar datos completos
    const datosCompletos = capturarDatosCompletos();

    if (esNueva) {
        // Crear nueva tasación en la API
        try {
            const tasacionCreada = await crearTasacionAPI({
                usuario_id: 1,
                tipo: datosTasacion.tipo,
                estado: estado,
                datos: datosCompletos,
                comparables_ids: comparablesIds
            });
            idFinal = tasacionCreada.id;
        } catch (e) {
            console.error('Error al crear tasación en API:', e);
            throw e;
        }
    } else {
        // Actualizar tasación existente en la API
        try {
            await actualizarTasacionAPI(idFinal, {
                estado: estado,
                datos: datosCompletos,
                comparables_ids: comparablesIds
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
}

function formatearDireccion(direccion) {
    if (!direccion) return direccion;
    return direccion
        .toLowerCase()
        .split(' ')
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
        .join(' ');
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

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    if (marcador) {
        const posicion = marcador.getLatLng();
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

    const serviciosSeleccionados = [];
    document.querySelectorAll('.servicios-grid input:checked').forEach(check => {
        if (check.closest('div').previousElementSibling?.textContent === "Servicios") {
            serviciosSeleccionados.push(check.value);
        }
    });
    datosTasacion.departamento.servicios = serviciosSeleccionados;

    const infraestructuraSeleccionados = [];
    document.querySelectorAll('.servicios-grid input:checked').forEach(check => {
        if (check.closest('div').previousElementSibling?.textContent === "Infraestructura") {
            infraestructuraSeleccionados.push(check.value);
        }
    });
    datosTasacion.departamento.infraestructura = infraestructuraSeleccionados;

    const amenitiesSeleccionados = [];
    document.querySelectorAll('.servicios-grid input:checked').forEach(check => {
        if (check.closest('div').previousElementSibling?.textContent === "Amenities") {
            amenitiesSeleccionados.push(check.value);
        }
    });
    datosTasacion.departamento.amenities = amenitiesSeleccionados;

    datosTasacion.departamento.observaciones = document.getElementById("observacionesInput").value;

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();

    if (marcador) {
        const posicion = marcador.getLatLng();
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
    datosTasacion.departamento.estadoConservacion = document.getElementById("estadoConservacionInput").value;
    datosTasacion.departamento.caracteristicaConstructiva = document.getElementById("caracteristicaConstructivaInput").value;
    datosTasacion.departamento.ubicacionEdificio = document.getElementById("ubicacionEdificioInput").value;

    // Guardar coeficientes numéricos
    datosTasacion.departamento.ubicacionPlantaCoef = parseFloat(document.getElementById("ubicacionPlantaCoef").value) || 1;
    datosTasacion.departamento.ubicacionPisoCoef = parseFloat(document.getElementById("ubicacionPisoCoef").value) || 1;
    datosTasacion.departamento.superficieCubiertaCoef = parseFloat(document.getElementById("superficieCubiertaCoef").value) || 1;
    datosTasacion.departamento.caracteristicaConstructivaCoef = parseFloat(document.getElementById("caracteristicaConstructivaCoef").value) || 1;

    // Calcular coeficiente de antigüedad (Ross-Heidecke)
    const antiguedad = parseInt(datosTasacion.departamento.antiguedad) || 0;
    const estado = parseInt(datosTasacion.departamento.estadoConservacion) || 1;

    // Tabla de Ross-Heidecke simplificada
    let coeficiente = 1;
    const factor = [0.01, 0.015, 0.02, 0.025, 0.03][estado - 1] || 0.01;
    coeficiente = Math.max(0.5, 1 - (antiguedad * factor));

    datosTasacion.departamento.estadoConservacionCoef = coeficiente;

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
        zona: document.getElementById("zonaInput")?.value || ""
    };

    resultadoCalculado = false;
    actualizarIndicadoresProgreso();
}

/* =========================
   CONFIGURACIÓN DE RESULTADOS
   Configuración declarativa para la generación de tablas de resultados
   por tipo de inmueble
========================= */

var configuracionResultados = {
    lote: {
        metodo: "Fitto y Cervini",
        columnas_comparables: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "valor_lote", label: "Valor del lote", tipo: "moneda" },
            { id: "valor_m2", label: "Valor por m²", tipo: "moneda" },
            { id: "frente", label: "Frente", tipo: "numero" },
            { id: "fondo", label: "Fondo", tipo: "numero" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "fitto_cervini", label: "F&C", tipo: "coeficiente", fuente: "coef_fitto_comparable" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_m2_homogeneizado", label: "Valor por m² homogeneizado", tipo: "moneda", destacado: true }
        ],
        columnas_objetivo: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "frente", label: "Frente", tipo: "numero" },
            { id: "fondo", label: "Fondo", tipo: "numero" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "valor_promedio", label: "Valor promedio de comp.", tipo: "moneda" },
            { id: "fitto_cervini", label: "F&C", tipo: "coeficiente", fuente: "coeficiente_fitto_lote" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_final", label: "Valor del lote", tipo: "moneda", destacado: true },
            { id: "valor_m2", label: "Valor por m²", tipo: "moneda", destacado: true }
        ],
        columnas_condicionales: [
            {
                condicion: (datos) => {
                    const tipoLote = datos.lote?.tipoLote;
                    return tipoLote === "Esquina" || tipoLote === "Esquina larga (+30m)";
                },
                insertar_despues_de: "fitto_cervini",
                columnas: [
                    { id: "valvano", label: "Valvano", tipo: "coeficiente", fuente: "extras.coef_valvano" }
                ],
                solo_objetivo: true
            }
        ],
        // Renderizadores específicos para filas objetivo
        renderizadores_objetivo: {
            obtenerDatosFila: (resultado, datosTasacion) => {
                const car = datosTasacion.lote?.caracteristicas || {};
                const tipoLote = datosTasacion.lote?.tipoLote;
                const esIrregular = tipoLote === "Irregular";

                const frenteInput = parseFloat(car.frente) || 0;
                const fondoInput = car.fondo ? parseFloat(car.fondo) : null;
                const fondoFicticioInput = car.fondoFicticio ? parseFloat(car.fondoFicticio) : null;

                const frenteResultado = resultado.frente != null ? parseFloat(resultado.frente) : null;
                const fondoResultado = resultado.fondo != null ? parseFloat(resultado.fondo) : null;

                const frente = frenteResultado ?? frenteInput;
                const fondoValor = esIrregular
                    ? (fondoResultado ?? fondoFicticioInput ?? fondoInput ?? '-')
                    : (fondoResultado ?? fondoInput ?? '-');

                // Calcular valor promedio
                const valorPromedio = resultado.comparables && resultado.comparables.length > 0
                    ? resultado.comparables.reduce((sum, c) => sum + (c.valor_m2_homogeneizado || 0), 0) / resultado.comparables.length
                    : 0;

                // Siempre usar la dirección de datosTasacion.ubicacion
                const direccion = datosTasacion.ubicacion?.calle_principal ||
                                  datosTasacion.ubicacion?.direccion ||
                                  datosTasacion.ubicacion?.direccion_completa ||
                                  'Sin dirección';

                // Calcular superficie (priorizar resultado, sino las características)
                const superficieInput = parseFloat(car.superficie) || null;
                const superficieResultado = resultado.superficie != null ? parseFloat(resultado.superficie) : null;
                const superficie = superficieResultado ?? superficieInput ?? (frente && fondoValor ? (frente * fondoValor) : '-');

                // Retornar el objeto de datos completo para que obtenerValor pueda usar las propiedades fuente
                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    _caracteristicas: car,
                    direccion: direccion,
                    frente: frente,
                    fondo: fondoValor,
                    superficie: superficie,
                    fos: car.fos || '-',
                    fot: car.fot || '-',
                    valor_promedio: valorPromedio
                };
            }
        },
        // Configuración para cuadros de detalle (esquina/medial)
        columnas_detalle: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "frente", label: "Frente", tipo: "numero" },
            { id: "fondo", label: "Fondo", tipo: "numero" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "fos", label: "FOS", tipo: "texto" },
            { id: "fot", label: "FOT", tipo: "texto" },
            { id: "valor_promedio", label: "Valor promedio de comp.", tipo: "moneda" },
            { id: "fitto_cervini", label: "F&C", tipo: "coeficiente", fuente: "coeficiente_fitto_lote" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_final", label: "Valor del lote", tipo: "moneda", destacado: true },
            { id: "valor_m2", label: "Valor por m²", tipo: "moneda", destacado: true }
        ],
        columnas_condicionales_detalle: [
            {
                condicion: (tipo) => tipo === 'esquina',
                insertar_despues_de: "fitto_cervini",
                columnas: [
                    { id: "valvano", label: "Valvano", tipo: "coeficiente", fuente: "extras.coef_valvano" }
                ]
            }
        ],
        renderizadores_detalle: {
            obtenerDatosFila: (resultado, tipo) => {
                // Siempre usar la dirección de datosTasacion.ubicacion
                const direccion = datosTasacion.ubicacion?.calle_principal ||
                                  datosTasacion.ubicacion?.direccion ||
                                  datosTasacion.ubicacion?.direccion_completa ||
                                  'Sin dirección';

                // Calcular valor promedio de los comparables del bloque
                const promedio = resultado.valor_promedio_m2 != null
                    ? resultado.valor_promedio_m2
                    : (resultado.comparables && resultado.comparables.length
                        ? resultado.comparables.reduce((sum, c) => sum + (c.valor_m2_homogeneizado || c.valor_m2 || 0), 0) / resultado.comparables.length
                        : 0);

                const car = datosTasacion.lote?.caracteristicas || {};
                const superficieResultado = resultado.superficie != null ? parseFloat(resultado.superficie) : null;
                const superficieInput = parseFloat(car.superficie) || null;
                const superficieCalculada = (resultado.frente && resultado.fondo) ? (resultado.frente * resultado.fondo) : null;
                const superficie = superficieResultado ?? superficieInput ?? superficieCalculada ?? '-';

                // Retornar el objeto de datos completo para que obtenerValor pueda usar las propiedades fuente
                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    direccion: direccion,
                    frente: resultado.frente || '-',
                    fondo: resultado.fondo || '-',
                    superficie: superficie,
                    fos: resultado.fos || '-',
                    fot: resultado.fot || '-',
                    valor_promedio: promedio,
                    valor_promedio_m2: promedio,
                    valor_m2: resultado.valor_m2
                };
            }
        }
    },

    departamento: {
        metodo: "Ross-Heidecke",
        columnas_comparables: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "valor", label: "Valor", tipo: "moneda" },
            { id: "valor_m2", label: "Valor m²", tipo: "moneda" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "superficie_homogeneizada", label: "Superficie homogeneizada", tipo: "numero", fuente: "superficie_homogeneizada" },
            { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
            { id: "ubicacion_planta", label: "Ubic. Planta", tipo: "coeficiente", fuente: "ubicacionPlantaCoef" },
            { id: "ubicacion_piso", label: "Ubic. Piso", tipo: "coeficiente", fuente: "ubicacionPisoCoef" },
            { id: "caracteristica_constructiva", label: "Características constructivas", tipo: "coeficiente", fuente: "caracteristicaConstructivaCoef" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubiertaCoef" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actividad", label: "Actividad", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_m2_final", label: "Valor m² homogeneizado", tipo: "moneda", fuente: "valor_m2_homogeneizado", destacado: true }
        ],
        columnas_objetivo: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "superficie", label: "Superficie", tipo: "numero", fuente: "superficie" },
            { id: "superficie_homogeneizada", label: "Superficie homogeneizada", tipo: "numero", fuente: "superficie_homogeneizada" },
            { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
            { id: "ubicacion_planta", label: "Ubic. Planta", tipo: "coeficiente", fuente: "ubicacionPlantaCoef" },
            { id: "ubicacion_piso", label: "Ubic. Piso", tipo: "coeficiente", fuente: "ubicacionPisoCoef" },
            { id: "caracteristica_constructiva", label: "Características constructivas", tipo: "coeficiente", fuente: "caracteristicaConstructivaCoef" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubiertaCoef" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actividad", label: "Actividad", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor", label: "Valor", tipo: "moneda", destacado: true },
            { id: "valor_m2", label: "Valor por m²", tipo: "moneda", fuente: "valor_m2", destacado: true }
        ],
        columnas_condicionales: [],
        // Renderizadores específicos para filas objetivo
        renderizadores_objetivo: {
            obtenerDatosFila: (resultado, datosTasacion) => {
                const depto = datosTasacion.departamento || {};
                const direccion = datosTasacion.ubicacion?.calle_principal ||
                                  datosTasacion.ubicacion?.direccion ||
                                  datosTasacion.ubicacion?.direccion_completa ||
                                  'Sin dirección';

                const rossHeidecke = resultado.rossHeidecke ?? 1;
                const superficieOriginal = resultado.superficie ?? depto.homogeneizacion?.totalSuperficie ?? resultado.superficie_homogeneizada ?? 0;
                const superficieHomogeneizada = resultado.superficie_homogeneizada ?? depto.homogeneizacion?.totalHomogeneizada ?? superficieOriginal;

                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    _departamento: depto,
                    direccion: direccion,
                    valor: resultado.valor_final || 0,
                    valor_m2: resultado.valor_m2 || 0,
                    superficie: superficieOriginal,
                    superficie_homogeneizada: superficieHomogeneizada,
                    valor_m2_final: resultado.valor_m2 || 0,
                    // Agregar coeficientes numéricos específicos de departamento
                    rossHeidecke,
                    ubicacionPlanta: depto.ubicacionPlantaCoef || depto.ubicacionPlanta || null,
                    ubicacionPiso: depto.ubicacionPisoCoef || depto.ubicacionPiso || null,
                    caracteristicaConstructiva: depto.caracteristicaConstructivaCoef || depto.caracteristicaConstructiva || depto.coeficientes?.caracteristicaConstructiva || null,
                    superficieCubierta: depto.superficieCubiertaCoef || depto.superficieCubierta || depto.coeficientes?.superficieCubierta || null
                };
            }
        }
    },

    casa: {
        metodo: "Comparación directa",
        columnas_comparables: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "valor", label: "Valor", tipo: "moneda" },
            { id: "valor_m2", label: "Valor m²", tipo: "moneda" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "superficie_homogeneizada", label: "Superficie homogeneizada", tipo: "numero", fuente: "superficie_homogeneizada" },
            { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubiertaCoef" },
            { id: "superficie_total", label: "Sup. Total", tipo: "coeficiente", fuente: "superficieTotalCoef" },
            { id: "caracteristica_constructiva", label: "Características constructivas", tipo: "coeficiente", fuente: "caracteristicaConstructivaCoef" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_m2_final", label: "Valor m² homogeneizado", tipo: "moneda", fuente: "valor_m2_homogeneizado", destacado: true }
        ],
        columnas_objetivo: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "superficie", label: "Superficie", tipo: "numero", fuente: "superficie" },
            { id: "superficie_homogeneizada", label: "Superficie homogeneizada", tipo: "numero", fuente: "superficie_homogeneizada" },
            { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubiertaCoef" },
            { id: "superficie_total", label: "Sup. Total", tipo: "coeficiente", fuente: "superficieTotalCoef" },
            { id: "caracteristica_constructiva", label: "Características constructivas", tipo: "coeficiente", fuente: "caracteristicaConstructivaCoef" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor", label: "Valor", tipo: "moneda", destacado: true },
            { id: "valor_m2", label: "Valor por m²", tipo: "moneda", fuente: "valor_m2", destacado: true }
        ],
        columnas_condicionales: [],
        renderizadores_objetivo: {
            obtenerDatosFila: (resultado, datosTasacion) => {
                const casa = datosTasacion.casa || {};
                const rossHeidecke = resultado.rossHeidecke ?? 1;
                const superficieOriginal = resultado.superficie ?? casa.homogeneizacion?.totalSuperficie ?? resultado.superficie_homogeneizada ?? 0;
                const superficieHomogeneizada = resultado.superficie_homogeneizada ?? casa.homogeneizacion?.totalHomogeneizada ?? superficieOriginal;

                return {
                    direccion: datosTasacion.ubicacion?.calle_principal || datosTasacion.ubicacion?.direccion || 'Casa a tasar',
                    valor: resultado.valor_final || 0,
                    valor_m2: resultado.valor_m2 || 0,
                    superficie: superficieOriginal,
                    superficie_homogeneizada: superficieHomogeneizada,
                    rossHeidecke,
                    superficieCubiertaCoef: parseFloat(casa.superficieCubiertaCoef) || 1,
                    superficieTotalCoef: parseFloat(casa.superficieTotalCoef) || 1,
                    caracteristicaConstructivaCoef: parseFloat(casa.caracteristicaConstructivaCoef) || 1
                };
            }
        }
    }
};

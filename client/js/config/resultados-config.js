/* =========================
   CONFIGURACIÓN DE RESULTADOS
   Configuración declarativa para la generación de tablas de resultados
   por tipo de inmueble
========================= */

/**
 * Calcula el coeficiente de estado/ross-heidecke para casa a partir del estado y antigüedad.
 * Se usa como fallback cuando el resultado no trae el coeficiente ya calculado por el backend.
 */
function _coeficienteEstadoCasa(estadoConservacion, antiguedad) {
    const match = String(estadoConservacion || '').match(/\d+/);
    const nivel = match ? parseInt(match[0]) : 0;

    if (nivel >= 1 && nivel <= 5) {
        const ant = parseInt(antiguedad) || 0;
        if (ant > 0) {
            const factor = [0.01, 0.015, 0.02, 0.025, 0.03][nivel - 1] || 0.015;
            return Math.max(0.3, 1 - (ant * factor));
        }
        const mapeo = { 1: 1.0, 2: 0.9, 3: 0.8, 4: 0.7, 5: 0.7 };
        return mapeo[nivel];
    }
    return 1.0;
}

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

                // "Valor por m²" del objetivo = valor_final / superficie, la misma
                // definición que usa recalcularConCoeficientes() y que el backend
                // usa para esquina +30m. El backend devuelve aquí valor_m2 =
                // valor_promedio_m2 (sin F&C); esa magnitud ya se muestra en la
                // columna "Valor promedio de comp."
                const superficieNum = typeof superficie === 'number' ? superficie : parseFloat(superficie);
                const valorM2Objetivo = (superficieNum > 0 && resultado.valor_final != null)
                    ? resultado.valor_final / superficieNum
                    : resultado.valor_m2;

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
                    valor_promedio: valorPromedio,
                    valor_m2: valorM2Objetivo
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
            { id: "valor_promedio", label: "Valor promedio de comp.", tipo: "moneda", fuente: "valor_promedio_homogeneizado" },
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
                // "Superficie" = m² originales del inmueble (pantalla de
                // homogeneización, total de la columna Superficie).
                // resultado.superficie del backend ya es la HOMOGENEIZADA
                // (_parse_superficie_cubierta toma totalHomogeneizada primero),
                // por eso no puede ser la fuente de esta columna.
                const totalSup = parseFloat(depto.homogeneizacion?.totalSuperficie);
                const superficieOriginal = (totalSup > 0 ? totalSup : null)
                    ?? (resultado.superficie != null ? parseFloat(resultado.superficie) : null)
                    ?? parseFloat(depto.superficieHomogeneizada)
                    ?? 0;
                const superficieHomogeneizada = resultado.superficie_homogeneizada ?? depto.homogeneizacion?.totalHomogeneizada ?? superficieOriginal;

                const valorPromedio = resultado.valor_promedio_homogeneizado
                    ?? (resultado.comparables && resultado.comparables.length > 0
                        ? resultado.comparables.reduce((sum, c) => sum + (parseFloat(c.valor_m2_homogeneizado) || 0), 0) / resultado.comparables.length
                        : 0);

                // Coeficientes numéricos del objetivo: vienen del input "Coef"
                // de cada selector (guardados como *Coef). Si no hay valor, null
                // para que la celda muestre "-" en lugar de ocultar el faltante.
                const coefObj = (v) => { const n = parseFloat(v); return n > 0 ? n : null; };

                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    _departamento: depto,
                    direccion: direccion,
                    valor: resultado.valor_final || 0,
                    valor_m2: resultado.valor_m2 || 0,
                    superficie: superficieOriginal,
                    superficie_homogeneizada: superficieHomogeneizada,
                    valor_promedio_homogeneizado: valorPromedio,
                    valor_m2_final: resultado.valor_m2 || 0,
                    rossHeidecke,
                    ubicacionPlantaCoef: coefObj(depto.ubicacionPlantaCoef),
                    ubicacionPisoCoef: coefObj(depto.ubicacionPisoCoef),
                    caracteristicaConstructivaCoef: coefObj(depto.caracteristicaConstructivaCoef),
                    superficieCubiertaCoef: coefObj(depto.superficieCubiertaCoef)
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
                // Igual que en departamento: resultado.superficie del backend ya
                // es la homogeneizada; la original es homogeneizacion.totalSuperficie.
                const totalSupCasa = parseFloat(casa.homogeneizacion?.totalSuperficie);
                const superficieOriginal = (totalSupCasa > 0 ? totalSupCasa : null)
                    ?? (resultado.superficie != null ? parseFloat(resultado.superficie) : null)
                    ?? resultado.superficie_homogeneizada
                    ?? 0;
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

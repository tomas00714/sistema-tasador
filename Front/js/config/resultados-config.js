/* =========================
   CONFIGURACIÓN DE RESULTADOS
   Configuración declarativa para la generación de tablas de resultados
   por tipo de inmueble
========================= */

/**
 * Calcula el coeficiente de estado/ross-heidecke para casa a partir del estado y antigüedad.
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
            { id: "fos", label: "FOS", tipo: "texto" },
            { id: "fot", label: "FOT", tipo: "texto" },
            { id: "fitto_cervini", label: "F&C", tipo: "coeficiente", fuente: "coef_fitto_comparable" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_m2_homogeneizado", label: "Valor por m² homogeneizado", tipo: "moneda", destacado: true }
        ],
        columnas_objetivo: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "frente", label: "Frente", tipo: "numero" },
            { id: "fondo", label: "Fondo", tipo: "numero" },
            { id: "fos", label: "FOS", tipo: "texto" },
            { id: "fot", label: "FOT", tipo: "texto" },
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
                const frente = parseFloat(car.frente) || 0;
                const fondo = car.fondo ? parseFloat(car.fondo) : null;
                const tipoLote = datosTasacion.lote?.tipoLote;
                const esIrregular = tipoLote === "Irregular";
                const fondoValor = esIrregular ? (car.fondoFicticio || fondo || '-') : (fondo || '-');

                // Calcular valor promedio
                const valorPromedio = resultado.comparables && resultado.comparables.length > 0
                    ? resultado.comparables.reduce((sum, c) => sum + (c.valor_m2_homogeneizado || 0), 0) / resultado.comparables.length
                    : 0;

                // Siempre usar la dirección de datosTasacion.ubicacion
                const direccion = datosTasacion.ubicacion?.calle_principal ||
                                  datosTasacion.ubicacion?.direccion ||
                                  datosTasacion.ubicacion?.direccion_completa ||
                                  'Sin dirección';

                // Retornar el objeto de datos completo para que obtenerValor pueda usar las propiedades fuente
                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    _caracteristicas: car,
                    direccion: direccion,
                    frente: frente,
                    fondo: fondoValor,
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

                // Retornar el objeto de datos completo para que obtenerValor pueda usar las propiedades fuente
                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    direccion: direccion,
                    frente: resultado.frente || '-',
                    fondo: resultado.fondo || '-',
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
            { id: "ubicacion_planta", label: "Ubic. Planta", tipo: "coeficiente", fuente: "ubicacionPlanta" },
            { id: "ubicacion_piso", label: "Ubic. Piso", tipo: "coeficiente", fuente: "ubicacionPiso" },
            { id: "caracteristica_constructiva", label: "Const. Constructiva", tipo: "coeficiente", fuente: "caracteristicaConstructiva" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubierta" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actividad", label: "Actividad", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_m2_final", label: "Valor m² ajustado", tipo: "moneda", fuente: "valor_m2_homogeneizado", destacado: true }
        ],
        columnas_objetivo: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
            { id: "ubicacion_planta", label: "Ubic. Planta", tipo: "coeficiente", fuente: "ubicacionPlanta" },
            { id: "ubicacion_piso", label: "Ubic. Piso", tipo: "coeficiente", fuente: "ubicacionPiso" },
            { id: "caracteristica_constructiva", label: "Const. Constructiva", tipo: "coeficiente", fuente: "caracteristicaConstructiva" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubierta" },
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

                return {
                    ...resultado,
                    _datosTasacion: datosTasacion,
                    _departamento: depto,
                    direccion: direccion,
                    valor: resultado.valor_final || 0,
                    valor_m2: resultado.valor_m2 || 0,
                    superficie: resultado.superficie || resultado.superficie_homogeneizada || 0,
                    valor_m2_final: resultado.valor_m2 || 0,
                    // Agregar coeficientes numéricos específicos de departamento
                    rossHeidecke: resultado.rossHeidecke || depto.rossHeidecke || depto.coeficientes?.rossHeidecke || null,
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
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubiertaCoef" },
            { id: "superficie_total", label: "Sup. Total", tipo: "coeficiente", fuente: "superficieTotalCoef" },
            { id: "calidad_construccion", label: "Calidad Const.", tipo: "coeficiente", fuente: "calidadConstruccionCoef" },
            { id: "estado_conservacion", label: "Estado Cons.", tipo: "coeficiente", fuente: "estadoConservacionCoef" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor_m2_final", label: "Valor m² final", tipo: "moneda", fuente: "valor_m2_homogeneizado", destacado: true }
        ],
        columnas_objetivo: [
            { id: "direccion", label: "Dirección", tipo: "texto" },
            { id: "superficie", label: "Superficie", tipo: "numero" },
            { id: "ross_heidecke", label: "Ross-Heidecke", tipo: "coeficiente", fuente: "rossHeidecke" },
            { id: "superficie_cubierta", label: "Sup. Cubierta", tipo: "coeficiente", fuente: "superficieCubiertaCoef" },
            { id: "superficie_total", label: "Sup. Total", tipo: "coeficiente", fuente: "superficieTotalCoef" },
            { id: "calidad_construccion", label: "Calidad Const.", tipo: "coeficiente", fuente: "calidadConstruccionCoef" },
            { id: "ubicacion", label: "Ubicacion", tipo: "coeficiente_editable", es_fijo: true },
            { id: "actualizacion", label: "Actualización", tipo: "coeficiente_editable", es_fijo: true },
            { id: "valor", label: "Valor", tipo: "moneda", destacado: true },
            { id: "valor_m2", label: "Valor por m²", tipo: "moneda", fuente: "valor_m2", destacado: true }
        ],
        columnas_condicionales: [],
        renderizadores_objetivo: {
            obtenerDatosFila: (resultado, datosTasacion) => {
                const casa = datosTasacion.casa || {};
                const rossHeidecke = _coeficienteEstadoCasa(casa.estadoConservacion, casa.antiguedad);
                return {
                    direccion: datosTasacion.ubicacion?.calle_principal || datosTasacion.ubicacion?.direccion || 'Casa a tasar',
                    valor: resultado.valor_final || 0,
                    valor_m2: resultado.valor_m2 || 0,
                    superficie: resultado.superficie || 0,
                    rossHeidecke,
                    superficieCubiertaCoef: parseFloat(casa.superficieCubiertaCoef) || 1,
                    superficieTotalCoef: parseFloat(casa.superficieTotalCoef) || 1,
                    calidadConstruccionCoef: parseFloat(casa.calidadConstruccionCoef) || 1
                };
            }
        }
    }
};

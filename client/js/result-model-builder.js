/* =========================
   RESULT MODEL BUILDER
   Constructor del modelo genérico con lógica inmobiliaria
   Conoce qué cuadros existen, qué columnas tiene cada uno
   Usa CalculationEngine para cálculos complejos
========================= */

class ResultModelBuilder {
    constructor() {
        this.calculationEngine = calculationEngine;
    }

    // =========================
    // MÉTODO PRINCIPAL
    // =========================

    /**
     * Construye el modelo genérico completo
     * @param {Object} resultadoTasacion - Resultado de la tasación
     * @param {Object} datosTasacion - Datos de la tasación
     * @param {string} tipo - Tipo de inmueble ('lote', 'departamento', 'casa')
     * @returns {Object} GenericTableModel
     */
    construirModelo(resultadoTasacion, datosTasacion, tipo) {
        switch (tipo) {
            case 'lote':
                return this.construirModeloLote(resultadoTasacion, datosTasacion);
            case 'departamento':
                return this.construirModeloDepartamento(resultadoTasacion, datosTasacion);
            case 'casa':
                return this.construirModeloCasa(resultadoTasacion, datosTasacion);
            default:
                throw new Error(`Tipo de inmueble no soportado: ${tipo}`);
        }
    }

    // =========================
    // MODELO LOTE
    // =========================

    construirModeloLote(resultado, datos) {
        const car = datos.lote?.caracteristicas || {};
        const tipoLote = datos.lote?.tipoLote || 'Medial';
        const esEsquina = tipoLote === 'Esquina' || tipoLote === 'Esquina larga (+30m)';
        const esEsquinaLarga = tipoLote === 'Esquina larga (+30m)';
        const esSalidaDosCalles = tipoLote === 'Salida a dos calles';

        // Determinar método
        const metodo = esSalidaDosCalles ? 'Comparación de mercado' : 'Fitto y Cervini';

        // Construir modelo
        const modelo = {
            metadata: {
                titulo: 'Resultado de la Tasación',
                subtitulo: 'Valor estimado según método de comparación de mercado'
            },
            tarjetaPrincipal: this.construirTarjetaLote(resultado, datos, tipoLote),
            secciones: []
        };

        // Sección de comparables
        modelo.secciones.push(this.construirSeccionComparablesLote(resultado, esEsquina));

        // Sección(es) objetivo
        if (esEsquinaLarga) {
            // Esquina larga: objetivo principal + detalle esquina + detalle medial
            modelo.secciones.push(this.construirSeccionObjetivoLote(resultado, datos, tipoLote, false));
            modelo.secciones.push(this.construirSeccionDetalleEsquina(resultado, datos));
            modelo.secciones.push(this.construirSeccionDetalleMedial(resultado, datos));
        } else {
            // Normal: solo objetivo
            modelo.secciones.push(this.construirSeccionObjetivoLote(resultado, datos, tipoLote, esEsquina));
        }

        return modelo;
    }

    construirTarjetaLote(resultado, datos, tipoLote) {
        return {
            titulo: 'Valor Final',
            valorPrincipal: {
                valor: resultado.valor_final,
                valorFormateado: this.formatearMoneda(resultado.valor_final),
                etiqueta: 'Valor Final'
            },
            valoresSecundarios: [
                {
                    valor: resultado.valor_m2,
                    valorFormateado: this.formatearMoneda(resultado.valor_m2),
                    etiqueta: 'Valor por m²'
                },
                {
                    valor: resultado.superficie,
                    valorFormateado: this.formatearNumeroSeguro(resultado.superficie, 2, 'm²'),
                    etiqueta: 'Superficie'
                }
            ]
        };
    }

    construirSeccionComparablesLote(resultado, esEsquina) {
        const columnas = this.obtenerColumnasComparablesLote(esEsquina);
        const filas = resultado.comparables.map((comp, index) => 
            this.construirFilaComparableLote(comp, index)
        );
        const filaPie = this.construirFilaPromedioLote(resultado.comparables);

        return {
            id: 'comparables',
            titulo: 'Comparables',
            orden: 1,
            tabla: {
                columnas,
                filas,
                filaPie
            }
        };
    }

    construirSeccionObjetivoLote(resultado, datos, tipoLote, esEsquina) {
        const columnas = this.obtenerColumnasObjetivoLote(esEsquina);
        const filas = [this.construirFilaObjetivoLote(resultado, datos, tipoLote, esEsquina)];

        return {
            id: 'objetivo',
            titulo: 'Objetivo',
            orden: 2,
            tabla: {
                columnas,
                filas
            }
        };
    }

    construirSeccionDetalleEsquina(resultado, datos) {
        if (!resultado.resultado_esquina) return null;

        const columnas = this.obtenerColumnasDetalleLote(true, 'esquina');
        const filas = [this.construirFilaDetalleLote(resultado.resultado_esquina, 'esquina', true)];

        return {
            id: 'detalle_esquina',
            titulo: 'Detalle Esquina',
            orden: 3,
            tabla: {
                columnas,
                filas
            }
        };
    }

    construirSeccionDetalleMedial(resultado, datos) {
        if (!resultado.resultado_medial) return null;

        const columnas = this.obtenerColumnasDetalleLote(false, 'medial');
        const filas = [this.construirFilaDetalleLote(resultado.resultado_medial, 'medial', false)];

        return {
            id: 'detalle_medial',
            titulo: 'Detalle Medial',
            orden: 4,
            tabla: {
                columnas,
                filas
            }
        };
    }

    // =========================
    // MODELO DEPARTAMENTO
    // =========================

    construirModeloDepartamento(resultado, datos) {
        const modelo = {
            metadata: {
                titulo: 'Resultado de la Tasación',
                subtitulo: 'Valor estimado según método de comparación de mercado'
            },
            tarjetaPrincipal: this.construirTarjetaDepartamento(resultado, datos),
            secciones: []
        };

        // Sección de comparables
        modelo.secciones.push(this.construirSeccionComparablesDepartamento(resultado));

        // Sección objetivo
        modelo.secciones.push(this.construirSeccionObjetivoDepartamento(resultado, datos));

        return modelo;
    }

    construirTarjetaDepartamento(resultado, datos) {
        return {
            titulo: 'Valor Final',
            valorPrincipal: {
                valor: resultado.valor_final,
                valorFormateado: this.formatearMoneda(resultado.valor_final),
                etiqueta: 'Valor Final'
            },
            valoresSecundarios: [
                {
                    valor: resultado.valor_m2,
                    valorFormateado: this.formatearMoneda(resultado.valor_m2),
                    etiqueta: 'Valor por m²'
                },
                {
                    valor: resultado.superficie,
                    valorFormateado: this.formatearNumeroSeguro(resultado.superficie, 2, 'm²'),
                    etiqueta: 'Superficie homogeneizada'
                }
            ]
        };
    }

    construirSeccionComparablesDepartamento(resultado) {
        const columnas = this.obtenerColumnasComparablesDepartamento();
        const filas = resultado.comparables.map((comp, index) => 
            this.construirFilaComparableDepartamento(comp, index)
        );
        const filaPie = this.construirFilaPromedioDepartamento(resultado.comparables);

        return {
            id: 'comparables',
            titulo: 'Comparables',
            orden: 1,
            tabla: {
                columnas,
                filas,
                filaPie
            }
        };
    }

    construirSeccionObjetivoDepartamento(resultado, datos) {
        const columnas = this.obtenerColumnasObjetivoDepartamento();
        const filas = [this.construirFilaObjetivoDepartamento(resultado, datos)];

        return {
            id: 'objetivo',
            titulo: 'Objetivo',
            orden: 2,
            tabla: {
                columnas,
                filas
            }
        };
    }

    // =========================
    // MODELO CASA
    // =========================

    construirModeloCasa(resultado, datos) {
        const modelo = {
            metadata: {
                titulo: 'Resultado de la Tasación',
                subtitulo: 'Valor estimado según método de comparación de mercado'
            },
            tarjetaPrincipal: this.construirTarjetaCasa(resultado, datos),
            secciones: []
        };

        // Sección de comparables
        modelo.secciones.push(this.construirSeccionComparablesCasa(resultado));

        // Sección objetivo
        modelo.secciones.push(this.construirSeccionObjetivoCasa(resultado, datos));

        return modelo;
    }

    construirTarjetaCasa(resultado, datos) {
        return {
            titulo: 'Valor Final',
            valorPrincipal: {
                valor: resultado.valor_final,
                valorFormateado: this.formatearMoneda(resultado.valor_final),
                etiqueta: 'Valor Final'
            },
            valoresSecundarios: [
                {
                    valor: resultado.valor_m2,
                    valorFormateado: this.formatearMoneda(resultado.valor_m2),
                    etiqueta: 'Valor por m²'
                },
                {
                    valor: resultado.superficie,
                    valorFormateado: this.formatearNumeroSeguro(resultado.superficie, 2, 'm²'),
                    etiqueta: 'Superficie homogeneizada'
                }
            ]
        };
    }

    construirSeccionComparablesCasa(resultado) {
        const columnas = this.obtenerColumnasComparablesCasa();
        const filas = resultado.comparables.map((comp, index) => 
            this.construirFilaComparableCasa(comp, index)
        );
        const filaPie = this.construirFilaPromedioCasa(resultado.comparables);

        return {
            id: 'comparables',
            titulo: 'Comparables',
            orden: 1,
            tabla: {
                columnas,
                filas,
                filaPie
            }
        };
    }

    construirSeccionObjetivoCasa(resultado, datos) {
        const columnas = this.obtenerColumnasObjetivoCasa();
        const filas = [this.construirFilaObjetivoCasa(resultado, datos)];

        return {
            id: 'objetivo',
            titulo: 'Objetivo',
            orden: 2,
            tabla: {
                columnas,
                filas
            }
        };
    }

    // =========================
    // COLUMNAS LOTE
    // =========================

    obtenerColumnasComparablesLote(esEsquina, tipo = '') {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'valor_total', etiqueta: 'Valor total', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario', etiqueta: 'Valor unitario', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'frente', etiqueta: 'Frente', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m' } } },
            { id: 'fondo', etiqueta: 'Fondo', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m' } } },
            { id: 'fos', etiqueta: 'FOS', tipo: 'texto' },
            { id: 'fot', etiqueta: 'FOT', tipo: 'texto' },
            { id: 'fitto_cervini', etiqueta: 'F&C', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        if (esEsquina) {
            columnas.push({ id: 'valvano', etiqueta: 'Valvano', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } });
        }

        columnas.push(
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        );

        // Columnas personalizadas acumuladas de todos los comparables
        const personalizadas = this.obtenerColumnasPersonalizadas('comparables', tipo);
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_homogeneizado', etiqueta: 'Valor homogeneizado', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    obtenerColumnasObjetivoLote(esEsquina) {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'frente', etiqueta: 'Frente', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m' } } },
            { id: 'fondo', etiqueta: 'Fondo', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m' } } },
            { id: 'fos', etiqueta: 'FOS', tipo: 'texto' },
            { id: 'fot', etiqueta: 'FOT', tipo: 'texto' },
            { id: 'valor_promedio', etiqueta: 'Valor promedio', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'fitto_cervini', etiqueta: 'F&C', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        if (esEsquina) {
            columnas.push({ id: 'valvano', etiqueta: 'Valvano', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } });
        }

        columnas.push(
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        );

        // Columnas personalizadas del objetivo lote
        const personalizadas = this.obtenerColumnasPersonalizadas('objetivo', 'lote');
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_final', etiqueta: 'Valor final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario_final', etiqueta: 'Valor unitario final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    obtenerColumnasDetalleLote(esEsquina, tipo = 'lote') {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'frente', etiqueta: 'Frente', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m' } } },
            { id: 'fondo', etiqueta: 'Fondo', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m' } } },
            { id: 'fos', etiqueta: 'FOS', tipo: 'texto' },
            { id: 'fot', etiqueta: 'FOT', tipo: 'texto' },
            { id: 'valor_promedio', etiqueta: 'Valor promedio', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'fitto_cervini', etiqueta: 'F&C', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        if (esEsquina) {
            columnas.push({ id: 'valvano', etiqueta: 'Valvano', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } });
        }

        columnas.push(
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        );

        // Columnas personalizadas del detalle (esquina/medial)
        const personalizadas = this.obtenerColumnasPersonalizadas('objetivo', tipo);
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_final', etiqueta: 'Valor final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario_final', etiqueta: 'Valor unitario final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    // =========================
    // COLUMNAS DEPARTAMENTO
    // =========================

    obtenerColumnasComparablesDepartamento() {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'valor_total', etiqueta: 'Valor total', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario', etiqueta: 'Valor unitario', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'superficie', etiqueta: 'Superficie', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m²' } } },
            { id: 'coef_ubicacion_planta', etiqueta: 'Ubicación Planta', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'coef_piso', etiqueta: 'Piso', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'coef_constructiva', etiqueta: 'Constructiva', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'coef_superficie', etiqueta: 'Superficie', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        // Columnas personalizadas acumuladas de todos los comparables
        const personalizadas = this.obtenerColumnasPersonalizadas('comparables', 'departamento');
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_homogeneizado', etiqueta: 'Valor homogeneizado', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    obtenerColumnasObjetivoDepartamento() {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'superficie', etiqueta: 'Superficie', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m²' } } },
            { id: 'coef_ubicacion_planta', etiqueta: 'Ubicación Planta', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'coef_piso', etiqueta: 'Piso', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'coef_constructiva', etiqueta: 'Constructiva', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'coef_superficie', etiqueta: 'Superficie', tipo: 'coeficiente', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        // Columnas personalizadas del objetivo departamento
        const personalizadas = this.obtenerColumnasPersonalizadas('objetivo', 'departamento');
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_final', etiqueta: 'Valor final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario_final', etiqueta: 'Valor unitario final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    // =========================
    // COLUMNAS CASA
    // =========================

    obtenerColumnasComparablesCasa() {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'valor_total', etiqueta: 'Valor total', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario', etiqueta: 'Valor unitario', tipo: 'moneda', configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'superficie', etiqueta: 'Superficie', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m²' } } },
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        // Columnas personalizadas acumuladas de todos los comparables
        const personalizadas = this.obtenerColumnasPersonalizadas('comparables', 'casa');
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_homogeneizado', etiqueta: 'Valor homogeneizado', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    obtenerColumnasObjetivoCasa() {
        const columnas = [
            { id: 'direccion', etiqueta: 'Dirección', tipo: 'texto' },
            { id: 'superficie', etiqueta: 'Superficie', tipo: 'numero', configuracion: { numero: { decimales: 2, sufijo: ' m²' } } },
            { id: 'ubicacion', etiqueta: 'Ubicacion', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } },
            { id: 'actualizacion', etiqueta: 'Actualización', tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } }
        ];

        // Columnas personalizadas del objetivo casa
        const personalizadas = this.obtenerColumnasPersonalizadas('objetivo', 'casa');
        personalizadas.forEach(coef => {
            columnas.push({ id: coef.id, etiqueta: coef.nombre, tipo: 'parametro_editable', configuracion: { coeficiente: { decimales: 2 } } });
        });

        columnas.push(
            { id: 'valor_final', etiqueta: 'Valor final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } },
            { id: 'valor_unitario_final', etiqueta: 'Valor unitario final', tipo: 'moneda', visualizacion: { destacado: true }, configuracion: { moneda: { simbolo: '$', decimales: 0 } } }
        );

        return columnas;
    }

    // =========================
    // FILAS LOTE
    // =========================

    construirFilaComparableLote(comp, index) {
        const coefUbicacion = this.obtenerCoeficiente(index, 'ubicacion');
        const coefActualizacion = this.obtenerCoeficiente(index, 'actualizacion');
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('comparables');
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados(index, columnasPersonalizadas);

        return {
            id: `fila_${index}`,
            tipo: 'dato',
            orden: index + 1,
            acciones: [{ id: 'menu', icono: 'fa-ellipsis-vertical' }],
            celdas: {
                direccion: { valor: comp.direccion, valorFormateado: comp.direccion, tipo: 'texto' },
                valor_total: { valor: comp.valor_lote, valorFormateado: this.formatearMoneda(comp.valor_lote), tipo: 'moneda' },
                valor_unitario: { valor: comp.valor_m2, valorFormateado: this.formatearMoneda(comp.valor_m2), tipo: 'moneda' },
                frente: { valor: comp.frente, valorFormateado: this.formatearNumeroSeguro(comp.frente, 2, 'm'), tipo: 'numero' },
                fondo: { valor: comp.fondo, valorFormateado: this.formatearNumeroSeguro(comp.fondo, 2, 'm'), tipo: 'numero' },
                fos: { valor: comp.fos, valorFormateado: comp.fos || '-', tipo: 'texto' },
                fot: { valor: comp.fot, valorFormateado: comp.fot || '-', tipo: 'texto' },
                fitto_cervini: { valor: comp.coef_fitto_relacion, valorFormateado: this.formatearNumeroSeguro(comp.coef_fitto_relacion), tipo: 'coeficiente' },
                valvano: comp.extras?.coef_valvano ? { valor: comp.extras.coef_valvano, valorFormateado: this.formatearNumeroSeguro(comp.extras.coef_valvano), tipo: 'coeficiente' } : { valor: null, valorFormateado: '-', tipo: 'vacio' },
                ubicacion: { valor: coefUbicacion, valorFormateado: this.formatearNumeroSeguro(coefUbicacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: coefActualizacion, valorFormateado: this.formatearNumeroSeguro(coefActualizacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_homogeneizado: { valor: comp.valor_m2_homogeneizado, valorFormateado: this.formatearMoneda(comp.valor_m2_homogeneizado), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaObjetivoLote(resultado, datos, tipoLote, esEsquina) {
        const car = datos.lote?.caracteristicas || {};
        const valorPromedio = resultado.valor_promedio_homogeneizado || 0;
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('objetivo', 'lote');
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados('lote', columnasPersonalizadas);

        return {
            id: 'objetivo',
            tipo: 'destacada',
            orden: 1,
            configuracion: { destacado: true },
            celdas: {
                direccion: { valor: datos.ubicacion?.direccion || 'Sin dirección', valorFormateado: datos.ubicacion?.direccion || 'Sin dirección', tipo: 'texto' },
                frente: { valor: car.frente, valorFormateado: this.formatearNumeroSeguro(car.frente, 2, 'm'), tipo: 'numero' },
                fondo: { valor: car.fondo, valorFormateado: this.formatearNumeroSeguro(car.fondo, 2, 'm'), tipo: 'numero' },
                fos: { valor: car.fos, valorFormateado: car.fos || '-', tipo: 'texto' },
                fot: { valor: car.fot, valorFormateado: car.fot || '-', tipo: 'texto' },
                valor_promedio: { valor: valorPromedio, valorFormateado: this.formatearMoneda(valorPromedio), tipo: 'moneda' },
                fitto_cervini: { valor: resultado.coeficiente_fitto_lote, valorFormateado: this.formatearNumeroSeguro(resultado.coeficiente_fitto_lote), tipo: 'coeficiente' },
                valvano: resultado.coeficiente_valvano ? { valor: resultado.coeficiente_valvano, valorFormateado: this.formatearNumeroSeguro(resultado.coeficiente_valvano), tipo: 'coeficiente' } : { valor: null, valorFormateado: '-', tipo: 'vacio' },
                ubicacion: { valor: resultado.coeficiente_ubicacion, valorFormateado: this.formatearNumeroSeguro(resultado.coeficiente_ubicacion || 1.0), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: resultado.coeficiente_actualizacion, valorFormateado: this.formatearNumeroSeguro(resultado.coeficiente_actualizacion || 1.0), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_final: { valor: resultado.valor_final, valorFormateado: this.formatearMoneda(resultado.valor_final), tipo: 'moneda', visualizacion: { destacado: true } },
                valor_unitario_final: { valor: resultado.valor_m2, valorFormateado: this.formatearMoneda(resultado.valor_m2), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaDetalleLote(resultadoDetalle, tipo, esEsquina) {
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('objetivo', tipo);
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados(tipo, columnasPersonalizadas);

        return {
            id: `detalle_${tipo}`,
            tipo: 'destacada',
            orden: 1,
            configuracion: { destacado: true },
            celdas: {
                direccion: { valor: resultadoDetalle.direccion, valorFormateado: resultadoDetalle.direccion, tipo: 'texto' },
                frente: { valor: resultadoDetalle.frente, valorFormateado: this.formatearNumeroSeguro(resultadoDetalle.frente, 2, 'm'), tipo: 'numero' },
                fondo: { valor: resultadoDetalle.fondo, valorFormateado: this.formatearNumeroSeguro(resultadoDetalle.fondo, 2, 'm'), tipo: 'numero' },
                fos: { valor: resultadoDetalle.fos || '-', valorFormateado: resultadoDetalle.fos || '-', tipo: 'texto' },
                fot: { valor: resultadoDetalle.fot || '-', valorFormateado: resultadoDetalle.fot || '-', tipo: 'texto' },
                valor_promedio: { valor: resultadoDetalle.valor_promedio_m2, valorFormateado: this.formatearMoneda(resultadoDetalle.valor_promedio_m2), tipo: 'moneda' },
                fitto_cervini: { valor: resultadoDetalle.coeficiente_fitto_lote, valorFormateado: this.formatearNumeroSeguro(resultadoDetalle.coeficiente_fitto_lote), tipo: 'coeficiente' },
                valvano: resultadoDetalle.extras?.coef_valvano ? { valor: resultadoDetalle.extras.coef_valvano, valorFormateado: this.formatearNumeroSeguro(resultadoDetalle.extras.coef_valvano), tipo: 'coeficiente' } : { valor: null, valorFormateado: '-', tipo: 'vacio' },
                ubicacion: { valor: resultadoDetalle.coeficiente_ubicacion, valorFormateado: this.formatearNumeroSeguro(resultadoDetalle.coeficiente_ubicacion || 1.0), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: resultadoDetalle.coeficiente_actualizacion, valorFormateado: this.formatearNumeroSeguro(resultadoDetalle.coeficiente_actualizacion || 1.0), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_final: { valor: resultadoDetalle.valor_final, valorFormateado: this.formatearMoneda(resultadoDetalle.valor_final), tipo: 'moneda', visualizacion: { destacado: true } },
                valor_unitario_final: { valor: resultadoDetalle.valor_m2, valorFormateado: this.formatearMoneda(resultadoDetalle.valor_m2), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaPromedioLote(comparables) {
        const promedio = this.calculationEngine.calcularPromedioHomogeneizado(comparables);
        const columnas = this.obtenerColumnasComparablesLote(false);
        
        const celdas = {};
        columnas.forEach(col => {
            if (col.id === 'direccion') {
                celdas[col.id] = { valor: 'Promedio', valorFormateado: 'Promedio', tipo: 'texto', visualizacion: { destacado: true } };
            } else if (col.id === 'valor_homogeneizado') {
                celdas[col.id] = { valor: promedio, valorFormateado: this.formatearMoneda(promedio), tipo: 'moneda', visualizacion: { destacado: true } };
            } else {
                celdas[col.id] = { valor: null, valorFormateado: '-', tipo: 'vacio' };
            }
        });

        return {
            id: 'promedio',
            tipo: 'resumen',
            orden: 999,
            configuracion: { destacado: true },
            celdas
        };
    }

    // =========================
    // FILAS DEPARTAMENTO
    // =========================

    construirFilaComparableDepartamento(comp, index) {
        const coefUbicacion = this.obtenerCoeficiente(index, 'ubicacion');
        const coefActualizacion = this.obtenerCoeficiente(index, 'actualizacion');
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('comparables', 'departamento');
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados(index, columnasPersonalizadas);

        return {
            id: `fila_${index}`,
            tipo: 'dato',
            orden: index + 1,
            acciones: [{ id: 'menu', icono: 'fa-ellipsis-vertical' }],
            celdas: {
                direccion: { valor: comp.direccion, valorFormateado: comp.direccion, tipo: 'texto' },
                valor_total: { valor: comp.valor, valorFormateado: this.formatearMoneda(comp.valor), tipo: 'moneda' },
                valor_unitario: { valor: comp.valor / comp.superficie, valorFormateado: this.formatearMoneda(comp.valor / comp.superficie), tipo: 'moneda' },
                superficie: { valor: comp.superficie, valorFormateado: this.formatearNumeroSeguro(comp.superficie, 2, 'm²'), tipo: 'numero' },
                coef_ubicacion_planta: { valor: comp.ubicacionPlanta, valorFormateado: this.formatearNumeroSeguro(comp.ubicacionPlanta), tipo: 'coeficiente' },
                coef_piso: { valor: comp.ubicacionPiso, valorFormateado: this.formatearNumeroSeguro(comp.ubicacionPiso), tipo: 'coeficiente' },
                coef_constructiva: { valor: comp.caracteristicaConstructiva, valorFormateado: this.formatearNumeroSeguro(comp.caracteristicaConstructiva), tipo: 'coeficiente' },
                coef_superficie: { valor: comp.superficieCubierta, valorFormateado: this.formatearNumeroSeguro(comp.superficieCubierta), tipo: 'coeficiente' },
                ubicacion: { valor: coefUbicacion, valorFormateado: this.formatearNumeroSeguro(coefUbicacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: coefActualizacion, valorFormateado: this.formatearNumeroSeguro(coefActualizacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_homogeneizado: { valor: comp.valor_m2_homogeneizado, valorFormateado: this.formatearMoneda(comp.valor_m2_homogeneizado), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaObjetivoDepartamento(resultado, datos) {
        const depto = datos.departamento || {};
        const hom = depto.homogeneizacion || {};
        const valorPromedio = resultado.valor_promedio_homogeneizado || resultado.valor_m2 || 0;
        const superficieHomogeneizada = hom.totalHomogeneizada || resultado.superficie || 0;
        const coefUbicacion = this.obtenerCoeficiente('departamento', 'ubicacion');
        const coefActualizacion = this.obtenerCoeficiente('departamento', 'actualizacion');
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('objetivo', 'departamento');
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados('departamento', columnasPersonalizadas);

        return {
            id: 'objetivo',
            tipo: 'destacada',
            orden: 1,
            configuracion: { destacado: true },
            celdas: {
                direccion: { valor: datos.ubicacion?.direccion || 'Sin dirección', valorFormateado: datos.ubicacion?.direccion || 'Sin dirección', tipo: 'texto' },
                superficie: { valor: superficieHomogeneizada, valorFormateado: this.formatearNumeroSeguro(superficieHomogeneizada, 2, 'm²'), tipo: 'numero' },
                coef_ubicacion_planta: { valor: 1.0, valorFormateado: '1.00', tipo: 'coeficiente' },
                coef_piso: { valor: 1.0, valorFormateado: '1.00', tipo: 'coeficiente' },
                coef_constructiva: { valor: 1.0, valorFormateado: '1.00', tipo: 'coeficiente' },
                coef_superficie: { valor: 1.0, valorFormateado: '1.00', tipo: 'coeficiente' },
                ubicacion: { valor: coefUbicacion, valorFormateado: this.formatearNumeroSeguro(coefUbicacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: coefActualizacion, valorFormateado: this.formatearNumeroSeguro(coefActualizacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_final: { valor: resultado.valor_final, valorFormateado: this.formatearMoneda(resultado.valor_final), tipo: 'moneda', visualizacion: { destacado: true } },
                valor_unitario_final: { valor: resultado.valor_m2, valorFormateado: this.formatearMoneda(resultado.valor_m2), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaPromedioDepartamento(comparables) {
        const promedio = this.calculationEngine.calcularPromedioHomogeneizado(comparables);
        const columnas = this.obtenerColumnasComparablesDepartamento();
        
        const celdas = {};
        columnas.forEach(col => {
            if (col.id === 'direccion') {
                celdas[col.id] = { valor: 'Promedio', valorFormateado: 'Promedio', tipo: 'texto', visualizacion: { destacado: true } };
            } else if (col.id === 'valor_homogeneizado') {
                celdas[col.id] = { valor: promedio, valorFormateado: this.formatearMoneda(promedio), tipo: 'moneda', visualizacion: { destacado: true } };
            } else {
                celdas[col.id] = { valor: null, valorFormateado: '-', tipo: 'vacio' };
            }
        });

        return {
            id: 'promedio',
            tipo: 'resumen',
            orden: 999,
            configuracion: { destacado: true },
            celdas
        };
    }

    // =========================
    // FILAS CASA
    // =========================

    construirFilaComparableCasa(comp, index) {
        const coefUbicacion = this.obtenerCoeficiente(index, 'ubicacion');
        const coefActualizacion = this.obtenerCoeficiente(index, 'actualizacion');
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('comparables', 'casa');
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados(index, columnasPersonalizadas);

        return {
            id: `fila_${index}`,
            tipo: 'dato',
            orden: index + 1,
            acciones: [{ id: 'menu', icono: 'fa-ellipsis-vertical' }],
            celdas: {
                direccion: { valor: comp.direccion, valorFormateado: comp.direccion, tipo: 'texto' },
                valor_total: { valor: comp.valor, valorFormateado: this.formatearMoneda(comp.valor), tipo: 'moneda' },
                valor_unitario: { valor: comp.valor / comp.superficie, valorFormateado: this.formatearMoneda(comp.valor / comp.superficie), tipo: 'moneda' },
                superficie: { valor: comp.superficie, valorFormateado: this.formatearNumeroSeguro(comp.superficie, 2, 'm²'), tipo: 'numero' },
                ubicacion: { valor: coefUbicacion, valorFormateado: this.formatearNumeroSeguro(coefUbicacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: coefActualizacion, valorFormateado: this.formatearNumeroSeguro(coefActualizacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_homogeneizado: { valor: comp.valor_m2_homogeneizado, valorFormateado: this.formatearMoneda(comp.valor_m2_homogeneizado), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaObjetivoCasa(resultado, datos) {
        const casa = datos.casa || {};
        const hom = casa.homogeneizacion || {};
        const valorPromedio = resultado.valor_promedio_homogeneizado || resultado.valor_m2 || 0;
        const superficieHomogeneizada = hom.totalHomogeneizada || resultado.superficie || 0;
        const coefUbicacion = this.obtenerCoeficiente('casa', 'ubicacion');
        const coefActualizacion = this.obtenerCoeficiente('casa', 'actualizacion');
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas('objetivo', 'casa');
        const celdasPersonalizadas = this.construirCeldasCoeficientesPersonalizados('casa', columnasPersonalizadas);

        return {
            id: 'objetivo',
            tipo: 'destacada',
            orden: 1,
            configuracion: { destacado: true },
            celdas: {
                direccion: { valor: datos.ubicacion?.direccion || 'Sin dirección', valorFormateado: datos.ubicacion?.direccion || 'Sin dirección', tipo: 'texto' },
                superficie: { valor: superficieHomogeneizada, valorFormateado: this.formatearNumeroSeguro(superficieHomogeneizada, 2, 'm²'), tipo: 'numero' },
                ubicacion: { valor: coefUbicacion, valorFormateado: this.formatearNumeroSeguro(coefUbicacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                actualizacion: { valor: coefActualizacion, valorFormateado: this.formatearNumeroSeguro(coefActualizacion), tipo: 'parametro_editable', edicion: { editable: true, tipo: 'numero', paso: 0.01 } },
                ...celdasPersonalizadas,
                valor_final: { valor: resultado.valor_final, valorFormateado: this.formatearMoneda(resultado.valor_final), tipo: 'moneda', visualizacion: { destacado: true } },
                valor_unitario_final: { valor: resultado.valor_m2, valorFormateado: this.formatearMoneda(resultado.valor_m2), tipo: 'moneda', visualizacion: { destacado: true } }
            }
        };
    }

    construirFilaPromedioCasa(comparables) {
        const promedio = this.calculationEngine.calcularPromedioHomogeneizado(comparables);
        const columnas = this.obtenerColumnasComparablesCasa();
        
        const celdas = {};
        columnas.forEach(col => {
            if (col.id === 'direccion') {
                celdas[col.id] = { valor: 'Promedio', valorFormateado: 'Promedio', tipo: 'texto', visualizacion: { destacado: true } };
            } else if (col.id === 'valor_homogeneizado') {
                celdas[col.id] = { valor: promedio, valorFormateado: this.formatearMoneda(promedio), tipo: 'moneda', visualizacion: { destacado: true } };
            } else {
                celdas[col.id] = { valor: null, valorFormateado: '-', tipo: 'vacio' };
            }
        });

        return {
            id: 'promedio',
            tipo: 'resumen',
            orden: 999,
            configuracion: { destacado: true },
            celdas
        };
    }

    // =========================
    // UTILIDADES
    // =========================

    obtenerCoeficiente(index, coefId, defaultValue = 1.0) {
        if (typeof coeficientesPersonalizados === 'undefined' || !coeficientesPersonalizados[index]) {
            return defaultValue;
        }
        const coef = coeficientesPersonalizados[index].find(c => c.id === coefId);
        return coef ? coef.valor : defaultValue;
    }

    construirCeldasCoeficientesPersonalizados(index, columnasPersonalizadas) {
        const celdas = {};
        columnasPersonalizadas.forEach(coef => {
            const valor = this.obtenerCoeficiente(index, coef.id, 1.0);
            celdas[coef.id] = {
                valor: valor,
                valorFormateado: this.formatearNumeroSeguro(valor),
                tipo: 'parametro_editable',
                edicion: { editable: true, tipo: 'numero', paso: 0.01 }
            };
        });
        return celdas;
    }

    obtenerColumnasPersonalizadas(tipoTabla = 'comparables', tipo = '') {
        if (typeof coeficientesPersonalizados === 'undefined') return [];

        const todos = [];
        const indicesExcluir = ['lote', 'esquina', 'medial'];

        if (tipoTabla === 'objetivo') {
            // Para tabla objetivo se usan los coeficientes del tipo (lote/departamento/casa)
            const key = tipo || 'departamento';
            const coefs = coeficientesPersonalizados[key] || [];
            coefs.forEach(coef => {
                if (coef.id !== 'ubicacion' && coef.id !== 'actualizacion' && coef.id !== 'actividad' &&
                    !todos.find(c => c.id === coef.id)) {
                    todos.push(coef);
                }
            });
        } else {
            // Para tabla comparables se acumulan de todos los comparables
            Object.keys(coeficientesPersonalizados).forEach(index => {
                if (indicesExcluir.includes(index) || isNaN(parseInt(index))) return;
                const coefs = coeficientesPersonalizados[index] || [];
                coefs.forEach(coef => {
                    if (coef.id !== 'ubicacion' && coef.id !== 'actualizacion' && coef.id !== 'actividad' &&
                        !todos.find(c => c.id === coef.id)) {
                        todos.push(coef);
                    }
                });
            });
        }

        return todos;
    }

    formatearMoneda(valor) {
        if (valor === null || valor === undefined) return '-';
        return '$' + Math.round(valor).toLocaleString('es-AR');
    }

    formatearNumeroSeguro(valor, decimales = 2, sufijo = '') {
        if (valor === null || valor === undefined || valor === '') {
            return sufijo ? '- ' + sufijo : '-';
        }
        const num = parseFloat(valor);
        if (isNaN(num)) {
            return sufijo ? '- ' + sufijo : '-';
        }
        const formateado = num.toFixed(decimales);
        return sufijo ? formateado + ' ' + sufijo : formateado;
    }
}

// Instancia singleton del constructor de modelos
var resultModelBuilder = new ResultModelBuilder();

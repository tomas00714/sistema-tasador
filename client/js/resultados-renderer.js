/* =========================
   RESULTADOS RENDERER
   Renderer genérico para la pantalla de resultados de tasación
   Basado en configuración declarativa por tipo de inmueble
========================= */

function diagnosticStringify(obj, maxDepth = 8) {
    const seen = new WeakSet();
    function serialize(value, depth) {
        if (depth > maxDepth) return '[Profundidad maxima]';
        if (value === undefined) return '[undefined]';
        if (value === null) return null;
        if (typeof value === 'function') return '[Function]';
        if (typeof value !== 'object') return value;
        if (value instanceof HTMLElement) return '[HTMLElement]';
        if (value instanceof Window) return '[Window]';
        if (value instanceof Document) return '[Document]';
        if (seen.has(value)) return '[Ciclo]';
        seen.add(value);
        let out;
        if (Array.isArray(value)) {
            out = value.map(item => serialize(item, depth + 1));
        } else {
            out = {};
            for (const k of Object.keys(value)) {
                out[k] = serialize(value[k], depth + 1);
            }
        }
        seen.delete(value);
        return out;
    }
    try {
        return JSON.stringify(serialize(obj, 0), null, 2);
    } catch (e) {
        return '[Error al serializar: ' + e.message + ']';
    }
}

class ResultadosRenderer {
    constructor(contenedor, resultado, tipo, datosTasacionArg = null, modo = 'edicion') {
        this.contenedor = contenedor;
        this.resultado = resultado;
        this.tipo = tipo;
        this.modo = modo;
        this.datosTasacion = datosTasacionArg || window.datosTasacion || {};
        this.coeficientesPersonalizados = (this.datosTasacion?.coeficientesPersonalizados) || window.coeficientesPersonalizados || {};
        this.config = configuracionResultados[tipo] || configuracionResultados.lote;

        console.log('=== DIAGNOSTICO ResultadosRenderer ===');
        console.log('TIPO:', tipo);
        console.log('MODO:', modo);
        console.log('CONFIG COLUMNAS COMPARABLES:', diagnosticStringify(this.config.columnas_comparables));
        console.log('CONFIG COLUMNAS OBJETIVO:', diagnosticStringify(this.config.columnas_objetivo));
        console.log('RESULTADO CRUDO:', diagnosticStringify(resultado));
        console.log('COMPARABLES CRUDOS:', diagnosticStringify(resultado.comparables));

        // Normalizar comparables para asegurar estructura consistente
        this.resultado.comparables = this.normalizarComparables(this.resultado.comparables || []);

        console.log('COMPARABLES NORMALIZADOS:', diagnosticStringify(this.resultado.comparables));

        // Detectar cambio de generación de cuadros y resetear si necesario
        this.detectarCambioGeneracionCuadros();
    }

    normalizarComparables(comparables) {
        return comparables.map(comp => {
            // Normalizar dirección
            const direccion = comp.ubicacion?.direccion || comp.direccion || comp.direccion_completa || "Sin dirección";

            // Usar modelo canónico si existe, fallback a estructura antigua
            const inm = comp.inmueble || {};
            const depto = comp.departamento || {};
            const casaComp = comp.casa || {};

            // Normalizar según tipo
            if (this.tipo === 'lote') {
                console.log('[normalizarComparables] lote COMP crudo:', diagnosticStringify(comp));
                const normalizado = {
                    ...comp,
                    direccion: direccion,
                    valor_lote: comp.valor_lote || comp.valor,
                    valor_m2: comp.valor_m2 || (comp.valor / comp.superficie),
                    frente: inm.frente || comp.frente || 0,
                    fondo: inm.fondo || comp.fondo || 0,
                    fos: inm.fos || comp.fos || null,
                    fot: inm.fot || comp.fot || null,
                    tipoLote: inm.tipoLote || comp.tipoLote || '',
                    coef_fitto_comparable: comp.coef_fitto_comparable || comp.coef_fitto_relacion || null,
                    coef_fitto_relacion: comp.coef_fitto_comparable || comp.coef_fitto_relacion || null,
                    valor_m2_homogeneizado: comp.valor_m2_homogeneizado || comp.valor_m2
                };
                console.log('[normalizarComparables] lote COMP normalizado:', diagnosticStringify(normalizado));
                return normalizado;
            } else if (this.tipo === 'departamento') {
                console.log('[normalizarComparables] departamento COMP crudo:', diagnosticStringify(comp));
                const superficie = comp.superficie || inm.superficie || depto.superficieTotal || 0;
                const superficieHomogeneizada = comp.superficie_homogeneizada ?? superficie;
                const valor = comp.valor || 0;
                const valorM2 = comp.valor_m2 || (superficie > 0 ? valor / superficie : 0);
                const rossHeidecke = parseFloat(comp.rossHeidecke) || 1;

                const normalizado = {
                    ...comp,
                    direccion: direccion,
                    valor: valor,
                    valor_m2: valorM2,
                    valor_m2_homogeneizado: comp.valor_m2_homogeneizado || valorM2,
                    superficie: superficie,
                    superficie_homogeneizada: superficieHomogeneizada,
                    antiguedad: comp.antiguedad ?? inm.antiguedad ?? depto.antiguedad ?? null,
                    estadoConservacion: comp.estadoConservacion ?? inm.estadoConservacion ?? depto.estadoConservacion ?? null,
                    // Extraer coeficientes del modelo canónico o fallback
                    rossHeidecke,
                    ubicacionPlantaCoef: inm.ubicacionPlantaCoef || comp.ubicacionPlantaCoef || depto.ubicacionPlantaCoef || null,
                    ubicacionPisoCoef: inm.ubicacionPisoCoef || comp.ubicacionPisoCoef || depto.ubicacionPisoCoef || null,
                    caracteristicaConstructivaCoef: inm.caracteristicaConstructivaCoef || comp.caracteristicaConstructivaCoef || depto.caracteristicaConstructivaCoef || null,
                    superficieCubiertaCoef: inm.superficieCubiertaCoef || comp.superficieCubiertaCoef || depto.superficieCubiertaCoef || null,
                    superficieTotal: inm.superficieTotal || comp.superficieTotal || depto.superficieTotal || superficie
                };
                console.log('[normalizarComparables] departamento COMP normalizado:', diagnosticStringify(normalizado));
                return normalizado;
            } else if (this.tipo === 'casa') {
                console.log('[normalizarComparables] casa COMP crudo:', diagnosticStringify(comp));
                const superficie = comp.superficie || inm.superficie || casaComp.superficie || 0;
                const superficieHomogeneizada = comp.superficie_homogeneizada ?? superficie;
                const valor = comp.valor || 0;
                const valorM2 = comp.valor_m2 || (superficie > 0 ? valor / superficie : 0);
                const rossHeidecke = parseFloat(comp.rossHeidecke) || 1;

                const normalizado = {
                    ...comp,
                    direccion: direccion,
                    valor: valor,
                    valor_m2: valorM2,
                    valor_m2_homogeneizado: comp.valor_m2_homogeneizado || valorM2,
                    superficie: superficie,
                    superficie_homogeneizada: superficieHomogeneizada,
                    superficieCubierta: comp.superficieCubierta || casaComp.superficieCubiertaTexto || casaComp.superficieCubierta || '',
                    superficieCubiertaCoef: inm.superficieCubiertaCoef || comp.superficieCubiertaCoef || casaComp.superficieCubiertaCoef || 1,
                    superficieTotal: comp.superficieTotal || casaComp.superficieTotalTexto || casaComp.superficieTotal || '',
                    superficieTotalCoef: inm.superficieTotalCoef || comp.superficieTotalCoef || casaComp.superficieTotalCoef || 1,
                    calidadConstruccion: comp.calidadConstruccion || casaComp.calidadConstruccion || '',
                    calidadConstruccionCoef: inm.calidadConstruccionCoef || comp.calidadConstruccionCoef || casaComp.calidadConstruccionCoef || 1,
                    estadoConservacion: comp.estadoConservacion ?? inm.estadoConservacion ?? casaComp.estadoConservacion ?? null,
                    antiguedad: comp.antiguedad ?? inm.antiguedad ?? casaComp.antiguedad ?? null,
                    rossHeidecke
                };
                normalizado.estadoConservacionCoef = parseFloat(normalizado.estadoConservacionCoef) || rossHeidecke;

                console.log('[normalizarComparables] casa COMP normalizado:', diagnosticStringify(normalizado));
                return normalizado;
            }
            return comp;
        });
    }

    detectarCambioGeneracionCuadros() {
        // En modo solo lectura no se mutan coeficientes ni resultados globales
        if (this.modo === 'lectura') return;

        // Calcular la firma actual de la generación de cuadros
        const firmaActual = this.calcularFirmaGeneracion();

        // Variable global para almacenar la firma anterior
        if (typeof firmaGeneracionCuadros === 'undefined') {
            window.firmaGeneracionCuadros = {};
        }

        const firmaAnterior = window.firmaGeneracionCuadros[this.tipo];

        // Si la firma cambió, resetear coeficientes y resultados
        if (firmaAnterior && firmaAnterior !== firmaActual) {
            console.log('[ResultadosRenderer] Cambio de generación de cuadros detectado, reseteando coeficientes y resultados');
            this.coeficientesPersonalizados = window.coeficientesPersonalizados = {};
            resultadoTasacion = null;
        }

        // Guardar la firma actual
        window.firmaGeneracionCuadros[this.tipo] = firmaActual;
    }

    calcularFirmaGeneracion() {
        // Generar una firma basada en las condiciones que afectan la generación de cuadros
        let firma = this.tipo;
        
        if (this.tipo === 'lote') {
            const tipoLote = this.datosTasacion.lote?.tipoLote;
            // Para lote, la condición principal es si es esquina (agrega valvano)
            const esEsquina = tipoLote === 'Esquina' || tipoLote === 'Esquina larga (+30m)';
            firma += `_${esEsquina ? 'esquina' : 'no_esquina'}`;
            // También considerar el tipo específico de lote para diferenciar medial vs esquina larga
            firma += `_${tipoLote || 'sin_tipo'}`;
        }
        
        return firma;
    }

    renderizar() {
        const html = this.modo === 'lectura'
            ? `
                <div class="resultado-layout-vertical">
                    ${this.renderizarSecciones()}
                </div>
            `
            : `
                ${this.renderizarHeader()}
                ${this.renderizarAdvertencias()}
                <div class="resultado-layout-vertical">
                    ${this.renderizarTarjetaValor()}
                    ${this.renderizarSecciones()}
                </div>
            `;
        this.contenedor.innerHTML = html;
        if (this.modo !== 'lectura') {
            this.inicializarEventListeners();
        }
        return html;
    }

    renderizarAdvertencias() {
        const advertencias = this.resultado?.advertencias || [];
        if (!advertencias.length) return '';
        const lista = advertencias.map(a => `<li>${a}</li>`).join('');
        return `
            <div class="alerta-advertencia" style="background:#fff3cd;color:#856404;padding:12px 16px;border:1px solid #ffeeba;border-radius:6px;margin:0 0 16px 0;">
                <strong>Advertencia</strong>
                <ul style="margin:8px 0 0 0; padding-left: 20px;">${lista}</ul>
            </div>
        `;
    }

    renderizarHeader() {
        return `
            <div class="titulo-seccion">
                <h1>Resultado de la tasación</h1>
                <p>Valor estimado según ${this.config.metodo} y comparables homogeneizados.</p>
            </div>
        `;
    }

    renderizarTarjetaValor() {
        const r = this.resultado;
        return `
            <div class="resultado-valor-card">
                <div class="resultado-valor-top">
                    <div class="resultado-valor-left">
                        <span class="resultado-etiqueta">Valor final</span>
                        <span class="resultado-valor">$ ${this.formatearMoneda(r.valor_final)}</span>
                    </div>
                </div>
                <div class="resultado-separador"></div>
                <div class="resultado-meta">
                    <div>
                        <span>Valor por m² homogeneizado</span>
                        <strong>$ ${this.formatearMoneda(r.valor_m2)}</strong>
                    </div>
                    <div>
                        <span>Superficie homogeneizada</span>
                        <strong>${r.superficie ? r.superficie.toFixed(2) : '0.00'} m²</strong>
                    </div>
                </div>
            </div>
        `;
    }

    renderizarSecciones() {
        // Renderizar tabla de comparables
        // Renderizar tabla(s) de objetivo (puede ser múltiple)
        return `
            ${this.renderizarTablaComparables()}
            ${this.renderizarTablasObjetivo()}
        `;
    }

    renderizarTablaComparables() {
        const columnas = this.obtenerColumnas('comparables');
        return `
            <div class="resultado-tabla-wrap">
                <h3>Comparables</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${this.renderizarThead(columnas, 'comparables')}
                        ${this.renderizarTbodyComparables(columnas)}
                        ${this.renderizarTfootPromedio(columnas)}
                    </table>
                </div>
            </div>
        `;
    }

    renderizarTablasObjetivo() {
        // Verificar si hay secciones objetivo explícitas en el resultado
        if (this.resultado.secciones_objetivo && this.resultado.secciones_objetivo.length > 0) {
            return this.resultado.secciones_objetivo.map(seccion => 
                this.renderizarTablaObjetivo(seccion)
            ).join('');
        }

        // Fallback: usar estructura antigua para compatibilidad
        return this.renderizarTablaObjetivoFallback();
    }

    renderizarTablaObjetivo(seccion) {
        const columnas = this.obtenerColumnas('objetivo', seccion);
        return `
            <div class="resultado-tabla-wrap">
                <h3>${seccion.titulo}</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${this.renderizarThead(columnas, 'objetivo')}
                        ${this.renderizarTbodyObjetivo(columnas, seccion)}
                    </table>
                </div>
            </div>
        `;
    }

    renderizarTablaObjetivoFallback() {
        // Para lote con estructura antigua
        if (this.tipo === 'lote') {
            return this.renderizarTablaObjetivoLote();
        }
        // Para departamento con estructura antigua
        if (this.tipo === 'departamento') {
            return this.renderizarTablaObjetivoDepartamento();
        }
        // Para casa con estructura antigua
        if (this.tipo === 'casa') {
            return this.renderizarTablaObjetivoCasa();
        }
        return '';
    }

    renderizarTablaObjetivoLote() {
        const columnas = this.obtenerColumnas('objetivo');
        const r = this.resultado;
        const tipoLote = this.datosTasacion.lote?.tipoLote;

        // Verificar condiciones especiales
        const esEsquinaLarga = tipoLote === "Esquina larga (+30m)" || tipoLote === "esquina_larga";
        const esSalidaDosCalles = tipoLote === "Salida a dos calles" || tipoLote === "dos_calles";

        // Solo esquina larga usa cuadros de detalle
        if (esEsquinaLarga) {
            let html = '';
            if (r.resultado_esquina) {
                html += this.generarCuadroDetalleLote(r.resultado_esquina, 'esquina');
            }
            if (r.resultado_medial) {
                html += this.generarCuadroDetalleLote(r.resultado_medial, 'medial');
            }
            // Inicializar event listeners para los nuevos elementos (solo en modo edición)
            if (this.modo !== 'lectura') {
                this.inicializarEventListeners();
            }
            return html;
        }

        // Obtener datos de fila usando el renderizador del config
        const datosFila = this.config.renderizadores_objetivo?.obtenerDatosFila(r, this.datosTasacion) || {};
        const filaObjetivo = this.renderizarFilaGenerica(columnas, datosFila, 'objetivo', this.tipo);

        // Salida a dos calles y otros tipos usan tabla estándar
        return `
            <div class="resultado-tabla-wrap">
                <h3>Detalle del lote objetivo</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${this.renderizarThead(columnas, 'objetivo')}
                        <tbody>${filaObjetivo}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderizarTablaObjetivoDepartamento() {
        const columnas = this.obtenerColumnas('objetivo');
        const r = this.resultado;

        // Obtener datos de fila usando el renderizador del config
        const datosFila = this.config.renderizadores_objetivo?.obtenerDatosFila(r, this.datosTasacion) || {};
        const filaObjetivo = this.renderizarFilaGenerica(columnas, datosFila, 'objetivo', this.tipo);

        return `
            <div class="resultado-tabla-wrap">
                <h3>Departamento a tasar</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${this.renderizarThead(columnas, 'objetivo')}
                        <tbody>${filaObjetivo}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderizarTablaObjetivoCasa() {
        const columnas = this.obtenerColumnas('objetivo');
        const r = this.resultado;

        // Obtener datos de fila usando el renderizador del config
        const datosFila = this.config.renderizadores_objetivo?.obtenerDatosFila(r, this.datosTasacion) || {};
        const filaObjetivo = this.renderizarFilaGenerica(columnas, datosFila, 'objetivo', this.tipo);

        return `
            <div class="resultado-tabla-wrap">
                <h3>Casa a tasar</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${this.renderizarThead(columnas, 'objetivo')}
                        <tbody>${filaObjetivo}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    obtenerColumnas(tipo, seccion = null) {
        let columnas = tipo === 'comparables'
            ? [...this.config.columnas_comparables]
            : [...this.config.columnas_objetivo];

        // Aplicar columnas condicionales en la posición correcta
        if (this.config.columnas_condicionales) {
            this.config.columnas_condicionales.forEach(cond => {
                // Si la columna condicional es solo para objetivo y estamos en comparables, saltar
                if (cond.solo_objetivo && tipo === 'comparables') {
                    return;
                }

                if (cond.condicion(this.datosTasacion)) {
                    if (cond.insertar_despues_de) {
                        // Insertar después de la columna especificada
                        const insertIndex = columnas.findIndex(col => col.id === cond.insertar_despues_de);
                        if (insertIndex !== -1) {
                            columnas.splice(insertIndex + 1, 0, ...cond.columnas);
                        }
                    } else {
                        // Agregar al final
                        columnas = [...columnas, ...cond.columnas];
                    }
                }
            });
        }

        return columnas;
    }

    insertarColumnasPersonalizadas(columnas, tipoTabla = 'comparables') {
        // Encontrar el índice de la última columna de coeficiente fijo
        const coeficientesFijos = ['ubicacion', 'actualizacion', 'actividad'];
        let insertIndex = columnas.length;
        for (let i = columnas.length - 1; i >= 0; i--) {
            if (coeficientesFijos.includes(columnas[i].id)) {
                insertIndex = i + 1;
                break;
            }
        }

        return {
            columnasAntes: columnas.slice(0, insertIndex),
            columnasDespues: columnas.slice(insertIndex),
            insertIndex
        };
    }

    renderizarThead(columnas, tipoTabla = 'comparables') {
        // Agregar columnas personalizadas dinámicas
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas(tipoTabla);
        const columnasPersonalizadasHeader = columnasPersonalizadas.map(coef => {
            const botonEliminar = this.modo === 'lectura' ? '' : `<button type="button" class="coef-eliminar-btn" data-coef-id="${coef.id}" data-tipo="${tipoTabla === 'objetivo' ? this.tipo : ''}" title="Eliminar coeficiente">-</button><br>`;
            return `<th>${botonEliminar}<span class="coef-title">${coef.nombre}</span></th>`;
        }).join('');

        // Insertar columnas personalizadas después de los coeficientes fijos
        const { columnasAntes, columnasDespues } = this.insertarColumnasPersonalizadas(columnas, tipoTabla);

        return `
            <thead>
                <tr>
                    ${columnasAntes.map(col => `<th>${col.label}</th>`).join('')}
                    ${columnasPersonalizadasHeader}
                    ${columnasDespues.map(col => `<th>${col.label}</th>`).join('')}
                    <th></th>
                </tr>
            </thead>
        `;
    }

    obtenerColumnasPersonalizadas(tipoTabla = 'comparables') {
        console.log('[obtenerColumnasPersonalizadas] START - tipoTabla:', tipoTabla, 'this.tipo:', this.tipo);
        if (!this.coeficientesPersonalizados) return [];

        const todosCoeficientes = [];

        if (tipoTabla === 'objetivo') {
            // Para tabla objetivo, solo mostrar coeficientes del tipo actual
            const tipoIndex = this.tipo;
            console.log('[obtenerColumnasPersonalizadas] tipoIndex:', tipoIndex);
            const coefs = this.coeficientesPersonalizados[tipoIndex] || [];
            console.log('[obtenerColumnasPersonalizadas] coefs:', coefs);
            coefs.forEach(coef => {
                if (!todosCoeficientes.find(c => c.id === coef.id) &&
                    coef.id !== 'ubicacion' && coef.id !== 'actualizacion' && coef.id !== 'actividad') {
                    todosCoeficientes.push(coef);
                }
            });
        } else {
            // Para tabla comparables, mostrar coeficientes acumulados
            Object.keys(this.coeficientesPersonalizados).forEach(index => {
                if (!isNaN(parseInt(index))) {
                    const coefs = this.coeficientesPersonalizados[index];
                    coefs.forEach(coef => {
                        if (!todosCoeficientes.find(c => c.id === coef.id) &&
                            coef.id !== 'ubicacion' && coef.id !== 'actualizacion' && coef.id !== 'actividad') {
                            todosCoeficientes.push(coef);
                        }
                    });
                }
            });
        }
        console.log('[obtenerColumnasPersonalizadas] todosCoeficientes:', todosCoeficientes);
        return todosCoeficientes;
    }

    renderizarTbodyComparables(columnas) {
        const comparables = this.resultado.comparables || [];
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas();
        
        return `
            <tbody>
                ${comparables.map((comp, index) => 
                    this.renderizarFilaComparable(comp, columnas, index, columnasPersonalizadas)
                ).join('')}
            </tbody>
        `;
    }

    renderizarFilaComparable(comparable, columnas, index, columnasPersonalizadas) {
        // Insertar columnas personalizadas después de los coeficientes fijos
        const { columnasAntes, columnasDespues } = this.insertarColumnasPersonalizadas(columnas, 'comparables');

        const celdaAcciones = this.modo === 'lectura' ? '<td></td>' : `
            <td>
                <button type="button" class="btn-opciones-comparable" data-index="${index}">•••</button>
            </td>
        `;

        return `
            <tr data-comparable-index="${index}">
                ${columnasAntes.map(col => this.renderizarCelda(comparable, col, index)).join('')}
                ${columnasPersonalizadas.map(coef => this.renderizarCeldaPersonalizada(comparable, coef, index)).join('')}
                ${columnasDespues.map(col => this.renderizarCelda(comparable, col, index)).join('')}
                ${celdaAcciones}
            </tr>
        `;
    }

    renderizarFilaGenerica(columnas, datosFila, tipoTabla = 'objetivo', index = null) {
        console.log('[renderizarFilaGenerica] START - tipoTabla:', tipoTabla, 'index:', index, 'this.tipo:', this.tipo);
        
        // Insertar columnas personalizadas después de los coeficientes fijos
        const { columnasAntes, columnasDespues } = this.insertarColumnasPersonalizadas(columnas, tipoTabla);

        // Obtener columnas personalizadas
        console.log('[renderizarFilaGenerica] this.coeficientesPersonalizados:', this.coeficientesPersonalizados);
        const columnasPersonalizadas = tipoTabla === 'objetivo'
            ? (this.coeficientesPersonalizados[index] || []).filter(c => c.id !== 'ubicacion' && c.id !== 'actualizacion' && c.id !== 'actividad')
            : this.obtenerColumnasPersonalizadas();
        
        console.log('[renderizarFilaGenerica] columnasPersonalizadas:', columnasPersonalizadas);

        let celdas = '';
        columnasAntes.forEach(col => {
            celdas += this.renderizarCeldaGenerica(col, datosFila, tipoTabla, index);
        });

        // Agregar columnas personalizadas
        columnasPersonalizadas.forEach(coef => {
            if (tipoTabla === 'objetivo' && this.modo !== 'lectura') {
                celdas += `<td><input type="number" class="coef-personalizado-input" data-index="${index}" data-coef-id="${coef.id}" value="${coef.valor.toFixed(2)}" step="0.01" min="0"></td>`;
            } else if (tipoTabla === 'objetivo' && this.modo === 'lectura') {
                celdas += `<td><strong>${parseFloat(coef.valor).toFixed(2)}</strong></td>`;
            } else {
                celdas += this.renderizarCeldaPersonalizada(datosFila, coef, index);
            }
        });

        columnasDespues.forEach(col => {
            celdas += this.renderizarCeldaGenerica(col, datosFila, tipoTabla, index);
        });

        const filaClass = tipoTabla === 'objetivo' ? `fila-${this.tipo}-tasar` : '';
        const filaStyle = tipoTabla === 'objetivo' ? 'color: #0066cc;' : '';

        const celdaAcciones = this.modo === 'lectura' ? '<td></td>' : `
            <td>
                <button type="button" class="btn-opciones-comparable" data-index="${index}">•••</button>
            </td>
        `;

        return `
            <tr class="${filaClass}" style="${filaStyle}" data-${tipoTabla === 'comparables' ? 'comparable-index' : 'tipo'}="${index}">
                ${celdas}
                ${celdaAcciones}
            </tr>
        `;
    }

    renderizarCeldaGenerica(columna, datosFila, tipoTabla, index) {
        // Para coeficientes fijos, mostrar input en edición o valor fijo en lectura
        if (columna.es_fijo) {
            const valor = this.obtenerValorCoeficienteFijo(columna.id, index);
            if (this.modo === 'lectura') {
                return `<td><strong>${parseFloat(valor).toFixed(2)}</strong></td>`;
            }
            const inputClass = columna.id === 'ubicacion' ? 'coef-ubicacion-input' :
                              columna.id === 'actualizacion' ? 'coef-actualizacion-input' :
                              columna.id === 'actividad' ? 'coef-actividad-input' : 'coef-input';
            return `<td><input type="number" class="${inputClass}" data-index="${index}" data-coef-id="${columna.id}" value="${valor.toFixed(2)}" step="0.01" min="0"></td>`;
        }

        // Usar obtenerValor para respetar la propiedad fuente del config
        const valor = this.obtenerValor(datosFila, columna);

        // DIAGNOSTICO: mostrar que datos se usan para filas objetivo
        if (columna.tipo === 'coeficiente' || columna.tipo === 'moneda' || columna.tipo === 'numero') {
            console.log(`[renderizarCeldaGenerica] index=${index} tipoTabla=${tipoTabla} col.id=${columna.id} col.fuente=${columna.fuente || '-'} valor=${valor} (typeof ${typeof valor}) datosKeys=[${Object.keys(datosFila || {}).join(',')}]`);
        }

        if (valor === undefined || valor === null || valor === '') {
            console.log(`[renderizarCeldaGenerica] VALOR FALTANTE index=${index} col.id=${columna.id} col.fuente=${columna.fuente || '-'}`);
            return `<td>-</td>`;
        }

        switch (columna.tipo) {
            case 'texto':
                return `<td><strong>${this.escapeHtml(valor)}</strong></td>`;
            case 'numero':
                return `<td><strong>${valor}</strong></td>`;
            case 'moneda':
                return `<td><strong>${this.formatearMoneda(valor)}</strong></td>`;
            case 'coeficiente':
                return `<td><strong>${parseFloat(valor).toFixed(2)}</strong></td>`;
            default:
                return `<td>${valor}</td>`;
        }
    }

    renderizarCelda(datos, columna, index = null) {
        // Para coeficientes fijos (ubicacion, actualizacion, actividad), mostrar input en edición o valor fijo en lectura
        if (columna.es_fijo) {
            const dataIndex = index !== null ? index : (this.tipo === 'lote' ? 'lote' : '-1');
            const valor = this.obtenerValorCoeficienteFijo(columna.id, dataIndex);
            if (this.modo === 'lectura') {
                return `<td><strong>${parseFloat(valor).toFixed(2)}</strong></td>`;
            }
            const inputClass = columna.id === 'ubicacion' ? 'coef-ubicacion-input' :
                              columna.id === 'actualizacion' ? 'coef-actualizacion-input' :
                              columna.id === 'actividad' ? 'coef-actividad-input' : 'coef-input';
            return `<td><input type="number" class="${inputClass}" data-index="${dataIndex}" data-coef-id="${columna.id}" value="${valor.toFixed(2)}" step="0.01" min="0"></td>`;
        }

        const valor = this.obtenerValor(datos, columna);

        // DIAGNOSTICO: mostrar que datos se estan usando para cada celda
        if (columna.tipo === 'coeficiente' || columna.tipo === 'moneda' || columna.tipo === 'numero') {
            console.log(`[renderizarCelda] index=${index} tipo=${this.tipo} col.id=${columna.id} col.fuente=${columna.fuente || '-'} valor=${valor} (typeof ${typeof valor}) datosKeys=[${Object.keys(datos || {}).join(',')}]`);
        }

        if (valor === undefined || valor === null || valor === '') {
            console.log(`[renderizarCelda] VALOR FALTANTE index=${index} col.id=${columna.id} col.fuente=${columna.fuente || '-'}`);
            return `<td>-</td>`;
        }

        switch (columna.tipo) {
            case 'texto':
                return `<td>${this.escapeHtml(valor)}</td>`;
            case 'numero':
                return `<td>${valor}</td>`;
            case 'moneda':
                return `<td>${this.formatearMoneda(valor)}</td>`;
            case 'coeficiente':
                return `<td><strong>${parseFloat(valor).toFixed(2)}</strong></td>`;
            default:
                return `<td>${valor}</td>`;
        }
    }

    renderizarCeldaPersonalizada(datos, coef, index) {
        const coefPersonalizado = this.coeficientesPersonalizados[index]?.find(c => c.id === coef.id);
        if (coefPersonalizado) {
            if (this.modo === 'lectura') {
                return `<td><strong>${parseFloat(coefPersonalizado.valor).toFixed(2)}</strong></td>`;
            }
            return `<td><input type="number" class="coef-personalizado-input" data-index="${index}" data-coef-id="${coef.id}" value="${coefPersonalizado.valor}" step="0.01" min="0"></td>`;
        } else if (this.modo === 'lectura') {
            return `<td>-</td>`;
        } else {
            return `<td><button type="button" class="coef-mas-btn" data-index="${index}" data-coef-id="${coef.id}">+</button></td>`;
        }
    }

    renderizarTfootPromedio(columnas) {
        const r = this.resultado;
        const valorPromedio = r.comparables && r.comparables.length > 0
            ? r.comparables.reduce((sum, c) => sum + (c.valor_m2_homogeneizado || 0), 0) / r.comparables.length
            : 0;
        
        const columnasPersonalizadas = this.obtenerColumnasPersonalizadas();
        const columnasPersonalizadasEmpty = columnasPersonalizadas.map(() => `<td></td>`).join('');

        return `
            <tfoot>
                <tr class="valor-promedio-row">
                    <td><strong>Valor promedio:</strong></td>
                    ${columnas.slice(1, -1).map(() => `<td></td>`).join('')}
                    ${columnasPersonalizadasEmpty}
                    <td><strong>${this.formatearMoneda(valorPromedio)}</strong></td>
                    <td></td>
                </tr>
            </tfoot>
        `;
    }

    obtenerValor(datos, columna) {
        if (columna.fuente) {
            // Acceso anidado: "coeficientes.fitto" -> datos.coeficientes.fitto
            const partes = columna.fuente.split('.');
            const valor = partes.reduce((obj, key) => obj?.[key], datos);
            return valor;
        }
        const valor = datos[columna.id];
        return valor;
    }

    obtenerValorCoeficienteFijo(coefId, index) {
        const coefs = this.coeficientesPersonalizados[index] || [];

        // Buscar el coeficiente
        const coef = coefs.find(c => c.id === coefId);
        if (coef) {
            return coef.valor;
        }

        // En modo edición, inicializar el coeficiente si no existe
        if (this.modo !== 'lectura') {
            if (!this.coeficientesPersonalizados[index]) {
                this.coeficientesPersonalizados[index] = [];
            }
            const nombreMap = {
                'ubicacion': 'Ubicacion',
                'actualizacion': 'Actualización',
                'actividad': 'Actividad'
            };
            this.coeficientesPersonalizados[index].push({
                id: coefId,
                nombre: nombreMap[coefId] || coefId,
                valor: 1.0
            });
        }

        return 1.0;
    }

    generarCuadroDetalleLote(resultado, tipo) {
        console.log('[generarCuadroDetalleLote] START - tipo:', tipo);
        const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1);

        // Obtener columnas del config para detalle
        let columnas = [...this.config.columnas_detalle];

        // Aplicar columnas condicionales para detalle
        if (this.config.columnas_condicionales_detalle) {
            this.config.columnas_condicionales_detalle.forEach(cond => {
                if (cond.condicion(tipo)) {
                    if (cond.insertar_despues_de) {
                        const insertIndex = columnas.findIndex(col => col.id === cond.insertar_despues_de);
                        if (insertIndex !== -1) {
                            columnas.splice(insertIndex + 1, 0, ...cond.columnas);
                        }
                    } else {
                        columnas = [...columnas, ...cond.columnas];
                    }
                }
            });
        }

        // Inicializar coeficientes fijos para este tipo (solo en modo edición)
        if (this.modo !== 'lectura') {
            if (!this.coeficientesPersonalizados[tipo]) {
                this.coeficientesPersonalizados[tipo] = [];
            }
            if (!this.coeficientesPersonalizados[tipo].find(c => c.id === 'ubicacion')) {
                this.coeficientesPersonalizados[tipo].push({ id: 'ubicacion', nombre: 'Ubicacion', valor: 1.0 });
            }
            if (!this.coeficientesPersonalizados[tipo].find(c => c.id === 'actualizacion')) {
                this.coeficientesPersonalizados[tipo].push({ id: 'actualizacion', nombre: 'Actualización', valor: 1.0 });
            }
        }

        // Obtener datos de fila usando el renderizador del config
        const datosFila = this.config.renderizadores_detalle?.obtenerDatosFila(resultado, tipo) || {};

        // Renderizar thead
        console.log('[generarCuadroDetalleLote] this.coeficientesPersonalizados[tipo]:', this.coeficientesPersonalizados[tipo]);
        const columnasPersonalizadas = (this.coeficientesPersonalizados[tipo] || []).filter(c => c.id !== 'ubicacion' && c.id !== 'actualizacion');
        console.log('[generarCuadroDetalleLote] columnasPersonalizadas:', columnasPersonalizadas);
        const columnasPersonalizadasHeader = columnasPersonalizadas.map(coef => {
            const botonEliminar = this.modo === 'lectura' ? '' : `<button type="button" class="coef-eliminar-btn" data-coef-id="${coef.id}" data-tipo="${tipo}" title="Eliminar coeficiente">-</button><br>`;
            return `<th>${botonEliminar}<span class="coef-title">${coef.nombre}</span></th>`;
        }).join('');

        const { columnasAntes, columnasDespues } = this.insertarColumnasPersonalizadas(columnas, 'objetivo');

        const thead = `
            <thead>
                <tr>
                    ${columnasAntes.map(col => `<th>${col.label}</th>`).join('')}
                    ${columnasPersonalizadasHeader}
                    ${columnasDespues.map(col => `<th>${col.label}</th>`).join('')}
                    <th></th>
                </tr>
            </thead>
        `;

        // Renderizar fila usando el método genérico
        const fila = this.renderizarFilaGenerica(columnas, datosFila, 'objetivo', tipo);

        return `
            <div class="resultado-tabla-wrap">
                <h3>Detalle ${tipoLabel}</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${thead}
                        <tbody>${fila}</tbody>
                    </table>
                </div>
            </div>
        `;
    }

    inicializarEventListeners() {
        // Event listeners para inputs de coeficientes
        document.querySelectorAll(".coef-ubicacion-input, .coef-actualizacion-input, .coef-actividad-input, .coef-personalizado-input").forEach(input => {
            this.actualizarColorFondoCoeficiente(input);

            input.addEventListener("input", () => {
                this.actualizarColorFondoCoeficiente(input);
                
                // Guardar coeficiente primero
                const index = input.dataset.index;
                const valor = parseFloat(input.value) || 1;
                this.guardarCoeficiente(index, input, valor);
                
                // Luego notificar al sistema reactivo para recálculo con debounce
                reactiveCoefficients.onCoeficienteChange(index, input, valor);
            });
        });

        // Event listeners para botones de opciones
        document.querySelectorAll(".btn-opciones-comparable").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const index = e.target.dataset.index;
                if (typeof mostrarMenuOpcionesComparable === 'function') {
                    mostrarMenuOpcionesComparable(index, e.target);
                }
            });
        });

        // Event listeners para botones de agregar/eliminar coeficientes personalizados
        document.querySelectorAll(".coef-mas-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const index = e.target.dataset.index;
                const coefId = e.target.dataset.coefId;
                this.agregarCoeficientePersonalizado(index, coefId);
                
                // Recalcular automáticamente
                reactiveCoefficients.onCoeficienteAgregado(index, coefId);
            });
        });

        document.querySelectorAll(".coef-eliminar-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const coefId = e.target.dataset.coefId;
                const tipo = e.target.dataset.tipo;
                this.eliminarCoeficientePersonalizado(coefId, tipo);
                
                // Recalcular automáticamente
                reactiveCoefficients.onCoeficienteEliminado(coefId, tipo);
            });
        });
    }

    actualizarColorFondoCoeficiente(input) {
        const valor = parseFloat(input.value) || 1;
        if (valor >= 1.30 || valor <= 0.70) {
            input.classList.add('coeficiente-umbral-excedido');
        } else {
            input.classList.remove('coeficiente-umbral-excedido');
        }
    }

    guardarCoeficiente(index, input, valor) {
        if (!this.coeficientesPersonalizados[index]) {
            this.coeficientesPersonalizados[index] = [];
        }

        if (input.classList.contains('coef-ubicacion-input')) {
            const coef = this.coeficientesPersonalizados[index].find(c => c.id === 'ubicacion');
            if (coef) {
                coef.valor = valor;
            } else {
                this.coeficientesPersonalizados[index].push({ id: 'ubicacion', nombre: 'Ubicacion', valor });
            }
        } else if (input.classList.contains('coef-actualizacion-input')) {
            const coef = this.coeficientesPersonalizados[index].find(c => c.id === 'actualizacion');
            if (coef) {
                coef.valor = valor;
            } else {
                this.coeficientesPersonalizados[index].push({ id: 'actualizacion', nombre: 'Actualización', valor });
            }
        } else if (input.classList.contains('coef-actividad-input')) {
            const coef = this.coeficientesPersonalizados[index].find(c => c.id === 'actividad');
            if (coef) {
                coef.valor = valor;
            } else {
                this.coeficientesPersonalizados[index].push({ id: 'actividad', nombre: 'Actividad', valor });
            }
        } else if (input.classList.contains('coef-personalizado-input')) {
            const coefId = input.dataset.coefId;
            const coef = this.coeficientesPersonalizados[index].find(c => c.id === coefId);
            if (coef) {
                coef.valor = valor;
            }
        }
    }

    agregarCoeficientePersonalizado(index, coefId) {
        console.log('[agregarCoeficientePersonalizado] START - index:', index, 'coefId:', coefId);
        const coefDef = this.obtenerColumnasPersonalizadas().find(c => c.id === coefId);
        const nombre = coefDef ? coefDef.nombre : 'Coeficiente';
        console.log('[agregarCoeficientePersonalizado] coefDef:', coefDef, 'nombre:', nombre);

        if (!this.coeficientesPersonalizados[index]) {
            console.log('[agregarCoeficientePersonalizado] Creando array para index:', index);
            this.coeficientesPersonalizados[index] = [];
        }

        // Inicializar coeficientes fijos si es necesario (solo para comparables, no para objetivos)
        const esObjetivo = ['lote', 'esquina', 'medial', 'departamento', 'casa'].includes(index);
        if (!esObjetivo) {
            if (!this.coeficientesPersonalizados[index].find(c => c.id === 'ubicacion')) {
                this.coeficientesPersonalizados[index].push({ id: 'ubicacion', nombre: 'Ubicacion', valor: 1.0 });
            }
            if (!this.coeficientesPersonalizados[index].find(c => c.id === 'actualizacion')) {
                this.coeficientesPersonalizados[index].push({ id: 'actualizacion', nombre: 'Actualización', valor: 1.0 });
            }
        }

        this.coeficientesPersonalizados[index].push({
            id: coefId,
            nombre: nombre,
            valor: 1.0
        });

        console.log('[agregarCoeficientePersonalizado] Coeficiente agregado. this.coeficientesPersonalizados[index]:', this.coeficientesPersonalizados[index]);

        // Re-renderizar la pantalla para mostrar la nueva columna
        this.renderizar();
    }

    eliminarCoeficientePersonalizado(coefId, tipo) {
        if (tipo) {
            // Es un coeficiente de objetivo (lote/esquina/medial/departamento/casa)
            if (this.coeficientesPersonalizados[tipo]) {
                this.coeficientesPersonalizados[tipo] = this.coeficientesPersonalizados[tipo].filter(c => c.id !== coefId);
            }
        } else {
            // Es un coeficiente de comparables (eliminar de todos los comparables)
            const indicesObjetivo = ['lote', 'esquina', 'medial', 'departamento', 'casa'];
            Object.keys(this.coeficientesPersonalizados).forEach(index => {
                if (!indicesObjetivo.includes(index)) {
                    this.coeficientesPersonalizados[index] = this.coeficientesPersonalizados[index].filter(c => c.id !== coefId);
                }
            });
        }
        // Re-renderizar la pantalla para eliminar la columna
        this.renderizar();
    }


    formatearMoneda(valor) {
        if (typeof valor !== 'number' || !isFinite(valor)) return '0';
        return valor.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
}

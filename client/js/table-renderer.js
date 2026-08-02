/* =========================
   TABLE RENDERER
   Renderer agnóstico al dominio
   Solo renderiza el modelo genérico sin conocer lógica inmobiliaria
========================= */

class TableRenderer {
    constructor(contenedor, modelo) {
        this.contenedor = contenedor;
        this.modelo = modelo;
        this.callbacks = {
            onValorCambiado: null,
            onAccionEjecutada: null
        };
    }

    // =========================
    // RENDERIZADO PRINCIPAL
    // =========================

    renderizar() {
        const html = `
            ${this.renderizarHeader()}
            <div class="resultado-layout-vertical">
                ${this.renderizarTarjetaPrincipal()}
                ${this.renderizarSecciones()}
            </div>
        `;
        this.contenedor.innerHTML = html;
        this.inicializarEventListeners();
    }

    renderizarHeader() {
        return `
            <div class="titulo-seccion">
                <h1>${this.modelo.metadata.titulo}</h1>
                <p>${this.modelo.metadata.subtitulo}</p>
            </div>
        `;
    }

    renderizarTarjetaPrincipal() {
        const tarjeta = this.modelo.tarjetaPrincipal;
        return `
            <div class="resultado-valor-card">
                <div class="resultado-valor-top">
                    <div class="resultado-valor-left">
                        <span class="resultado-etiqueta">${tarjeta.titulo}</span>
                        <span class="resultado-valor">${tarjeta.valorPrincipal.valorFormateado}</span>
                    </div>
                </div>
                <div class="resultado-separador"></div>
                <div class="resultado-meta">
                    ${tarjeta.valoresSecundarios.map(vs => `
                        <div>
                            <span>${vs.etiqueta}</span>
                            <strong>${vs.valorFormateado}</strong>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderizarSecciones() {
        return this.modelo.secciones
            .sort((a, b) => a.orden - b.orden)
            .map(seccion => this.renderizarSeccion(seccion))
            .join('');
    }

    renderizarSeccion(seccion) {
        return `
            <div class="resultado-tabla-wrap">
                <h3>${seccion.titulo}</h3>
                <div class="resultado-tabla-scroll">
                    <table class="resultado-tabla">
                        ${this.renderizarThead(seccion.tabla.columnas)}
                        ${this.renderizarTbody(seccion.tabla)}
                        ${seccion.tabla.filaPie ? this.renderizarFilaPie(seccion.tabla.filaPie, seccion.tabla.columnas) : ''}
                    </table>
                </div>
            </div>
        `;
    }

    // =========================
    // RENDERIZADO DE TABLA
    // =========================

    renderizarThead(columnas) {
        return `
            <thead>
                <tr>
                    ${columnas.map(col => `<th>${col.etiqueta}</th>`).join('')}
                    <th></th>
                </tr>
            </thead>
        `;
    }

    renderizarTbody(tabla) {
        return `
            <tbody>
                ${tabla.filas
                    .sort((a, b) => a.orden - b.orden)
                    .map(fila => this.renderizarFila(fila, tabla.columnas))
                    .join('')}
            </tbody>
        `;
    }

    renderizarFila(fila, columnas) {
        const configuracionFila = fila.configuracion || {};
        const clasesFila = configuracionFila.destacado ? 'resultado-fila-destacada' : '';
        
        return `
            <tr class="${clasesFila}" data-fila-id="${fila.id}">
                ${columnas.map(col => this.renderizarCelda(fila.celdas[col.id], col, fila)).join('')}
                ${fila.acciones && fila.acciones.length > 0 ? this.renderizarAcciones(fila.acciones, fila) : '<td></td>'}
            </tr>
        `;
    }

    renderizarCelda(celda, columna, fila) {
        if (!celda) {
            return '<td>-</td>';
        }

        const tipo = celda.tipo || columna.tipo;
        const valorFormateado = celda.valorFormateado || this.formatearValor(celda.valor, tipo, columna);
        const visualizacion = celda.visualizacion || {};
        const edicion = celda.edicion || {};
        const clases = visualizacion.destacado ? 'resultado-celda-destacada' : '';

        if (edicion.editable) {
            const inputClass = `resultado-input-editable ${clases}`.trim();
            const inputValue = celda.valor !== null && celda.valor !== undefined ? celda.valor : '';
            return `
                <td class="${clases}">
                    <input
                        type="${edicion.tipo || 'number'}"
                        class="${inputClass}"
                        data-fila-id="${fila.id}"
                        data-columna-id="${columna.id}"
                        value="${inputValue}"
                        step="${edicion.paso || 0.01}"
                        min="${edicion.min || 0}"
                    >
                </td>
            `;
        }

        return `<td class="${clases}">${valorFormateado}</td>`;
    }

    renderizarFilaPie(filaPie, columnas) {
        const configuracionFila = filaPie.configuracion || {};
        const clasesFila = configuracionFila.destacado ? 'resultado-fila-destacada' : '';
        
        return `
            <tfoot>
                <tr class="${clasesFila}">
                    ${columnas.map(col => this.renderizarCelda(filaPie.celdas[col.id], col, filaPie)).join('')}
                    <td></td>
                </tr>
            </tfoot>
        `;
    }

    renderizarAcciones(acciones, fila) {
        return `
            <td>
                ${acciones.map(accion => `
                    <button 
                        type="button" 
                        class="btn-opciones-comparable"
                        data-fila-id="${fila.id}"
                        data-accion-id="${accion.id}"
                        title="Opciones"
                    >
                        <i class="fa-solid ${accion.icono}"></i>
                    </button>
                `).join('')}
            </td>
        `;
    }

    // =========================
    // EVENT LISTENERS
    // =========================

    inicializarEventListeners() {
        // Inputs editables
        this.contenedor.querySelectorAll('.resultado-input-editable').forEach(input => {
            input.addEventListener('input', (e) => {
                this.manejarCambioValor(e);
            });
        });

        // Botones de acciones
        this.contenedor.querySelectorAll('.btn-opciones-comparable').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.manejarAccion(e);
            });
        });
    }

    manejarCambioValor(evento) {
        const input = evento.target;
        const filaId = input.dataset.filaId;
        const columnaId = input.dataset.columnaId;
        const valor = parseFloat(input.value) || 0;

        if (this.callbacks.onValorCambiado) {
            this.callbacks.onValorCambiado(filaId, columnaId, valor);
        }
    }

    manejarAccion(evento) {
        const btn = evento.currentTarget;
        const filaId = btn.dataset.filaId;
        const accionId = btn.dataset.accionId;

        if (this.callbacks.onAccionEjecutada) {
            this.callbacks.onAccionEjecutada(filaId, accionId, btn);
        }
    }

    // =========================
    // CALLBACKS
    // =========================

    onValorCambiado(callback) {
        this.callbacks.onValorCambiado = callback;
    }

    onAccionEjecutada(callback) {
        this.callbacks.onAccionEjecutada = callback;
    }

    // =========================
    // UTILIDADES
    // =========================

    formatearValor(valor, tipo, columna) {
        if (valor === null || valor === undefined) return '-';

        switch (tipo) {
            case 'moneda':
                return this.formatearMoneda(valor, columna.configuracion?.moneda);
            case 'numero':
                return this.formatearNumero(valor, columna.configuracion?.numero);
            case 'coeficiente':
                return valor.toFixed(columna.configuracion?.coeficiente?.decimales || 2);
            case 'parametro_editable':
                return valor.toFixed(columna.configuracion?.coeficiente?.decimales || 2);
            case 'texto':
            default:
                return String(valor);
        }
    }

    formatearMoneda(valor, config) {
        const simbolo = config?.simbolo || '$';
        const decimales = config?.decimales || 0;
        return simbolo + Math.round(valor).toLocaleString('es-AR');
    }

    formatearNumero(valor, config) {
        const decimales = config?.decimales || 2;
        const sufijo = config?.sufijo || '';
        return valor.toFixed(decimales) + sufijo;
    }

    // =========================
    // ACTUALIZACIÓN
    // =========================

    actualizarModelo(modelo) {
        this.modelo = modelo;
        this.renderizar();
    }
}

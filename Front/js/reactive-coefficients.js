/* =========================
   REACTIVE COEFFICIENTS
   Sistema reactivo para actualización automática de coeficientes
========================= */

class ReactiveCoefficients {
    constructor() {
        this.debounceTimer = null;
        this.debounceDelay = 300; // ms
        this.tipo = datosTasacion.tipo || 'lote';
    }

    // Manejar cambio en coeficiente
    onCoeficienteChange(index, input, valor) {
        // El guardado se maneja en resultados-renderer.js
        // Este método solo maneja el debounce y recálculo

        // Debounce para evitar recálculos excesivos
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.recalcularAutomaticamente();
        }, this.debounceDelay);
    }

    // Manejar adición de coeficiente personalizado
    onCoeficienteAgregado(index, coefId) {
        // Recalcular inmediatamente (sin debounce)
        this.recalcularAutomaticamente();
    }

    // Manejar eliminación de coeficiente personalizado
    onCoeficienteEliminado(coefId, tipo) {
        // Recalcular inmediatamente (sin debounce)
        this.recalcularAutomaticamente();
    }

    async recalcularAutomaticamente() {
        // Lógica específica por tipo, siempre leyendo el tipo actual
        const tipo = datosTasacion.tipo || this.tipo || 'lote';
        switch (tipo) {
            case 'lote':
                await this.recalcularLote();
                break;
            case 'departamento':
                await this.recalcularDepartamento();
                break;
            case 'casa':
                await this.recalcularCasa();
                break;
        }
    }

    async recalcularLote() {
        // Reutilizar lógica existente de recalcularConCoeficientes
        if (typeof recalcularConCoeficientes === 'function') {
            await recalcularConCoeficientes();
        }
        this.actualizarUI();
    }

    async recalcularDepartamento() {
        // Implementar lógica específica para departamento
        if (typeof recalcularConCoeficientesDepartamento === 'function') {
            await recalcularConCoeficientesDepartamento();
        }
        this.actualizarUI();
    }

    async recalcularCasa() {
        // Implementar lógica específica para casa
        if (typeof recalcularConCoeficientesCasa === 'function') {
            await recalcularConCoeficientesCasa();
        }
        this.actualizarUI();
    }

    actualizarUI() {
        // Actualizar solo los valores que cambiaron, no toda la pantalla
        this.actualizarValoresComparables();
        this.actualizarValorFinal();
        this.actualizarTarjetaValor();
        this.actualizarInputsCoeficientes();
    }

    actualizarInputsCoeficientes() {
        // Actualizar los valores de los inputs de coeficientes después del recálculo
        // Esto es necesario si los coeficientes calculados cambian
        document.querySelectorAll(".coef-ubicacion-input, .coef-actualizacion-input, .coef-actividad-input, .coef-personalizado-input").forEach(input => {
            const index = input.dataset.index;
            const coefId = input.dataset.coefId;
            
            if (coeficientesPersonalizados[index]) {
                const coef = coeficientesPersonalizados[index].find(c => c.id === coefId);
                if (coef) {
                    input.value = coef.valor.toFixed(2);
                }
            }
        });
    }

    actualizarValoresComparables() {
        // Actualizar celdas de valores en tabla de comparables
        const r = resultadoTasacion;
        if (r && r.comparables) {
            r.comparables.forEach((c, index) => {
                // Buscar la fila del comparable
                const row = document.querySelector(`tr[data-comparable-index="${index}"]`);
                if (row) {
                    // Actualizar todas las celdas de moneda en la fila
                    const cells = row.querySelectorAll('td');
                    cells.forEach((cell, cellIndex) => {
                        const cellText = cell.textContent.trim();
                        // Si la celda contiene un valor monetario (tiene $ y números)
                        if (cellText.includes('$') && /\d/.test(cellText)) {
                            // Actualizar el valor basado en el índice de la columna
                            // Esto es una aproximación, lo ideal sería identificar por clase o atributo
                            // Por ahora, actualizamos toda la fila re-renderizándola
                        }
                    });
                }
            });
            
            // Como es difícil identificar exactamente qué celda actualizar sin clases específicas,
            // re-renderizamos toda la tabla de comparables
            if (typeof mostrarPantallaResultado === 'function') {
                mostrarPantallaResultado(false);
            }
        }
    }

    actualizarValorFinal() {
        // Actualizar valor final en la tarjeta
        const r = resultadoTasacion;
        if (r) {
            const valorFinalEl = document.getElementById('valorFinal');
            const valorM2El = document.getElementById('valorM2');
            
            if (valorFinalEl) {
                valorFinalEl.textContent = this.formatearMoneda(r.valor_final);
            }
            if (valorM2El) {
                valorM2El.textContent = this.formatearMoneda(r.valor_m2);
            }
        }
    }

    actualizarTarjetaValor() {
        // Actualizar tarjeta de valor si existe
        const tarjeta = document.querySelector('.resultado-valor-card');
        if (tarjeta && resultadoTasacion) {
            // Re-renderizar solo la tarjeta
            const r = resultadoTasacion;
            tarjeta.innerHTML = `
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
            `;
        }
    }

    formatearMoneda(valor) {
        if (typeof valor !== 'number' || !isFinite(valor)) return '0';
        return valor.toLocaleString('es-AR', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
}

// Instancia global
var reactiveCoefficients = new ReactiveCoefficients();

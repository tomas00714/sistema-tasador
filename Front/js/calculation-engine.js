/* =========================
   CALCULATION ENGINE
   Motor de cálculos puros para tasación
   Sin dependencias de UI ni del modelo visual
========================= */

class CalculationEngine {
    constructor() {
        // Tablas de coeficientes (se cargarán desde backend o configuración)
        this.tablaValvano = {};
    }

    // =========================
    // COEFICIENTES
    // =========================

    /**
     * Calcula el coeficiente Fitto-Cervini
     * @param {Object} datos - Datos del lote/comparable
     * @param {number} datos.frente - Frente del lote
     * @param {number} datos.fondo - Fondo del lote
     * @param {number} datos.superficie - Superficie del lote
     * @returns {number} Coeficiente Fitto-Cervini
     */
    calcularFittoCervini(datos) {
        const { frente, fondo, superficie } = datos;
        
        // En modo demo, usamos 1.0
        // En producción, esto vendría del backend
        return 1.0;
    }

    /**
     * Calcula n = F/m para Valvano
     * @param {number} frente - Frente del lote
     * @param {number} fondo - Fondo del lote
     * @param {string} ladoMayorValor - 'frente' o 'fondo'
     * @returns {number} Valor de n
     */
    calcularNValvano(frente, fondo, ladoMayorValor) {
        const F = frente + fondo;
        const m = ladoMayorValor === 'frente' ? frente : fondo;
        if (m === 0) return 0;
        return F / m;
    }

    /**
     * Obtiene el coeficiente Valvano desde archivo JSON
     * @param {number} n - Valor de n calculado
     * @param {string} zona - Zona del lote
     * @returns {Promise<number>} Coeficiente Valvano
     */
    async obtenerCoeficienteValvano(n, zona) {
        try {
            const response = await fetch('../Back/tablas/valvano_data.json');
            const data = await response.json();
            
            // Map zona to table name
            const zonaToTabla = {
                '1': 'Tabla I',
                '2': 'Tabla II',
                '3': 'Tabla III',
                '4': 'Tabla IV'
            };
            
            const tabla = zonaToTabla[zona] || 'Tabla I';
            const tablaData = data.zonas[tabla];
            
            if (!tablaData) return 0;
            
            // Find the closest n value in the table
            const nValues = data.n_values;
            let closestN = nValues[0];
            let minDiff = Math.abs(n - closestN);
            
            for (const nVal of nValues) {
                const diff = Math.abs(n - nVal);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestN = nVal;
                }
            }
            
            // Get the coefficient for the closest n value
            const nStr = closestN.toFixed(2);
            return tablaData[nStr] || 0;
        } catch (error) {
            console.error('Error loading Valvano table:', error);
            return 0;
        }
    }

    /**
     * Calcula el coeficiente Ross-Heidecke
     * @param {Object} datos - Datos del departamento
     * @param {number} datos.piso - Piso del departamento
     * @param {string} datos.ubicacionPlanta - Ubicación en la planta
     * @param {number} datos.antiguedad - Antigüedad en años
     * @returns {number} Coeficiente Ross-Heidecke
     */
    calcularRossHeidecke(datos) {
        const { piso, ubicacionPlanta, antiguedad } = datos;
        
        // En modo demo, usamos valores simulados
        // En producción, esto vendría del backend
        let coeficiente = 1.0;
        
        // Ajuste por piso
        if (piso >= 1 && piso <= 3) coeficiente *= 1.05;
        else if (piso >= 4 && piso <= 6) coeficiente *= 1.10;
        else if (piso >= 7) coeficiente *= 1.15;
        
        // Ajuste por ubicación en planta
        if (ubicacionPlanta === 'frente') coeficiente *= 1.05;
        else if (ubicacionPlanta === 'contrafrente') coeficiente *= 0.95;
        
        // Ajuste por antigüedad
        if (antiguedad <= 5) coeficiente *= 1.10;
        else if (antiguedad <= 10) coeficiente *= 1.05;
        else if (antiguedad <= 20) coeficiente *= 1.0;
        else coeficiente *= 0.95;
        
        return coeficiente;
    }

    // =========================
    // HOMOGENEIZACIÓN
    // =========================

    /**
     * Homogeneiza un valor aplicando coeficientes
     * @param {number} valorOriginal - Valor original
     * @param {Object} coeficientes - Objeto con coeficientes
     * @returns {number} Valor homogeneizado
     */
    homogeneizarValor(valorOriginal, coeficientes) {
        if (!coeficientes || Object.keys(coeficientes).length === 0) {
            return valorOriginal;
        }

        let valorHomogeneizado = valorOriginal;
        
        // Multiplicar todos los coeficientes
        Object.values(coeficientes).forEach(coef => {
            if (coef !== null && coef !== undefined && coef !== 0) {
                valorHomogeneizado *= coef;
            }
        });

        return valorHomogeneizado;
    }

    /**
     * Homogeneiza un array de comparables
     * @param {Array} comparables - Array de comparables
     * @param {Object} coeficientes - Objeto con coeficientes
     * @returns {Array} Comparables homogeneizados
     */
    homogeneizarComparables(comparables, coeficientes) {
        return comparables.map(comp => {
            const valorOriginal = comp.valor_m2 || comp.valor_unitario || 0;
            const valorHomogeneizado = this.homogeneizarValor(valorOriginal, coeficientes);
            
            return {
                ...comp,
                valor_m2_homogeneizado: valorHomogeneizado
            };
        });
    }

    // =========================
    // CÁLCULOS FINALES
    // =========================

    /**
     * Calcula el valor final de un inmueble
     * @param {number} valorPromedio - Valor promedio homogeneizado
     * @param {number} superficie - Superficie del inmueble
     * @param {Object} coeficientes - Coeficientes adicionales
     * @returns {Object} { valorFinal, valorUnitario }
     */
    calcularValorFinal(valorPromedio, superficie, coeficientes = {}) {
        const valorInicial = valorPromedio * superficie;
        const valorFinal = this.homogeneizarValor(valorInicial, coeficientes);
        const valorUnitario = valorFinal / superficie;

        return {
            valorFinal,
            valorUnitario
        };
    }

    /**
     * Calcula la superficie homogeneizada
     * @param {Object} datos - Datos del inmueble
     * @param {number} datos.superficie - Superficie original
     * @param {Object} datos.homogeneizacion - Coeficientes de homogeneización
     * @returns {number} Superficie homogeneizada
     */
    calcularSuperficieHomogeneizada(datos) {
        const { superficie, homogeneizacion } = datos;
        
        if (!homogeneizacion || !superficie) {
            return superficie || 0;
        }

        // Para departamentos, usar superficie homogeneizada
        if (homogeneizacion.superficie_homogeneizada) {
            return homogeneizacion.superficie_homogeneizada;
        }

        return superficie;
    }

    // =========================
    // LÓGICA ESPECÍFICA
    // =========================

    /**
     * Divide una esquina larga en esquina y medial
     * @param {number} frente - Frente total
     * @param {number} fondo - Fondo total
     * @returns {Object} { esquina, medial }
     */
    dividirEsquinaLarga(frente, fondo) {
        let frente_esquina, fondo_esquina, frente_medial, fondo_medial;

        if (fondo > 30) {
            // El fondo excede, se tasa esquina hasta 30m de fondo
            frente_esquina = frente;
            fondo_esquina = 30;
            frente_medial = fondo - 30;
            fondo_medial = frente;
        } else if (frente > 30) {
            // El frente excede, se tasa esquina hasta 30m de frente
            frente_esquina = 30;
            fondo_esquina = fondo;
            frente_medial = frente - 30;
            fondo_medial = fondo;
        } else {
            // Ningún lado excede 30m, tratar como esquina normal
            frente_esquina = frente;
            fondo_esquina = fondo;
            frente_medial = 0;
            fondo_medial = 0;
        }

        const superficie_esquina = frente_esquina * fondo_esquina;
        const superficie_medial = frente_medial * fondo_medial;

        return {
            esquina: {
                frente: frente_esquina,
                fondo: fondo_esquina,
                superficie: superficie_esquina
            },
            medial: {
                frente: frente_medial,
                fondo: fondo_medial,
                superficie: superficie_medial
            }
        };
    }

    /**
     * Calcula el fondo ficticio para lotes irregulares
     * @param {Object} datos - Datos del lote
     * @param {number} datos.fondo - Fondo real
     * @param {number} datos.fondoFicticio - Fondo ficticio si existe
     * @returns {number} Fondo a usar
     */
    calcularFondoFicticio(datos) {
        const { fondo, fondoFicticio } = datos;
        
        if (fondoFicticio) {
            return fondoFicticio;
        }
        
        return fondo;
    }

    /**
     * Calcula el promedio de valores homogeneizados
     * @param {Array} comparables - Array de comparables con valor_m2_homogeneizado
     * @returns {number} Promedio
     */
    calcularPromedioHomogeneizado(comparables) {
        if (!comparables || comparables.length === 0) {
            return 0;
        }

        const valores = comparables
            .map(c => c.valor_m2_homogeneizado || 0)
            .filter(v => v > 0);

        if (valores.length === 0) {
            return 0;
        }

        return valores.reduce((a, b) => a + b, 0) / valores.length;
    }
}

// Instancia singleton del motor de cálculos
var calculationEngine = new CalculationEngine();

/* =========================
   CALCULOS COEFICIENTES
   Coefficient calculation functions
========================= */

console.log('[calculos-coeficientes.js] Script loading...');

/**
 * Calculates the age coefficient for depreciation
 * Based on Ross-Heidecke simplified table
 */
function calcularCoeficienteAntiguedad() {
    const antiguedad = parseInt(document.getElementById("antiguedadInput").value) || 0;
    const estado = datosTasacion.departamento.estadoConservacionCoef || 1;

    // Tabla de Ross-Heidecke simplificada
    // Estado 1 (Nuevo/muy bueno): coeficiente = 1 - (antiguedad * 0.01)
    // Estado 2 (Normal): coeficiente = 1 - (antiguedad * 0.015)
    // Estado 3 (Reparaciones sencillas): coeficiente = 1 - (antiguedad * 0.02)
    // Estado 4 (Reparaciones importantes): coeficiente = 1 - (antiguedad * 0.025)
    // Estado 5 (Demolición): coeficiente = 1 - (antiguedad * 0.03)

    let coeficiente = 1;
    
    switch (estado) {
        case 1:
            coeficiente = 1 - (antiguedad * 0.01);
            break;
        case 2:
            coeficiente = 1 - (antiguedad * 0.015);
            break;
        case 3:
            coeficiente = 1 - (antiguedad * 0.02);
            break;
        case 4:
            coeficiente = 1 - (antiguedad * 0.025);
            break;
        case 5:
            coeficiente = 1 - (antiguedad * 0.03);
            break;
        default:
            coeficiente = 1 - (antiguedad * 0.015);
    }

    // Ensure coefficient doesn't go below 0.3
    coeficiente = Math.max(0.3, coeficiente);
    
    return coeficiente;
}

// Make available globally
window.calcularCoeficienteAntiguedad = calcularCoeficienteAntiguedad;

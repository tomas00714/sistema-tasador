/* =========================
   FORMAT UTILS
   Formateo de presentación numérica compartido.

   Regla: los valores internos conservan precisión completa
   para los cálculos; estas funciones solo se aplican a lo
   que se muestra al usuario (máximo `decimales` decimales).
========================= */

/**
 * Formatea un número para mostrarlo con un máximo de `decimales`
 * decimales. No muta ni redondea el valor original.
 * @param {*} valor - número o string numérico
 * @param {number} [decimales=2]
 * @returns {string} valor formateado, o '' si no es numérico
 */
function formatearNumero(valor, decimales = 2) {
    const n = Number(valor);
    if (!isFinite(n)) return '';
    return n.toFixed(decimales);
}

/**
 * Formatea un monto para mostrarlo en es-AR con un máximo de
 * `decimales` decimales (sin decimales forzados).
 * @param {*} valor
 * @param {number} [decimales=2]
 * @returns {string} valor formateado, o '-' si no es numérico
 */
function formatearMonto(valor, decimales = 2) {
    const n = Number(valor);
    if (!isFinite(n)) return '-';
    return n.toLocaleString('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimales
    });
}

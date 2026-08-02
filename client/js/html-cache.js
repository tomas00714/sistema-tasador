/* =========================
   HTML CACHE
   Sistema de caché para HTML generado dinámicamente
========================= */

const htmlCache = new Map();

/**
 * Genera HTML con caché
 * @param {string} key - Clave única para el caché
 * @param {Function} generator - Función que genera el HTML
 * @param {Array} params - Parámetros que afectan el HTML (para invalidar caché)
 * @returns {string} HTML generado
 */
function generarHTMLConCache(key, generator, params = []) {
    const cacheKey = `${key}-${JSON.stringify(params)}`;
    
    if (htmlCache.has(cacheKey)) {
        return htmlCache.get(cacheKey);
    }
    
    const html = generator();
    htmlCache.set(cacheKey, html);
    return html;
}

/**
 * Invalida caché de una clave específica
 * @param {string} key - Clave a invalidar
 */
function invalidarHTMLCache(key) {
    // Eliminar todas las entradas que empiezan con la clave
    for (const cacheKey of htmlCache.keys()) {
        if (cacheKey.startsWith(key)) {
            htmlCache.delete(cacheKey);
        }
    }
}

/**
 * Invalida todo el caché de HTML
 */
function invalidarTodoHTMLCache() {
    htmlCache.clear();
}

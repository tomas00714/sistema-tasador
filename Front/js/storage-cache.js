/* =========================
   STORAGE CACHE
   Sistema de caché en memoria para localStorage
========================= */

const storageCache = new Map();
const CACHE_DURATION = 30000; // 30 segundos

/**
 * Lee datos de localStorage con caché
 * @param {string} key - Clave de localStorage
 * @returns {any} Datos almacenados
 */
function leerConCache(key) {
    const cacheKey = `cache-${key}`;
    const cached = storageCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expira) {
        return cached.data;
    }
    
    try {
        const data = JSON.parse(localStorage.getItem(key));
        storageCache.set(cacheKey, {
            data: data,
            expira: Date.now() + CACHE_DURATION
        });
        return data;
    } catch (error) {
        console.error(`Error al leer ${key} de localStorage:`, error);
        return null;
    }
}

/**
 * Guarda datos en localStorage y actualiza caché
 * @param {string} key - Clave de localStorage
 * @param {any} data - Datos a guardar
 */
function guardarConCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        const cacheKey = `cache-${key}`;
        storageCache.set(cacheKey, {
            data: data,
            expira: Date.now() + CACHE_DURATION
        });
    } catch (error) {
        console.error(`Error al guardar ${key} en localStorage:`, error);
    }
}

/**
 * Invalida la caché de una clave específica
 * @param {string} key - Clave de localStorage
 */
function invalidarCache(key) {
    const cacheKey = `cache-${key}`;
    storageCache.delete(cacheKey);
}

/**
 * Invalida toda la caché
 */
function invalidarTodaCache() {
    storageCache.clear();
}

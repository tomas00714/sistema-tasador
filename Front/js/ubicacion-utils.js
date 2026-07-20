console.log("ubicacion-utils.js cargado correctamente");

/* =========================
   UBICACION UTILS
   Funciones centralizadas para manejo de provincias y localidades
========================= */

// Variables globales para almacenar datos
let provinciasData = [];
let localidadesData = [];

/**
 * Normaliza texto para comparación (sin mayúsculas, minúscas o acentos)
 * @param {string} texto - Texto a normalizar
 * @returns {string} Texto normalizado
 */
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""); // Remover acentos
}

/**
 * Verifica si un texto coincide exactamente con otro (sin distinguir mayúsculas, minúsculas o acentos)
 * @param {string} texto1 - Primer texto
 * @param {string} texto2 - Segundo texto
 * @returns {boolean} True si coinciden
 */
function coincidenciaExacta(texto1, texto2) {
    return normalizarTexto(texto1) === normalizarTexto(texto2);
}

/**
 * Asegura que el dataset de provincias esté cargado (con caché en localStorage)
 */
async function asegurarDatasetProvincias() {
    if (provinciasData.length) {
        return;
    }

    // Verificar caché en localStorage
    const cache = leerConCache('provincias_cache');
    const cacheFecha = leerConCache('provincias_cache_fecha');
    const expiracion = 24 * 60 * 60 * 1000; // 24 horas

    if (cache && cacheFecha && (Date.now() - parseInt(cacheFecha) < expiracion)) {
        provinciasData = cache;
        return;
    }

    // Hacer petición a la API
    const res = await fetch("https://apis.datos.gob.ar/georef/api/provincias");
    const data = await res.json();
    
    if (data.provincias) {
        provinciasData = data.provincias.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // Guardar en caché
        guardarConCache('provincias_cache', provinciasData);
        guardarConCache('provincias_cache_fecha', Date.now().toString());
    }
}

/**
 * Carga las localidades de una provincia (con caché en localStorage)
 * @param {string} provinciaNombre - Nombre de la provincia
 */
async function cargarLocalidades(provinciaNombre) {
    // Verificar caché en localStorage
    const cacheKey = `localidades_cache_${provinciaNombre}`;
    const cacheFechaKey = `localidades_cache_fecha_${provinciaNombre}`;
    const cache = leerConCache(cacheKey);
    const cacheFecha = leerConCache(cacheFechaKey);
    const expiracion = 24 * 60 * 60 * 1000; // 24 horas

    if (cache && cacheFecha && (Date.now() - parseInt(cacheFecha) < expiracion)) {
        localidadesData = cache;
        return localidadesData;
    }

    // Hacer petición a la API
    const res = await fetch(
        `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(provinciaNombre)}&max=5000`
    );
    const data = await res.json();

    if (data.localidades) {
        localidadesData = data.localidades.sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        // Guardar en caché
        guardarConCache(cacheKey, localidadesData);
        guardarConCache(cacheFechaKey, Date.now().toString());
    }

    return localidadesData;
}

/**
 * Busca una provincia por nombre (sin distinguir mayúsculas, minúsculas o acentos)
 * @param {string} nombre - Nombre de la provincia a buscar
 * @returns {Object|null} Provincia encontrada o null
 */
function buscarProvincia(nombre) {
    const nombreNormalizado = normalizarTexto(nombre);
    return provinciasData.find(p => normalizarTexto(p.nombre) === nombreNormalizado) || null;
}

/**
 * Busca una localidad por nombre (sin distinguir mayúsculas, minúsculas o acentos)
 * @param {string} nombre - Nombre de la localidad a buscar
 * @returns {Object|null} Localidad encontrada o null
 */
function buscarLocalidad(nombre) {
    const nombreNormalizado = normalizarTexto(nombre);
    return localidadesData.find(l => normalizarTexto(l.nombre) === nombreNormalizado) || null;
}

/**
 * Filtra provincias por texto de búsqueda
 * @param {string} filtro - Texto de búsqueda
 * @returns {Array} Provincias filtradas
 */
function filtrarProvincias(filtro = "") {
    const filtroNormalizado = normalizarTexto(filtro);
    return provinciasData.filter(p => normalizarTexto(p.nombre).includes(filtroNormalizado));
}

/**
 * Filtra localidades por texto de búsqueda
 * @param {string} filtro - Texto de búsqueda
 * @param {number} limite - Límite de resultados (opcional)
 * @returns {Array} Localidades filtradas
 */
function filtrarLocalidades(filtro = "", limite = 30) {
    const filtroNormalizado = normalizarTexto(filtro);
    return localidadesData
        .filter(l => normalizarTexto(l.nombre).includes(filtroNormalizado))
        .slice(0, limite);
}

/**
 * Obtiene los datos de provincias
 * @returns {Array} Datos de provincias
 */
function getProvinciasData() {
    return provinciasData;
}

/**
 * Obtiene los datos de localidades
 * @returns {Array} Datos de localidades
 */
function getLocalidadesData() {
    return localidadesData;
}

/**
 * Limpia el caché de provincias y localidades en localStorage
 */
function limpiarCacheUbicacion() {
    localStorage.removeItem('provincias_cache');
    localStorage.removeItem('provincias_cache_fecha');
    
    // Limpiar caché de todas las localidades
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('localidades_cache_')) {
            localStorage.removeItem(key);
        }
    }
}

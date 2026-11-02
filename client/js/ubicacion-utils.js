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
 * Extrae el nombre de la calle de una dirección completa (calle + altura)
 * @param {string} direccion - Dirección completa (ej: "San Martín 2600")
 * @returns {string} Nombre de la calle sin altura (ej: "San Martín")
 */
function extraerCalleDeDireccion(direccion) {
    if (!direccion) return '';
    // Buscar el último número en la dirección
    const match = direccion.match(/(\d+)\s*$/);
    if (match) {
        return direccion.substring(0, match.index).trim();
    }
    return direccion.trim();
}

/**
 * Extrae la altura de una dirección completa
 * @param {string} direccion - Dirección completa (ej: "San Martín 2600")
 * @returns {string|null} Altura como string o null si no se encuentra
 */
function extraerAlturaDeDireccion(direccion) {
    if (!direccion) return null;
    const match = direccion.match(/(\d+)\s*$/);
    return match ? match[1] : null;
}

/**
 * Normaliza un número de altura para comparación (remueve letras, sufijos, espacios)
 * @param {string} altura - Altura como string
 * @returns {string} Altura normalizada como número
 */
function normalizarAltura(altura) {
    if (!altura) return '';
    // Eliminar letras, sufijos comunes, espacios
    return altura.toString()
        .replace(/[^\d]/g, '')  // Solo dígitos
        .replace(/^0+/, '');  // Eliminar ceros a la izquierda
}

/**
 * Compara si dos nombres de calle son equivalentes
 * @param {string} calle1 - Primer nombre de calle
 * @param {string} calle2 - Segundo nombre de calle
 * @returns {boolean} True si se consideran equivalentes
 */
function callesEquivalentes(calle1, calle2) {
    if (!calle1 || !calle2) return false;
    
    const c1 = normalizarTexto(calle1);
    const c2 = normalizarTexto(calle2);
    
    // Coincidencia exacta
    if (c1 === c2) return true;
    
    // Eliminar puntos, espacios extras, y algunas abreviaturas comunes
    const limpiarCalle = (c) => c
        .replace(/\./g, '')
        .replace(/\s+/g, '')
        .replace(/^(av|avenida|avda)\.?/, '')
        .replace(/^(calle|cl)\.?/, '')
        .replace(/^(santa|sto)\.?/, '');
    
    const c1Limpia = limpiarCalle(c1);
    const c2Limpia = limpiarCalle(c2);
    
    if (c1Limpia === c2Limpia) return true;
    
    return false;
}

/**
 * Compara si dos alturas son equivalentes
 * @param {string} altura1 - Primera altura
 * @param {string} altura2 - Segunda altura
 * @returns {boolean} True si coinciden
 */
function alturasEquivalentes(altura1, altura2) {
    if (!altura1 || !altura2) return false;
    
    const a1 = normalizarAltura(altura1);
    const a2 = normalizarAltura(altura2);
    
    return a1 === a2 && a1 !== '';
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
 * Extrae el nombre de localidad de un resultado de Nominatim, considerando múltiples campos.
 * @param {Object} address - Objeto address de Nominatim
 * @returns {string|null} Nombre de localidad normalizado o null
 */
function extraerLocalidad(address) {
    if (!address) return null;
    // Nominatim puede usar city, town, village, municipality, suburb, etc.
    const campos = ['city', 'town', 'village', 'municipality', 'suburb', 'hamlet'];
    for (const campo of campos) {
        if (address[campo]) {
            return normalizarTexto(address[campo]);
        }
    }
    return null;
}

/**
 * Verifica si una localidad del resultado coincide con la solicitada.
 * @param {string} localidadResultado - Localidad del resultado (normalizada)
 * @param {string} localidadSolicitada - Localidad solicitada (normalizada)
 * @param {Array} localidadesValidas - Lista de localidades válidas de la API georef
 * @returns {boolean} True si coincide o es una variante legítima
 */
function validarLocalidad(localidadResultado, localidadSolicitada, localidadesValidas = []) {
    if (!localidadResultado || !localidadSolicitada) return false;

    // Coincidencia exacta normalizada
    if (localidadResultado === localidadSolicitada) return true;

    // Verificar si son variantes legítimas usando la API georef
    if (localidadesValidas.length > 0) {
        const localidadSolicitadaObj = localidadesValidas.find(l => normalizarTexto(l.nombre) === localidadSolicitada);
        const localidadResultadoObj = localidadesValidas.find(l => normalizarTexto(l.nombre) === localidadResultado);

        if (localidadSolicitadaObj && localidadResultadoObj) {
            // Verificar si son la misma localidad (mismo ID)
            return localidadSolicitadaObj.id === localidadResultadoObj.id;
        }
    }

    // Verificar si la solicitada contiene a la resultado (ej: "Santa Fe" vs "Santa Fe Capital")
    if (localidadResultado.includes(localidadSolicitada) || localidadSolicitada.includes(localidadResultado)) {
        return true;
    }

    return false;
}

/**
 * Valida las coordenadas de un resultado de Nominatim.
 * @param {string} lat - Latitud
 * @param {string} lon - Longitud
 * @returns {boolean} True si son válidas
 */
function validarCoordenadas(lat, lon) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    return !isNaN(latNum) && !isNaN(lonNum) && latNum >= -90 && latNum <= 90 && lonNum >= -180 && lonNum <= 180;
}

/**
 * Mapa para rastrear AbortControllers por instancia
 */
const abortControllersPorInstancia = new Map();

/**
 * Geocodifica una ubicación intentando con dirección completa, luego localidad+provincia y finalmente provincia sola.
 * @param {string} direccion - Dirección (opcional)
 * @param {string} localidad - Localidad (opcional)
 * @param {string} provincia - Provincia (opcional)
 * @param {string} pais - País (default Argentina)
 * @param {string} instanceId - ID único de instancia para prevenir race conditions (opcional)
 * @returns {Promise<Object|null>} { lat, lon, exacto, query, tipo, direccionValidada } o null
 */
async function geocodificarConFallback(direccion = '', localidad = '', provincia = '', pais = 'Argentina', instanceId = null) {
    const d = direccion.trim();
    const l = localidad.trim();
    const p = provincia.trim();
    const lNormalizada = normalizarTexto(l);
    const pNormalizada = normalizarTexto(p);

    // Extraer calle y altura solicitadas de la dirección
    const calleSolicitada = extraerCalleDeDireccion(d);
    const alturaSolicitada = extraerAlturaDeDireccion(d);

    // Cancelar petición anterior de la misma instancia
    if (instanceId) {
        const prevController = abortControllersPorInstancia.get(instanceId);
        if (prevController) {
            prevController.abort();
        }
        const newController = new AbortController();
        abortControllersPorInstancia.set(instanceId, newController);
    }

    const signal = instanceId ? abortControllersPorInstancia.get(instanceId)?.signal : null;

    // Función para validar resultado administrativo
    const validarResultadoAdministrativo = (resultado) => {
        const address = resultado.address || {};
        const localidadResultado = extraerLocalidad(address);
        const provinciaResultado = normalizarTexto(address.state || '');

        // Validar provincia
        if (p && provinciaResultado && provinciaResultado !== pNormalizada) {
            console.warn(`[geocodificarConFallback] Provincia no coincide: solicitada=${p}, resultado=${address.state}`);
            return { valido: false, motivo: 'provincia_incorrecta' };
        }

        // Validar localidad
        if (l && localidadResultado) {
            const localidadesValidas = getLocalidadesData();
            if (!validarLocalidad(localidadResultado, lNormalizada, localidadesValidas)) {
                console.warn(`[geocodificarConFallback] Localidad no coincide: solicitada=${l}, resultado=${address.city || address.town || address.village}`);
                return { valido: false, motivo: 'localidad_incorrecta' };
            }
        }

        return { valido: true };
    };

    // Intento 1: Usar parámetros estructurados de Nominatim para forzar límites administrativos estrictos
    if (d && l && p) {
        try {
            const params = new URLSearchParams({
                format: 'json',
                street: d,
                city: l,
                state: p,
                country: pais,
                limit: '10',  // Consultar hasta 10 resultados para encontrar uno válido
                addressdetails: '1'  // Solicitar detalles de dirección
            });
            const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
            const data = await res.json();

            if (data && data.length) {
                // Evaluar todos los resultados y clasificarlos
                const candidatos = [];
                
                for (const resultado of data) {
                    // Validar coordenadas
                    if (!validarCoordenadas(resultado.lat, resultado.lon)) {
                        continue;
                    }

                    // Validar coincidencia administrativa
                    const validacion = validarResultadoAdministrativo(resultado);
                    if (!validacion.valido) {
                        continue;
                    }

                    const address = resultado.address || {};
                    const tieneAltura = address.house_number !== undefined;
                    const tieneCalle = address.road !== undefined;
                    const calleResultado = address.road || '';
                    const alturaResultado = address.house_number ? address.house_number.toString() : '';

                    // Validar calle solo si se solicitó una calle específica
                    if (calleSolicitada && !callesEquivalentes(calleSolicitada, calleResultado)) {
                        continue;
                    }

                    // Clasificar candidato
                    if (tieneAltura && tieneCalle) {
                        // Validar altura
                        if (alturaSolicitada && alturasEquivalentes(alturaSolicitada, alturaResultado)) {
                            // Coincidencia exacta
                            candidatos.push({
                                tipo: 'direccion_exacta',
                                resultado,
                                prioridad: 1
                            });
                        } else {
                            // Altura diferente - no usar como exacto
                            console.warn(`[geocodificarConFallback] Altura diferente: solicitada=${alturaSolicitada}, resultado=${alturaResultado}`);
                        }
                    } else if (!tieneAltura && tieneCalle) {
                        // Calle sin altura - aceptar como aproximación
                        candidatos.push({
                            tipo: 'calle_aproximada',
                            resultado,
                            prioridad: 2
                        });
                    }
                }

                // Ordenar por prioridad y seleccionar el mejor
                if (candidatos.length > 0) {
                    candidatos.sort((a, b) => a.prioridad - b.prioridad);
                    const mejor = candidatos[0];
                    
                    return {
                        lat: parseFloat(mejor.resultado.lat),
                        lon: parseFloat(mejor.resultado.lon),
                        exacto: mejor.tipo === 'direccion_exacta',
                        query: `${d}, ${l}, ${p}, ${pais} (estructurado)`,
                        tipo: mejor.tipo,
                        direccionValidada: true
                    };
                }

                console.warn('[geocodificarConFallback] Intento 1: ningún resultado válido con provincia, localidad y calle correctas');
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('[geocodificarConFallback] Petición cancelada (intento 1)');
                return null;
            }
            console.warn('Error geocodificando con parámetros estructurados:', e);
        }
    }

    // Fallback: Usar query libre si los parámetros estructurados fallan
    const intentos = [];
    if (d && l && p) intentos.push({ query: `${d}, ${l}, ${p}, ${pais}`, requiereDireccion: true });
    if (!d && l && p) intentos.push({ query: `${l}, ${p}, ${pais}`, requiereDireccion: false });
    if (!d && p) intentos.push({ query: `${p}, ${pais}`, requiereDireccion: false });
    if (!d && pais && !intentos.length) intentos.push({ query: pais, requiereDireccion: false });

    for (let i = 0; i < intentos.length; i++) {
        const { query, requiereDireccion } = intentos[i];

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&addressdetails=1`, { signal });
            const data = await res.json();

            if (data && data.length) {
                // Evaluar todos los resultados y clasificarlos
                const candidatos = [];
                
                for (const resultado of data) {
                    // Validar coordenadas
                    if (!validarCoordenadas(resultado.lat, resultado.lon)) {
                        continue;
                    }

                    // Validar coincidencia administrativa
                    const validacion = validarResultadoAdministrativo(resultado);
                    if (!validacion.valido) {
                        continue;
                    }

                    const address = resultado.address || {};
                    const tieneAltura = address.house_number !== undefined;
                    const tieneCalle = address.road !== undefined;
                    const calleResultado = address.road || '';
                    const alturaResultado = address.house_number ? address.house_number.toString() : '';

                    // Si se requirió dirección pero no se encontró calle, continuar
                    if (requiereDireccion && !tieneCalle) {
                        continue;
                    }

                    // Validar calle si se solicitó dirección
                    if (calleSolicitada && !callesEquivalentes(calleSolicitada, calleResultado)) {
                        continue;
                    }

                    // Clasificar candidato
                    if (tieneAltura && tieneCalle) {
                        // Validar altura si se solicitó
                        if (alturaSolicitada) {
                            if (alturasEquivalentes(alturaSolicitada, alturaResultado)) {
                                candidatos.push({
                                    tipo: 'direccion_exacta',
                                    resultado,
                                    prioridad: 1
                                });
                            } else {
                                console.warn(`[geocodificarConFallback] Fallback - Altura diferente: solicitada=${alturaSolicitada}, resultado=${alturaResultado}`);
                            }
                        } else {
                            // No se solicitó altura específica, aceptar cualquier altura
                            candidatos.push({
                                tipo: 'direccion_exacta',
                                resultado,
                                prioridad: 1
                            });
                        }
                    } else if (!tieneAltura && tieneCalle) {
                        // Calle sin altura - aceptar como aproximación
                        candidatos.push({
                            tipo: 'calle_aproximada',
                            resultado,
                            prioridad: 2
                        });
                    }
                }

                // Ordenar por prioridad y seleccionar el mejor
                if (candidatos.length > 0) {
                    candidatos.sort((a, b) => a.prioridad - b.prioridad);
                    const mejor = candidatos[0];
                    
                    return {
                        lat: parseFloat(mejor.resultado.lat),
                        lon: parseFloat(mejor.resultado.lon),
                        exacto: mejor.tipo === 'direccion_exacta',
                        query: `${query} (fallback)`,
                        tipo: mejor.tipo,
                        direccionValidada: true
                    };
                }

                console.warn(`[geocodificarConFallback] Fallback (${query}): ningún resultado válido con provincia, localidad y calle correctas`);
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('[geocodificarConFallback] Petición cancelada (fallback)');
                return null;
            }
            console.warn('Error geocodificando:', query, e);
        }
    }

    return null;
}

/**
 * Obtiene la ubicación aproximada del usuario si concede permisos.
 * @returns {Promise<Object|null>} { lat, lon } o null
 */
function obtenerUbicacionUsuario() {
    return new Promise((resolve) => {
        if (!navigator || !navigator.geolocation) {
            return resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
        );
    });
}

/**
 * Muestra un mensaje discreto dentro o sobre un contenedor del mapa.
 * @param {HTMLElement} contenedor - Contenedor del mapa
 * @param {string} mensaje - Texto a mostrar
 * @param {number} duracion - Duración en ms (default 3000)
 */
function mostrarMensajeMapa(contenedor, mensaje, duracion = 3000) {
    if (!contenedor) return;

    const existente = contenedor.querySelector('.mapa-mensaje-discreto');
    if (existente) existente.remove();

    const div = document.createElement('div');
    div.className = 'mapa-mensaje-discreto';
    div.textContent = mensaje;
    div.style.cssText = 'position:absolute; bottom:10px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.65); color:#fff; padding:6px 12px; border-radius:6px; font-size:13px; z-index:1000; pointer-events:none;';
    contenedor.style.position = 'relative';
    contenedor.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, duracion);
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

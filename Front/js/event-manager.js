/* =========================
   EVENT MANAGER
   Sistema para evitar event listeners duplicados
========================= */

const listenersRegistrados = new Map();

/**
 * Agrega un event listener de forma segura, evitando duplicados
 * @param {EventTarget} elemento - Elemento del DOM o document/window
 * @param {string} evento - Nombre del evento (ej: 'click', 'keydown')
 * @param {Function} handler - Función a ejecutar
 * @param {Object} opciones - Opciones del addEventListener
 * @returns {boolean} - true si se agregó, false si ya existía
 */
function agregarListenerSeguro(elemento, evento, handler, opciones = {}) {
    const elementoId = elemento === document ? 'document' : 
                      elemento === window ? 'window' : 
                      elemento.id || elemento.className || 'unknown';
    
    const key = `${elementoId}-${evento}`;
    
    if (listenersRegistrados.has(key)) {
        return false;
    }
    
    elemento.addEventListener(evento, handler, opciones);
    listenersRegistrados.set(key, { elemento, evento, handler, opciones });
    return true;
}

/**
 * Remueve un event listener registrado
 * @param {EventTarget} elemento - Elemento del DOM o document/window
 * @param {string} evento - Nombre del evento
 */
function removerListener(elemento, evento) {
    const elementoId = elemento === document ? 'document' : 
                      elemento === window ? 'window' : 
                      elemento.id || elemento.className || 'unknown';
    
    const key = `${elementoId}-${evento}`;
    
    if (listenersRegistrados.has(key)) {
        const { handler, opciones } = listenersRegistrados.get(key);
        elemento.removeEventListener(evento, handler, opciones);
        listenersRegistrados.delete(key);
    }
}

/**
 * Remueve todos los listeners registrados
 */
function removerTodosLosListeners() {
    listenersRegistrados.forEach(({ elemento, evento, handler, opciones }) => {
        elemento.removeEventListener(evento, handler, opciones);
    });
    listenersRegistrados.clear();
}

/**
 * Verifica si un listener está registrado
 * @param {EventTarget} elemento - Elemento del DOM o document/window
 * @param {string} evento - Nombre del evento
 * @returns {boolean}
 */
function listenerRegistrado(elemento, evento) {
    const elementoId = elemento === document ? 'document' : 
                      elemento === window ? 'window' : 
                      elemento.id || elemento.className || 'unknown';
    
    return listenersRegistrados.has(`${elementoId}-${evento}`);
}

/**
 * Crea una función debounce que retrasa la ejecución hasta que pasen X ms
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función con debounce
 */
function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Crea una función throttle que limita la ejecución a una vez cada X ms
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Tiempo límite en ms
 * @returns {Function} - Función con throttle
 */
function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Inicializa un autocomplete de forma genérica
 * @param {string} inputId - ID del input
 * @param {string} listId - ID de la lista de opciones
 * @param {Object} opciones - Opciones adicionales
 * @param {Function} opciones.onSelect - Callback cuando se selecciona un item (recibe el item y el input)
 * @param {Function} opciones.onOpen - Callback cuando se abre la lista
 * @param {boolean} opciones.usarFocus - Si true usa focus en lugar de click (default: false)
 */
function inicializarAutocomplete(inputId, listId, opciones = {}) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);

    if (!input || !list) return;

    const eventoAbrir = opciones.usarFocus ? 'focus' : 'click';

    input.addEventListener(eventoAbrir, () => {
        list.style.display = "block";
        if (opciones.onOpen) opciones.onOpen(input, list);
    });

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            input.value = item.textContent;
            list.style.display = "none";
            
            if (opciones.onSelect) {
                opciones.onSelect(item, input);
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            list.style.display = "none";
        }
    });
}

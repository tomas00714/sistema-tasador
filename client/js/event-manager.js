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
 * Ajusta la posición de la lista de autocomplete según el espacio disponible
 * @param {HTMLElement} input - El input del autocomplete
 * @param {HTMLElement} list - La lista de opciones
 */
function ajustarPosicionLista(input, list) {
    // Obtener el contenedor scrollable (.tasacion-contenido)
    const contenedorScroll = input.closest('.tasacion-contenido');
    if (!contenedorScroll) return;

    // Obtener rectángulos
    const inputRect = input.getBoundingClientRect();
    const contenedorRect = contenedorScroll.getBoundingClientRect();

    // Calcular el espacio disponible
    const espacioAbajo = contenedorRect.bottom - inputRect.bottom - 6; // 6px de gap
    const espacioArriba = inputRect.top - contenedorRect.top - 6;

    // Altura máxima de la lista (por defecto 260px)
    const alturaMaxima = 260;

    // Decidir dirección
    if (espacioAbajo >= alturaMaxima) {
        // Hay suficiente espacio abajo: abrir hacia abajo (comportamiento normal)
        list.classList.remove('autocomplete-list-up');
        list.style.top = 'calc(100% + 6px)';
        list.style.bottom = 'auto';
        list.style.maxHeight = `${alturaMaxima}px`;
    } else if (espacioArriba >= alturaMaxima) {
        // Hay suficiente espacio arriba: abrir hacia arriba
        list.classList.add('autocomplete-list-up');
        list.style.top = 'auto';
        list.style.bottom = 'calc(100% + 6px)';
        list.style.maxHeight = `${alturaMaxima}px`;
    } else {
        // No hay suficiente espacio en ninguna dirección: usar el mayor espacio disponible
        if (espacioAbajo > espacioArriba) {
            // Abrir hacia abajo con altura limitada
            list.classList.remove('autocomplete-list-up');
            list.style.top = 'calc(100% + 6px)';
            list.style.bottom = 'auto';
            list.style.maxHeight = `${Math.max(espacioAbajo, 100)}px`; // Mínimo 100px
        } else {
            // Abrir hacia arriba con altura limitada
            list.classList.add('autocomplete-list-up');
            list.style.top = 'auto';
            list.style.bottom = 'calc(100% + 6px)';
            list.style.maxHeight = `${Math.max(espacioArriba, 100)}px`; // Mínimo 100px
        }
    }
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

    const handleAbrir = () => {
        list.style.display = "block";
        input.parentElement.classList.add('is-open');
        ajustarPosicionLista(input, list);
        if (opciones.onOpen) opciones.onOpen(input, list);
    };

    const handleCerrar = () => {
        list.style.display = "none";
        input.parentElement.classList.remove('is-open');
    };

    input.addEventListener(eventoAbrir, handleAbrir);

    list.querySelectorAll(".autocomplete-item").forEach(item => {
        item.addEventListener("click", () => {
            // Mostrar el texto completo en el input, pero el callback onSelect recibirá el item completo
            input.value = item.textContent;
            handleCerrar();

            if (opciones.onSelect) {
                opciones.onSelect(item, input);
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (!input.parentElement.contains(e.target)) {
            handleCerrar();
        }
    });

    // Recalcular posición al hacer scroll del contenedor si la lista está abierta
    const contenedorScroll = input.closest('.tasacion-contenido');
    if (contenedorScroll) {
        contenedorScroll.addEventListener('scroll', () => {
            if (list.style.display === 'block') {
                ajustarPosicionLista(input, list);
            }
        });
    }

    // Recalcular posición al cambiar el tamaño de la ventana si la lista está abierta
    window.addEventListener('resize', () => {
        if (list.style.display === 'block') {
            ajustarPosicionLista(input, list);
        }
    });
}

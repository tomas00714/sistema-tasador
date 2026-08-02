/* =========================
   MODAL GENÉRICO
   Sistema reutilizable de modales
========================= */

/**
 * Muestra un modal genérico con contenido personalizado
 * @param {Object} opciones - Configuración del modal
 * @param {string} opciones.titulo - Título del modal
 * @param {string} opciones.mensaje - Mensaje del modal
 * @param {Array} opciones.botones - Array de botones con configuración
 * @param {string} opciones.botones[].texto - Texto del botón
 * @param {string} opciones.botones[].clase - Clase CSS del botón (opcional)
 * @param {Function} opciones.botones[].onClick - Callback al hacer click
 * @param {boolean} opciones.cerrarAlClick - Cierra el modal al hacer click en overlay (default: true)
 */
function mostrarModalGenerico(opciones) {
    const modal = document.getElementById("modalGenerico");
    if (!modal) {
        console.error("No se encontró el modal genérico en el HTML");
        return;
    }

    // Configurar título
    const tituloElement = modal.querySelector(".modal-titulo");
    if (tituloElement) {
        tituloElement.textContent = opciones.titulo || "Información";
    }

    // Configurar mensaje
    const mensajeElement = modal.querySelector(".modal-mensaje");
    if (mensajeElement) {
        mensajeElement.textContent = opciones.mensaje || "";
    }

    // Configurar botones
    const botonesContainer = modal.querySelector(".modal-botones");
    if (botonesContainer) {
        botonesContainer.innerHTML = ""; // Limpiar botones anteriores

        opciones.botones.forEach((config, index) => {
            const boton = document.createElement("button");
            boton.textContent = config.texto;
            if (config.clase) {
                boton.className = config.clase;
            }
            boton.addEventListener("click", (e) => {
                e.preventDefault();
                if (config.onClick) {
                    config.onClick();
                }
            });
            botonesContainer.appendChild(boton);
        });
    }

    // Configurar cierre al click en overlay
    const overlay = modal.querySelector(".modal-overlay");
    if (overlay) {
        const cerrarAlClick = opciones.cerrarAlClick !== false;
        // Remover listeners anteriores
        const newOverlay = overlay.cloneNode(true);
        overlay.parentNode.replaceChild(newOverlay, overlay);

        if (cerrarAlClick) {
            newOverlay.addEventListener("click", (e) => {
                if (e.target === newOverlay) {
                    ocultarModalGenerico();
                }
            });
        }
    }

    modal.classList.add("active");
}

/**
 * Oculta el modal genérico
 */
function ocultarModalGenerico() {
    const modal = document.getElementById("modalGenerico");
    if (modal) {
        modal.classList.remove("active");
        // Limpiar contenido para evitar memory leaks
        const titulo = modal.querySelector(".modal-titulo");
        const mensaje = modal.querySelector(".modal-mensaje");
        const botones = modal.querySelector(".modal-botones");
        
        if (titulo) titulo.textContent = "";
        if (mensaje) mensaje.textContent = "";
        if (botones) botones.innerHTML = "";
    }
}

/**
 * Muestra un modal de confirmación simple (Sí/No)
 * @param {string} titulo - Título del modal
 * @param {string} mensaje - Mensaje del modal
 * @param {Function} onConfirm - Callback al confirmar
 * @param {Function} onCancel - Callback al cancelar (opcional)
 */
function mostrarModalConfirmacion(titulo, mensaje, onConfirm, onCancel) {
    mostrarModalGenerico({
        titulo: titulo,
        mensaje: mensaje,
        botones: [
            {
                texto: "Cancelar",
                clase: "btn-cancelar",
                onClick: () => {
                    ocultarModalGenerico();
                    if (onCancel) onCancel();
                }
            },
            {
                texto: "Confirmar",
                clase: "btn-confirmar",
                onClick: () => {
                    ocultarModalGenerico();
                    if (onConfirm) onConfirm();
                }
            }
        ]
    });
}

/**
 * Muestra un modal de información simple (Aceptar)
 * @param {string} titulo - Título del modal
 * @param {string} mensaje - Mensaje del modal
 * @param {Function} onAccept - Callback al aceptar (opcional)
 */
function mostrarModalInformacion(titulo, mensaje, onAccept) {
    mostrarModalGenerico({
        titulo: titulo,
        mensaje: mensaje,
        botones: [
            {
                texto: "Aceptar",
                clase: "btn-aceptar",
                onClick: () => {
                    ocultarModalGenerico();
                    if (onAccept) onAccept();
                }
            }
        ]
    });
}

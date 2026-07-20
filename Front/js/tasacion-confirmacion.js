/* =========================
   TASACION CONFIRMACION
   Confirmación de salir y cambio de tipo
========================= */

let navegacionPendiente = null;

function mostrarConfirmacionSalir() {
    mostrarModalGenerico({
        titulo: "¿Estás seguro de salir?",
        mensaje: "Estás en medio de una tasación. Si sales, perderás los datos no guardados.",
        botones: [
            {
                texto: "Cancelar",
                clase: "btn-confirmacion-cancelar",
                onClick: () => {
                    ocultarConfirmacionSalir();
                }
            },
            {
                texto: "Guardar borrador",
                clase: "btn-confirmacion-guardar",
                onClick: async () => {
                    await guardarBorrador();
                }
            },
            {
                texto: "No guardar",
                clase: "btn-confirmacion-no-guardar",
                onClick: () => {
                    const urlPendiente = navegacionPendiente;
                    ocultarConfirmacionSalir();
                    navegacionPendiente = urlPendiente;
                    ejecutarNavegacionPendiente();
                }
            }
        ],
        cerrarAlClick: false
    });
}

function ocultarConfirmacionSalir() {
    ocultarModalGenerico();
    navegacionPendiente = null;
}

function mostrarModalConfirmacionGuardarTasacion() {
    mostrarModalGenerico({
        titulo: "¿Guardar tasación?",
        mensaje: "¿Deseas guardar esta tasación en el historial?",
        botones: [
            {
                texto: "Cancelar",
                clase: "btn-confirmacion-cancelar",
                onClick: () => {
                    ocultarModalGenerico();
                }
            },
            {
                texto: "Guardar y salir",
                clase: "btn-confirmacion-guardar",
                onClick: async () => {
                    ocultarModalGenerico();
                    datosTasacion.resultado = resultadoTasacion;
                    await guardarTasacion();
                    limpiarDatosTasacion();
                    window.location.href = "index.html";
                }
            },
            {
                texto: "Guardar y crear informe",
                clase: "btn-confirmacion-crear-informe",
                onClick: async () => {
                    ocultarModalGenerico();
                    datosTasacion.resultado = resultadoTasacion;
                    const idGuardado = await guardarTasacion();
                    if (idGuardado) {
                        localStorage.setItem("tasacionParaInformeId", idGuardado);
                    }
                    limpiarDatosTasacion();
                    window.location.href = "vista-previa-informe.html";
                }
            }
        ],
        cerrarAlClick: false
    });
}

async function guardarBorrador() {
    guardarTodosLosDatos();

    try {
        await guardarTasacion('borrador');
    } catch (e) {
        console.error('Error al guardar borrador:', e);
        throw e;
    }

    const urlPendiente = navegacionPendiente;
    limpiarDatosTasacion();
    ocultarConfirmacionSalir();
    navegacionPendiente = urlPendiente;
    ejecutarNavegacionPendiente();
}

function ejecutarNavegacionPendiente() {
    limpiarDatosTasacion();

    if (navegacionPendiente === "VOLVER_A_PANTALLA_1") {
        navegacionPendiente = null;
        volverSeleccionTipo();
        return;
    }
    
    if (navegacionPendiente === "BROWSER_BACK") {
        navegacionPendiente = null;
        window.location.href = "index.html";
        return;
    }

    if (navegacionPendiente) {
        const url = navegacionPendiente;
        navegacionPendiente = null;
        console.log("Ejecutando navegación pendiente a:", url);
        window.location.href = url;
    } else {
        console.log("No hay navegación pendiente, yendo a index.html");
        window.location.href = "index.html";
    }
}

function interceptarNavegacion(event) {
    if (pasoActual < 2) {
        return;
    }

    const target = event.target;
    const linkElement = target.closest("a");
    const buttonElement = target.closest("[data-href]");

    let href = null;

    if (linkElement) {
        href = linkElement.getAttribute("href");
    } else if (buttonElement) {
        href = buttonElement.dataset.href;
    }

    if (!href) {
        return;
    }

    // Ignorar esquemas que no son navegacion de pagina
    const hrefLower = href.trim().toLowerCase();
    if (hrefLower.startsWith("javascript:") || hrefLower.startsWith("mailto:") || hrefLower.startsWith("tel:")) {
        return;
    }

    const currentURL = new URL(window.location.href);
    let linkURL;
    try {
        linkURL = new URL(href, window.location.href);
    } catch (e) {
        return;
    }

    const currentPath = currentURL.pathname + currentURL.search;
    const linkPath = linkURL.pathname + linkURL.search;

    // Si es solo un ancla dentro de la misma pagina, no interceptar
    if (linkPath === currentPath && linkURL.hash) {
        return;
    }

    // Incluir recarga a la misma pagina (por ejemplo, "Nueva tasacion" en tasacion.html)
    event.preventDefault();
    event.stopPropagation();
    navegacionPendiente = linkURL.href;
    mostrarConfirmacionSalir();
}

function interceptarVolverAPantalla1() {
    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso && pasoActual === 2) {
        const newBtn = btnVolverPaso.cloneNode(true);
        btnVolverPaso.parentNode.replaceChild(newBtn, btnVolverPaso);
        
        newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            navegacionPendiente = "VOLVER_A_PANTALLA_1";
            mostrarConfirmacionSalir();
        });
    }
}

window.addEventListener("popstate", (event) => {
    if (pasoActual >= 2) {
        event.preventDefault();
        event.stopPropagation();
        history.pushState(null, "", window.location.href);
        navegacionPendiente = "BROWSER_BACK";
        mostrarConfirmacionSalir();
    }
});

// Advertir al usuario si intenta cerrar o recargar la pagina con una tasacion en curso
window.addEventListener("beforeunload", (event) => {
    if (pasoActual >= 2) {
        event.preventDefault();
        event.returnValue = "¿Estás seguro de salir? Los cambios no guardados se perderán.";
        return event.returnValue;
    }
});

function inicializarConfirmacionSalir() {
    document.addEventListener("click", interceptarNavegacion, true);
    history.pushState(null, "", window.location.href);
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarConfirmacionSalir();
});

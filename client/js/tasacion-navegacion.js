/* =========================
   TASACION NAVEGACION
   Lógica de navegación entre pasos
========================= */

// Centralized flow configuration with render and save functions
// Defined as empty object here, populated in tasacion-casa.js after all functions are loaded
const configuracionFlujos = {};

function manejarBtnSiguiente() {
    console.log('[manejarBtnSiguiente] START - pasoActual:', pasoActual);
    console.log('[manejarBtnSiguiente] datosTasacion.tipo:', datosTasacion.tipo);
    console.log('[manejarBtnSiguiente] tipoSeleccionado:', tipoSeleccionado);
    
    // Step 1: Selection type - handle before checking flow configuration
    if (pasoActual === 1) {
        console.log('[manejarBtnSiguiente] Step 1 - tipoSeleccionado:', tipoSeleccionado);
        if (tipoSeleccionado === "lote") {
            mostrarFormularioLote();
        } else if (tipoSeleccionado === "departamento") {
            mostrarFormularioDepartamento();
        } else if (tipoSeleccionado === "casa") {
            mostrarFormularioCasa();
        }
        return;
    }

    const tipo = datosTasacion.tipo;
    if (!tipo) {
        console.error('manejarBtnSiguiente - tipo is undefined');
        return;
    }
    
    console.log('[manejarBtnSiguiente] tipo:', tipo);
    const flujo = configuracionFlujos[tipo];

    console.log('[manejarBtnSiguiente] configuracionFlujos keys:', Object.keys(configuracionFlujos));
    
    if (!flujo) {
        console.error('manejarBtnSiguiente - flujo is undefined for tipo:', tipo);
        return;
    }

    console.log('[manejarBtnSiguiente] flujo.pasos.length:', flujo.pasos.length);
    console.log('[manejarBtnSiguiente] flujo.pasos:', flujo.pasos.map(p => p.nombre));

    // Calculate current step index (pasoActual 2 = index 0, pasoActual 3 = index 1, etc.)
    const currentStepIndex = pasoActual - 2;
    console.log('[manejarBtnSiguiente] currentStepIndex:', currentStepIndex);
    
    const currentPaso = flujo.pasos[currentStepIndex];
    if (!currentPaso) {
        console.error('[manejarBtnSiguiente] currentPaso is undefined for currentStepIndex:', currentStepIndex);
        return;
    }

    // 1. Clear previous errors
    if (typeof ValidationUI !== 'undefined') {
        ValidationUI.limpiarTodosLosErrores();
    }

    // 2. Save data from current step BEFORE validating
    if (currentPaso.guardar) {
        console.log('[manejarBtnSiguiente] Calling guardar() BEFORE validation');
        currentPaso.guardar();
    }

    // 3. Validate current step
    if (currentPaso.validator) {
        console.log('[manejarBtnSiguiente] Validating current step');
        const resultadoValidacion = currentPaso.validator.validar(datosTasacion);
        console.log('[manejarBtnSiguiente] resultadoValidacion:', resultadoValidacion);
        
        if (!resultadoValidacion.valido) {
            console.log('[manejarBtnSiguiente] Validation failed, showing errors:', resultadoValidacion.errores);
            // Show errors
            if (typeof ValidationUI !== 'undefined') {
                resultadoValidacion.errores.forEach(error => {
                    if (error.campo) {
                        ValidationUI.marcarCampoError(error.campo, error.mensaje);
                    } else {
                        // Global errors (no specific field)
                        alert(error.mensaje);
                    }
                });
            }
            return;
        }
    }

    // 4. Calculate next step
    const nextStepIndex = currentStepIndex + 1;
    console.log('[manejarBtnSiguiente] nextStepIndex:', nextStepIndex);
    
    // Check if this is the last step (save tasation)
    if (!flujo.pasos[nextStepIndex]) {
        console.log('[manejarBtnSiguiente] Last step - showing save modal');
        mostrarModalConfirmacionGuardarTasacion();
        return;
    }

    // 5. Render next step
    const nextPaso = flujo.pasos[nextStepIndex];
    console.log('[manejarBtnSiguiente] nextPaso.nombre:', nextPaso.nombre);
    
    if (nextPaso.render) {
        console.log('[manejarBtnSiguiente] Calling render() for nextPaso');
        nextPaso.render();
    } else {
        console.error('[manejarBtnSiguiente] nextPaso has no render function');
    }
}

function inicializarBotonesTasacion() {
    const btnSiguiente = getBtnSiguiente();
    if (btnSiguiente) {
        const wasDisabled = btnSiguiente.disabled;
        const wasActive = btnSiguiente.classList.contains("activo");

        const newBtn = btnSiguiente.cloneNode(true);
        btnSiguiente.parentNode.replaceChild(newBtn, btnSiguiente);

        newBtn.disabled = wasDisabled;
        if (wasActive) {
            newBtn.classList.add("activo");
        }

        newBtn.addEventListener("click", (e) => {
            e.preventDefault();
            manejarBtnSiguiente();
        });
    }

    const btnVolverPaso = getBtnVolverPaso();
    if (btnVolverPaso) {
        const newBtn = btnVolverPaso.cloneNode(true);
        btnVolverPaso.parentNode.replaceChild(newBtn, btnVolverPaso);

        newBtn.addEventListener("click", (e) => {
            e.preventDefault();

            console.log('[btnVolverPaso] START - pasoActual:', pasoActual);

            // Step 2: go back to type selection
            if (pasoActual === 2) {
                if (typeof volverSeleccionTipo === 'function') {
                    volverSeleccionTipo();
                }
                return;
            }

            const tipo = datosTasacion.tipo;
            if (!tipo) {
                console.error('[btnVolverPaso] tipo is undefined');
                return;
            }

            const flujo = configuracionFlujos[tipo];
            if (!flujo) {
                console.error('[btnVolverPaso] flujo is undefined for tipo:', tipo);
                return;
            }

            // Calculate current step index
            const currentStepIndex = pasoActual - 2;
            console.log('[btnVolverPaso] currentStepIndex:', currentStepIndex);

            // Navigate to previous step
            const previousStepIndex = currentStepIndex - 1;
            console.log('[btnVolverPaso] previousStepIndex:', previousStepIndex);

            // If going back to step 1 (index -1), go to type selection
            if (previousStepIndex < 0) {
                if (typeof volverSeleccionTipo === 'function') {
                    volverSeleccionTipo();
                }
                return;
            }

            const previousPaso = flujo.pasos[previousStepIndex];
            if (previousPaso?.render) {
                console.log('[btnVolverPaso] Calling render() for previousPaso:', previousPaso.nombre);
                previousPaso.render();
            } else {
                console.error('[btnVolverPaso] previousPaso has no render function');
            }
        });
    }
}

// Función para verificar si hay algún modal abierto
function hayModalAbierto() {
    // Verificar modal genérico
    const modalGenerico = document.getElementById('modalGenerico');
    if (modalGenerico && modalGenerico.classList.contains('active')) {
        return true;
    }

    // Verificar modal de comparables
    const comparableModalOverlay = document.getElementById('comparableModalOverlay');
    if (comparableModalOverlay && comparableModalOverlay.style.display !== 'none') {
        return true;
    }

    // Verificar modal overlay de historial
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay && modalOverlay.classList.contains('active')) {
        return true;
    }

    // Verificar modal de comparables en historial
    const comparablesModalOverlay = document.getElementById('comparablesModalOverlay');
    if (comparablesModalOverlay && comparablesModalOverlay.classList.contains('active')) {
        return true;
    }

    return false;
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    inicializarBotonesTasacion();
    verificarModoEdicion();

    // Event listener para tecla Enter en botón siguiente (usando sistema seguro)
    agregarListenerSeguro(document, "keydown", (e) => {
        if (e.key === "Enter") {
            // Verificar si hay un modal de comparable abierto
            const modalOverlay = document.getElementById('comparableModalOverlay');
            if (modalOverlay && modalOverlay.style.display !== 'none') {
                // Si el modal está abierto, buscar el botón correspondiente
                const btnGuardarModal = document.getElementById('comparableModalBtnGuardar');
                if (btnGuardarModal && !btnGuardarModal.disabled && btnGuardarModal.style.display !== 'none') {
                    e.preventDefault();
                    btnGuardarModal.click();
                    return;
                }
            }

            // Si hay algún modal abierto (incluyendo genérico), no hacer nada
            if (hayModalAbierto()) {
                return;
            }

            // Si no hay modal abierto, presionar botón siguiente
            const btnSiguiente = getBtnSiguiente();
            if (btnSiguiente && !btnSiguiente.disabled) {
                e.preventDefault();
                manejarBtnSiguiente();
            }
        }
    });
});

// Verificar si estamos en modo edición
function verificarModoEdicion() {
    try {
        const tasacionEnEdicion = localStorage.getItem("tasacionEnEdicion");
        if (tasacionEnEdicion) {
            const tasacion = JSON.parse(tasacionEnEdicion);
            
            tasacionId = 1; // 1 indica que es una edición
            tasacionIdReal = tasacion.id; // Guardar el ID real para usar al guardar
            
            if (tasacion.datosCompletos) {
                cargarDatosCompletos(tasacion.datosCompletos);
            } else {
                datosTasacion.tipo = tasacion.tipo;
                datosTasacion.cantDeEdiciones = tasacion.cantDeEdiciones || 0;
                datosTasacion.ubicacion = tasacion.ubicacion || { direccion: "", provincia: "", localidad: "", lat: null, lon: null, orientacion: "" };
                
                if (tasacion.tipo === 'lote') {
                    datosTasacion.lote = tasacion.lote || { tipoLote: "", servicios: [], caracteristicas: {}, observaciones: "" };
                } else if (tasacion.tipo === 'departamento') {
                    datosTasacion.departamento = tasacion.departamento || { ambientes: "", dormitorios: "", banos: "", cochera: false, baulera: false, servicios: [], amenities: [], infraestructura: [], observaciones: "" };
                } else if (tasacion.tipo === 'casa') {
                    datosTasacion.casa = tasacion.casa || {};
                }
                
                datosTasacion.comparables = tasacion.comparables || [];
                resultadoTasacion = tasacion.resultado || null;
                pasoActual = 2;
                tipoSeleccionado = tasacion.tipo;
            }
            
            localStorage.removeItem("tasacionEnEdicion");

            if (tipoSeleccionado) {
                pasoActual = 2;
                if (tipoSeleccionado === 'lote') {
                    mostrarFormularioLote();
                } else if (tipoSeleccionado === 'departamento') {
                    mostrarFormularioDepartamento();
                } else if (tipoSeleccionado === 'casa') {
                    mostrarFormularioCasa();
                }
            }
        }
    } catch (e) {
        console.error("Error al cargar tasación en edición:", e);
    }
}

// Re-inicializar cuando se abre la tarjeta de tasación
const originalAbrirTasacionHome = window.abrirTasacionHome;
if (originalAbrirTasacionHome) {
    window.abrirTasacionHome = function(opciones) {
        originalAbrirTasacionHome(opciones);
        setTimeout(inicializarBotonesTasacion, 100);
    };
}

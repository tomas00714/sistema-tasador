/* Reservado para utilidades globales compartidas. */

/* Dark Mode Toggle */
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = darkModeToggle?.querySelector('i');

// Check for saved dark mode preference or default to light mode
const savedDarkMode = localStorage.getItem('darkMode');
if (savedDarkMode === 'true') {
    document.body.classList.add('dark-mode');
    if (darkModeIcon) {
        darkModeIcon.classList.remove('fa-sun');
        darkModeIcon.classList.add('fa-moon');
    }
}

// Toggle dark mode
if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);

        if (darkModeIcon) {
            if (isDarkMode) {
                darkModeIcon.classList.remove('fa-sun');
                darkModeIcon.classList.add('fa-moon');
            } else {
                darkModeIcon.classList.remove('fa-moon');
                darkModeIcon.classList.add('fa-sun');
            }
        }

        // Update map tiles for dark mode
        if (typeof cambiarTelosMapa === 'function') {
            cambiarTelosMapa();
        }
        if (typeof cambiarTilesMapaHistorial === 'function') {
            cambiarTilesMapaHistorial();
        }
    });
}

/* Progress Indicators for Navbar */
const progressSection = document.getElementById('progressSection');

// Define dynamic step arrays for each property type
// Position 0 in array = visual step 2 (since step 1 is common to all)
const pasosPorTipo = {
    'lote': ['datos', 'caracteristicas', 'comparables', 'resultado'],
    'departamento': ['datos', 'caracteristicas', 'superficie', 'comparables', 'resultado'],
    'casa': [] // To be defined, structure will be the same
};

// Get total steps for a type (array.length + 1 because step 1 is common and array starts at step 2)
function getTotalSteps(tipo) {
    const pasos = pasosPorTipo[tipo] || [];
    return pasos.length + 1;
}

// Get step name from array index (index 0 = visual step 2)
function getNombrePaso(tipo, index) {
    const pasos = pasosPorTipo[tipo] || [];
    return pasos[index] || null;
}

// Get array index from visual step number (step 2 = index 0)
function getIndexPaso(tipo, stepNumber) {
    return stepNumber - 2;
}

// Validation criteria for each step and type
// Returns true if the step's criteria are met
function validarCriterioPaso(tipo, nombrePaso) {
    if (tipo === 'lote') {
        if (nombrePaso === 'datos') {
            // Requiere tipo de lote seleccionado
            return typeof datosTasacion !== 'undefined' &&
                   datosTasacion?.lote?.tipoLote &&
                   datosTasacion.lote.tipoLote !== '';
        }
        if (nombrePaso === 'caracteristicas') {
            // Requiere frente y fondo mayores a 0
            const frente = parseFloat(datosTasacion?.lote?.caracteristicas?.frente) || 0;
            const fondo = parseFloat(datosTasacion?.lote?.caracteristicas?.fondo) || 0;
            const fondoFicticio = parseFloat(datosTasacion?.lote?.caracteristicas?.fondoFicticio) || 0;
            const superficie = parseFloat(datosTasacion?.lote?.caracteristicas?.superficie) || 0;
            const tipoLote = datosTasacion?.lote?.tipoLote || '';
            const zona = datosTasacion?.lote?.caracteristicas?.zona || '';

            // Para irregular: requiere frente, superficie y fondo ficticio mayores a 0
            if (tipoLote === 'Irregular') {
                if (frente <= 0 || superficie <= 0 || fondoFicticio <= 0) {
                    return false;
                }
            } else {
                // Validación básica: frente y fondo mayores a 0
                if (frente <= 0 || fondo <= 0) {
                    return false;
                }
            }

            // Para esquina y esquina +30m: requiere zona seleccionada
            if (tipoLote === 'Esquina' || tipoLote === 'Esquina larga (+30m)') {
                if (!zona || zona === '') {
                    return false;
                }
            }

            // Para esquina +30m: requiere que uno de los lados sea mayor a 30
            if (tipoLote === 'Esquina larga (+30m)') {
                if (frente <= 30 && fondo <= 30) {
                    return false;
                }
            }

            return typeof datosTasacion !== 'undefined' &&
                   datosTasacion?.lote?.caracteristicas;
        }
        if (nombrePaso === 'comparables') {
            // Requiere al menos 1 comparable
            return typeof datosTasacion !== 'undefined' &&
                   datosTasacion?.comparables &&
                   datosTasacion.comparables.length >= 1;
        }
        if (nombrePaso === 'resultado') {
            // No tiene restricción, es el paso final
            return true;
        }
    }

    if (tipo === 'departamento') {
        // Por ahora sin restricciones, estructura lista para futuro
        if (nombrePaso === 'datos') return true;
        if (nombrePaso === 'caracteristicas') return true;
        if (nombrePaso === 'superficie') return true;
        if (nombrePaso === 'comparables') return true;
        if (nombrePaso === 'resultado') return true;
    }

    if (tipo === 'casa') {
        // Estructura lista para cuando se defina
        return true;
    }

    return false;
}

// Check if a step is unlocked based on previous step's criteria
function pasoEstaDesbloqueado(tipo, stepNumber) {
    // Step 1 is always unlocked (selection type)
    if (stepNumber === 1) return true;
    
    // Step 2 is always unlocked (datos/ubicacion)
    if (stepNumber === 2) return true;
    
    // For steps 3+, check if previous step meets its criteria
    const previousStepNumber = stepNumber - 1;
    const previousIndex = getIndexPaso(tipo, previousStepNumber);
    const previousNombrePaso = getNombrePaso(tipo, previousIndex);
    
    if (!previousNombrePaso) return false;
    
    return validarCriterioPaso(tipo, previousNombrePaso);
}

function actualizarIndicadoresProgreso() {
    if (!progressSection) return;

    // Check if we're in a tasation flow (pasoActual should be defined)
    if (typeof pasoActual === 'undefined' || pasoActual < 2) {
        progressSection.innerHTML = '';
        return;
    }

    // Try to get the tipo from datosTasacion, default to 'lote' if not available
    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';

    const totalSteps = getTotalSteps(tipo);

    // Generate progress indicators
    let html = '';
    for (let i = 1; i <= totalSteps; i++) {
        const estaDesbloqueado = pasoEstaDesbloqueado(tipo, i);
        
        let clase = '';
        if (i === pasoActual) {
            clase = 'active';
        } else if (i < pasoActual) {
            clase = 'completed';
        }

        const disabled = !estaDesbloqueado ? 'disabled' : '';

        html += `<button class="progress-indicator ${clase} ${disabled}" data-step="${i}" ${disabled ? 'disabled' : ''}>${i}</button>`;
    }

    progressSection.innerHTML = html;

    // Add click handlers
    progressSection.querySelectorAll('.progress-indicator').forEach(btn => {
        btn.addEventListener('click', () => {
            const step = parseInt(btn.dataset.step);
            navegarAPaso(step);
        });
    });
}

function actualizarTextoBotonSiguiente() {
    const btnSiguiente = document.getElementById("btnSiguiente");
    if (!btnSiguiente) return;

    // Get the tipo from datosTasacion, default to 'lote' if not available
    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    const totalSteps = getTotalSteps(tipo);

    // Check if current step is the last step
    if (pasoActual === totalSteps) {
        btnSiguiente.textContent = "Guardar tasación";
    } else {
        btnSiguiente.textContent = "Siguiente";
    }
}

function actualizarEstadoBotonSiguiente() {
    const btnSiguiente = document.getElementById("btnSiguiente");
    if (!btnSiguiente) return;

    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    const nombrePasoActual = getNombrePaso(tipo, getIndexPaso(tipo, pasoActual));

    // Step 1 is always enabled once a type is selected
    if (pasoActual === 1) {
        btnSiguiente.disabled = !tipoSeleccionado;
        if (tipoSeleccionado) {
            btnSiguiente.classList.add("activo");
        } else {
            btnSiguiente.classList.remove("activo");
        }
        return;
    }

    // For other steps, check if current step criteria are met
    if (nombrePasoActual && typeof validarCriterioPaso === 'function') {
        const criterioCumplido = validarCriterioPaso(tipo, nombrePasoActual);
        btnSiguiente.disabled = !criterioCumplido;
        if (criterioCumplido) {
            btnSiguiente.classList.add("activo");
        } else {
            btnSiguiente.classList.remove("activo");
        }
    } else {
        // If no criteria defined, enable by default
        btnSiguiente.disabled = false;
        btnSiguiente.classList.add("activo");
    }
}

function navegarAPaso(step) {
    if (step === pasoActual) return;

    // Save data from current screen before navigating
    if (typeof guardarTodosLosDatos === 'function') {
        guardarTodosLosDatos();
    }

    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    const nombrePaso = getNombrePaso(tipo, getIndexPaso(tipo, step));

    if (step === 1) {
        volverSeleccionTipo();
    } else if (step === 2) {
        if (tipo === 'lote') {
            mostrarFormularioLote();
        } else if (tipo === 'departamento') {
            mostrarFormularioDepartamento();
        }
    } else if (nombrePaso === 'caracteristicas') {
        if (tipo === 'lote') {
            mostrarCaracteristicasLote();
        } else if (tipo === 'departamento') {
            mostrarCaracteristicasDepartamento();
        }
    } else if (nombrePaso === 'superficie') {
        if (tipo === 'departamento') {
            mostrarHomogeneizacionSuperficie();
        }
    } else if (nombrePaso === 'comparables') {
        mostrarPantallaComparables();
    } else if (nombrePaso === 'resultado') {
        if (tipo === 'lote') {
            calcularYMostrarResultado();
        } else if (tipo === 'departamento') {
            calcularYMostrarResultadoDepartamento();
        }
    }

    // Update button text after navigation
    actualizarTextoBotonSiguiente();
}

// Initialize progress indicators on DOM load
document.addEventListener('DOMContentLoaded', () => {
    actualizarIndicadoresProgreso();
});

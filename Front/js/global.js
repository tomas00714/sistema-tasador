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

// Define number of steps per property type
const stepsPorTipo = {
    'lote': 5,
    'casa': 5,
    'departamento': 4
};

function actualizarIndicadoresProgreso() {
    if (!progressSection) return;

    // Check if we're in a tasation flow (pasoActual should be defined)
    if (typeof pasoActual === 'undefined' || pasoActual < 2) {
        progressSection.innerHTML = '';
        return;
    }

    // Try to get the tipo from datosTasacion, default to 'lote' if not available
    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';

    const totalSteps = stepsPorTipo[tipo] || 5;

    // Determine which steps are enabled based on tasacion state
    const enabledSteps = getEnabledSteps(tipo);

    // Generate progress indicators
    let html = '';
    for (let i = 1; i <= totalSteps; i++) {
        let clase = '';
        if (i === pasoActual) {
            clase = 'active';
        } else if (i < pasoActual) {
            clase = 'completed';
        }

        const disabled = !enabledSteps.includes(i) ? 'disabled' : '';

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

function getEnabledSteps(tipo) {
    const enabled = [1, 2]; // Siempre habilitados: selección de tipo y ubicación

    // Paso 3: requiere tipo de lote seleccionado (para lote)
    if (tipo === 'lote') {
        if (typeof datosTasacion !== 'undefined' && datosTasacion?.lote?.tipoLote) {
            enabled.push(3);
        }
    } else {
        // Para casa y departamento, el paso 3 está siempre habilitado
        enabled.push(3);
    }

    // Paso 4: habilitado si paso 3 está habilitado
    if (enabled.includes(3)) {
        enabled.push(4);
    }

    // Paso 5: solo habilitado si el resultado ha sido calculado
    if (typeof resultadoCalculado !== 'undefined' && resultadoCalculado) {
        enabled.push(5);
    }

    return enabled;
}

function actualizarTextoBotonSiguiente() {
    const btnSiguiente = document.getElementById("btnSiguiente");
    if (!btnSiguiente) return;

    // Get the tipo from datosTasacion, default to 'lote' if not available
    const tipo = (typeof datosTasacion !== 'undefined' && datosTasacion?.tipo) ? datosTasacion.tipo : 'lote';
    const totalSteps = stepsPorTipo[tipo] || 5;

    // Check if current step is the last step
    if (pasoActual === totalSteps) {
        btnSiguiente.textContent = "Guardar tasación";
    } else {
        btnSiguiente.textContent = "Siguiente";
    }
}

function navegarAPaso(step) {
    if (step === pasoActual) return;

    // Save data from current screen before navigating
    if (typeof guardarTodosLosDatos === 'function') {
        guardarTodosLosDatos();
    }

    if (step === 1) {
        volverSeleccionTipo();
    } else if (step === 2) {
        if (datosTasacion.tipo === 'lote') {
            mostrarFormularioLote();
        } else {
            mostrarFormularioDepartamento();
        }
    } else if (step === 3) {
        if (datosTasacion.tipo === 'lote') {
            mostrarCaracteristicasLote();
        } else {
            mostrarCaracteristicasDepartamento();
        }
    } else if (step === 4) {
        mostrarPantallaComparables();
    } else if (step === 5) {
        mostrarPantallaResultado();
    }

    // Update button text after navigation
    actualizarTextoBotonSiguiente();
}

// Initialize progress indicators on DOM load
document.addEventListener('DOMContentLoaded', () => {
    actualizarIndicadoresProgreso();
});

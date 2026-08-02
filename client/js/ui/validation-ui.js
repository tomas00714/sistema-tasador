/* =========================
   VALIDATION UI
   Visual feedback utilities for validation
========================= */

console.log('[validation-ui.js] Script loading...');

const ValidationUI = {
    /**
     * Marks a field with an error visually
     * @param {string} campoId - The ID of the field to mark
     * @param {string} mensaje - The error message to display
     */
    marcarCampoError(campoId, mensaje) {
        const campo = document.getElementById(campoId);
        if (!campo) return;

        campo.classList.add('campo-error');
        campo.setAttribute('data-error', mensaje);

        // Remove existing error message if any
        const mensajeErrorExistente = campo.parentNode.querySelector('.mensaje-error');
        if (mensajeErrorExistente) {
            mensajeErrorExistente.remove();
        }

        // Show error message below the field
        const mensajeError = document.createElement('div');
        mensajeError.className = 'mensaje-error';
        mensajeError.textContent = mensaje;
        campo.parentNode.appendChild(mensajeError);
    },

    /**
     * Clears error marking from a field
     * @param {string} campoId - The ID of the field to clear
     */
    limpiarCampoError(campoId) {
        const campo = document.getElementById(campoId);
        if (!campo) return;

        campo.classList.remove('campo-error');
        campo.removeAttribute('data-error');

        const mensajeError = campo.parentNode.querySelector('.mensaje-error');
        if (mensajeError) {
            mensajeError.remove();
        }
    },

    /**
     * Clears all error markings from the form
     */
    limpiarTodosLosErrores() {
        document.querySelectorAll('.campo-error').forEach(campo => {
            this.limpiarCampoError(campo.id);
        });
    },

    /**
     * Initializes auto-clearing of errors when user corrects fields
     */
    inicializarAutoLimpieza() {
        // Clear error on input/change events
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('campo-error')) {
                this.limpiarCampoError(e.target.id);
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('campo-error')) {
                this.limpiarCampoError(e.target.id);
            }
        });
    }
};

// Initialize auto-cleanup on load
document.addEventListener('DOMContentLoaded', () => {
    ValidationUI.inicializarAutoLimpieza();
});

// Make available globally
window.ValidationUI = ValidationUI;

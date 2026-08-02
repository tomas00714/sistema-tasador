/* =========================
   VALIDATOR BASE
   Base functionality for validators
========================= */

console.log('[validator-base.js] Script loading...');

/**
 * Base validator with common validation functions
 */
const ValidatorBase = {
    /**
     * Validates that a value is greater than zero
     * @param {number} value - The value to validate
     * @returns {boolean} True if value > 0
     */
    mayorCero(value) {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Validates that a string is not empty
     * @param {string} value - The string to validate
     * @returns {boolean} True if string is not empty after trimming
     */
    noVacio(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    },

    /**
     * Validates email format
     * @param {string} email - The email to validate
     * @returns {boolean} True if email format is valid
     */
    email(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    /**
     * Validates that a select/radio option is selected
     * @param {string} value - The selected value
     * @returns {boolean} True if a value is selected
     */
    seleccionado(value) {
        return this.noVacio(value);
    },

    /**
     * Creates a validation result object
     * @param {boolean} valido - Whether validation passed
     * @param {Array} errores - Array of error objects
     * @returns {Object} Validation result
     */
    crearResultado(valido, errores = []) {
        return { valido, errores };
    }
};

// Make available globally
window.ValidatorBase = ValidatorBase;

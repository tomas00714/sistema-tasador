/**
 * Guard de acceso premium para páginas restringidas.
 * Protege páginas que requieren suscripción activa o permisos de administrador.
 */

/**
 * Redirige a la página de pricing para suscribirse.
 */
function redirectToPricing() {
    window.location.href = '../index.html#pricing';
}

/**
 * Redirige a la página de inicio si no es administrador.
 */
function redirectToHome() {
    window.location.href = 'index.html';
}

/**
 * Muestra la pantalla de acceso restringido/premium.
 */
function showPremiumRestricted() {
    // Redirigir a pricing en lugar de mostrar pantalla estática
    redirectToPricing();
}

/**
 * Muestra la pantalla de acceso restringido para administradores.
 */
function showAdminRestricted() {
    // Redirigir a inicio
    redirectToHome();
}

/**
 * Oculta la pantalla de acceso restringido y muestra el contenido normal.
 */
function hidePremiumRestricted() {
    const restrictedScreen = document.getElementById('premiumRestrictedScreen');
    if (restrictedScreen) {
        restrictedScreen.style.display = 'none';
    }

    // Mostrar contenido principal
    const mainContent = document.querySelector('.main-content, main, .home-stage, .tasacion-stage, .solicitudes-stage');
    if (mainContent) {
        mainContent.style.display = '';
    }

    // Mostrar sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = '';
    }

    // Mostrar header móvil
    const mobileHeader = document.querySelector('.mobile-header');
    if (mobileHeader) {
        mobileHeader.style.display = '';
    }
}

/**
 * Muestra un indicador de carga mientras se verifica el acceso.
 */
function showPremiumLoading() {
    let loadingScreen = document.getElementById('premiumLoadingScreen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'premiumLoadingScreen';
        loadingScreen.className = 'premium-loading-screen';
        loadingScreen.innerHTML = `
            <div class="premium-loading-container">
                <div class="premium-loading-spinner"></div>
                <p>Verificando acceso...</p>
            </div>
        `;
        document.body.appendChild(loadingScreen);
    }

    // Ocultar contenido temporalmente
    const mainContent = document.querySelector('.main-content, main, .home-stage, .tasacion-stage, .solicitudes-stage');
    if (mainContent) {
        mainContent.style.display = 'none';
    }

    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = 'none';
    }

    loadingScreen.style.display = 'flex';
}

/**
 * Oculta el indicador de carga.
 */
function hidePremiumLoading() {
    const loadingScreen = document.getElementById('premiumLoadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

/**
 * Guard principal para páginas premium.
 * Verifica autenticación y acceso premium antes de mostrar el contenido.
 */
async function requirePremiumAccess() {
    // Verificar autenticación
    if (!isAuthenticated()) {
        // Redirigir a login con parámetro redirect
        const currentPath = window.location.pathname;
        const relativePath = currentPath.replace('/client/', '');
        window.location.href = `../login.html?redirect=${encodeURIComponent(relativePath)}`;
        return false;
    }

    // Mostrar carga mientras se verifica acceso
    showPremiumLoading();

    // Verificar acceso premium
    const access = await checkPremiumAccess();

    // Ocultar carga
    hidePremiumLoading();

    if (!access.hasAccess) {
        // No tiene acceso premium - mostrar pantalla restringida
        showPremiumRestricted();
        return false;
    }

    // Tiene acceso premium - mostrar contenido normal
    hidePremiumRestricted();
    return true;
}

/**
 * Wrapper para acciones que requieren acceso premium.
 * Ejecuta la acción solo si el usuario tiene acceso premium.
 * @param {Function} action - La acción a ejecutar si tiene acceso
 * @param {boolean} showErrorModal - Si true, muestra modal de suscripción cuando no tiene acceso
 */
async function executeIfPremium(action, showErrorModal = true) {
    if (!isAuthenticated()) {
        window.location.href = `../login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        return false;
    }

    const access = await checkPremiumAccess();

    if (!access.hasAccess) {
        if (showErrorModal) {
            // Redirigir a pricing para suscribirse
            window.location.href = '../index.html#pricing';
        }
        return false;
    }

    // Ejecutar acción
    if (typeof action === 'function') {
        action();
    }
    return true;
}

/**
 * Guard para páginas de administrador.
 * Verifica autenticación y permisos de administrador antes de mostrar el contenido.
 */
async function requireAdminAccess() {
    // Verificar autenticación
    if (!isAuthenticated()) {
        // Redirigir a login con parámetro redirect
        const currentPath = window.location.pathname;
        const relativePath = currentPath.replace('/client/', '');
        window.location.href = `../login.html?redirect=${encodeURIComponent(relativePath)}`;
        return false;
    }

    // Mostrar carga mientras se verifica acceso
    showPremiumLoading();

    // Verificar permisos de administrador
    const userData = localStorage.getItem('auth_user');
    if (!userData) {
        hidePremiumLoading();
        showAdminRestricted();
        return false;
    }

    const user = JSON.parse(userData);
    if (!user.is_admin) {
        hidePremiumLoading();
        showAdminRestricted();
        return false;
    }

    // Es administrador - mostrar contenido normal
    hidePremiumLoading();
    hidePremiumRestricted();
    return true;
}

// Exponer funciones globalmente
window.PremiumGuard = {
    requirePremiumAccess,
    requireAdminAccess,
    executeIfPremium,
    showPremiumRestricted,
    hidePremiumRestricted
};

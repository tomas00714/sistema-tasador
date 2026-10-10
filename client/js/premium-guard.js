/**
 * Guard de acceso premium para páginas restringidas.
 * Protege páginas que requieren suscripción activa.
 */

/**
 * Muestra la pantalla de acceso restringido/premium.
 */
function showPremiumRestricted() {
    // Ocultar contenido principal
    const mainContent = document.querySelector('.main-content, main, .home-stage, .tasacion-stage, .solicitudes-stage');
    if (mainContent) {
        mainContent.style.display = 'none';
    }

    // Ocultar sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.display = 'none';
    }

    // Ocultar header móvil
    const mobileHeader = document.querySelector('.mobile-header');
    if (mobileHeader) {
        mobileHeader.style.display = 'none';
    }

    // Crear o mostrar pantalla de acceso restringido
    let restrictedScreen = document.getElementById('premiumRestrictedScreen');
    if (!restrictedScreen) {
        restrictedScreen = document.createElement('div');
        restrictedScreen.id = 'premiumRestrictedScreen';
        restrictedScreen.className = 'premium-restricted-screen';
        restrictedScreen.innerHTML = `
            <div class="premium-restricted-container">
                <div class="premium-restricted-icon">
                    <i class="fa-solid fa-lock"></i>
                </div>
                <h1 class="premium-restricted-title">Funcionalidad Premium</h1>
                <p class="premium-restricted-message">
                    Esta funcionalidad requiere una suscripción activa para acceder.
                </p>
                <div class="premium-restricted-features">
                    <div class="premium-feature">
                        <i class="fa-solid fa-check"></i>
                        <span>Tasaciones ilimitadas</span>
                    </div>
                    <div class="premium-feature">
                        <i class="fa-solid fa-check"></i>
                        <span>Base de datos de comparables</span>
                    </div>
                    <div class="premium-feature">
                        <i class="fa-solid fa-check"></i>
                        <span>Informes PDF personalizados</span>
                    </div>
                    <div class="premium-feature">
                        <i class="fa-solid fa-check"></i>
                        <span>Colaboración en tiempo real</span>
                    </div>
                </div>
                <div class="premium-restricted-actions">
                    <a href="../index.html#pricing" class="btn btn-primary btn-premium-cta">
                        Suscribirme
                        <i class="fa-solid fa-arrow-right"></i>
                    </a>
                    <a href="index.html" class="btn btn-secondary">
                        Volver al inicio
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(restrictedScreen);
    }

    restrictedScreen.style.display = 'flex';
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

// Exponer funciones globalmente
window.PremiumGuard = {
    requirePremiumAccess,
    executeIfPremium,
    showPremiumRestricted,
    hidePremiumRestricted
};

function getToken() {
    return localStorage.getItem('auth_token');
}

function isAuthenticated() {
    return !!getToken();
}

function requireAuth() {
    if (!isAuthenticated()) {
        const currentPath = window.location.pathname;
        const isInApp = currentPath.includes('/app/');
        window.location.href = isInApp ? '../login.html' : 'login.html';
        return false;
    }
    return true;
}

function requireGuest() {
    if (isAuthenticated()) {
        const currentPath = window.location.pathname;
        const isInApp = currentPath.includes('/app/');
        window.location.href = isInApp ? 'index.html' : 'app/index.html';
        return false;
    }
    return true;
}

// Páginas que requieren acceso premium
const PREMIUM_PAGES = ['tasacion.html', 'solicitudes.html', 'vista-previa-informe.html'];

async function requirePremium() {
    const currentPath = window.location.pathname;
    const isPremiumPage = PREMIUM_PAGES.some(page => currentPath.includes(page));

    if (!isPremiumPage) {
        return true;
    }

    // Verificar autenticación primero
    if (!isAuthenticated()) {
        const isInApp = currentPath.includes('/app/');
        window.location.href = isInApp ? '../login.html' : 'login.html';
        return false;
    }

    // Verificar acceso premium usando SubscriptionManager
    if (window.SubscriptionManager && window.SubscriptionManager.verificarAccesoPro) {
        const access = await window.SubscriptionManager.verificarAccesoPro();
        if (!access.hasAccess) {
            // Redirigir a pricing
            window.location.href = 'index.html#pricing';
            return false;
        }
    } else {
        // Fallback: redirigir a pricing si SubscriptionManager no está disponible
        window.location.href = 'index.html#pricing';
        return false;
    }

    return true;
}

document.addEventListener('DOMContentLoaded', function() {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('login.html') ||
                       currentPath.includes('registro.html') ||
                       currentPath.includes('recuperar-password.html');

    const isAppPage = currentPath.includes('/app/');

    if (isAuthPage) {
        requireGuest();
    }

    if (isAppPage) {
        requireAuth();
        // Verificar acceso premium para páginas protegidas
        requirePremium();
    }
});

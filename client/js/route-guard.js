const TOKEN_KEY = 'auth_token';

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
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
    }
});

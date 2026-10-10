const TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'auth_user';

const GOOGLE_POPUP_NAME = 'google_oauth_popup';
const GOOGLE_POPUP_FEATURES = 'width=500,height=600,resizable,scrollbars=yes';

// Solo destinos del mismo origen: rutas relativas ("compartir.html",
// "app/index.html") o URLs absolutas que resuelvan a window.location.origin
// (mercado-pago.js envía location.href completa). Rechaza javascript:,
// data:, vbscript:, //externo.com y cualquier otro esquema/origen.
function destinoRedirectSeguro(destino) {
    if (!destino || typeof destino !== 'string') return null;
    const v = destino.trim();
    if (!v || /[\x00-\x1f\x7f]/.test(v)) return null;
    try {
        const u = new URL(v, window.location.origin);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        if (u.origin !== window.location.origin) return null;
        return u.pathname + u.search + u.hash;
    } catch (e) {
        return null;
    }
}

function getAuthRedirect() {
    const params = new URLSearchParams(window.location.search);
    const redirect = destinoRedirectSeguro(params.get('redirect'));
    const shareToken = params.get('share_token');
    if (redirect && shareToken) {
        const separador = redirect.includes('?') ? '&' : '?';
        return `${redirect}${separador}token=${encodeURIComponent(shareToken)}`;
    }
    if (redirect) {
        return redirect;
    }
    return 'app/index.html';
}

function getApiUrl() {
    const stored = localStorage.getItem('apiUrl');
    if (stored) return stored;
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
    return isLocal ? 'http://127.0.0.1:8080' : 'https://sistema-tasador.onrender.com';
}

function continuarConGoogle() {
    const apiUrl = getApiUrl();
    const popup = window.open(`${apiUrl}/api/auth/google?mode=continue`, GOOGLE_POPUP_NAME, GOOGLE_POPUP_FEATURES);
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        showError('authError', 'El navegador bloqueó la ventana emergente. Permití los popups para este sitio.');
        return;
    }
}

function appendAuthParams(url) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    const shareToken = params.get('share_token');
    if (!redirect && !shareToken) return url;

    const newParams = new URLSearchParams();
    if (redirect) newParams.set('redirect', redirect);
    if (shareToken) newParams.set('share_token', shareToken);

    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${newParams.toString()}`;
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function setUserData(userData) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

function getUserData() {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
}

function removeUserData() {
    localStorage.removeItem(USER_DATA_KEY);
}

function isAuthenticated() {
    return !!getToken();
}

/**
 * Verifica si el usuario tiene acceso premium (suscripción activa o es admin).
 * @returns {Promise<{hasAccess: boolean, isAuth: boolean, tiene_acceso_pro: boolean, is_admin: boolean}>}
 */
async function checkPremiumAccess() {
    const token = getToken();
    if (!token) {
        return { hasAccess: false, isAuth: false, tiene_acceso_pro: false, is_admin: false };
    }

    try {
        const response = await fetch(`${getApiUrl()}/api/suscripcion`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { hasAccess: false, isAuth: false, tiene_acceso_pro: false, is_admin: false };
            }
            throw new Error('Error al verificar acceso premium');
        }

        const data = await response.json();
        const tiene_acceso_pro = data.tiene_acceso_pro || false;
        const is_admin = data.is_admin || false;
        
        return {
            hasAccess: tiene_acceso_pro || is_admin,
            isAuth: true,
            tiene_acceso_pro,
            is_admin
        };
    } catch (error) {
        console.error('[Auth] Error verificando acceso premium:', error);
        return { hasAccess: false, isAuth: true, tiene_acceso_pro: false, is_admin: false };
    }
}

function validatePassword(password) {
    if (password.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
        return 'La contraseña debe tener al menos una mayúscula';
    }
    return null;
}

function logout() {
    removeToken();
    removeUserData();
    window.location.href = '../index.html';
}

async function login(email, password) {
    const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al iniciar sesión');
    }

    const data = await response.json();
    setToken(data.access_token);
    setUserData({
        usuario_id: data.usuario_id,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        is_admin: data.is_admin
    });
    
    return data;
}

async function register(nombre, apellido, email, password) {
    const response = await fetch(`${getApiUrl()}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre, apellido, email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al registrar usuario');
    }

    const data = await response.json();
    setToken(data.access_token);
    setUserData({
        usuario_id: data.usuario_id,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        is_admin: data.is_admin
    });
    
    return data;
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function showSuccess(elementId, message) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.textContent = message;
        successElement.style.display = 'block';
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

function hideSuccess(elementId) {
    const successElement = document.getElementById(elementId);
    if (successElement) {
        successElement.style.display = 'none';
    }
}

function completarLoginGoogle(tokenData) {
    setToken(tokenData.access_token);
    setUserData({
        usuario_id: tokenData.usuario_id,
        email: tokenData.email,
        nombre: tokenData.nombre,
        apellido: tokenData.apellido,
        is_admin: tokenData.is_admin
    });
    window.location.href = getAuthRedirect();
}

function handleGoogleAuthMessage(event) {
    // Solo aceptar mensajes del backend que sirvió el callback de Google.
    // Sin esta verificación cualquier ventana/origen podría inyectar un
    // token o un mensaje falso en el flujo de login.
    try {
        const apiOrigin = new URL(getApiUrl(), window.location.href).origin;
        if (event.origin !== apiOrigin) return;
    } catch (e) {
        return;
    }

    if (!event.data || typeof event.data !== 'object') return;
    const data = event.data;

    switch (data.type) {
        case 'google-auth-success':
            if (data.token) {
                completarLoginGoogle(data.token);
            }
            break;
        case 'google-auth-existing':
            showError('authError', data.message || `Ya existe una cuenta con ${data.email}. Iniciá sesión con tu contraseña y vinculá Google desde tu perfil.`);
            break;
        case 'google-auth-error':
            showError('authError', data.message || 'Error al autenticar con Google');
            break;
    }
}

window.addEventListener('message', handleGoogleAuthMessage);

document.addEventListener('DOMContentLoaded', function() {
    // Password toggle functionality
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
                this.classList.add('active');
                this.setAttribute('aria-label', 'Ocultar contraseña');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
                this.classList.remove('active');
                this.setAttribute('aria-label', 'Mostrar contraseña');
            }
        });
    });

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginBtn = document.getElementById('loginBtn');
            
            hideError('authError');
            loginBtn.disabled = true;
            loginBtn.textContent = 'Iniciando sesión...';

            try {
                await login(email, password);
                window.location.href = getAuthRedirect();
            } catch (error) {
                showError('authError', error.message);
                loginBtn.disabled = false;
                loginBtn.textContent = 'Iniciar Sesión';
            }
        });
    }

    if (registerForm) {
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const passwordHint = document.querySelector('.form-hint');
        const confirmPasswordHint = document.getElementById('confirmPasswordHint');

        // Validación en tiempo real de contraseña
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const error = validatePassword(password);
            
            if (error) {
                this.classList.add('error');
                passwordHint.classList.add('error');
                passwordHint.classList.remove('success');
                passwordHint.textContent = error;
            } else {
                this.classList.remove('error');
                passwordHint.classList.remove('error');
                passwordHint.classList.add('success');
                passwordHint.textContent = 'Contraseña válida';
            }
            
            // Re-validar confirmación si ya tiene valor
            if (confirmPasswordInput.value) {
                confirmPasswordInput.dispatchEvent(new Event('input'));
            }
        });

        // Validación en tiempo real de confirmación de contraseña
        confirmPasswordInput.addEventListener('input', function() {
            const password = passwordInput.value;
            const confirmPassword = this.value;
            
            if (confirmPassword && confirmPassword !== password) {
                this.classList.add('error');
                confirmPasswordHint.classList.add('error');
                confirmPasswordHint.textContent = 'Las contraseñas no coinciden';
            } else {
                this.classList.remove('error');
                confirmPasswordHint.classList.remove('error');
                if (confirmPassword && confirmPassword === password) {
                    confirmPasswordHint.textContent = 'Las contraseñas coinciden';
                } else {
                    confirmPasswordHint.textContent = '';
                }
            }
        });

        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const nombre = document.getElementById('nombre').value;
            const apellido = document.getElementById('apellido').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const registerBtn = document.getElementById('registerBtn');
            
            hideError('authError');
            
            // Validar contraseña
            const passwordError = validatePassword(password);
            if (passwordError) {
                showError('authError', passwordError);
                passwordInput.classList.add('error');
                passwordHint.classList.add('error');
                passwordHint.textContent = passwordError;
                return;
            }
            
            // Validar que las contraseñas coincidan
            if (password !== confirmPassword) {
                showError('authError', 'Las contraseñas no coinciden');
                confirmPasswordInput.classList.add('error');
                confirmPasswordHint.classList.add('error');
                confirmPasswordHint.textContent = 'Las contraseñas no coinciden';
                return;
            }
            
            registerBtn.disabled = true;
            registerBtn.textContent = 'Creando cuenta...';

            try {
                await register(nombre, apellido, email, password);
                window.location.href = getAuthRedirect();
            } catch (error) {
                showError('authError', error.message);
                registerBtn.disabled = false;
                registerBtn.textContent = 'Crear Cuenta';
            }
        });
    }

    if (forgotPasswordForm) {
        const emailInput = document.getElementById('email');
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

        // Enable button when email is not empty
        const validateEmail = () => {
            const email = emailInput.value;
            forgotPasswordBtn.disabled = !email || email.trim() === '';
        };

        emailInput.addEventListener('input', validateEmail);

        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;

            hideError('authError');
            hideSuccess('authSuccess');
            forgotPasswordBtn.disabled = true;
            forgotPasswordBtn.textContent = 'Enviando...';

            try {
                const response = await fetch(`${getApiUrl()}/api/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Error al enviar enlace');
                }

                showSuccess('authSuccess', 'Se ha enviado un enlace a tu email para restablecer tu contraseña.');
                forgotPasswordForm.reset();
                validateEmail(); // Re-enable button after reset
            } catch (error) {
                showError('authError', error.message);
            } finally {
                forgotPasswordBtn.disabled = false;
                forgotPasswordBtn.textContent = 'Enviar Enlace';
            }
        });
    }

    // Reset Password Form
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        const resetPasswordBtn = document.getElementById('resetPasswordBtn');

        // Enable button when both passwords are filled and valid
        const validateForm = () => {
            const newPass = newPasswordInput.value;
            const confirmPass = confirmPasswordInput.value;
            const passwordError = validatePassword(newPass);
            resetPasswordBtn.disabled = !(newPass && confirmPass && !passwordError && newPass === confirmPass);
        };

        newPasswordInput.addEventListener('input', validateForm);
        confirmPasswordInput.addEventListener('input', validateForm);

        resetPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const newPassword = newPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            hideError('authError');
            hideSuccess('authSuccess');
            resetPasswordBtn.disabled = true;
            resetPasswordBtn.textContent = 'Restableciendo...';

            // Validar que las contraseñas coincidan
            if (newPassword !== confirmPassword) {
                showError('authError', 'Las contraseñas no coinciden');
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.textContent = 'Restablecer Contraseña';
                return;
            }

            // Validar requisitos de contraseña (igual que registro)
            const passwordError = validatePassword(newPassword);
            if (passwordError) {
                showError('authError', passwordError);
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.textContent = 'Restablecer Contraseña';
                return;
            }

            // Obtener token de la URL
            const params = new URLSearchParams(window.location.search);
            const token = params.get('token');

            if (!token) {
                showError('authError', 'No se encontró el token de recuperación. Solicita un nuevo enlace.');
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.textContent = 'Restablecer Contraseña';
                return;
            }

            try {
                const response = await fetch(`${getApiUrl()}/api/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: token,
                        new_password: newPassword
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Error al restablecer contraseña');
                }

                showSuccess('authSuccess', 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.');
                resetPasswordForm.reset();

                // Limpiar el token de la URL
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

                // Redirigir al login después de 2 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);

            } catch (error) {
                showError('authError', error.message);
                resetPasswordBtn.disabled = false;
                resetPasswordBtn.textContent = 'Restablecer Contraseña';
            }
        });
    }

    if (isAuthenticated() && (loginForm || registerForm)) {
        window.location.href = getAuthRedirect();
    }

    document.querySelectorAll('.auth-footer a').forEach(enlace => {
        enlace.href = appendAuthParams(enlace.getAttribute('href') || enlace.href);
    });
});

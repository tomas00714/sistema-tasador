const API_BASE_URL = localStorage.getItem('apiUrl') || 'http://127.0.0.1:8080';

const TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'auth_user';

function getApiUrl() {
    const stored = localStorage.getItem('apiUrl');
    if (stored) return stored;
    const defaultUrl = window.location.hostname === 'localhost' 
        ? 'http://127.0.0.1:8080' 
        : 'https://sistema-tasador.onrender.com';
    return defaultUrl;
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
    window.location.href = 'login.html';
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
        apellido: data.apellido
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
        apellido: data.apellido
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
                window.location.href = 'app/index.html';
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
                window.location.href = 'app/index.html';
            } catch (error) {
                showError('authError', error.message);
                registerBtn.disabled = false;
                registerBtn.textContent = 'Crear Cuenta';
            }
        });
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
            
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
            } catch (error) {
                showError('authError', error.message);
            } finally {
                forgotPasswordBtn.disabled = false;
                forgotPasswordBtn.textContent = 'Enviar Enlace';
            }
        });
    }

    if (isAuthenticated() && (loginForm || registerForm)) {
        window.location.href = 'app/index.html';
    }
});

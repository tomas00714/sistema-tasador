/**
 * SUBSCRIPTION MANAGER
 * Módulo centralizado para la lógica de suscripciones, acceso Pro y flujos de alta.
 * Fuente única de verdad para: estado de suscripción, modal de upgrade, trial y pagos.
 */

// =========================
// ESTADO Y CONFIGURACIÓN
// =========================

const SubscriptionManager = {
    estado: {
        tieneAccesoPro: false,
        esAdmin: false,
        trialInfo: null,
        suscripcionInfo: null
    },
    
    callbacks: {
        onAccesoProCambiado: null,
        onTrialActivado: null,
        onPagoCompletado: null
    }
};

// =========================
// VERIFICACIÓN DE ACCESO PRO
// =========================

/**
 * Verifica si el usuario tiene acceso Pro (suscripción activa, trial o admin).
 * @param {boolean} forzarRecarga - Si true, ignora el estado en caché y hace una nueva petición
 * @returns {Promise<{hasAccess: boolean, isAuth: boolean, tiene_acceso_pro: boolean, is_admin: boolean}>}
 */
async function verificarAccesoPro(forzarRecarga = false) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        return { hasAccess: false, isAuth: false, tiene_acceso_pro: false, is_admin: false };
    }

    // Si no se fuerza recarga y ya tenemos estado reciente, usarlo (caché de 30 segundos)
    if (!forzarRecarga && SubscriptionManager.estado.ultimaVerificacion) {
        const ahora = Date.now();
        const haceMenosDe30s = ahora - SubscriptionManager.estado.ultimaVerificacion < 30000;
        if (haceMenosDe30s) {
            return {
                hasAccess: SubscriptionManager.estado.tieneAccesoPro,
                isAuth: true,
                tiene_acceso_pro: SubscriptionManager.estado.tieneAccesoPro,
                is_admin: SubscriptionManager.estado.esAdmin
            };
        }
    }

    try {
        const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://127.0.0.1:8080';
        const response = await fetch(`${apiUrl}/api/suscripcion`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                return { hasAccess: false, isAuth: false, tiene_acceso_pro: false, is_admin: false };
            }
            if (response.status === 403) {
                return { hasAccess: false, isAuth: true, tiene_acceso_pro: false, is_admin: false };
            }
            throw new Error('Error al verificar acceso Pro');
        }

        const data = await response.json();
        const tiene_acceso_pro = data.tiene_acceso_pro || false;
        const is_admin = data.is_admin || false;

        // Actualizar estado local
        SubscriptionManager.estado = {
            tieneAccesoPro: tiene_acceso_pro || is_admin,
            esAdmin: is_admin,
            trialInfo: data.trial_info || null,
            suscripcionInfo: {
                estado: data.estado_suscripcion || 'free',
                plan: data.plan || 'Free',
                fechaInicio: data.fecha_inicio,
                fechaFinPeriodo: data.fecha_fin_periodo
            },
            ultimaVerificacion: Date.now()
        };

        return {
            hasAccess: tiene_acceso_pro || is_admin,
            isAuth: true,
            tiene_acceso_pro,
            is_admin
        };
    } catch (error) {
        console.error('[SubscriptionManager] Error verificando acceso Pro:', error);
        return { hasAccess: false, isAuth: true, tiene_acceso_pro: false, is_admin: false };
    }
}

/**
 * Wrapper para acciones que requieren acceso Pro.
 * @param {Function} action - Acción a ejecutar si tiene acceso
 * @param {boolean} mostrarModal - Si true, muestra modal de suscripción cuando no tiene acceso
 * @returns {Promise<boolean>} - true si la acción se ejecutó
 */
async function ejecutarSiPro(action, mostrarModal = true) {
    const access = await verificarAccesoPro();

    if (!access.hasAccess) {
        if (mostrarModal) {
            mostrarModalSuscripcion();
        }
        return false;
    }

    if (typeof action === 'function') {
        action();
    }
    return true;
}

// =========================
// MODAL DE SUSCRIPCIONES
// =========================

/**
 * Muestra el modal de suscripciones reutilizable.
 * Reutiliza el modal existente de premium-guard.js (no duplicar).
 * @param {boolean} mostrarConfirmacionTrial - Si true, muestra confirmación de trial en lugar de tarjetas
 */
function mostrarModalSuscripcion(mostrarConfirmacionTrial = false) {
    if (window.PremiumGuard && window.PremiumGuard.showSubscriptionModal) {
        window.PremiumGuard.showSubscriptionModal();

        // Si se solicitó confirmación de trial, mostrarla después de que el modal se renderice
        if (mostrarConfirmacionTrial) {
            setTimeout(() => {
                mostrarModalConfirmacionTrial();
            }, 100);
        }
    } else {
        console.error('[SubscriptionManager] PremiumGuard.showSubscriptionModal no disponible');
    }
}

function ocultarModalSuscripcion() {
    if (window.PremiumGuard && window.PremiumGuard.hideSubscriptionModal) {
        window.PremiumGuard.hideSubscriptionModal();
    }
}

// =========================
// TRIAL (PRUEBA GRATUITA)
// =========================

/**
 * Verifica si el usuario es elegible para el trial en el modal.
 */
async function verificarElegibilidadTrialModal() {
    const btnTrial = document.getElementById('subscriptionModalTrial');
    if (!btnTrial) return;

    const isAuthenticated = localStorage.getItem('auth_token');
    if (!isAuthenticated) {
        btnTrial.style.display = 'none';
        return;
    }

    try {
        const estado = await verificarAccesoPro();
        
        // Mostrar botón solo si:
        // - No tiene acceso Pro
        // - Trial no está vigente
        // - Trial no ha sido usado
        if (!estado.tiene_acceso_pro && 
            SubscriptionManager.estado.trialInfo &&
            !SubscriptionManager.estado.trialInfo.esta_vigente &&
            !SubscriptionManager.estado.trialInfo.usado) {
            btnTrial.style.display = 'block';
        } else {
            btnTrial.style.display = 'none';
        }
    } catch (error) {
        console.error('[SubscriptionManager] Error verificando elegibilidad trial:', error);
        btnTrial.style.display = 'none';
    }
}

/**
 * Inicia el flujo de trial con confirmación.
 */
function iniciarFlujoTrial() {
    const isAuthenticated = localStorage.getItem('auth_token');

    if (!isAuthenticated) {
        // Usuario sin cuenta: debe registrarse primero
        window.location.href = 'registro.html?plan=trial&redirect=' + encodeURIComponent(window.location.href);
        return;
    }

    // Usuario con cuenta: mostrar confirmación (modal independiente)
    mostrarModalConfirmacionTrial();
}

/**
 * Muestra modal de confirmación de trial.
 * Crea un modal independiente que no depende del modal de suscripción.
 */
function mostrarModalConfirmacionTrial() {
    // Verificar si ya existe un modal de confirmación abierto
    let modalOverlay = document.getElementById('trialConfirmModalOverlay');

    if (modalOverlay) {
        // Ya está abierto, no hacer nada
        return;
    }

    // Crear modal de confirmación
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'trialConfirmModalOverlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.65);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 30px;
        max-width: 500px;
        width: calc(100vw - 40px);
        position: relative;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    modalContent.innerHTML = `
        <button type="button" id="trialConfirmClose" aria-label="Cerrar" style="
            position: absolute;
            top: 15px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            padding: 0;
            line-height: 1;
        ">✕</button>
        <h2 style="margin-top: 0; margin-bottom: 10px; color: #333;">¿Activar prueba gratuita?</h2>
        <p style="color: #666; margin-bottom: 15px;">La prueba gratuita dura <strong>15 días</strong> y te da acceso completo a todas las funcionalidades Pro.</p>
        <p style="color: #666; margin-bottom: 30px;">Al finalizar la prueba, <strong>no hay compromiso de pago</strong>. Podés continuar con tu cuenta Free si lo deseas.</p>
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="trialCancelar">Cancelar</button>
            <button type="button" class="btn btn-primary" id="trialConfirmar">Activar prueba gratuita</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Handlers
    document.getElementById('trialConfirmClose').addEventListener('click', ocultarModalConfirmacionTrial);
    document.getElementById('trialCancelar').addEventListener('click', ocultarModalConfirmacionTrial);
    document.getElementById('trialConfirmar').addEventListener('click', activarTrial);

    // Cerrar al hacer click en overlay
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            ocultarModalConfirmacionTrial();
        }
    });

    // Cerrar con Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            ocultarModalConfirmacionTrial();
            document.removeEventListener('keydown', escapeHandler);
        }
    };
    document.addEventListener('keydown', escapeHandler);

    // Mostrar con animación
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modalOverlay.style.pointerEvents = 'all';
    }, 10);
}

function ocultarModalConfirmacionTrial() {
    const modalOverlay = document.getElementById('trialConfirmModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.opacity = '0';
        modalOverlay.style.pointerEvents = 'none';

        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 180);
    }
}

/**
 * Activa el trial de 15 días.
 */
async function activarTrial() {
    const btnConfirmar = document.getElementById('trialConfirmar');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Activando...';
    }

    try {
        const token = localStorage.getItem('auth_token');
        const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://127.0.0.1:8000';

        const response = await fetch(`${apiUrl}/api/suscripcion/activar-trial`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Error al activar trial' }));
            throw new Error(errorData.detail || 'No eres elegible para el trial o ya lo has utilizado');
        }

        const result = await response.json();

        // Éxito
        const vencimiento = new Date(result.trial_fin);
        const vencimientoStr = vencimiento.toLocaleString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Cerrar modal de confirmación
        ocultarModalConfirmacionTrial();

        // Mostrar aviso con fecha y hora exactas
        mostrarModalAvisoTrial(vencimientoStr);

        // Redirigir a la app después de unos segundos
        setTimeout(() => {
            window.location.href = 'app/index.html';
        }, 3000);

    } catch (error) {
        console.error('[SubscriptionManager] Error al activar trial:', error);

        if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Activar prueba gratuita';
        }

        alert('Error: ' + error.message);
    }
}

/**
 * Muestra aviso de trial activado.
 */
function mostrarModalAvisoTrial(vencimientoStr) {
    const aviso = document.createElement('div');
    aviso.className = 'subscription-aviso';
    aviso.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
    `;
    aviso.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <i class="fa-solid fa-check-circle" style="font-size: 24px;"></i>
            <strong>¡Prueba gratuita activada!</strong>
        </div>
        <p style="margin: 0; font-size: 14px;">Vence el ${vencimientoStr}</p>
    `;
    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.remove();
    }, 5000);
}

// =========================
// SUSCRIPCIÓN PAGA
// =========================

/**
 * Inicia el flujo de suscripción paga.
 */
function iniciarFlujoSuscripcion() {
    const isAuthenticated = localStorage.getItem('auth_token');
    
    if (!isAuthenticated) {
        // Usuario sin cuenta: redirigir a registro con plan=paid
        window.location.href = 'registro.html?plan=paid&redirect=' + encodeURIComponent(window.location.href);
        return;
    }

    // Usuario con cuenta: iniciar checkout de Mercado Pago
    iniciarCheckoutMercadoPago();
}

/**
 * Inicia el checkout de Mercado Pago.
 */
async function iniciarCheckoutMercadoPago() {
    try {
        const token = localStorage.getItem('auth_token');
        const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://127.0.0.1:8000';

        const response = await fetch(`${apiUrl}/api/suscripcion/iniciar-checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Error al iniciar checkout' }));
            throw new Error(errorData.detail || 'Error al iniciar checkout');
        }

        const result = await response.json();

        // Redirigir al init_point de Mercado Pago
        if (result.init_point) {
            window.location.href = result.init_point;
        } else {
            throw new Error('No se recibió init_point de Mercado Pago');
        }

    } catch (error) {
        console.error('[SubscriptionManager] Error iniciando checkout:', error);
        alert('Error al iniciar el checkout: ' + error.message);
    }
}

// =========================
// REDIRECCIÓN PROTEGIDA
// =========================

/**
 * Redirige a pricing si no tiene acceso Pro (para acceso directo por URL).
 */
function redirigirSiNoPro() {
    verificarAccesoPro().then(access => {
        if (!access.hasAccess) {
            window.location.href = '../index.html#pricing';
        }
    });
}

// =========================
// RETORNO DE MERCADO PAGO
// =========================

/**
 * Verifica si el usuario acaba de volver de Mercado Pago y muestra el estado del pago.
 * Detecta parámetros en la URL: collection_id, preference_id, payment_status, etc.
 */
async function verificarRetornoMercadoPago() {
    const urlParams = new URLSearchParams(window.location.search);
    const collectionId = urlParams.get('collection_id');
    const preferenceId = urlParams.get('preference_id');
    const paymentStatus = urlParams.get('payment_status');
    const externalReference = urlParams.get('external_reference');

    // Si no hay parámetros de Mercado Pago, no hacer nada
    if (!collectionId && !preferenceId && !paymentStatus) {
        return;
    }

    // Verificar estado real en el backend (la autoridad)
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            // No autenticado, redirigir a login
            window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://127.0.0.1:8000';
        const response = await fetch(`${apiUrl}/api/suscripcion`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Error al verificar estado de pago');
        }

        const data = await response.json();

        // Limpiar URL (remover parámetros de Mercado Pago)
        window.history.replaceState({}, document.title, window.location.pathname);

        // Evaluar estado
        if (data.tiene_acceso_pro) {
            // Pago confirmado y Pro activado
            mostrarAvisoPagoExitoso();
        } else if (data.estado_suscripcion === 'pending') {
            // Pago pendiente o fallido
            mostrarAvisoPagoPendiente();
        } else {
            // No hay suscripción o pago falló
            mostrarAvisoPagoFallido();
        }

    } catch (error) {
        console.error('[SubscriptionManager] Error verificando retorno Mercado Pago:', error);
        // En caso de error, asumir fallido por seguridad
        mostrarAvisoPagoFallido();
    }
}

/**
 * Muestra aviso de pago exitoso.
 */
function mostrarAvisoPagoExitoso() {
    const aviso = document.createElement('div');
    aviso.className = 'subscription-aviso';
    aviso.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #d4edda;
        color: #155724;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
    `;
    aviso.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <i class="fa-solid fa-check-circle" style="font-size: 24px;"></i>
            <strong>¡Pago confirmado!</strong>
        </div>
        <p style="margin: 0; font-size: 14px;">Tu suscripción Pro está activa. Ya podés usar todas las funcionalidades.</p>
    `;
    document.body.appendChild(aviso);

    setTimeout(() => {
        aviso.remove();
    }, 5000);
}

/**
 * Muestra aviso de pago pendiente con opciones.
 */
function mostrarAvisoPagoPendiente() {
    const aviso = document.createElement('div');
    aviso.className = 'subscription-aviso';
    aviso.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff3cd;
        color: #856404;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
    `;
    aviso.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <i class="fa-solid fa-clock" style="font-size: 24px;"></i>
            <strong>Pago pendiente</strong>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px;">El pago está siendo procesado. Puede tardar unos minutos en confirmarse.</p>
        <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-primary" id="btnReintentarPago" style="font-size: 12px; padding: 6px 12px;">Reintentar pago</button>
            <button type="button" class="btn btn-secondary" id="btnContinuarCuenta" style="font-size: 12px; padding: 6px 12px;">Continuar con mi cuenta</button>
        </div>
    `;
    document.body.appendChild(aviso);

    document.getElementById('btnReintentarPago').addEventListener('click', () => {
        aviso.remove();
        iniciarFlujoSuscripcion();
    });

    document.getElementById('btnContinuarCuenta').addEventListener('click', () => {
        aviso.remove();
    });
}

/**
 * Muestra aviso de pago fallido con opciones.
 */
function mostrarAvisoPagoFallido() {
    const aviso = document.createElement('div');
    aviso.className = 'subscription-aviso';
    aviso.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f8d7da;
        color: #721c24;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
    `;
    aviso.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <i class="fa-solid fa-exclamation-circle" style="font-size: 24px;"></i>
            <strong>Pago fallido</strong>
        </div>
        <p style="margin: 0 0 12px 0; font-size: 14px;">El pago no pudo completarse. Podés reintentar o continuar con tu cuenta Free.</p>
        <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-primary" id="btnReintentarPago" style="font-size: 12px; padding: 6px 12px;">Reintentar pago</button>
            <button type="button" class="btn btn-secondary" id="btnContinuarCuenta" style="font-size: 12px; padding: 6px 12px;">Continuar con mi cuenta</button>
        </div>
    `;
    document.body.appendChild(aviso);

    document.getElementById('btnReintentarPago').addEventListener('click', () => {
        aviso.remove();
        iniciarFlujoSuscripcion();
    });

    document.getElementById('btnContinuarCuenta').addEventListener('click', () => {
        aviso.remove();
    });
}

// =========================
// EXPORTAR FUNCIONES GLOBALES
// =========================

window.SubscriptionManager = {
    verificarAccesoPro,
    ejecutarSiPro,
    mostrarModalSuscripcion,
    ocultarModalSuscripcion,
    redirigirSiNoPro,
    iniciarFlujoTrial,
    iniciarFlujoSuscripcion,
    verificarRetornoMercadoPago
};

// Verificar retorno de Mercado Pago al cargar el script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', verificarRetornoMercadoPago);
} else {
    verificarRetornoMercadoPago();
}

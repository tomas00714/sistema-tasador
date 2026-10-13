/**
 * Guard de acceso premium para páginas restringidas.
 * Protege páginas que requieren suscripción activa o permisos de administrador.
 */

/**
 * Muestra el modal de suscripciones reutilizable.
 * Crea el modal dinámicamente en el body para que funcione en todas las páginas.
 */
function showSubscriptionModal() {
    // Crear modal-overlay y modal dinámicamente si no existen
    let modalOverlay = document.getElementById('subscriptionModalOverlay');
    let modalTasacion = document.getElementById('subscriptionModal');
    
    if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'subscriptionModalOverlay';
        modalOverlay.className = 'modal-overlay';
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
            z-index: 9999;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
        `;
        
        modalTasacion = document.createElement('div');
        modalTasacion.id = 'subscriptionModal';
        modalTasacion.className = 'modal-tasacion';
        modalTasacion.style.cssText = `
            background: white;
            border: 1px solid var(--color-border, #e0e0e0);
            border-radius: 8px;
            padding: 30px;
            max-width: 900px;
            width: calc(100vw - 40px);
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            position: relative;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        modalTasacion.innerHTML = `
            <button type="button" class="cerrar-modal" id="cerrarSubscriptionModal" aria-label="Cerrar" style="
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
            <div class="subscription-modal-content">
                <h2 style="margin-top: 0; margin-bottom: 10px; color: #333;">Se requiere suscripción Pro</h2>
                <p style="color: #666; margin-bottom: 30px;">Para acceder a esta funcionalidad, necesitas una suscripción activa o activar la prueba gratuita.</p>
                <div class="subscription-modal-plans" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                    <div class="pricing-card" style="margin: 0; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; background: white;">
                        <h3 style="margin-top: 0; margin-bottom: 16px; color: #333;">Prueba gratuita</h3>
                        <div class="pricing-price" style="font-size: 32px; font-weight: 700; color: #0066cc; margin-bottom: 24px;">
                            15 días<span style="font-size: 16px; font-weight: 400; color: #666;">gratis</span>
                        </div>
                        <ul class="pricing-features" style="list-style: none; padding: 0; margin: 0 0 24px 0; text-align: left;">
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Tasaciones ilimitadas</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Base de datos de comparables</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Informes PDF personalizados</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Integración con mapas</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Colaboración en tiempo real</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Soporte prioritario</li>
                        </ul>
                        <button class="btn btn-secondary trial-cta-modal" id="trialCtaModal" style="width: 100%; justify-content: center; display: none; padding: 12px 24px; border: 1px solid #0066cc; background: white; color: #0066cc; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">
                            Activar prueba gratuita
                        </button>
                        <div id="trialMessageModal" style="display: none; margin-top: 15px; padding: 10px; border-radius: 5px; font-size: 14px;"></div>
                    </div>
                    <div class="pricing-card" style="margin: 0; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; text-align: center; background: white;">
                        <h3 style="margin-top: 0; margin-bottom: 16px; color: #333;">Suscripción</h3>
                        <div class="pricing-price" style="font-size: 32px; font-weight: 700; color: #0066cc; margin-bottom: 24px;">
                            $15.000 ARS<span style="font-size: 16px; font-weight: 400; color: #666;">/mes</span>
                        </div>
                        <ul class="pricing-features" style="list-style: none; padding: 0; margin: 0 0 24px 0; text-align: left;">
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Tasaciones ilimitadas</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Base de datos de comparables</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Informes PDF personalizados</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Integración con mapas</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Colaboración en tiempo real</li>
                            <li style="padding: 8px 0; color: #666; display: flex; align-items: center; gap: 10px;"><i class="fa-solid fa-check" style="color: #28a745;"></i> Soporte prioritario</li>
                        </ul>
                        <button class="btn btn-primary pricing-cta-modal" id="pricingCtaModal" style="width: 100%; justify-content: center; padding: 12px 24px; background: #0066cc; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            Suscribirme
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        modalOverlay.appendChild(modalTasacion);
        document.body.appendChild(modalOverlay);
        
        // Handler para cerrar modal
        document.getElementById('cerrarSubscriptionModal').addEventListener('click', hideSubscriptionModal);
        
        // Handler para cerrar al hacer click en el overlay
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                hideSubscriptionModal();
            }
        });
        
        // Handler para cerrar con Escape
        document.addEventListener('keydown', handleSubscriptionModalEscape);

        // Handler para activar trial (usar SubscriptionManager compartido)
        const trialCtaModal = document.getElementById('trialCtaModal');
        if (trialCtaModal) {
            trialCtaModal.addEventListener('click', function() {
                if (window.SubscriptionManager && window.SubscriptionManager.iniciarFlujoTrial) {
                    window.SubscriptionManager.iniciarFlujoTrial();
                }
            });
        }

        // Handler para suscribirse (usar SubscriptionManager compartido)
        const pricingCtaModal = document.getElementById('pricingCtaModal');
        if (pricingCtaModal) {
            pricingCtaModal.addEventListener('click', function() {
                if (window.SubscriptionManager && window.SubscriptionManager.iniciarFlujoSuscripcion) {
                    window.SubscriptionManager.iniciarFlujoSuscripcion();
                }
            });
        }
    }
    
    // Verificar elegibilidad para trial usando SubscriptionManager (sin recarga si se acaba de verificar)
    if (window.SubscriptionManager && window.SubscriptionManager.verificarAccesoPro) {
        window.SubscriptionManager.verificarAccesoPro(false).then(access => {
            const trialCtaModal = document.getElementById('trialCtaModal');
            if (!trialCtaModal) return;

            // Mostrar botón solo si autenticado y elegible
            if (access.isAuth && !access.hasAccess &&
                SubscriptionManager.estado.trialInfo &&
                !SubscriptionManager.estado.trialInfo.esta_vigente &&
                !SubscriptionManager.estado.trialInfo.usado) {
                trialCtaModal.style.display = 'block';
            } else {
                trialCtaModal.style.display = 'none';
            }
        });
    }

    // Mostrar modal con animación
    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        modalOverlay.style.pointerEvents = 'all';
    }, 10);
}

/**
 * Cierra el modal de suscripciones.
 */
function hideSubscriptionModal() {
    const modalOverlay = document.getElementById('subscriptionModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.opacity = '0';
        modalOverlay.style.pointerEvents = 'none';
        
        // Remover del DOM después de la animación
        setTimeout(() => {
            if (modalOverlay.parentNode) {
                modalOverlay.parentNode.removeChild(modalOverlay);
            }
        }, 180);
    }
    
    // Remover handler de Escape
    document.removeEventListener('keydown', handleSubscriptionModalEscape);
}

/**
 * Handler para cerrar modal con Escape.
 */
function handleSubscriptionModalEscape(e) {
    if (e.key === 'Escape') {
        hideSubscriptionModal();
    }
}

/**
 * Verifica elegibilidad para trial en el modal.
 * DEPRECADO: Usar SubscriptionManager.verificarAccesoPro directamente.
 */
async function checkTrialEligibilityModal() {
    // Esta función ahora delega a SubscriptionManager
    const trialCtaModal = document.getElementById('trialCtaModal');
    if (!trialCtaModal) return;

    if (window.SubscriptionManager && window.SubscriptionManager.verificarAccesoPro) {
        const access = await window.SubscriptionManager.verificarAccesoPro();

        // Mostrar botón solo si autenticado y elegible
        if (access.isAuth && !access.hasAccess &&
            SubscriptionManager.estado.trialInfo &&
            !SubscriptionManager.estado.trialInfo.esta_vigente &&
            !SubscriptionManager.estado.trialInfo.usado) {
            trialCtaModal.style.display = 'block';
        } else {
            trialCtaModal.style.display = 'none';
        }
    }
}

/**
 * Redirige a la página de pricing para suscribirse.
 */
function redirectToPricing() {
    const currentPath = window.location.pathname;
    if (currentPath.includes('/app/')) {
        window.location.href = '../index.html#pricing';
    } else {
        window.location.href = 'index.html#pricing';
    }
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
    // Abrir modal de suscripciones en lugar de redirigir
    showSubscriptionModal();
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
 * Para acceso directo por URL, redirige a pricing si no tiene acceso.
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

    // Verificar acceso premium delegando a SubscriptionManager
    let access;
    if (window.SubscriptionManager && window.SubscriptionManager.verificarAccesoPro) {
        access = await window.SubscriptionManager.verificarAccesoPro();
    } else {
        // Fallback a checkPremiumAccess si SubscriptionManager no está disponible
        access = await checkPremiumAccess();
    }

    // Ocultar carga
    hidePremiumLoading();

    if (!access.hasAccess) {
        // No tiene acceso premium - redirigir a pricing (acceso directo por URL)
        redirectToPricing();
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
        const currentPath = window.location.pathname;
        const relativePath = currentPath.replace('/client/', '');
        window.location.href = `../login.html?redirect=${encodeURIComponent(relativePath)}`;
        return false;
    }

    // Verificar acceso premium delegando a SubscriptionManager
    let access;
    if (window.SubscriptionManager && window.SubscriptionManager.verificarAccesoPro) {
        access = await window.SubscriptionManager.verificarAccesoPro();
    } else {
        // Fallback a checkPremiumAccess si SubscriptionManager no está disponible
        access = await checkPremiumAccess();
    }

    if (!access.hasAccess) {
        if (showErrorModal) {
            // Mostrar modal de suscripción
            showSubscriptionModal();
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
 * Función para ejecutar acciones que requieren acceso premium sin bloquear la página.
 * Similar a executeIfPremium pero siempre muestra el modal si no tiene acceso.
 */
async function requirePremiumForAction(action) {
    if (!isAuthenticated()) {
        const currentPath = window.location.pathname;
        const relativePath = currentPath.replace('/client/', '');
        window.location.href = `../login.html?redirect=${encodeURIComponent(relativePath)}`;
        return false;
    }

    // Verificar acceso premium delegando a SubscriptionManager
    let access;
    if (window.SubscriptionManager && window.SubscriptionManager.verificarAccesoPro) {
        access = await window.SubscriptionManager.verificarAccesoPro();
    } else {
        // Fallback a checkPremiumAccess si SubscriptionManager no está disponible
        access = await checkPremiumAccess();
    }

    if (!access.hasAccess) {
        // Mostrar modal de suscripción
        showSubscriptionModal();
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
    requirePremiumForAction,
    showPremiumRestricted,
    hidePremiumRestricted,
    showSubscriptionModal,
    hideSubscriptionModal
};

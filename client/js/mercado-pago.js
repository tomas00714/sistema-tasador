/**
 * Mercado Pago Checkout Integration
 * Maneja la integración con Mercado Pago CardToken Brick para suscripciones
 */

// Estado global del checkout
let mpCardInstance = null;
let isProcessing = false;

/**
 * Obtiene la configuración de Mercado Pago desde el backend
 */
async function getMercadoPagoConfig() {
    try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/suscripcion/config`);
        
        if (!response.ok) {
            throw new Error('Error al obtener configuración de Mercado Pago');
        }
        
        const config = await response.json();
        return config;
    } catch (error) {
        console.error('[MercadoPago] Error obteniendo configuración:', error);
        throw error;
    }
}

/**
 * Obtiene el estado de suscripción del usuario
 */
async function getSubscriptionStatus() {
    try {
        const token = getToken();
        if (!token) {
            return null;
        }
        
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/suscripcion`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                return null; // No autenticado
            }
            throw new Error('Error al obtener estado de suscripción');
        }
        
        return await response.json();
    } catch (error) {
        console.error('[MercadoPago] Error obteniendo estado de suscripción:', error);
        throw error;
    }
}

/**
 * Inicializa el CardToken Brick de Mercado Pago
 */
async function initializeCardToken(containerId, publicKey) {
    try {
        if (mpCardInstance) {
            mpCardInstance.unmount();
        }
        
        const cardTokenBrickBuilder = mp.bricks({
            settings: {
                initialization: {
                    amount: 10, // Este valor es solo visual, el backend usa MP_PLAN_PRICE
                    payer: {
                        email: ''
                    }
                },
                customization: {
                    visual: {
                        style: {
                            customVariables: {
                                baseColor: '#0055ff',
                                textPrimaryColor: '#333333',
                                textSecondaryColor: '#666666',
                                formBackgroundColor: '#ffffff',
                            }
                        }
                    },
                    paymentMethods: {
                        minInstallments: 1,
                        maxInstallments: 1
                    }
                },
                callbacks: {
                    onReady: () => {
                        console.log('[MercadoPago] CardToken Brick listo');
                    },
                    onSubmit: (cardFormData) => {
                        return new Promise((resolve, reject) => {
                            handleCardTokenSubmit(cardFormData, resolve, reject);
                        });
                    },
                    onError: (error) => {
                        console.error('[MercadoPago] Error en brick:', error);
                        showCheckoutError('Error al procesar la tarjeta. Por favor, intentá nuevamente.');
                    }
                }
            },
        });
        
        mpCardInstance = cardTokenBrickBuilder.create('cardPayment', containerId);
        
        return mpCardInstance;
    } catch (error) {
        console.error('[MercadoPago] Error inicializando CardToken:', error);
        throw error;
    }
}

/**
 * Maneja el envío del formulario de tarjeta
 */
async function handleCardTokenSubmit(cardFormData, resolve, reject) {
    try {
        if (isProcessing) {
            reject(new Error('Ya hay un proceso en curso'));
            return;
        }
        
        isProcessing = true;
        
        const token = getToken();
        if (!token) {
            reject(new Error('Debes iniciar sesión para suscribirte'));
            isProcessing = false;
            return;
        }
        
        const cardToken = cardFormData.token;
        const apiUrl = getApiUrl();
        
        // Enviar el token al backend
        const response = await fetch(`${apiUrl}/api/suscripcion/crear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                card_token_id: cardToken,
                back_url: window.location.href
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Error al crear suscripción' }));
            throw new Error(errorData.detail || 'Error al crear suscripción');
        }
        
        const result = await response.json();
        
        // Éxito: la suscripción fue creada en estado pending
        resolve(result);
        
        // Cerrar modal
        closeCheckoutModal();
        
        // Actualizar UI
        showSubscriptionPending();
        
    } catch (error) {
        console.error('[MercadoPago] Error en envío:', error);
        reject(error);
    } finally {
        isProcessing = false;
    }
}

/**
 * Muestra el estado de suscripción pendiente
 */
function showSubscriptionPending() {
    const pricingCard = document.querySelector('.pricing-card');
    if (!pricingCard) return;
    
    const ctaButton = pricingCard.querySelector('.pricing-cta');
    if (ctaButton) {
        ctaButton.disabled = true;
        ctaButton.innerHTML = '<i class="fa-solid fa-clock"></i> Procesando...';
        ctaButton.classList.add('disabled');
    }
    
    // Mostrar mensaje de estado pendiente
    const existingMessage = pricingCard.querySelector('.subscription-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'subscription-message pending';
    messageDiv.innerHTML = `
        <i class="fa-solid fa-clock"></i>
        <p>Suscripción creada correctamente. Estamos esperando la confirmación del primer pago de Mercado Pago. Te avisaremos cuando tu plan Pro esté activo.</p>
    `;
    
    pricingCard.insertBefore(messageDiv, ctaButton);
}

/**
 * Muestra que el usuario ya tiene Pro activo
 */
function showSubscriptionActive() {
    const pricingCard = document.querySelector('.pricing-card');
    if (!pricingCard) return;
    
    const ctaButton = pricingCard.querySelector('.pricing-cta');
    if (ctaButton) {
        ctaButton.disabled = true;
        ctaButton.innerHTML = '<i class="fa-solid fa-check"></i> Ya sos Pro';
        ctaButton.classList.add('disabled', 'success');
    }
    
    // Mostrar mensaje de estado activo
    const existingMessage = pricingCard.querySelector('.subscription-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'subscription-message active';
    messageDiv.innerHTML = `
        <i class="fa-solid fa-check-circle"></i>
        <p>¡Tu plan Pro está activo! Disfrutá de todas las funcionalidades.</p>
    `;
    
    pricingCard.insertBefore(messageDiv, ctaButton);
}

/**
 * Muestra el modal de checkout
 */
async function showCheckoutModal() {
    try {
        const token = getToken();
        if (!token) {
            // Redirigir a login
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        // Verificar estado de suscripción actual
        const subscriptionStatus = await getSubscriptionStatus();
        if (subscriptionStatus && subscriptionStatus.tiene_acceso_pro) {
            showSubscriptionActive();
            return;
        }
        
        if (subscriptionStatus && subscriptionStatus.estado === 'pending') {
            showSubscriptionPending();
            return;
        }
        
        // Obtener configuración
        const config = await getMercadoPagoConfig();
        
        // Crear modal
        const modal = document.createElement('div');
        modal.className = 'mp-checkout-modal';
        modal.innerHTML = `
            <div class="mp-checkout-modal-content">
                <div class="mp-checkout-modal-header">
                    <h3>Suscribirse al Plan Pro</h3>
                    <button class="mp-checkout-modal-close" onclick="window.MercadoPagoCheckout.closeCheckoutModal()">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
                <div class="mp-checkout-modal-body">
                    <div id="cardPayment-container"></div>
                    <div id="mp-error-message" class="mp-error-message" style="display: none;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Inicializar CardToken Brick
        await initializeCardToken('cardPayment-container', config.mp_public_key);
        
        // Cerrar modal al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.MercadoPagoCheckout.closeCheckoutModal();
            }
        });
        
    } catch (error) {
        console.error('[MercadoPago] Error mostrando checkout:', error);
        showCheckoutError(error.message);
    }
}

/**
 * Cierra el modal de checkout
 */
function closeCheckoutModal() {
    const modal = document.querySelector('.mp-checkout-modal');
    if (modal) {
        if (mpCardInstance) {
            mpCardInstance.unmount();
            mpCardInstance = null;
        }
        modal.remove();
    }
}

/**
 * Muestra error en el checkout
 */
function showCheckoutError(message) {
    const errorElement = document.getElementById('mp-error-message');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert(message);
    }
}

/**
 * Configura el botón de suscripción en la página de precios
 */
function setupSubscriptionButton() {
    const pricingCtaButton = document.getElementById('pricingCtaButton');
    if (!pricingCtaButton) return;
    
    // Verificar estado de suscripción al cargar
    checkSubscriptionStatusAndUpdateUI();
    
    // Remover handler anterior
    const newButton = pricingCtaButton.cloneNode(true);
    pricingCtaButton.parentNode.replaceChild(newButton, pricingCtaButton);
    
    // Agregar nuevo handler
    newButton.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const token = getToken();
        if (!token) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        if (newButton.disabled) {
            return;
        }
        
        await showCheckoutModal();
    });
}

/**
 * Verifica el estado de suscripción y actualiza la UI
 */
async function checkSubscriptionStatusAndUpdateUI() {
    try {
        const subscriptionStatus = await getSubscriptionStatus();
        const pricingCtaButton = document.getElementById('pricingCtaButton');
        
        if (!pricingCtaButton) return;
        
        if (subscriptionStatus && subscriptionStatus.tiene_acceso_pro) {
            showSubscriptionActive();
        } else if (subscriptionStatus && subscriptionStatus.estado === 'pending') {
            showSubscriptionPending();
        } else {
            // Usuario free puede suscribirse
            pricingCtaButton.disabled = false;
            pricingCtaButton.innerHTML = 'Suscribirme <i class="fa-solid fa-arrow-right"></i>';
            pricingCtaButton.classList.remove('disabled', 'success');
        }
    } catch (error) {
        console.error('[MercadoPago] Error verificando estado:', error);
        // En caso de error, permitir suscripción
        const pricingCtaButton = document.getElementById('pricingCtaButton');
        if (pricingCtaButton) {
            pricingCtaButton.disabled = false;
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setupSubscriptionButton();
});

// Exponer funciones globalmente
window.MercadoPagoCheckout = {
    showCheckoutModal,
    closeCheckoutModal,
    checkSubscriptionStatusAndUpdateUI
};

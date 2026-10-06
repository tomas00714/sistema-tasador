/**
 * Mercado Pago Checkout Integration
 * Maneja la integración con Mercado Pago checkout sin CardToken Brick
 * El usuario completa el pago directamente en Mercado Pago mediante init_point
 */

// Estado global del checkout
let isProcessing = false;

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
 * Inicia el checkout de suscripción via Mercado Pago
 */
async function iniciarCheckout() {
    try {
        if (isProcessing) {
            console.warn('[MercadoPago] Ya hay un proceso de checkout en curso');
            return;
        }
        
        isProcessing = true;
        
        const token = getToken();
        if (!token) {
            // Redirigir a login
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        const apiUrl = getApiUrl();
        
        // Llamar al backend para iniciar el checkout
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
        
        // Redirigir al usuario al init_point de Mercado Pago
        if (result.init_point) {
            window.location.href = result.init_point;
        } else {
            throw new Error('No se recibió init_point de Mercado Pago');
        }
        
    } catch (error) {
        console.error('[MercadoPago] Error iniciando checkout:', error);
        alert('Error al iniciar el checkout: ' + error.message);
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
        <p>Suscripción iniciada. Completa el checkout en Mercado Pago para activar tu plan Pro.</p>
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
        
        await iniciarCheckout();
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
    iniciarCheckout,
    checkSubscriptionStatusAndUpdateUI
};

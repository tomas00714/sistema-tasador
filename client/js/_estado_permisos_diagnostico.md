# DIAGNÓSTICO Y PROPUESTA: ARQUITECTURA DE ESTADO DE PERMISOS

## PROBLEMA ACTUAL

### Verificaciones duplicadas de permisos
Cada vez que un usuario pulsa un botón protegido:
1. `SubscriptionManager.ejecutarSiPro()` llama a `verificarAccesoPro()`
2. `verificarAccesoPro()` hace una petición `GET /api/suscripcion`
3. Si no tiene acceso, `mostrarModalSuscripcion()` llama a `PremiumGuard.showSubscriptionModal()`
4. `showSubscriptionModal()` vuelve a llamar a `verificarAccesoPro()` para verificar elegibilidad de trial

Esto resulta en hasta 2 peticiones por clic en el peor caso (sin caché).

### Falta de estado persistente
- El estado de permisos no se carga explícitamente al iniciar sesión
- No se actualiza automáticamente después de cambios de plan, activación de trial, etc.
- Cada clic puede requerir una nueva petición de red
- No hay distinción clara entre "estado inicial" y "estado actualizado"

## PROPUESTA DE ARQUITECTURA

### 1. Estado compartido centralizado

**Estructura propuesta:**
```javascript
const SubscriptionManager = {
    estado: {
        // Estado de autenticación
        isAuthenticated: false,
        userId: null,
        email: null,

        // Estado de permisos
        tieneAccesoPro: false,
        esAdmin: false,
        plan: 'free', // 'free', 'trial', 'pro'
        estadoSuscripcion: null, // 'activa', 'en_gracia', 'cancelada', etc.

        // Trial específico
        trialInfo: {
            esta_vigente: false,
            usado: false,
            inicio: null,
            fin: null
        },

        // Metadatos
        ultimaVerificacion: null,
        esStale: false // Indica si el estado puede estar desactualizado
    }
}
```

### 2. Carga inicial del estado

**Al iniciar sesión (auth.js):**
```javascript
async function login(email, password) {
    // ... lógica de login existente ...

    // Cargar estado de permisos después de login exitoso
    if (window.SubscriptionManager) {
        await window.SubscriptionManager.cargarEstadoInicial();
    }
}
```

**Al recuperar sesión (localStorage):**
```javascript
// Al cargar la página, si hay token:
if (getToken()) {
    SubscriptionManager.cargarEstadoInicial();
}
```

**Método `cargarEstadoInicial()`:**
```javascript
async function cargarEstadoInicial() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        const apiUrl = window.getApiUrl ? window.getApiUrl() : 'http://127.0.0.1:8080';
        const response = await fetch(`${apiUrl}/api/suscripcion`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            actualizarEstadoDesdeBackend(data);
        }
    } catch (error) {
        console.error('[SubscriptionManager] Error cargando estado inicial:', error);
        // No fallar la sesión si falla la carga de permisos
    }
}
```

### 3. Actualización del estado

**Eventos que deben actualizar el estado:**
- Inicio de sesión exitoso → cargar estado inicial
- Activación de trial → actualizar estado
- Pago de suscripción confirmado → actualizar estado
- Cancelación de suscripción → actualizar estado
- Cierre de sesión → limpiar estado

**Método `actualizarEstadoDesdeBackend(data)`:**
```javascript
function actualizarEstadoDesdeBackend(data) {
    SubscriptionManager.estado = {
        ...SubscriptionManager.estado,
        tieneAccesoPro: data.tiene_acceso_pro || data.is_admin,
        esAdmin: data.is_admin,
        plan: data.plan || 'free',
        estadoSuscripcion: data.estado_suscripcion,
        trialInfo: data.trial_info || null,
        ultimaVerificacion: Date.now(),
        esStale: false
    };

    // Notificar a componentes que dependen del estado
    if (SubscriptionManager.callbacks.onAccesoProCambiado) {
        SubscriptionManager.callbacks.onAccesoProCambiado(SubscriptionManager.estado);
    }
}
```

### 4. Verificación optimizada de permisos

**`verificarAccesoPro()` con caché extendida:**
```javascript
async function verificarAccesoPro(forzarRecarga = false) {
    // Si el token no existe, sin acceso
    const token = localStorage.getItem('auth_token');
    if (!token) {
        return { hasAccess: false, isAuth: false, tiene_acceso_pro: false, is_admin: false };
    }

    // Si no se fuerza recarga y el estado es reciente (5 minutos), usar caché
    if (!forzarRecarga && SubscriptionManager.estado.ultimaVerificacion) {
        const ahora = Date.now();
        const haceMenosDe5min = ahora - SubscriptionManager.estado.ultimaVerificacion < 300000;
        if (haceMenosDe5min && !SubscriptionManager.estado.esStale) {
            return {
                hasAccess: SubscriptionManager.estado.tieneAccesoPro,
                isAuth: true,
                tiene_acceso_pro: SubscriptionManager.estado.tieneAccesoPro && !SubscriptionManager.estado.esAdmin,
                is_admin: SubscriptionManager.estado.esAdmin
            };
        }
    }

    // Si no hay caché válida, hacer petición
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
        actualizarEstadoDesdeBackend(data);

        return {
            hasAccess: SubscriptionManager.estado.tieneAccesoPro,
            isAuth: true,
            tiene_acceso_pro: data.tiene_acceso_pro,
            is_admin: data.is_admin
        };
    } catch (error) {
        console.error('[SubscriptionManager] Error verificando acceso Pro:', error);
        const esErrorDeRed = error.name === 'TypeError' && error.message.includes('fetch');
        return {
            hasAccess: false,
            isAuth: true,
            tiene_acceso_pro: false,
            is_admin: false,
            error: esErrorDeRed ? 'network' : 'unknown'
        };
    }
}
```

### 5. Evitar segunda verificación en el modal

**Modificar `showSubscriptionModal()` en premium-guard.js:**
```javascript
function showSubscriptionModal() {
    // ... crear modal ...

    // Verificar elegibilidad para trial usando el estado en caché
    if (window.SubscriptionManager && window.SubscriptionManager.estado) {
        const estado = SubscriptionManager.estado;
        const trialCtaModal = document.getElementById('trialCtaModal');
        if (trialCtaModal) {
            // Mostrar botón solo si autenticado y elegible (usando estado en caché)
            if (estado.tieneAccesoPro === false && estado.esAdmin === false &&
                estado.trialInfo && !estado.trialInfo.esta_vigente && !estado.trialInfo.usado) {
                trialCtaModal.style.display = 'block';
            } else {
                trialCtaModal.style.display = 'none';
            }
        }
    }

    // ... resto del código ...
}
```

### 6. Marcar estado como stale cuando sea necesario

**Eventos que marcan `esStale = true`:**
- Después de 5 minutos sin recarga
- Cuando el usuario realiza una acción que podría cambiar el estado (ej: activar trial, pagar suscripción)
- Cuando se recibe un error inesperado del backend

**Método `marcarStale()`:**
```javascript
function marcarStale() {
    SubscriptionManager.estado.esStale = true;
}
```

### 7. Diferenciación de roles para administración

**Los botones de administración deben verificar `esAdmin` directamente:**
```javascript
// En sidebar.js o donde se controle acceso admin
if (SubscriptionManager.estado.esAdmin) {
    // Mostrar botones de administración
} else {
    // Ocultar botones de administración
}
```

**Separar permisos Pro de permisos de admin:**
```javascript
// Para acciones Pro:
if (SubscriptionManager.estado.tieneAccesoPro) {
    // Permitir
}

// Para acciones de admin:
if (SubscriptionManager.estado.esAdmin) {
    // Permitir
}
```

## BENEFICIOS

1. **Menos peticiones de red**: El estado se carga una vez al iniciar sesión y se reutiliza
2. **Respuesta más rápida**: Los botones responden inmediatamente usando el estado en caché
3. **Consistencia**: Todos los componentes usan el mismo estado compartido
4. **Claridad**: Distinción clara entre "sin permiso" y "no se pudo consultar"
5. **Mantenibilidad**: Lógica centralizada en SubscriptionManager
6. **Seguridad**: Backend sigue siendo la autoridad final; estado del frontend es solo optimización

## RIESGOS Y MITIGACIONES

**Riesgo**: Estado desactualizado si el backend cambia sin que el frontend lo sepa
**Mitigación**:
- Caché de 5 minutos (no permanente)
- Marcar `esStale` después de acciones que podrían cambiar el estado
- El backend sigue validando todas las operaciones protegidas

**Riesgo**: Usuarios podrían manipular el estado en localStorage
**Mitigación**:
- El estado no se guarda en localStorage (solo el token)
- El backend valida todas las operaciones
- El estado en frontend es solo para UX, no para autorización

## IMPLEMENTACIÓN POR ETAPAS

**Etapa 1** (cambio mínimo):
- Agregar `cargarEstadoInicial()` que se llame después del login
- Extender caché de 30s a 5 minutos
- Eliminar segunda verificación en `showSubscriptionModal()`

**Etapa 2** (cambio medio):
- Marcar estado como `esStale` cuando corresponda
- Agregar actualización del estado después de trial/pago
- Separar claramente permisos Pro de permisos admin

**Etapa 3** (cambio mayor):
- Implementar callbacks para notificar cambios de estado
- Agregar UI de carga cuando el estado está siendo verificado
- Implementar reintentos automáticos con backoff

# Guía de Prueba Manual - Mercado Pago Checkout

## Configuración Requerida

### 1. Variables de Entorno del Backend

Configurar las siguientes variables en `.env`:

```bash
# Token de acceso para API de Mercado Pago (Sandbox)
MP_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxx

# Public Key para frontend (Sandbox)
MP_PUBLIC_KEY=APP_USR-xxxxxxxxxxxxx

# Secret para validación de webhooks
MP_WEBHOOK_SECRET=xxxxxxxxxxxxx

# Entorno: sandbox o production
MP_ENVIRONMENT=sandbox

# Precio del plan (USD por defecto)
MP_PLAN_PRICE=10.0

# Moneda del plan (USD o ARS)
MP_PLAN_CURRENCY=USD
```

**Cómo obtener credenciales de Mercado Pago Sandbox:**
1. Ir a https://www.mercadopago.com.ar/developers
2. Iniciar sesión
3. Crear una aplicación o usar una existente
4. Ir a "Credenciales de producción/prueba"
5. Copiar Access Token y Public Key de "Pruebas"

### 2. Configurar Webhook en Mercado Pago

Para que los webhooks funcionen en sandbox:

1. En el panel de Mercado Pago Developers
2. Ir a la sección "Webhooks"
3. Configurar URL: `https://tu-dominio.com/api/webhooks/mercado-pago`
4. Para pruebas locales, usar ngrok o similar:
   ```bash
   ngrok http 8080
   ```
5. Usar la URL de ngrok como webhook URL en Mercado Pago
6. Copiar el "Webhook Secret" generado y configurarlo en `MP_WEBHOOK_SECRET`

**Nota:** Sin webhook configurado, la suscripción quedará en estado `pending` permanentemente.

---

## Pasos de Prueba

### Paso 1: Iniciar el Backend

```bash
cd server
python -m uvicorn main:app --reload --port 8080
```

Verificar que el backend esté corriendo en http://127.0.0.1:8080

### Paso 2: Iniciar el Frontend

```bash
cd client
# Si usás un servidor HTTP simple
python -m http.server 3000
# O si usás Live Server en VS Code
```

Abrir http://localhost:3000 en el navegador

### Paso 3: Iniciar Sesión

1. Clic en "Iniciar sesión" en la navegación
2. Ingresar email y contraseña de un usuario existente
3. O crear una nueva cuenta en "Registrarse"

### Paso 4: Ir a la Sección de Precios

1. Scrollear hasta la sección "Precios"
2. Verificar que el botón "Suscribirme" esté visible
3. Si el usuario ya tiene Pro, debería mostrar "Ya sos Pro" y el botón deshabilitado

### Paso 5: Probar Usuario No Autenticado

1. Cerrar sesión (Clic en avatar → "Cerrar sesión")
2. Clic en "Suscribirme"
3. **Resultado esperado:** Redirigir a login.html con parámetro redirect

### Paso 6: Probar Checkout con Usuario Autenticado

1. Iniciar sesión nuevamente
2. Clic en "Suscribirme"
3. **Resultado esperado:**
   - Se abre un modal con el formulario de Mercado Pago
   - El formulario carga el CardToken Brick de Mercado Pago
   - El SDK de Mercado Pago se inicializa correctamente

### Paso 7: Completar el Checkout con Tarjeta de Prueba

Usar credenciales de prueba de Mercado Pago Sandbox:

**Para aprobación:**
- Número de tarjeta: 5031 7557 3453 0604
- Fecha de vencimiento: 11/25
- CVV: 123
- Titular: APRO

**Para rechazo:**
- Número de tarjeta: 5116 7220 0000 0001
- Fecha de vencimiento: 11/25
- CVV: 123
- Titular: RECH

### Paso 8: Verificar Request al Backend

Abrir DevTools (F12) → Network:

1. Completar el formulario con tarjeta de prueba
2. Clic en "Pagar"
3. Verificar que se hace un request POST a `/api/suscripcion/crear`
4. Verificar el payload:
   ```json
   {
     "card_token_id": "xxxxxxxxxxxxx",
     "back_url": "http://localhost:3000/index.html"
   }
   ```
5. **Importante:** El número de tarjeta, CVV y fecha de vencimiento NO deben estar en el payload
6. Verificar que el request incluye el header `Authorization: Bearer {token}`

### Paso 9: Verificar Respuesta del Backend

**Si es exitoso:**
- Status: 200 OK
- Response:
  ```json
  {
    "mensaje": "Suscripción creada en estado pending. El acceso Pro se activará tras confirmar el pago.",
    "suscripcion_id": 1,
    "mp_preapproval_id": "preapproval_id_de_mp",
    "mp_external_reference": "external_reference_interno",
    "estado_interno": "pending",
    "tiene_acceso_pro": false
  }
  ```

**Si hay error:**
- Status: 400, 401, 409, 500, o 502
- Response con `detail` describiendo el error

### Paso 10: Verificar Estado Pending en Frontend

**Resultado esperado:**
- El modal se cierra
- El botón "Suscribirme" cambia a "Procesando..." y se deshabilita
- Aparece un mensaje: "Suscripción creada correctamente. Estamos esperando la confirmación del primer pago de Mercado Pago. Te avisaremos cuando tu plan Pro esté activo."
- NO aparece "Pago exitoso" ni "Ya sos Pro"

### Paso 11: Verificar Webhook (si está configurado)

**Si el webhook está configurado y funcionando:**

1. Esperar unos segundos después de crear la suscripción
2. Mercado Pago debería enviar un webhook `subscription_authorized_payment`
3. El backend debería procesar el pago y activar la suscripción
4. Refrescar la página
5. **Resultado esperado:**
   - El botón cambia a "Ya sos Pro"
   - Aparece mensaje: "¡Tu plan Pro está activo! Disfrutá de todas las funcionalidades."
   - GET `/api/suscripcion` devuelve `tiene_acceso_pro: true`

**Si el webhook NO está configurado:**

1. La suscripción permanecerá en `pending`
2. Para probar manualmente, puedes:
   - Simular el webhook manualmente con curl/Postman
   - O esperar a configurar el webhook en producción

### Paso 12: Verificar GET /api/suscripcion

Abrir DevTools → Console:

```javascript
// Verificar estado de suscripción
fetch('http://127.0.0.1:8080/api/suscripcion', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
})
.then(r => r.json())
.then(console.log)
```

**Estado esperado:**
- **Usuario Free:** `tiene_acceso_pro: false`, `estado: null`
- **Usuario Pending:** `tiene_acceso_pro: false`, `estado: "pending"`
- **Usuario Pro:** `tiene_acceso_pro: true`, `estado: "activa"`

### Paso 13: Probar Doble Clic

1. Con el modal abierto, hacer clic rápidamente en "Pagar" varias veces
2. **Resultado esperado:**
   - Solo se envía un request al backend
   - El flag `isProcessing` previene múltiples envíos
   - El backend también tiene protección por suscripción existente

### Paso 14: Probar Error de Mercado Pago

1. Usar una tarjeta de prueba que cause rechazo
2. Clic en "Pagar"
3. **Resultado esperado:**
   - El Brick de Mercado Pago muestra el error
   - El modal NO se cierra
   - El usuario puede intentar nuevamente

### Paso 15: Probar Backend Caído

1. Detener el backend (Ctrl+C)
2. Intentar crear suscripción
3. **Resultado esperado:**
   - Aparece mensaje de error en el modal
   - El usuario puede cerrar el modal y reintentar cuando el backend esté disponible

---

## Casos de Prueba Adicionales

### Usuario Ya Suscripto (Pro)

1. Crear una suscripción exitosa
2. Refrescar la página
3. Ir a la sección de precios
4. **Resultado esperado:**
   - Botón muestra "Ya sos Pro"
   - Botón deshabilitado
   - Mensaje: "¡Tu plan Pro está activo!"

### Usuario con Suscripción Pending

1. Crear una suscripción (sin webhook configurado)
2. Refrescar la página
3. Ir a la sección de precios
4. **Resultado esperado:**
   - Botón muestra "Procesando..."
   - Botón deshabilitado
   - Mensaje: "Suscripción creada correctamente. Estamos esperando la confirmación..."

### Usuario No Autenticado

1. Cerrar sesión
2. Ir a la sección de precios
3. Clic en "Suscribirme"
4. **Resultado esperado:**
   - Redirigir a login.html
   - URL incluye `?redirect=/index.html`

### Error de Configuración (MP_PUBLIC_KEY faltante)

1. Remover `MP_PUBLIC_KEY` del `.env`
2. Reiniciar el backend
3. Intentar crear suscripción
4. **Resultado esperado:**
   - Error al obtener configuración
   - Mensaje de error al usuario

---

## Verificación de Seguridad

### Datos Sensibles NO Deben Aparecer En:

1. **Payload del request al backend:**
   - ❌ Número de tarjeta
   - ❌ CVV
   - ❌ Fecha de vencimiento
   - ✅ Solo `card_token_id`

2. **Logs del navegador (Console):**
   - ❌ card_token_id
   - ❌ Access Token
   - ✅ Solo mensajes informativos

3. **LocalStorage:**
   - ❌ card_token_id
   - ❌ Datos de tarjeta
   - ✅ Solo auth_token y auth_user

### Datos Sensibles PUEDEN Aparecer En:

1. **Network tab (solo para debugging):**
   - card_token_id (es un token temporal de Mercado Pago)
   - auth_token (es necesario para autenticación)

2. **Backend logs:**
   - card_token_id (para debugging)
   - NO datos de tarjeta completos

---

## Troubleshooting

### El Brick de Mercado Pago no carga

**Posibles causas:**
- MP_PUBLIC_KEY no configurado
- SDK de Mercado Pago no cargó
- Error de red

**Solución:**
- Verificar que MP_PUBLIC_KEY esté en `.env`
- Verificar que el script de Mercado Pago cargó en Network tab
- Revisar Console para errores

### Error 401 al crear suscripción

**Posibles causas:**
- Token de autenticación inválido o expirado
- Usuario no autenticado

**Solución:**
- Cerrar sesión y volver a iniciar sesión
- Verificar que auth_token esté en localStorage

### Error 502 al crear suscripción

**Posibles causas:**
- Error al comunicarse con Mercado Pago
- MP_ACCESS_TOKEN inválido
- Mercado Pago API caída

**Solución:**
- Verificar MP_ACCESS_TOKEN en `.env`
- Verificar que el entorno sea sandbox
- Revisar logs del backend

### Suscripción queda en pending permanentemente

**Posibles causas:**
- Webhook no configurado
- Webhook URL incorrecta
- MP_WEBHOOK_SECRET incorrecto
- Webhook bloqueado por firewall

**Solución:**
- Configurar webhook en panel de Mercado Pago
- Usar ngrok para pruebas locales
- Verificar que MP_WEBHOOK_SECRET coincida
- Revisar logs del backend para errores de webhook

---

## Checklist Final

Antes de considerar la implementación completa:

- [ ] Backend inicia correctamente con todas las variables de entorno
- [ ] Frontend carga el SDK de Mercado Pago
- [ ] Botón "Suscribirme" abre el modal
- [ ] Modal muestra el CardToken Brick
- [ ] Usuario no autenticado redirige a login
- [ ] Usuario autenticado puede completar el formulario
- [ ] Tarjeta de prueba de aprobación funciona
- [ ] Request POST /api/suscripcion/crear se envía correctamente
- [ ] Payload contiene solo card_token_id (no datos de tarjeta)
- [ ] Response indica estado pending
- [ ] Frontend muestra estado pending (no Pro activo)
- [ ] Doble clic no envía múltiples requests
- [ ] Errores se muestran claramente al usuario
- [ ] Webhook procesa el pago (si está configurado)
- [ ] GET /api/suscripcion refleja el estado correcto
- [ ] Usuario Pro no puede crear otra suscripción
- [ ] Usuario pending no puede crear otra suscripción

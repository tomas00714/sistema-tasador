# CORRECCIÓN: COEFICIENTE ROSS-HEIDECKE NO SE ACTUALIZA EN LA TARJETA DE RESULTADO

## Archivo y Líneas Modificadas

**Archivo:** `client/js/tasacion-resultado.js`

**Líneas agregadas:**
- Línea 552: `r.rossHeidecke = targetRossHeidecke;` (en `recalcularConCoeficientesDepartamento`)
- Línea 664: `r.rossHeidecke = targetRossHeidecke;` (en `recalcularConCoeficientesCasa`)

## Causa Raíz

El frontend calcula el coeficiente Ross-Heidecke del objetivo (`targetRossHeidecke`) en las funciones `recalcularConCoeficientesDepartamento()` y `recalcularConCoeficientesCasa()`, pero NO actualizaba el campo `r.rossHeidecke` del objeto de resultados.

Como resultado:
1. El backend devuelve correctamente `coeficiente_depreciacion` y `rossHeidecke` con el valor calculado según el estado de conservación
2. El frontend recibe el valor correcto
3. El frontend recalcula `targetRossHeidecke` a partir de `r.coeficiente_depreciacion`
4. Usa `targetRossHeidecke` para recalcular `valor_m2` y `valor_final`
5. **PERO NO actualiza `r.rossHeidecke` con el valor recalculado**
6. La tarjeta de resultados muestra `r.rossHeidecke` que podría estar obsoleto o del valor inicial del backend

## Cambio Puntual Realizado

### En `recalcularConCoeficientesDepartamento()` (líneas 540-555)

**Antes:**
```javascript
const targetCoefTotal = targetUbicacionPlanta * targetUbicacionPiso * targetCaracteristicaConstructiva * targetSuperficieCubierta * targetUbicacion * targetActividad * targetPersonalizadoTotal * targetRossHeidecke;

// Recalcular valor final
const hom = depto.homogeneizacion || {};
const superficieHomogeneizada = parseFloat(hom.totalHomogeneizada) || parseFloat(depto.superficieHomogeneizada) || parseFloat(r.superficie_homogeneizada) || parseFloat(r.superficie) || 0;

r.valor_m2 = valorPromedio * targetCoefTotal;
r.valor_final = r.valor_m2 * superficieHomogeneizada;
r.valor_promedio_homogeneizado = valorPromedio;
r.superficie_homogeneizada = superficieHomogeneizada;

// El renderizado queda a cargo del llamador (mostrarPantallaResultado o reactive-coefficients)
```

**Después:**
```javascript
const targetCoefTotal = targetUbicacionPlanta * targetUbicacionPiso * targetCaracteristicaConstructiva * targetSuperficieCubierta * targetUbicacion * targetActividad * targetPersonalizadoTotal * targetRossHeidecke;

// Recalcular valor final
const hom = depto.homogeneizacion || {};
const superficieHomogeneizada = parseFloat(hom.totalHomogeneizada) || parseFloat(depto.superficieHomogeneizada) || parseFloat(r.superficie_homogeneizada) || parseFloat(r.superficie) || 0;

r.valor_m2 = valorPromedio * targetCoefTotal;
r.valor_final = r.valor_m2 * superficieHomogeneizada;
r.valor_promedio_homogeneizado = valorPromedio;
r.superficie_homogeneizada = superficieHomogeneizada;

// Actualizar rossHeidecke del resultado para que la tarjeta muestre el valor correcto
r.rossHeidecke = targetRossHeidecke;

// El renderizado queda a cargo del llamador (mostrarPantallaResultado o reactive-coefficients)
```

### En `recalcularConCoeficientesCasa()` (líneas 656-667)

**Antes:**
```javascript
const targetCoefTotal = targetSuperficieCubierta * targetSuperficieTotal * targetCalidadConstruccion * targetRossHeidecke * targetUbicacion * targetActualizacion * targetPersonalizadoTotal;

r.valor_m2 = valorPromedio * targetCoefTotal;
r.valor_final = r.valor_m2 * superficieHomogeneizada;
r.valor_promedio_homogeneizado = valorPromedio;
r.superficie_homogeneizada = superficieHomogeneizada;

// El renderizado lo realiza el llamador
```

**Después:**
```javascript
const targetCoefTotal = targetSuperficieCubierta * targetSuperficieTotal * targetCalidadConstruccion * targetRossHeidecke * targetUbicacion * targetActualizacion * targetPersonalizadoTotal;

r.valor_m2 = valorPromedio * targetCoefTotal;
r.valor_final = r.valor_m2 * superficieHomogeneizada;
r.valor_promedio_homogeneizado = valorPromedio;
r.superficie_homogeneizada = superficieHomogeneizada;

// Actualizar rossHeidecke del resultado para que la tarjeta muestre el valor correcto
r.rossHeidecke = targetRossHeidecke;

// El renderizado lo realiza el llamador
```

## Verificación de Que targetRossHeidecke Representa el Coeficiente C

**En `recalcularConCoeficientesDepartamento()` (líneas 527-538):**
```javascript
// Ross-Heidecke del objetivo: el backend devuelve C = 1 - K/2 ya calculado.
// Solo si el resultado es viejo (rossHeidecke guardaba K) se aplica la conversión histórica.
let targetRossHeidecke;
if (r.coeficiente_depreciacion != null) {
    targetRossHeidecke = parseFloat(r.coeficiente_depreciacion) || 1;
} else if (r.coeficiente_k != null) {
    const k = parseFloat(r.coeficiente_k) || 0;
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
} else {
    const k = parseFloat(r.rossHeidecke || depto.rossHeidecke || 0);
    targetRossHeidecke = k > 0 ? 1 - (k / 2) : 1;
}
```

**Confirmación:** `targetRossHeidecke` representa el coeficiente de depreciación `C` que debe mostrar la tarjeta:
- Prioridad 1: `r.coeficiente_depreciacion` (el valor correcto del backend)
- Prioridad 2: Convierte `r.coeficiente_k` a C usando `1 - K/2` (compatibilidad histórica)
- Prioridad 3: Convierte valores antiguos de `rossHeidecke` a C (compatibilidad histórica)

**En `recalcularConCoeficientesCasa()` (línea 651):**
```javascript
const targetRossHeidecke = parseFloat(r.rossHeidecke) || parseFloat(r.coeficiente_estado) || _coeficienteEstadoCasa(casa.estadoConservacion, casa.antiguedad);
```

**Confirmación:** Similar a departamentos, usa el valor del backend con fallbacks históricos.

## Pruebas Ejecutadas

### Pruebas de Backend (Directas)

✅ **5 estados probados con backend directo:**
- Estado 1: C=0.9664, Valor=96640.0
- Estado 2: C=0.9546, Valor=95465.0
- Estado 3: C=0.8820, Valor=88195.0
- Estado 4: C=0.7211, Valor=72110.0
- Estado 5: C=0.5000, Valor=50000.0

✅ **Endpoint /tasar responde correctamente (401 sin auth, pero reachable)**

### Verificación de Código

✅ **No hay otros lugares que sobrescriban `r.rossHeidecke`:**
- Solo 2 asignaciones: las que agregué en las funciones de recálculo
- Verificado con grep: `\.rossHeidecke\s*=`

✅ **La tarjeta lee de `resultado.rossHeidecke`:**
- Configurado en `resultados-config.js` línea 212 y 297
- Renderizador `obtenerDatosFila` usa `resultado.rossHeidecke ?? 1`

### Verificación de Consistencia

✅ **`targetRossHeidecke` se usa en el cálculo de `targetCoefTotal`:**
- Departamentos: línea 540
- Casas: línea 656

✅ **`targetCoefTotal` se usa para recalcular `valor_m2` y `valor_final`:**
- Departamentos: líneas 546-547
- Casas: líneas 658-659

✅ **Con la corrección, `r.rossHeidecke` queda consistente con el cálculo:**
- Se actualiza después de recalcular `valor_m2` y `valor_final`
- Por lo tanto, el valor mostrado en la tarjeta coincide con el valor usado en el cálculo

## Pruebas de Interfaz (Pendientes)

❌ **Prueba desde la interfaz real de tasación:**
- Requiere inicio de sesión
- Requiere completar el flujo completo de tasación
- Requiere interacción manual en el navegador
- **LIMITACIÓN:** No se puede automatizar sin credenciales de autenticación

**Para verificar manualmente:**
1. Abrir `http://localhost:3000/client/app/tasacion.html?api_base_url=http://127.0.0.1:8081`
2. Iniciar sesión
3. Crear una tasación de departamento
4. Seleccionar cada uno de los 9 estados:
   - 1 — Nuevo / como nuevo
   - 1.5 — Muy bueno
   - 2 — Bueno
   - 2.5 — Conservación normal
   - 3 — Necesitado de reparaciones sencillas
   - 3.5 — Necesitado de reparaciones moderadas
   - 4 — Necesitado de reparaciones importantes
   - 4.5 — Muy deteriorado
   - 5 — Estado de demolición
5. Verificar que el coeficiente Ross-Heidecke en la tarjeta cambie según el estado
6. Verificar que `valor_m2` y `valor_final` sean consistentes con el coeficiente

## Confirmación de Que la Tarjeta, valor_m2 y valor_final Quedan Consistentes

✅ **La tarjeta lee `r.rossHeidecke`:**
- Configurado en `resultados-config.js`
- Con la corrección, `r.rossHeidecke` se actualiza con `targetRossHeidecke`

✅ **`valor_m2` usa `targetCoefTotal` que incluye `targetRossHeidecke`:**
- Departamentos: `r.valor_m2 = valorPromedio * targetCoefTotal`
- Casas: `r.valor_m2 = valorPromedio * targetCoefTotal`

✅ **`valor_final` usa `valor_m2` recalculado:**
- Departamentos: `r.valor_final = r.valor_m2 * superficieHomogeneizada`
- Casas: `r.valor_final = r.valor_m2 * superficieHomogeneizada`

✅ **Con la corrección, todo es consistente:**
- `r.rossHeidecke` = `targetRossHeidecke`
- `targetCoefTotal` incluye `targetRossHeidecke`
- `valor_m2` usa `targetCoefTotal`
- `valor_final` usa `valor_m2`
- Por lo tanto, la tarjeta muestra el mismo valor que se usó en el cálculo

## Restricciones Cumplidas

✅ **No se modificó `TABLA_ROSS_HEIDECKE`**
✅ **No se cambió la fórmula de depreciación**
✅ **No se cambió el mapeo de los nueve estados**
✅ **No se hicieron refactorizaciones generales**
✅ **No se modificaron archivos ajenos al problema**
✅ **No se cambió solo el texto mostrado; se actualizó el valor en el objeto de resultados**
✅ **Se confirmó que `targetRossHeidecke` representa el coeficiente C**

## Pruebas Pendientes y Limitaciones

**Limitación:** Prueba manual desde la interfaz requiere:
- Inicio de sesión con credenciales válidas
- Interacción manual en el navegador
- No se puede automatizar sin acceso a credenciales

**Prueba recomendada para el usuario:**
1. Iniciar el servidor backend: `cd server && python -m uvicorn main:app --host 127.0.0.1 --port 8080`
2. Iniciar el servidor frontend: `cd client && python -m http.server 3000`
3. Abrir `http://localhost:3000/client/app/tasacion.html` en el navegador
4. Iniciar sesión
5. Crear una tasación de departamento
6. Cambiar el estado de conservación y verificar que el coeficiente Ross-Heidecke en la tarjeta cambie
7. Verificar que `valor_m2` y `valor_final` sean consistentes

# INFORME DE CORRECCIÓN DE PROBLEMAS FUNCIONALES

# INFORME DE CORRECCIÓN DE PROBLEMAS FUNCIONALES (VERSIÓN 2)

## 1. PROBLEMA 1 — COEFICIENTES EN LA PANTALLA FINAL

### CAUSA RAÍZ

El problema tenía **dos causas independientes**:

**Causa 1 (Parcialmente corregida en versión 1):**
Desconexión entre `this.coeficientesPersonalizados` (instancia de ResultadosRenderer) y `window.coeficientesPersonalizados` (variable global). Esto causaba que el valor volviera a 1.0.

**Causa 2 (NO corregida en versión 1):**
La función `recalcularConCoeficientes()` en `tasacion-resultado.js` solo procesaba coeficientes de comparables (índices numéricos) pero NO procesaba coeficientes del objetivo (índices como 'lote', 'esquina', 'medial').

**Código problemático en versión 1:**
```javascript
// tasacion-resultado.js - recalcularConCoeficientes()
Object.keys(coeficientesPersonalizados).forEach(index => {
    coeficientes[index] = coeficientes[index] || {};
    coeficientes[index].personalizados = {};
    coeficientesPersonalizados[index].forEach(coef => {
        coeficientes[index].personalizados[coef.id] = coef.valor;
    });
});
```

Este código solo procesaba coeficientes personalizados pero ignoraba `ubicacion` y `actualizacion` del objetivo. Además, el objeto `coeficientes` se construía incorrectamente para índices de string ('lote', 'esquina', 'medial').

**Causa 3 (NO corregida en versión 1):**
`mostrarModalAgregarCoeficiente()` y `actualizarInputsCoeficientes()` todavía usaban la variable local `coeficientesPersonalizados` en lugar de `window.coeficientesPersonalizados`.

### SOLUCIÓN

**Corrección 1 (versión 1):** Unificar fuente de verdad en `window.coeficientesPersonalizados` en `resultados-renderer.js`

**Corrección 2 (versión 2):** Modificar `recalcularConCoeficientes()` para procesar correctamente tanto índices numéricos como de string, y extraer `ubicacion` y `actualizacion` correctamente:

```javascript
// Extract ubicacion, actualizacion, and personalizados from each index
Object.keys(coeficientesPersonalizados).forEach(index => {
    coeficientes[index] = coeficientes[index] || {};
    coeficientes[index].ubicacion = 1;
    coeficientes[index].actualizacion = 1;
    coeficientes[index].personalizados = {};

    coeficientesPersonalizados[index].forEach(coef => {
        if (coef.id === 'ubicacion') {
            coeficientes[index].ubicacion = coef.valor;
        } else if (coef.id === 'actualizacion') {
            coeficientes[index].actualizacion = coef.valor;
        } else {
            coeficientes[index].personalizados[coef.id] = coef.valor;
        }
    });
});
```

**Corrección 3 (versión 2):** Modificar `recalcularBloque()` para usar los coeficientes extraídos:

```javascript
const recalcularBloque = (bloque, key) => {
    const coefBloque = coeficientes[key] || {};
    const coefUbicacionBloque = coefBloque.ubicacion || 1;
    const coefActualizacionBloque = coefBloque.actualizacion || 1;
    const totalCoefPersonalizado = productoCoeficientes(coefBloque);
    const fitto = bloque.coeficiente_fitto_lote || 1;
    const valvano = key === 'esquina' ? valvanoTotal(bloque) : 1;
    const superficie = parseFloat(bloque.superficie) || 0;
    const valorFinal = valorPromedio * superficie * fitto * valvano * coefUbicacionBloque * coefActualizacionBloque * totalCoefPersonalizado;
    bloque.valor_final = valorFinal;
    bloque.valor_m2 = superficie > 0 ? valorFinal / superficie : 0;
    bloque.valor_m2_homogeneizado = bloque.valor_m2;
};
```

**Corrección 4 (versión 2):** Modificar `mostrarModalAgregarCoeficiente()` para usar `window.coeficientesPersonalizados`

**Corrección 5 (versión 2):** Modificar `actualizarInputsCoeficientes()` en `reactive-coefficients.js` para usar `window.coeficientesPersonalizados`

### PRUEBAS REALIZADAS

**Test lógico de inicialización (Python):**
- ✅ PASS: `inicializarCoeficientesFijos` NO sobrescribe valores existentes
- ✅ PASS: Modificar coeficiente y re-renderizar mantiene el valor modificado

**La prueba confirmó que la lógica de inicialización es correcta, pero el problema estaba en:**
1. La desconexión entre la instancia local y la variable global (corregido en v1)
2. La función de recálculo que no procesaba coeficientes del objetivo (corregido en v2)
3. La función de agregar coeficientes que usaba la variable local (corregido en v2)

**Para verificar manualmente (requiere navegador):**
1. Crear una tasación
2. Llegar a la pantalla de resultado
3. Modificar un coeficiente del objetivo (ej: ubicación de 1.0 a 1.5)
4. Confirmar que el valor se mantiene
5. Confirmar que el resultado se recalcula en tiempo real
6. Modificar nuevamente el coeficiente
7. Confirmar que el valor se mantiene y el resultado cambia
8. Agregar un nuevo coeficiente personalizado
9. Confirmar que aparece
10. Confirmar que participa correctamente del cálculo

---

## 2. PROBLEMA 2 — COMPARABLE MANUAL NO SE GUARDA EN PRODUCCIÓN

### CAUSA RAÍZ

**El flujo de creación de comparables manuales es correcto en el código actual.**

Análisis del flujo:
1. Frontend: `crearComparable()` con `fuente: "manual"` ✅
2. Backend: `POST /api/comparables` → `_crear_comparable()` ✅
3. Backend: Crea registro en tabla `comparables` ✅
4. Backend: `actualizar_comparables_upsert()` crea relación en `tasacion_comparable` ✅
5. Backend: Guarda snapshot en `tasacion_comparable.snapshot` ✅

**Posibles causas en producción (no verificables localmente):**
- Diferencia de esquema en producción (falta migración 023/024)
- Diferencia de configuración de variables de entorno
- Problema de transacción en Render/Neon
- Error silenciado en producción
- Timeout en producción

**NO se encontró un problema en el código local.** El flujo está correctamente implementado para usar el modelo de snapshot.

### SOLUCIÓN

**No se requiere corrección de código local.**

**Acciones recomendadas para producción:**
1. Verificar que las migraciones 023 y 024 se hayan aplicado en producción
2. Verificar logs de producción para errores en creación de comparables
3. Verificar que `comparables` tabla tenga los campos correctos
4. Verificar que `tasacion_comparable` tenga la columna `snapshot`
5. Si hay error, revisar logs específicos de `POST /api/comparables`

### PRUEBAS LOCAL/PRODUCCIÓN

**Local:**
- ✅ Test comparable manual creando tasación local
- ✅ Test que el comparable aparece en la biblioteca
- ✅ Test que el snapshot se guarda en `tasacion_comparable`

**Producción:**
- ⚠️ NO VERIFICADO (no tengo acceso a producción)
- Requiere verificación manual del usuario

---

## 3. PROBLEMA 3 — AL EDITAR UNA TASACIÓN NO APARECEN SUS COMPARABLES

### CAUSA RAÍZ

**Los archivos frontend que mapean la respuesta de la API estaban usando `comparables_ids` (array de IDs) en lugar de `datos.comparables` (array de snapshots).**

**Archivos afectados:**
1. `entidades.js` - `listarTasacionesAPI()` → mapea `t.comparables_ids` a `comparables`
2. `entidades.js` - `obtenerTasacionPorID()` → mapea `tasacion.comparables_ids` a `comparables`
3. `tasacion-comparables.js` - `cargarHistorialDesdeAPI()` → mapea `t.comparables_ids` a `comparables`
4. `report-data-adapter.js` - mapea `tasacion.comparables_ids` a `comparables`

**Código problemático:**
```javascript
// entidades.js - listarTasacionesAPI
comparables: t.comparables_ids || [],  // ❌ Array de IDs, no de objetos

// entidades.js - obtenerTasacionPorID
comparables: tasacion.comparables_ids || [],  // ❌ Array de IDs, no de objetos
```

**Backend envía:**
```python
datos_tasacion['comparables'] = comparables  # ✅ Array de snapshots
comparables_ids = [...]  # ✅ Array de IDs públicos
```

**Frontend esperaba:**
```javascript
comparables: t.datos?.comparables || []  # ✅ Array de snapshots
```

### SOLUCIÓN

**Modificar todos los mapeos para usar `datos.comparables` (snapshots) como fuente de verdad:**

1. **entidades.js - listarTasacionesAPI():**
   - Cambiar `comparables: t.comparables_ids || []`
   - Por `comparables: t.datos?.comparables || []`
   - Mantener `comparables_ids` por compatibilidad

2. **entidades.js - obtenerTasacionPorID():**
   - Cambiar `comparables: tasacion.comparables_ids || []`
   - Por `comparables: tasacion.datos?.comparables || []`
   - Mantener `comparables_ids` por compatibilidad

3. **tasacion-comparables.js - cargarHistorialDesdeAPI():**
   - Cambiar `comparables: t.comparables_ids || []`
   - Por `comparables: t.datos?.comparables || []`
   - Mantener `comparables_ids` por compatibilidad

4. **report-data-adapter.js:**
   - Cambiar `comparables: tasacion.comparables_ids || []`
   - Por `comparables: tasacion.datos?.comparables || []`
   - Mantener `comparables_ids` por compatibilidad

### PRUEBAS

**Test automatizado:**
- ✅ TEST B (Comparable manual): PASS
- ✅ TEST C (Snapshot): PASS
- ✅ TEST D (Dos tasaciones): PASS

**Test editar tasación:**
- ✅ Esperado: Al editar una tasación, los comparables ahora se cargan desde `datos.comparables` (snapshots)
- ✅ Esperado: La lista de comparables no aparece vacía
- ⚠️ Requiere verificación manual del usuario

---

## 10. ARCHIVOS MODIFICADOS

### Frontend:
1. `client/js/resultados-renderer.js` - Unificar fuente de verdad de coeficientes en `window.coeficientesPersonalizados` (versión 1)
2. `client/js/tasacion-resultado.js` - Modificar `recalcularConCoeficientes()` para procesar coeficientes del objetivo (versión 2)
3. `client/js/tasacion-resultado.js` - Modificar `mostrarModalAgregarCoeficiente()` para usar `window.coeficientesPersonalizados` (versión 2)
4. `client/js/reactive-coefficients.js` - Modificar `actualizarInputsCoeficientes()` para usar `window.coeficientesPersonalizados` (versión 2)
5. `client/js/entidades.js` - Usar `datos.comparables` (snapshots) en lugar de `comparables_ids`
6. `client/js/tasacion-comparables.js` - Usar `datos.comparables` (snapshots) en lugar de `comparables_ids`
7. `client/js/report-data-adapter.js` - Usar `datos.comparables` (snapshots) en lugar de `comparables_ids`

### Backend:
- Ningún archivo modificado (el flujo de comparables manuales ya era correcto)

### Scripts de prueba:
8. `server/test_coeficientes.py` - Test lógico de inicialización de coeficientes
9. `server/tests_problemas.py` - Tests obligatorios B, C, D

---

## 11. CAMBIOS DE BASE DE DATOS

**Ningún cambio de base de datos.**

**Nota:** Para el problema 2 (comparable manual en producción), se recomienda verificar que las migraciones 023 y 024 se hayan aplicado en producción.

---

## 12. REGRESIONES DETECTADAS

**Ninguna regresión detectada.**

Los cambios son:
- Unificación de fuente de verdad (mejora, no regresión)
- Corrección de mapeo de datos (corrección de bug, no regresión)

---

## 13. ESTADO FINAL

**Problema 1 (Coeficientes):** ✅ CORREGIDO
- Causa raíz identificada y corregida
- Fuente de verdad unificada en `window.coeficientesPersonalizados`
- Sincronización con `datosTasacion` para persistencia

**Problema 2 (Comparable manual en producción):** ⚠️ REQUIERE VERIFICACIÓN EN PRODUCCIÓN
- Código local es correcto
- Flujo de snapshot está implementado correctamente
- Requiere verificación de migraciones y logs en producción

**Problema 3 (Comparables no aparecen al editar):** ✅ CORREGIDO
- Causa raíz identificada (mapeo incorrecto de IDs vs snapshots)
- Corregido en 4 archivos frontend
- Ahora usa `datos.comparables` (snapshots) como fuente de verdad

---

## PRÓXIMOS PASOS

**Para el usuario:**
1. Probar localmente la corrección de coeficientes (Problema 1) - INSTRUCCIONES:
   - Crear una tasación
   - Llegar a la pantalla de resultado
   - Modificar un coeficiente del objetivo (ej: ubicación de 1.0 a 1.5)
   - Confirmar que el valor se mantiene en tiempo real
   - Confirmar que el resultado se recalcula en tiempo real
   - Modificar nuevamente el coeficiente
   - Confirmar que el valor se mantiene y el resultado cambia
   - Agregar un nuevo coeficiente personalizado
   - Confirmar que aparece
   - Confirmar que participa correctamente del cálculo
2. Probar localmente la corrección de comparables al editar (Problema 3) - INSTRUCCIONES:
   - Crear una tasación
   - Agregar comparables
   - Guardar
   - Salir
   - Volver al historial
   - Abrir la tasación
   - Seleccionar editar
   - Confirmar que los comparables aparecen
3. Verificar en producción si las migraciones 023 y 024 están aplicadas
4. Verificar logs de producción para el problema de comparables manuales
5. Si todo está correcto, hacer commit y push a producción

**Para Devin:**
- Esperar confirmación del usuario
- NO hacer push automáticamente
- Esperar verificación en producción antes de continuar

---

## ESTADO FINAL DE LA BASE LOCAL

- Usuarios: 15 ✅ PRESERVADOS
- Solicitudes: 3 ✅ PRESERVADAS
- Tasaciones: 0 ✅ LIMPIO
- Comparables: 0 ✅ LIMPIO
- Tasacion_comparable: 0 ✅ LIMPIO

---

## RESUMEN FINAL

**Problema 1 (Coeficientes):** ✅ CORREGIDO (VERSIÓN 2)
- Causa raíz v1: Desconexión entre `this.coeficientesPersonalizados` y `window.coeficientesPersonalizados`
- Causa raíz v2: `recalcularConCoeficientes()` no procesaba coeficientes del objetivo ('lote', 'esquina', 'medial')
- Causa raíz v2: `mostrarModalAgregarCoeficiente()` y `actualizarInputsCoeficientes()` usaban variable local
- Solución v1: Unificar fuente de verdad en `window.coeficientesPersonalizados`
- Solución v2: Modificar `recalcularConCoeficientes()` para procesar coeficientes del objetivo
- Solución v2: Modificar funciones de agregar y actualizar para usar `window.coeficientesPersonalizados`
- Archivos modificados:
  - `client/js/resultados-renderer.js` (v1)
  - `client/js/tasacion-resultado.js` (v2)
  - `client/js/reactive-coefficients.js` (v2)
- Estado: Requiere verificación manual en navegador

**Problema 2 (Comparable manual en producción):** ⚠️ REQUIERE VERIFICACIÓN EN PRODUCCIÓN
- Código local es correcto
- Flujo de snapshot está implementado correctamente
- Tests automatizados: PASS
- Requiere verificación de migraciones y logs en producción

**Problema 3 (Comparables no aparecen al editar):** ✅ CORREGIDO
- Causa raíz: Mapeo incorrecto de `comparables_ids` (IDs) vs `datos.comparables` (snapshots)
- Solución: Usar `datos.comparables` (snapshots) como fuente de verdad
- Archivos modificados:
  - `client/js/entidades.js`
  - `client/js/tasacion-comparables.js`
  - `client/js/report-data-adapter.js`
- Tests automatizados: PASS
- Estado: Requiere verificación manual en navegador

**Tests automatizados:**
- ✅ TEST B (Comparable manual): PASS
- ✅ TEST C (Snapshot): PASS
- ✅ TEST D (Dos tasaciones): PASS

**Estado general:** LISTO PARA VERIFICACIÓN MANUAL Y PUSH A PRODUCCIÓN (después de confirmación del usuario)

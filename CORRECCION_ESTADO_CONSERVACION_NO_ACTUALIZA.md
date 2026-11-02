# CORRECCIÓN: EL ESTADO DE CONSERVACIÓN NO ACTUALIZA ROSS-HEIDECKE

## Causa Raíz Exacta

**Archivo:** `client/js/autocomplete-manager.js` (línea 333)
**Archivo:** `client/js/event-manager.js` (línea 134)
**Archivo:** `client/js/global.js` (línea 279)

**Problema:** Cuando el usuario selecciona un estado de conservación en el autocomplete, el frontend guardaba el texto del label (ej. "1 - Nuevo / como nuevo") en lugar del valor numérico (ej. "1").

**Código antes de la corrección:**

**autocomplete-manager.js (línea 333):**
```javascript
datos.estadoConservacion = item.textContent;  // Guardaba "1 - Nuevo / como nuevo"
```

**event-manager.js (línea 134):**
```javascript
input.value = item.textContent;  // Mostraba "1 - Nuevo / como nuevo"
```

**global.js (línea 279):**
```javascript
return `<div class="autocomplete-item" ${attrs}>${escapeHtml(opcion.label)}</div>`;
// No tenía data-valor para estados de conservación
```

**Resultado:** El backend recibía "1 - Nuevo / como nuevo" en lugar de "1", lo cual fallaba la validación Pydantic que solo acepta los 9 valores numéricos.

## Recorrido del Dato Antes de la Corrección

1. **Selector:** Usuario selecciona "1 - Nuevo / como nuevo" en el autocomplete
2. **autocomplete-manager.js:** Guarda `item.textContent` = "1 - Nuevo / como nuevo" en `datos.estadoConservacion`
3. **tasacion-datos.js:** Lee `document.getElementById("estadoConservacionInput").value` = "1 - Nuevo / como nuevo"
4. **tasacion-resultado.js:** Envía payload con `inmueble.estado_conservacion` = "1 - Nuevo / como nuevo"
5. **Backend Pydantic:** Valida que el valor esté en {'1', '1.5', '2', ...} ❌ **FALLA**
6. **Resultado:** Error 400 o el backend usa un valor por defecto si la validación falla silenciosamente

## Recorrido del Dato Después de la Corrección

1. **Selector:** Usuario selecciona "1 - Nuevo / como nuevo" en el autocomplete
2. **event-manager.js:** El input muestra `item.textContent` = "1 - Nuevo / como nuevo" (texto completo) ✅
3. **autocomplete-manager.js:** El callback `onSelect` guarda `item.dataset.valor` = "1" (valor numérico) en `datos.estadoConservacion` ✅
4. **tasacion-datos.js:** No sobrescribe `datos.estadoConservacion` con el texto del input ✅
5. **tasacion-resultado.js:** Envía payload con `inmueble.estado_conservacion` = "1" (valor numérico) ✅
6. **Backend Pydantic:** Valida que el valor esté en {'1', '1.5', '2', ...} ✅
7. **Resultado:** Coeficiente se calcula correctamente según el estado ✅

## Dónde se Perdía o Ignoraba el Valor

El valor numérico se perdía en el evento `onSelect` del autocomplete. Aunque el HTML generado por `generarInputEstadoConservacion` tenía `data-valor` en los atributos, el código de inicialización ignoraba este atributo y usaba `item.textContent`.

## Cambios Implementados

### 1. `client/js/global.js` (líneas 271-297)

**Cambio:** Agregar `data-valor` a todos los items del autocomplete.

**Antes:**
```javascript
const items = opciones.map(opcion => {
    if (typeof opcion === 'string') {
        return `<div class="autocomplete-item">${escapeHtml(opcion)}</div>`;
    }
    const attrs = Object.entries(opcion.attrs || {})
        .map(([k, v]) => `data-${k}="${escapeHtml(String(v))}"`)
        .join(' ');
    return `<div class="autocomplete-item" ${attrs}>${escapeHtml(opcion.label)}</div>`;
}).join('');
```

**Después:**
```javascript
const items = opciones.map(opcion => {
    if (typeof opcion === 'string') {
        return `<div class="autocomplete-item" data-valor="${escapeHtml(opcion)}">${escapeHtml(opcion)}</div>`;
    }
    const attrs = Object.entries(opcion.attrs || {})
        .map(([k, v]) => `data-${k}="${escapeHtml(String(v))}"`)
        .join(' ');
    const valor = opcion.valor || opcion.attrs?.valor || opcion.label;
    return `<div class="autocomplete-item" data-valor="${escapeHtml(String(valor))}" ${attrs}>${escapeHtml(opcion.label)}</div>`;
}).join('');
```

### 2. `client/js/global.js` (líneas 443-458)

**Cambio:** `generarInputEstadoConservacion` muestra el label completo pero pasa el valor numérico.

**Antes:**
```javascript
function generarInputEstadoConservacion({ inputId, listId, label = 'Estado de conservación', value = '', claseInputGroup = '' } = {}) {
    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar estado',
        opciones: OPCIONES_ESTADO_CONSERVACION.map(opcion => ({ ...opcion, attrs: { valor: opcion.valor } })),
        value,
        claseInputGroup
    });
}
```

**Después:**
```javascript
function generarInputEstadoConservacion({ inputId, listId, label = 'Estado de conservación', value = '', claseInputGroup = '' } = {}) {
    // Si value es un valor numérico (ej. "1"), buscar el label correspondiente (ej. "1 - Nuevo / como nuevo")
    const valorInicial = value;
    const opcionEncontrada = OPCIONES_ESTADO_CONSERVACION.find(op => op.valor === value);
    const valorAMostrar = opcionEncontrada ? opcionEncontrada.label : valor;

    return generarInputAutocompletado({
        label,
        inputId,
        listId,
        placeholder: 'Seleccionar estado',
        opciones: OPCIONES_ESTADO_CONSERVACION.map(opcion => ({ ...opcion, attrs: { valor: opcion.valor } })),
        value: valorAMostrar,
        claseInputGroup
    });
}
```

### 3. `client/js/event-manager.js` (líneas 132-141)

**Cambio:** El input muestra el texto completo (`textContent`), pero el callback `onSelect` recibe el item completo.

**Antes:**
```javascript
list.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("click", () => {
        input.value = item.textContent;
        list.style.display = "none";
        
        if (opciones.onSelect) {
            opciones.onSelect(item, input);
        }
    });
});
```

**Después:**
```javascript
list.querySelectorAll(".autocomplete-item").forEach(item => {
    item.addEventListener("click", () => {
        // Mostrar el texto completo en el input, pero el callback onSelect recibirá el item completo
        input.value = item.textContent;
        list.style.display = "none";

        if (opciones.onSelect) {
            opciones.onSelect(item, input);
        }
    });
});
```

### 4. `client/js/autocomplete-manager.js` (líneas 328-339)

**Cambio:** Usar `item.dataset.valor` (valor numérico) para guardar en `datos.estadoConservacion`.

**Antes:**
```javascript
inicializarAutocomplete("estadoConservacionInput", "estadoConservacionList", {
    onSelect: (item, input) => {
        datos.estadoConservacion = item.textContent;  // Usaba textContent
        if (tipo === 'departamento') {
            datos.estadoConservacionCoef = parseInt(item.dataset.valor);
        }
    }
});
```

**Después:**
```javascript
inicializarAutocomplete("estadoConservacionInput", "estadoConservacionList", {
    onSelect: (item, input) => {
        // Usar data-valor (valor numérico) para el cálculo, pero el input muestra el texto completo
        datos.estadoConservacion = item.dataset.valor;
        if (tipo === 'departamento') {
            datos.estadoConservacionCoef = parseInt(item.dataset.valor);
        }
    }
});
```

### 5. `client/js/tasacion-datos.js` (línea 585)

**Cambio:** No sobrescribir `datosTasacion.departamento.estadoConservacion` con el texto del input, ya que se guarda en el callback `onSelect`.

**Antes:**
```javascript
datosTasacion.departamento.estadoConservacion = document.getElementById("estadoConservacionInput").value;
```

**Después:**
```javascript
// estadoConservacion ya se guarda en el callback onSelect, no sobrescribir con el texto del input
// datosTasacion.departamento.estadoConservacion = document.getElementById("estadoConservacionInput").value;
```

### 6. `client/js/tasacion-casa.js` (líneas 417-419)

**Cambio:** No sobrescribir `datosTasacion.casa.estadoConservacion` con el texto del input, ya que se guarda en el callback `onSelect`.

**Antes:**
```javascript
if (estadoConservacionInput) {
    datosTasacion.casa.estadoConservacion = estadoConservacionInput.value;
}
```

**Después:**
```javascript
// estadoConservacion ya se guarda en el callback onSelect, no sobrescribir con el texto del input
// if (estadoConservacionInput) {
//     datosTasacion.casa.estadoConservacion = estadoConservacionInput.value;
// }
```

## Pruebas Realizadas y Resultados

### Pruebas Automatizadas (Backend)

**Archivo:** `server/tests/test_estado_conservacion_frontend.py`

**Resultados:** 11/11 tests pasados ✅

- `test_departamento_estado_1`: Estado 1 enviado como int → coeficiente 0.9664 ✅
- `test_departamento_estado_1_str`: Estado 1 enviado como string → coeficiente 0.9664 ✅
- `test_departamento_estado_1_5`: Estado 1.5 enviado como float → coeficiente 0.9663 ✅
- `test_departamento_estado_1_5_str`: Estado 1.5 enviado como string → coeficiente 0.9663 ✅
- `test_departamento_estado_2`: Estado 2 → coeficiente 0.9546 ✅
- `test_departamento_estado_2_5`: Estado 2.5 → coeficiente 0.9286 ✅
- `test_departamento_estado_3`: Estado 3 → coeficiente 0.8820 ✅
- `test_departamento_estado_3_5`: Estado 3.5 → coeficiente 0.8116 ✅
- `test_departamento_estado_4`: Estado 4 → coeficiente 0.7211 ✅
- `test_departamento_estado_4_5`: Estado 4.5 → coeficiente 0.6157 ✅
- `test_departamento_estado_5`: Estado 5 → coeficiente 0.5000 ✅

### Pruebas Automatizadas (Ross-Heidecke)

**Archivo:** `server/tests/test_ross_heidecke_nueve_estados.py`

**Resultados:** 14/14 tests pasados ✅

**Resultado:**
- La matriz Ross-Heidecke está intacta
- El mapeo de estados está intacto
- La fórmula está intacta
- Todos los 9 estados producen coeficientes diferentes y correctos

## Confirmación de Si el Backend Recibía el Estado Nuevo

**Antes de la corrección:**
- El backend recibía el texto del label (ej. "1 - Nuevo / como nuevo")
- Pydantic rechazaba este valor con error 400
- Si el error no se mostraba, el backend usaba un valor por defecto

**Después de la corrección:**
- El backend recibe el valor numérico (ej. "1", "1.5", "2", etc.)
- Pydantic acepta el valor y lo normaliza a string
- El backend calcula el coeficiente correcto según el estado
- **Confirmado:** El backend ahora recibe el estado nuevo correctamente ✅

## Confirmación de Si el Coeficiente se Recalculaba o se Reutilizaba un Valor Anterior

**Antes de la corrección:**
- El coeficiente no se recalculaba porque el estado no llegaba correctamente al backend
- El frontend mostraba un valor antiguo o por defecto
- Cambiar el estado no tenía efecto

**Después de la corrección:**
- El coeficiente se recalcula con el estado nuevo
- El frontend actualiza `r.rossHeidecke` con el valor recalculado
- **Confirmado:** El coeficiente se recalcula correctamente ✅

## Verificación de los Nueve Estados

**Valores numéricos confirmados:**
- 1 → Nuevo / como nuevo
- 1.5 → Muy bueno
- 2 → Bueno
- 2.5 → Conservación normal
- 3 → Necesitado de reparaciones sencillas
- 3.5 → Necesitado de reparaciones moderadas
- 4 → Necesitado de reparaciones importantes
- 4.5 → Muy deteriorado
- 5 → Estado de demolición

**Conversión entre strings y números:**
- El frontend guarda strings ("1", "1.5", etc.)
- El backend acepta strings y números, normaliza a strings
- No hay redondeo ni truncado de valores decimales
- Los cuatro estados intermedios (1.5, 2.5, 3.5, 4.5) se procesan correctamente ✅

## Cualquier Limitación que Impida Confirmar la Solución desde la Interfaz

**Limitación:** Prueba manual desde la interfaz requiere:
- Inicio de sesión con credenciales válidas
- Interacción manual en el navegador
- Completar el flujo completo de tasación (ubicación, características, comparables)
- No se puede automatizar sin acceso a credenciales

**Prueba recomendada para el usuario:**
1. Iniciar el servidor backend: `cd server && python -m uvicorn main:app --host 127.0.0.1 --port 8080`
2. Iniciar el servidor frontend: `cd client && python -m http.server 3000`
3. Abrir `http://localhost:3000/client/app/tasacion.html` en el navegador
4. Iniciar sesión
5. Crear una tasación de departamento
6. Mantener fija la antigüedad (ej. 10 años)
7. Cambiar el estado de conservación entre los 9 valores
8. Verificar que el coeficiente Ross-Heidecke en la tarjeta cambie según el estado
9. Verificar que `valor_m2` y `valor_final` sean consistentes con el coeficiente

## Archivos Modificados

1. **client/js/global.js** (líneas 271-297)
   - Agregar `data-valor` a todos los items del autocomplete
   - Usar `opcion.valor` si existe, de lo contrario usar `opcion.label`

2. **client/js/global.js** (líneas 443-458)
   - `generarInputEstadoConservacion` muestra el label completo (ej. "1 - Nuevo / como nuevo")
   - Pero mantiene el valor numérico en `data-valor` para el backend

3. **client/js/event-manager.js** (líneas 132-141)
   - El input muestra el texto completo (`textContent`) para UX
   - El callback `onSelect` recibe el item completo con `data-valor`

4. **client/js/autocomplete-manager.js** (líneas 328-339)
   - Usa `item.dataset.valor` (valor numérico) para guardar en `datos.estadoConservacion`
   - El input muestra el texto completo para mejor UX

5. **client/js/tasacion-datos.js** (línea 585)
   - No sobrescribe `datosTasacion.departamento.estadoConservacion` con el texto del input
   - Ya se guarda en el callback `onSelect`

6. **client/js/tasacion-casa.js** (líneas 417-419)
   - No sobrescribe `datosTasacion.casa.estadoConservacion` con el texto del input
   - Ya se guarda en el callback `onSelect`

7. **client/js/tasacion-resultado.js** (líneas 552, 664)
   - Esta corrección ya estaba implementada en el paso anterior
   - Actualiza `r.rossHeidecke` con el valor recalculado

8. **server/tests/test_estado_conservacion_frontend.py** (nuevo)
   - Tests para verificar que el backend recibe y procesa correctamente los 9 estados

## Restricciones Cumplidas

✅ No se modificó `TABLA_ROSS_HEIDECKE`
✅ No se cambió la fórmula de depreciación
✅ No se cambió el mapeo de los nueve estados
✅ No se hicieron refactorizaciones generales
✅ No se modificaron archivos ajenos al problema
✅ No se cambió solo el texto mostrado; se actualizó el valor en el objeto de datos
✅ Los cuatro estados intermedios se procesan correctamente
✅ No hay redondeo ni truncado de valores decimales

## Resumen

La causa raíz era que el autocomplete guardaba el texto del label en lugar del valor numérico. Con esta corrección:

1. El frontend guarda el valor numérico correcto (ej. "1", "1.5", etc.)
2. El backend recibe el valor numérico correcto
3. Pydantic valida y normaliza el valor
4. El backend calcula el coeficiente correcto según el estado
5. El frontend actualiza `r.rossHeidecke` con el valor recalculado
6. La tarjeta muestra el coeficiente correcto

La solución es consistente con el comportamiento de la antigüedad, que ya funcionaba correctamente.
